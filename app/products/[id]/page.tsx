import LotClient from "./LotClient";
import { headers } from "next/headers";

type Lot = {
  id: number;
  product_id: number;
  exp: string;
  qty_back: number;
  qty_display: number;
  created_at: string;
};

export default async function ProductDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  // 現在アクセスしている host/port を自動で拾う（3000でも3001でもOK）
  const h = await headers();
  const host = h.get("host"); // 例: localhost:3001
  const proto = h.get("x-forwarded-proto") ?? "http";
  const baseUrl = `${proto}://${host}`;

  const res = await fetch(`${baseUrl}/api/products/${id}/lots`, {
    cache: "no-store",
  });

  if (!res.ok) {
    return (
      <div style={{ padding: 16 }}>
        <h1>Product {id}</h1>
        <p>Failed to load lots: {res.status}</p>
      </div>
    );
  }

  const lots: Lot[] = await res.json();

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Product {id}</h1>
      <LotClient productId={id} initialLots={lots} />
    </div>
  );
}
