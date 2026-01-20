// lib/db.ts
import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },

  // ✅ タイムアウト耐性
  connectionTimeoutMillis: 10_000, // 接続確立待ち
  idleTimeoutMillis: 30_000,
  max: 5,
});
