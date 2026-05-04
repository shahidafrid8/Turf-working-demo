import type { Express } from "express";
import { type Server } from "http";
import { registerAdminRoutes } from "./routes/admin.routes";
import { registerAuthRoutes } from "./routes/auth.routes";
import { registerBookingRoutes } from "./routes/booking.routes";
import { registerOwnerRoutes } from "./routes/owner.routes";
import { registerPaymentRoutes } from "./routes/payment.routes";
import { registerPlayerRoutes } from "./routes/player.routes";
import { registerPublicRoutes } from "./routes/public.routes";
import { registerStaffRoutes } from "./routes/staff.routes";
import { registerUploadRoutes } from "./routes/upload.routes";

declare module "express-session" {
  interface SessionData {
    userId: string;
    userRole: string; // 'player' | 'turf_owner' | 'turf_staff' | 'admin'
  }
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  registerAuthRoutes(app);
  registerUploadRoutes(app);
  registerPublicRoutes(app);
  registerAdminRoutes(app);
  registerOwnerRoutes(app);
  registerStaffRoutes(app);
  registerPaymentRoutes(app);
  registerBookingRoutes(app);
  registerPlayerRoutes(app);

  return httpServer;
}
