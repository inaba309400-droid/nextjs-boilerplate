import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __pool: Pool | undefined;
}

export const pool =
  global.__pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

if (process.env.NODE_ENV !== "production") global.__pool = pool;

