import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

type Params = {
  params: Promise<{ id: string }>;
};

/* =========================
   GET /api/products/[id]/lots
========================= */
export async function GET(
  _req: Request,
  { params }: Params
) {
  const { id } = await params;
  const productId = Number(id);

  if (!Number.isFinite(productId)) {
    return NextResponse.json(
      { error: "Invalid product id" },
      { status: 400 }
    );
  }

  const { rows } = await pool.query(
    `
    SELECT
      id,
      product_id,
      to_char(exp, 'YYYY-MM-DD') AS exp,
      qty_back,
      qty_display
    FROM product_lots
    WHERE product_id = $1
    ORDER BY exp ASC
    `,
    [productId]
  );

  return NextResponse.json(rows);
}

/* =========================
   POST /api/products/[id]/lots
========================= */
export async function POST(
  req: Request,
  { params }: Params
) {
  const { id } = await params;
  const productId = Number(id);

  if (!Number.isFinite(productId)) {
    return NextResponse.json(
      { error: "Invalid product id" },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);

  const exp = body?.exp;
  const qty_back = Number(body?.qty_back);
  const qty_display = Number(body?.qty_display);

  if (!exp) {
    return NextResponse.json({ error: "exp is required" }, { status: 400 });
  }
  if (!Number.isFinite(qty_back) || qty_back < 0) {
    return NextResponse.json({ error: "qty_back must be >= 0" }, { status: 400 });
  }
  if (!Number.isFinite(qty_display) || qty_display < 0) {
    return NextResponse.json({ error: "qty_display must be >= 0" }, { status: 400 });
  }

  const { rows } = await pool.query(
    `
    INSERT INTO product_lots (product_id, exp, qty_back, qty_display)
    VALUES ($1, $2::date, $3, $4)
    ON CONFLICT (product_id, exp)
    DO UPDATE SET
      qty_back = EXCLUDED.qty_back,
      qty_display = EXCLUDED.qty_display
    RETURNING
      id,
      product_id,
      to_char(exp, 'YYYY-MM-DD') AS exp,
      qty_back,
      qty_display
    `,
    [productId, exp, qty_back, qty_display]
  );

  return NextResponse.json(rows[0]);
}
