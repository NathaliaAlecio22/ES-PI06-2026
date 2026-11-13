import "dotenv/config";
import cors from "cors";
import express from "express";
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

export default app;
