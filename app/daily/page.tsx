// app/daily/page.tsx
import DailyClient from "./DailyClient";

export const dynamic = "force-dynamic";

type Product = {
  id: number;
  name: string;
  image_url: string | null;
};

export default async function DailyPage() {
  const res = await fetch("http://localhost:3000/api/products", {
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch products: ${res.status} ${text}`);
  }

  const products: Product[] = await res.json();

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>Daily Count</h1>
      <div style={{ opacity: 0.7, marginBottom: 16 }}>
        写真をクリック → EXP別に店頭数だけ入力 → OK
      </div>

      <DailyClient initialProducts={products} />
    </div>
  );
}
