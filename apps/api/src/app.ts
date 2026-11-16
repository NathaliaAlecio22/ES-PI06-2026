import "dotenv/config";
import cors from "cors";
import express from "express";
import authRouter from "./routes/auth.routes.js";
import { participantesRouter } from "./routes/participantes.routes.js";

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim());

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "20kb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/participantes", participantesRouter);
app.use("/api", authRouter);

export default app;
