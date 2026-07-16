import { config } from "dotenv";
config({ path: ".env.local" });

import { defineConfig } from "prisma/config";

// CLI-only datasource (migrate, db pull, studio). Uses the direct
// (non-pooled) connection since PgBouncer's transaction mode doesn't
// support the DDL statements migrations issue.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DIRECT_URL"],
  },
});
