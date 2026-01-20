// app/daily/page.tsx
// app/daily/page.tsx
import { pool } from "@/lib/db";
import DailyLotClient from "./DailyClient";
type LotRow = {
  lot_id: number;
  product_id: number;
  exp: string; // date -> string (YYYY-MM-DD)
  qty_back: number;
  qty_display: number;
  product_name: string;
  image_url: string | null;
};

type LotStatus = "EXPIRED" | "TODAY" | "TOMORROW" | "REFILL" | "SOON" | "OK";

type UILot = {
  lot_id: number;
  product_id: number;
  exp: string;
  qty_back: number;
  qty_display: number;
  status: LotStatus;
};

type UIProductGroup = {
  product_id: number;
  product_name: string;
  image_url: string | null;
  lots: UILot[];
};

function toISODate(d: Date) {
  // Server timezone差分を避けるため、UTCベースでYYYY-MM-DD化
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDaysISO(baseISO: string, days: number) {
  const [y, m, d] = baseISO.split("-").map((n) => Number(n));
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return toISODate(dt);
}

function calcStatus(lot: { exp: string; qty_back: number; qty_display: number }, todayISO: string): LotStatus {
  // 優先順位：期限系 > 補充 > 近い > OK（現場向け）
  // ※補充を上げたいなら REFILL を期限系より上にしてもOK
  if (lot.exp < todayISO) return "EXPIRED";
  if (lot.exp === todayISO) return "TODAY";
  if (lot.exp === addDaysISO(todayISO, 1)) return "TOMORROW";

  if (lot.qty_display === 0 && lot.qty_back > 0) return "REFILL";

  if (lot.exp <= addDaysISO(todayISO, 7)) return "SOON";
  return "OK";
}

function statusLabel(s: LotStatus) {
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

function statusBadgeClass(s: LotStatus) {
  // Tailwind（色は後で調整でOK）
  switch (s) {
    case "EXPIRED":
      return "bg-red-100 text-red-800";
    case "TODAY":
      return "bg-orange-100 text-orange-800";
    case "TOMORROW":
      return "bg-yellow-100 text-yellow-800";
    case "REFILL":
      return "bg-blue-100 text-blue-800";
    case "SOON":
      return "bg-gray-100 text-gray-800";
    case "OK":
    default:
      return "bg-green-100 text-green-800";
  }
}

function groupByProduct(rows: LotRow[], todayISO: string): UIProductGroup[] {
  const map = new Map<number, UIProductGroup>();

  for (const r of rows) {
    const status = calcStatus({ exp: r.exp, qty_back: r.qty_back, qty_display: r.qty_display }, todayISO);
    const lot: UILot = {
      lot_id: r.lot_id,
      product_id: r.product_id,
      exp: r.exp,
      qty_back: r.qty_back,
      qty_display: r.qty_display,
      status,
    };

    if (!map.has(r.product_id)) {
      map.set(r.product_id, {
        product_id: r.product_id,
        product_name: r.product_name,
        image_url: r.image_url,
        lots: [lot],
      });
    } else {
      map.get(r.product_id)!.lots.push(lot);
    }
  }

  // lotを期限順に整列
  const groups = Array.from(map.values());
  for (const g of groups) {
    g.lots.sort((a, b) => a.exp.localeCompare(b.exp));
  }
  // 商品名順
  groups.sort((a, b) => a.product_name.localeCompare(b.product_name));
  return groups;
}

function splitSections(groups: UIProductGroup[]) {
  // セクションごとに「そのステータスを含むlotだけ」を表示したいので、再構築
  const build = (status: LotStatus): UIProductGroup[] => {
    const out: UIProductGroup[] = [];
    for (const g of groups) {
      const filtered = g.lots.filter((l) => l.status === status);
      if (filtered.length === 0) continue;
      out.push({ ...g, lots: filtered });
    }
    return out;
  };

  return {
    expired: build("EXPIRED"),
    today: build("TODAY"),
    tomorrow: build("TOMORROW"),
    refill: build("REFILL"),
    soon: build("SOON"),
    ok: build("OK"),
  };
}

async function getDailyRows(): Promise<LotRow[]> {
  // 期限切れも含めて「今日+7日まで」を対象にする（dailyは軽くする）
  const sql = `
  SELECT
    pl.id AS lot_id,
    pl.product_id,
    pl.exp::text AS exp,
    pl.qty_back,
    pl.qty_display,
    p.name AS product_name,
    NULL::text AS image_url
  FROM product_lots pl
  JOIN products p ON p.id = pl.product_id
  WHERE pl.exp <= (CURRENT_DATE + INTERVAL '7 days')
  ORDER BY pl.exp ASC, p.name ASC;
`;
  const { rows } = await pool.query(sql);
  // pgがnumberをstringで返すケースに備え、最低限の正規化
  return rows.map((r: any) => ({
    lot_id: Number(r.lot_id),
    product_id: Number(r.product_id),
    exp: String(r.exp),
    qty_back: Number(r.qty_back ?? 0),
    qty_display: Number(r.qty_display ?? 0),
    product_name: String(r.product_name),
    image_url: r.image_url ? String(r.image_url) : null,
  }));
}

function Section({
  title,
  status,
  groups,
}: {
  title: string;
  status: LotStatus;
  groups: UIProductGroup[];
}) {
  if (groups.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(status)}`}>
          {statusLabel(status)}
        </span>
      </div>

      <div className="grid gap-3">
        {groups.map((g) => (
          <div key={g.product_id} className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              {/* 画像は後付けでもOK。image_urlがないならプレースホルダ */}
              <div className="h-12 w-12 overflow-hidden rounded-xl border bg-gray-50 flex items-center justify-center">
                {g.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.image_url} alt={g.product_name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs text-gray-400">No Img</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="font-semibold">{g.product_name}</div>
                <div className="text-xs text-gray-500">商品ID: {g.product_id}</div>
              </div>
            </div>

            <div className="mt-3">
              <DailyLotClient productId={g.product_id} initialLots={g.lots} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function DailyPage() {
  const todayISO = toISODate(new Date());
  const rows = await getDailyRows();

  const grouped = groupByProduct(rows, todayISO);
  const sections = splitSections(grouped);

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Daily（今日の棚卸し）</h1>
        <p className="text-sm text-gray-600">
          対象：期限切れ〜 {addDaysISO(todayISO, 7)}（7日以内）
        </p>
      </header>

      <Section title="期限切れ（最優先）" status="EXPIRED" groups={sections.expired} />
      <Section title="本日" status="TODAY" groups={sections.today} />
      <Section title="明日" status="TOMORROW" groups={sections.tomorrow} />
      <Section title="補充（Display 0 / Backあり）" status="REFILL" groups={sections.refill} />
      <Section title="期限近い（7日以内）" status="SOON" groups={sections.soon} />

      {/* OKは邪魔なら消してOK */}
      <Section title="OK（参考）" status="OK" groups={sections.ok} />
    </main>
  );
}
