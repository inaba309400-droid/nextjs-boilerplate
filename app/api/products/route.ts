import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  const { rows } = await pool.query(
    `
    SELECT
      id,
      name,
      stock,
      to_char(exp, 'YYYY-MM-DD') AS exp
    FROM products
    ORDER BY id DESC
    `
  );

  return NextResponse.json(rows);
}
