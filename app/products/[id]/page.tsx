// app/products/[id]/page.tsx
import Link from "next/link";

type Lot = {
  id: number;
  product_id: number;
  exp: string;
  qty_back: number;
  qty_display: number;
};

async function getLots(id: string): Promise<Lot[] | null> {
  try {
    const res = await fetch(`http://127.0.0.1:3000/api/products/${id}/lots`, {
      cache: "no-store",
    });
    if (!res.ok) return null;

    const data = await res.json();
    if (data?.ok === true && Array.isArray(data.lots)) return data.lots;
    return null;
  } catch {
    return null;
  }
}

export default async function ProductLotsPage({
  params,
}: {
  params: Promise<{ id: string }>; // ✅ ここ重要（Promise）
}) {
  const { id } = await params; // ✅ ここ重要（await）
  const lots = await getLots(id);

  return (
    <main className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Product {id}</h1>
        <Link className="underline" href="/products">
          ← Back
        </Link>
      </div>

      {lots === null ? (
        <div className="rounded-lg border p-4">
          <div className="font-semibold">lots取得に失敗</div>
          <div className="text-sm opacity-80">
            /api/products/{id}/lots が落ちてる可能性あり
          </div>
        </div>
      ) : lots.length === 0 ? (
        <div className="rounded-lg border p-4">ロットが0件です</div>
      ) : (
        <ul className="space-y-2">
          {lots.map((l) => (
            <li key={l.id} className="rounded-lg border p-4">
              <div className="font-semibold">EXP: {l.exp}</div>
              <div className="text-sm">Back: {l.qty_back}</div>
              <div className="text-sm">Display: {l.qty_display}</div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
