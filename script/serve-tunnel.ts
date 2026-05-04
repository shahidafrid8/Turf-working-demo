/**
 * Tunnel-friendly server script.
 * 
 * Builds the client first, then serves the built files 
 * directly (no Vite HMR) so it works through localtunnel/ngrok.
 */
import { build as viteBuild } from "vite";
import { spawn } from "child_process";
import path from "path";

async function main() {
  console.log("📦 Building client for tunnel serving...");
  await viteBuild();
  console.log("✅ Client built successfully!\n");

  console.log("🚀 Starting server in tunnel mode...");
  const server = spawn("npx", ["tsx", "server/index.ts"], {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      // Force production static file serving (no Vite HMR)
      // but keep dev-mode guards relaxed
      SERVE_STATIC: "true",
    },
  });

  server.on("close", (code) => {
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
