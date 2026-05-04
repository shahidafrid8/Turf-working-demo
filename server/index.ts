import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { createSessionStore } from "./sessionStore";
import { captureError, logger } from "./logger";
import { assertProductionConfig } from "./productionGuards";

assertProductionConfig();
const app = express();
const httpServer = createServer(app);

// Render/Cloud Run/etc. run behind a reverse proxy. This is required so secure
// cookies (express-session) work correctly in production.
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.get("/healthz", (_req, res) => {
  res.status(200).json({ ok: true });
});

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

declare module "express-serve-static-core" {
  interface Request {
    requestId: string;
  }
}

app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  res.setHeader("x-request-id", req.requestId);
  next();
});

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// ── Security middleware ──────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts from Vite in dev
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || true, // Allow same-origin by default
  credentials: true,
}));

// Rate limiter for auth endpoints (prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 attempts per window
  message: { error: "Too many attempts, please try again after 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/register/owner", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/google", authLimiter);

// Rate limiter for uploads
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: "Too many uploads, please try again later" },
});
app.use("/api/upload", uploadLimiter);
app.use("/api/auth/profile-image", uploadLimiter);

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// ── Session configuration ────────────────────────────────────────────────────
const sessionSecret = process.env.SESSION_SECRET || (() => {
  const generated = crypto.randomBytes(32).toString("hex");
  console.warn("⚠️  WARNING: SESSION_SECRET not set. Using auto-generated secret.");
  console.warn("   Sessions will be invalidated on restart. Set SESSION_SECRET in your environment.");
  return generated;
})();

app.use(
  session({
    store: createSessionStore(),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  logger.info("server.log", { source, message, formattedTime });
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log the error but DON'T re-throw — that would crash the server
    captureError(err, { status, route: _req.path, requestId: _req.requestId });
    res.status(status).json({
      error: status >= 500 ? "Something went wrong. Please try again." : message,
      requestId: _req.requestId,
    });
  });

  if (process.env.NODE_ENV === "production" || process.env.SERVE_STATIC === "true") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
