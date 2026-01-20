"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Lot = {
  id: number;
  product_id: number;
  exp: string; // YYYY-MM-DD
  qty_back: number;
  qty_display: number;
};

export default function LotClient({
  productId,
  initialLots,
}: {
  productId: string;
  initialLots: Lot[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // 入荷用フォーム（初期値は空）
  const [exp, setExp] = useState("");
  const [qtyBack, setQtyBack] = useState<number>(0);
  const [qtyDisplay, setQtyDisplay] = useState<number>(0);

  const lots = useMemo(() => initialLots ?? [], [initialLots]);

  async function upsertLot(next: { exp: string; qty_back: number; qty_display: number }) {
    try {
      setSaving(true);

      const res = await fetch(`/api/products/${productId}/lots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });

      if (!res.ok) {
        const text = await res.text();
        alert(`保存に失敗しました: ${res.status}\n${text}`);
        return;
      }

      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ marginTop: 16 }}>
      <h2>🗓 毎日の棚卸し（EXPごと）</h2>
<p style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>
  毎日1回、現物の数に合わせて Back / Display を修正してください
</p>
      {lots.length === 0 ? (
        <p>No lots yet.</p>
      ) : (
        <ul style={{ display: "grid", gap: 12, padding: 0, listStyle: "none" }}>
          {lots.map((l) => {
            const ymd = l.exp; // ★変換しない
            return (
              <li key={l.id} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
                <div style={{ fontWeight: 700 }}>EXP: {ymd}</div>

                {/* Back */}
                <div>
                  <button
                    disabled={saving || l.qty_back <= 0}
                    onClick={() =>
                      upsertLot({ exp: ymd, qty_back: l.qty_back - 1, qty_display: l.qty_display })
                    }
                  >
                    -
                  </button>
                  {l.qty_back}
                  <button
                    disabled={saving}
                    onClick={() =>
                      upsertLot({ exp: ymd, qty_back: l.qty_back + 1, qty_display: l.qty_display })
                    }
                  >
                    +
                  </button>
                </div>

                {/* Display */}
                <div>
                  <button
                    disabled={saving || l.qty_display <= 0}
                    onClick={() =>
                      upsertLot({ exp: ymd, qty_back: l.qty_back, qty_display: l.qty_display - 1 })
                    }
                  >
                    -
                  </button>
                  {l.qty_display}
                  <button
                    disabled={saving}
                    onClick={() =>
                      upsertLot({ exp: ymd, qty_back: l.qty_back, qty_display: l.qty_display + 1 })
                    }
                  >
                    +
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <h3 style={{ marginTop: 32 }}>📦 入荷登録（商品が届いたときのみ）</h3>
<p style={{ fontSize: 13, opacity: 0.7 }}>
  新しい商品が届いたときだけ入力します。<br />
  普段の棚卸しでは触りません。
</p>
      <input type="date" value={exp} onChange={(e) => setExp(e.target.value)} />
      <input type="number" min={0} value={qtyBack} onChange={(e) => setQtyBack(+e.target.value)} />
      <input
        type="number"
        min={0}
        value={qtyDisplay}
        onChange={(e) => setQtyDisplay(+e.target.value)}
      />

      <button onClick={() => upsertLot({ exp, qty_back: qtyBack, qty_display: qtyDisplay })}>
        Save
      </button>
    </div>
  );
}
