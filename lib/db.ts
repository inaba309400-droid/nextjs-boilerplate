// lib/db.ts
import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ローカルやVercelの環境によって必要なら
  // ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});
