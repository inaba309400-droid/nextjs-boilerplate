// app/products/page.tsx
import Link from "next/link";

type Product = {
  id: number;
  name: string;
  stock: number;
  exp?: string;
};

export default async function ProductsPage() {
  const res = await fetch("http://localhost:3000/api/products", {
    cache: "no-store",
  });

  if (!res.ok) {
    return (
      <div style={{ padding: 16 }}>
        <h1>Products</h1>
        <p>Failed to load: {res.status}</p>
      </div>
    );
  }

  const products: Product[] = await res.json();

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Products</h1>

      <ul style={{ marginTop: 16, display: "grid", gap: 12 }}>
        {products.map((p) => (
          <li key={p.id}>
            <Link
              href={`/products/${p.id}`}
              style={{
                display: "block",
                border: "1px solid #ddd",
                borderRadius: 12,
                padding: 12,
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div style={{ fontWeight: 700 }}>
                {p.name}（id: {p.id}）
              </div>

              <div style={{ marginTop: 6, fontSize: 14, opacity: 0.8 }}>
                stock: {p.stock ?? "-"} / exp: {p.exp ?? "-"}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
