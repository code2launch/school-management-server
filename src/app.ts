import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import compression from "compression";
import config from "./app/config";
import router from "./app/routes";
import globalErrorHandler from "./app/middlewares/globalErrorHandler";
import notFound from "./app/middlewares/notFound";

const app: Application = express();

// ── Security & performance middleware ────────────────────────
app.use(helmet());
app.use(compression());

// Rate limiting — generous for school use but protects against abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." },
});
app.use("/api", limiter);

// ── CORS ─────────────────────────────────────────────────────
app.use(
  cors({
    origin: config.frontend_url,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ── Body parsing ─────────────────────────────────────────────
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// ── Logger (dev only) ────────────────────────────────────────
if (config.node_env === "development") {
  app.use(morgan("dev"));
}

// ── Health check ─────────────────────────────────────────────
app.get("/", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "🏫 School Management API is running.",
    version: "1.0.0",
    environment: config.node_env,
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req: Request, res: Response) => {
  res.json({ success: true, status: "healthy", uptime: process.uptime() });
});

// ── API routes ────────────────────────────────────────────────
app.use("/api/v1", router);

// ── Error handlers ────────────────────────────────────────────
app.use(globalErrorHandler);
app.use(notFound);

export default app;
