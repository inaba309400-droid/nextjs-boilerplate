// app/products/page.tsx
import Link from "next/link";

type Product = {
  id: number;
  name: string;
  stock?: number;
  exp?: string | null;
};

type ProductsResult =
  | { ok: true; products: Product[] }
  | {
      ok: false;
      status?: number;
      msg: string;
      url: string;
      body?: any;
    };

async function getProducts(): Promise<ProductsResult> {
  const url = "http://127.0.0.1:3000/api/products";

  try {
    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text(); // まず text で受ける（壊れてても表示できる）

    let body: any = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }

    if (!res.ok) {
      return { ok: false, status: res.status, msg: `fetch not ok: ${res.status}`, url, body };
    }

    // ✅ 1) APIが「配列」そのものを返すケース（今あなたがこれ）
    if (Array.isArray(body)) {
      return { ok: true, products: body as Product[] };
    }

    // ✅ 2) APIが { ok:true, products:[...] } を返すケース
    if (body?.ok === true && Array.isArray(body.products)) {
      return { ok: true, products: body.products as Product[] };
    }

    // ✅ 3) APIが { ok:true, rows:[...] } 等を返すケースも吸収
    if (Array.isArray(body?.rows)) {
      return { ok: true, products: body.rows as Product[] };
    }

    return {
      ok: false,
      status: res.status,
      msg: "unexpected json shape",
      url,
      body,
    };
  } catch (e: any) {
    return {
      ok: false,
      msg: e?.message ?? String(e),
      url,
    };
  }
}

export default async function ProductsPage() {
  const result = await getProducts();

  return (
    <main className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Products</h1>
        <Link className="underline" href="/">
          Home
        </Link>
      </div>

      {!result.ok ? (
        <div className="rounded-lg border p-4 space-y-2">
          <div className="font-semibold">Products 取得に失敗</div>
          <div className="text-sm opacity-80">叩いているURL: {result.url}</div>
          <div className="text-sm opacity-80">
            status: {result.status ?? "-"} / msg: {result.msg}
          </div>

          {/* デバッグ表示 */}
          {result.body !== undefined && (
            <pre className="mt-2 overflow-auto rounded-md bg-black/5 p-3 text-xs">
              {typeof result.body === "string"
                ? result.body
                : JSON.stringify(result.body, null, 2)}
            </pre>
          )}
        </div>
      ) : result.products.length === 0 ? (
        <div className="rounded-lg border p-4">0件です</div>
      ) : (
        <ul className="space-y-2">
          {result.products.map((p) => (
            <li key={p.id} className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold">
                    {p.name} <span className="opacity-60">(id: {p.id})</span>
                  </div>
                  {"stock" in p && (
                    <div className="text-sm opacity-80">stock: {p.stock ?? 0}</div>
                  )}
                  {"exp" in p && p.exp && (
                    <div className="text-sm opacity-80">exp: {String(p.exp)}</div>
                  )}
                </div>

                <Link className="underline" href={`/products/${p.id}`}>
                  Open →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
