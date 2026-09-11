import express from "express";

import { env } from "./config/env.js";

const app = express();

app.disable("x-powered-by");
app.use(express.json());

app.get("/health", (_request, response) => {
  response.status(200).json({ status: "ok" });
});

const server = app.listen(env.PORT, () => {
  console.log(`API listening on port ${env.PORT}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
