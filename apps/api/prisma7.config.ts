import "dotenv/config";

import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",

  datasource: {
    url: env("DATABASE_URL"),
    ...(process.env.DIRECT_URL ? { directUrl: process.env.DIRECT_URL } : {}),
  },
});