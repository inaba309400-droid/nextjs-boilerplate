// app/api/products/[id]/lots/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// Ctrl+F: toInt
function toInt(v: unknown): number | null {
  if (typeof v !== "string" && typeof v !== "number") return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Ctrl+F: Ctx
type Ctx =
  | { params: { id: string } }
  | { params: { productId: string } }
  | { params: Promise<{ id: string }> }
  | { params: Promise<{ productId: string }> };

// Ctrl+F: GET_LOTS
export async function GET(_req: Request, ctx: Ctx) {
  console.log("REAL_ROUTE_HIT");

  const params = await Promise.resolve((ctx as any).params);
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

// ===== POST_LOTS_START (Ctrl+F用) =====
//
// POST body 例:
// { "exp":"2026-01-25", "qty_back":10, "qty_display":2, "mode":"set" }
// { "exp":"2026-01-25", "qty_back":1,  "qty_display":0, "mode":"delta" }
//
// mode:
//  - "set"   : 値をそのまま設定（上書き）
//  - "delta" : 既存に加算（+1/-1など）
//
export async function POST(req: Request, ctx: Ctx) {
  console.log("REAL_POST_HIT");

  const params = await Promise.resolve((ctx as any).params);
  const raw = (params?.id ?? params?.productId) as unknown;
  const productId = toInt(raw);

  if (!productId) {
    return NextResponse.json({ ok: false, error: "invalid productId" }, { status: 400 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const exp = typeof body?.exp === "string" ? body.exp : null;
  const mode = body?.mode === "delta" ? "delta" : "set"; // default set

  // qtyは null 許可（片方だけ更新したい時がある）
  const qtyBack = body?.qty_back === null || body?.qty_back === undefined ? null : Number(body.qty_back);
  const qtyDisplay = body?.qty_display === null || body?.qty_display === undefined ? null : Number(body.qty_display);

  if (!exp) {
    return NextResponse.json({ ok: false, error: "exp_required" }, { status: 400 });
  }
  if (qtyBack !== null && (!Number.isFinite(qtyBack) || qtyBack < 0)) {
    return NextResponse.json({ ok: false, error: "invalid qty_back" }, { status: 400 });
  }
  if (qtyDisplay !== null && (!Number.isFinite(qtyDisplay) || qtyDisplay < 0)) {
    return NextResponse.json({ ok: false, error: "invalid qty_display" }, { status: 400 });
  }

  // UNIQUE (product_id, exp) がある前提で UPSERT
  // すでにあなたのNeonでは constraint が "already exists" なのでOK
  try {
    const { rows } = await pool.query(
      `
      insert into product_lots (product_id, exp, qty_back, qty_display)
      values (
        $1,
        $2::date,
        coalesce($3::int, 0),
        coalesce($4::int, 0)
      )
      on conflict (product_id, exp)
      do update set
        qty_back =
          case
            when $5 = 'delta' then greatest(product_lots.qty_back + coalesce($3::int, 0), 0)
            else coalesce($3::int, product_lots.qty_back)
          end,
        qty_display =
          case
            when $5 = 'delta' then greatest(product_lots.qty_display + coalesce($4::int, 0), 0)
            else coalesce($4::int, product_lots.qty_display)
          end
      returning id, product_id, exp, qty_back, qty_display
      `,
      [productId, exp, qtyBack, qtyDisplay, mode]
    );

    return NextResponse.json({ ok: true, lot: rows[0] }, { status: 200 });
  } catch (e: any) {
    console.error("lots route POST db error:", e);
    return NextResponse.json(
      { ok: false, error: "db_error", detail: e?.message ?? String(e), code: e?.code },
      { status: 500 }
    );
  }
}
// ===== POST_LOTS_END =====
