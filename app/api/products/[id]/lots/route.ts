console.log("REAL_ROUTE_HIT");
// app/api/products/[id]/lots/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

function toInt(v: unknown): number | null {
  if (typeof v !== "string" && typeof v !== "number") return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

type Ctx =
  | { params: { id: string } }
  | { params: { productId: string } }
  | { params: Promise<{ id: string }> }
  | { params: Promise<{ productId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const params = await Promise.resolve((ctx as any).params);

  // ルートが [id] でも、過去コードが productId を見てる可能性があるので両対応
  const raw = (params?.id ?? params?.productId) as unknown;
  const productId = toInt(raw);

  if (!productId) {
    return NextResponse.json(
      { ok: false, error: "invalid productId", debug: { params } },
      { status: 400 }
    );
  }

  try {
    const { rows } = await pool.query(
      `
      select
        id,
        product_id,
        exp,
        qty_back,
        qty_display
      from product_lots
      where product_id = $1
      order by exp asc, id asc
      `,
      [productId]
    );

    return NextResponse.json({ ok: true, lots: rows }, { status: 200 });
  } catch (e: any) {
  console.error("lots route db error:", e);

  return NextResponse.json(
    {
      ok: false,
      error: "db_error",
      detail: e?.message ?? e?.toString?.() ?? String(e),
      code: e?.code,
      hint: e?.hint,
      where: e?.where,
    },
    { status: 500 }
  );
}
}
