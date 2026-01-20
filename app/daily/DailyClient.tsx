// app/daily/DailyLotClient.tsx
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type LotStatus = "EXPIRED" | "TODAY" | "TOMORROW" | "REFILL" | "SOON" | "OK";

type UILot = {
  lot_id: number;
  product_id: number;
  exp: string;
  qty_back: number;
  qty_display: number;
  status: LotStatus;
};

export default function DailyLotClient({
  productId,
  initialLots,
}: {
  productId: number;
  initialLots: UILot[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // 「押した瞬間に見た目が変わる」体験のためローカルstateを持つ（refreshで最終確定）
  const [lots, setLots] = useState<UILot[]>(initialLots);

  // Server refresh で initialLots が変わった場合に追従させたいなら、
  // key を親側で変える or useEffectで同期でもOK。
  // 今回は最短で、操作中のUX優先（refreshで矛盾は解消される前提）。

  const sorted = useMemo(() => {
    // 期限順
    return [...lots].sort((a, b) => a.exp.localeCompare(b.exp));
  }, [lots]);

  async function upsertLot(next: { exp: string; qty_back: number; qty_display: number }) {
    const res = await fetch(`/api/products/${productId}/lots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`POST failed (${res.status}): ${text}`);
    }

    // サーバの最新に揃える
    startTransition(() => {
      router.refresh();
    });
  }

  function clampNonNegative(n: number) {
    return Math.max(0, n);
  }

  async function changeQty(lotId: number, field: "qty_back" | "qty_display", delta: number) {
    const current = lots.find((l) => l.lot_id === lotId);
    if (!current) return;

    const nextLot: UILot = {
      ...current,
      [field]: clampNonNegative((current as any)[field] + delta),
    } as UILot;

    // 楽観更新（即UI反映）
    setLots((prev) => prev.map((l) => (l.lot_id === lotId ? nextLot : l)));

    try {
      await upsertLot({
        exp: nextLot.exp,
        qty_back: nextLot.qty_back,
        qty_display: nextLot.qty_display,
      });
    } catch (e) {
      // 失敗したら元に戻す（最小のリカバリ）
      setLots((prev) => prev.map((l) => (l.lot_id === lotId ? current : l)));
      alert(e instanceof Error ? e.message : "保存に失敗しました");
    }
  }

  function statusText(s: LotStatus) {
    switch (s) {
      case "EXPIRED":
        return "期限切れ";
      case "TODAY":
        return "本日";
      case "TOMORROW":
        return "明日";
      case "REFILL":
        return "補充";
      case "SOON":
        return "期限近い";
      case "OK":
      default:
        return "OK";
    }
  }

  return (
    <div className="space-y-2">
      {sorted.map((lot) => (
        <div
          key={lot.lot_id}
          className="rounded-xl border bg-white p-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="font-semibold">EXP: {lot.exp}</div>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                  {statusText(lot.status)}
                </span>
              </div>
              <div className="text-xs text-gray-500">Lot ID: {lot.lot_id}</div>
            </div>

            {isPending && (
              <span className="text-xs text-gray-500">更新中…</span>
            )}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {/* Back */}
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
              <div className="text-sm font-medium">Back</div>
              <div className="flex items-center gap-2">
                <button
                  className="h-9 w-9 rounded-lg border bg-white text-lg"
                  onClick={() => changeQty(lot.lot_id, "qty_back", -1)}
                  disabled={isPending}
                >
                  −
                </button>
                <div className="w-10 text-center font-semibold">{lot.qty_back}</div>
                <button
                  className="h-9 w-9 rounded-lg border bg-white text-lg"
                  onClick={() => changeQty(lot.lot_id, "qty_back", +1)}
                  disabled={isPending}
                >
                  +
                </button>
              </div>
            </div>

            {/* Display */}
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
              <div className="text-sm font-medium">Display</div>
              <div className="flex items-center gap-2">
                <button
                  className="h-9 w-9 rounded-lg border bg-white text-lg"
                  onClick={() => changeQty(lot.lot_id, "qty_display", -1)}
                  disabled={isPending}
                >
                  −
                </button>
                <div className="w-10 text-center font-semibold">{lot.qty_display}</div>
                <button
                  className="h-9 w-9 rounded-lg border bg-white text-lg"
                  onClick={() => changeQty(lot.lot_id, "qty_display", +1)}
                  disabled={isPending}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {sorted.length === 0 && (
        <div className="rounded-xl border bg-gray-50 p-3 text-sm text-gray-600">
          対象ロットがありません（7日以内の期限がない）
        </div>
      )}
    </div>
  );
}
