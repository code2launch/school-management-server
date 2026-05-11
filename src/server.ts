import { Server } from "http";
import app from "./app";
import config from "./app/config";
import { prisma } from "./app/shared/prisma";

let server: Server;

async function main() {
  try {
    // Verify DB connection
    await prisma.$connect();
    console.log("✅ Database connected.");

    server = app.listen(config.port, () => {
      console.log(`🏫 School Management API`);
      console.log(`   → Environment : ${config.node_env}`);
      console.log(`   → Port        : ${config.port}`);
      console.log(`   → URL         : http://localhost:${config.port}`);
      console.log(`   → API Base    : http://localhost:${config.port}/api/v1`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

// ── Graceful shutdown ────────────────────────────────────────

const shutdown = async (signal: string) => {
  console.log(`\n⚠️  ${signal} received — shutting down gracefully...`);

  if (server) {
    server.close(async () => {
      console.log("🔌 HTTP server closed.");
      await prisma.$disconnect();
      console.log("🗄️  Database disconnected.");
      process.exit(0);
    });
  } else {
    await prisma.$disconnect();
    process.exit(0);
  }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason, promise) => {
  console.error("🚨 Unhandled Rejection at:", promise, "reason:", reason);
  shutdown("UNHANDLED_REJECTION");
});

process.on("uncaughtException", (err) => {
  console.error("🚨 Uncaught Exception:", err);
  shutdown("UNCAUGHT_EXCEPTION");
});

main();
