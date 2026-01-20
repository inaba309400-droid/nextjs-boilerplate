"use client";

import { useEffect, useMemo, useState } from "react";

type Product = {
  id: number;
  name: string;
  image_url: string | null;
};

type Lot = {
  id: number;
  product_id: number;
  exp: string;          // YYYY-MM-DD
  qty_total: number;    // 入荷総数
  qty_display: number;  // 店頭（入力する値）
  qty_back: number;     // APIで計算して返す（total - display）
};

export default function DailyClient({ initialProducts }: { initialProducts: Product[] }) {
  const products = useMemo(() => initialProducts ?? [], [initialProducts]);

  const [selectedId, setSelectedId] = useState<number | null>(products[0]?.id ?? null);
  const [lots, setLots] = useState<Lot[]>([]);
  const [loadingLots, setLoadingLots] = useState(false);
  const [saving, setSaving] = useState(false);

  // 選択された商品だけロット取得
  useEffect(() => {
    if (!selectedId) return;
    (async () => {
      setLoadingLots(true);
      try {
        const res = await fetch(`/api/products/${selectedId}/lots`, { cache: "no-store" });
        const data = await res.json();
        setLots(data);
      } finally {
        setLoadingLots(false);
      }
    })();
  }, [selectedId]);

  const selected = products.find((p) => p.id === selectedId) ?? null;

  async function saveDisplay(lotId: number, qty_display: number) {
    setSaving(true);
    try {
      const res = await fetch(`/api/lots/${lotId}/display`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qty_display }),
      });
      if (!res.ok) {
        const t = await res.text();
        alert(`保存失敗: ${res.status}\n${t}`);
        return;
      }
      // 更新後のロットを受け取って置き換え
      const updated: Lot = await res.json();
      setLots((prev) => prev.map((l) => (l.id === lotId ? updated : l)));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 16 }}>
      {/* 左：写真＋名前だけ */}
      <div>
        <div style={{ marginBottom: 10, fontWeight: 700 }}>Products</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {products.map((p) => {
            const active = p.id === selectedId;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                style={{
                  border: active ? "2px solid #111" : "1px solid #ddd",
                  borderRadius: 12,
                  padding: 10,
                  textAlign: "left",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    height: 120,
                    borderRadius: 10,
                    background: "#f3f4f6",
                    display: "grid",
                    placeItems: "center",
                    overflow: "hidden",
                    marginBottom: 8,
                  }}
                >
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ opacity: 0.6 }}>No Image</div>
                  )}
                </div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                <div style={{ opacity: 0.6, fontSize: 12 }}>ID: {p.id}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 右：EXP別入力 */}
      <div style={{ border: "1px solid #ddd", borderRadius: 14, padding: 14, background: "#fff" }}>
        {!selected ? (
          <div>左から商品を選んでください</div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{selected.name}</div>
                <div style={{ opacity: 0.6 }}>Product ID: {selected.id}</div>
              </div>
            </div>

            <div style={{ marginTop: 14, fontWeight: 700 }}>EXP別 店頭数入力</div>
            <div style={{ opacity: 0.65, fontSize: 13, marginTop: 4 }}>
              店頭（Display）だけ数えて入力。Backは自動計算。
            </div>

            {loadingLots ? (
              <div style={{ marginTop: 14 }}>Loading...</div>
            ) : lots.length === 0 ? (
              <div style={{ marginTop: 14, opacity: 0.7 }}>ロットがありません（入荷登録が必要）</div>
            ) : (
              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                {lots.map((l) => (
                  <div key={l.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 800 }}>EXP: {l.exp}</div>
                        <div style={{ fontSize: 12, opacity: 0.65 }}>
                          Lot ID: {l.id} / Total: {l.qty_total} / Back: {l.qty_back}
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center" }}>
                      <div style={{ width: 90, opacity: 0.8 }}>店頭数</div>
                      <input
                        type="number"
                        min={0}
                        value={l.qty_display}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setLots((prev) => prev.map((x) => (x.id === l.id ? { ...x, qty_display: v } : x)));
                        }}
                        style={{ width: 120, padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd" }}
                      />
                      <button
                        disabled={saving}
                        onClick={() => saveDisplay(l.id, l.qty_display)}
                        style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #111", background: "#111", color: "#fff" }}
                      >
                        OK
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
