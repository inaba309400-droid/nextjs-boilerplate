// app/products/[id]/page.tsx
import { headers } from "next/headers";
import LotClient from "./LotClient";

type Lot = {
  id: number;
  product_id: number;
  exp: string;
  qty_back: number;
  qty_display: number;
};

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = process.env.NODE_ENV === "development" ? "http" : "https";
  const baseUrl = `${proto}://${host}`;

  const res = await fetch(`${baseUrl}/api/products/${id}/lots`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    return (
      <div style={{ padding: 16 }}>
        <h1>Product</h1>
        <p>Failed to load lots: {res.status}</p>
        <pre style={{ whiteSpace: "pre-wrap" }}>{text}</pre>
      </div>
    );
  }

  // ★ここが重要：APIは { ok, lots } なので data で受ける
  const data = await res.json();
  const lots: Lot[] = Array.isArray(data) ? data : (data.lots ?? []);

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Product</h1>
      <LotClient productId={id} initialLots={lots} />
    </div>
  );
}
