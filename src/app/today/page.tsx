import { supabase } from '@/lib/supabase'
import { TrendingUp, TrendingDown, Minus, Eye, ShoppingCart, PiggyBank, AlertCircle, RefreshCw } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────

interface ScenarioRow {
  ticker: string
  name: string
  date: string
  current_price: number
  final_judgment: string
  scenario: string
  // RSI (컬럼명 테이블마다 다름)
  rsi?: number
  rsi_daily?: number
  // macro columns (vti_scenarios 기준)
  vix?: number
  fed_rate?: number
  unemployment?: number
  treasury_10y?: number
  treasury_2y?: number
  cape?: number
  cpi_yoy?: number
}

// ── Data fetching ──────────────────────────────────────────────────────────────

const TICKERS: { table: string; ticker: string; name: string }[] = [
  { table: 'vti_scenarios',  ticker: 'VTI',  name: 'Vanguard Total Stock Market' },
  { table: 'qqq_scenarios',  ticker: 'QQQ',  name: 'Invesco QQQ (Nasdaq-100)' },
  { table: 'asml_scenarios', ticker: 'ASML', name: 'ASML Holding N.V.' },
  { table: 'iwm_scenarios',  ticker: 'IWM',  name: 'iShares Russell 2000' },
  { table: 'nvda_scenarios', ticker: 'NVDA', name: 'NVIDIA Corporation' },
]

async function fetchLatestRow(table: string, ticker: string, name: string): Promise<ScenarioRow | null> {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .order('date', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) return null
  return { ...data, ticker, name } as ScenarioRow
}

async function getAllLatestRows(): Promise<ScenarioRow[]> {
  const results = await Promise.all(
    TICKERS.map(({ table, ticker, name }) => fetchLatestRow(table, ticker, name))
  )
  return results.filter((r): r is ScenarioRow => r !== null)
}

// ── UI helpers ─────────────────────────────────────────────────────────────────

const JUDGMENT_CONFIG: Record<
  string,
  { bg: string; border: string; badge: string; icon: React.ReactNode }
> = {
  매수:     { bg: 'bg-emerald-50', border: 'border-emerald-400', badge: 'bg-emerald-100 text-emerald-700', icon: <TrendingUp size={14} /> },
  추가매수: { bg: 'bg-emerald-50', border: 'border-emerald-400', badge: 'bg-emerald-100 text-emerald-700', icon: <ShoppingCart size={14} /> },
  적립매수: { bg: 'bg-teal-50',    border: 'border-teal-400',    badge: 'bg-teal-100 text-teal-700',       icon: <PiggyBank size={14} /> },
  보유:     { bg: 'bg-amber-50',   border: 'border-amber-400',   badge: 'bg-amber-100 text-amber-700',     icon: <Minus size={14} /> },
  관망:     { bg: 'bg-slate-50',   border: 'border-slate-300',   badge: 'bg-slate-100 text-slate-600',     icon: <Eye size={14} /> },
  매도:     { bg: 'bg-red-50',     border: 'border-red-400',     badge: 'bg-red-100 text-red-700',         icon: <TrendingDown size={14} /> },
}

function getJudgmentCfg(judgment: string) {
  return JUDGMENT_CONFIG[judgment] ?? JUDGMENT_CONFIG['관망']
}

/** scenario 텍스트의 핵심 근거 첫 2개 항목만 추출 */
function extractKeyPoints(scenario: string): string[] {
  const lines = scenario.split('\n')
  const points: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
      const text = trimmed.replace(/^[•\-]\s*/, '').trim()
      if (text.length > 5) points.push(text)
      if (points.length >= 2) break
    }
  }
  return points
}

function JudgmentCard({ row }: { row: ScenarioRow }) {
  const cfg = getJudgmentCfg(row.final_judgment)
  const rsi = row.rsi ?? row.rsi_daily
  const points = extractKeyPoints(row.scenario)

  return (
    <div className={`rounded-xl border-l-4 ${cfg.border} ${cfg.bg} p-5 flex flex-col gap-3 shadow-sm min-h-[200px]`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-slate-500 font-medium leading-none">{row.name}</p>
          <p className="text-2xl font-black text-slate-900 mt-1 tracking-tight">{row.ticker}</p>
        </div>
        <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${cfg.badge}`}>
          {cfg.icon}
          {row.final_judgment}
        </span>
      </div>

      {/* Price & RSI */}
      <div className="flex items-center gap-3">
        <span className="text-lg font-semibold text-slate-800">
          ${row.current_price.toLocaleString()}
        </span>
        {rsi !== undefined && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${
            rsi >= 70 ? 'bg-red-100 text-red-600' :
            rsi <= 30 ? 'bg-emerald-100 text-emerald-600' :
            'bg-slate-100 text-slate-500'
          }`}>
            RSI {rsi.toFixed(1)}
          </span>
        )}
      </div>

      {/* Key points */}
      {points.length > 0 && (
        <ul className="space-y-1 mt-auto">
          {points.map((p, i) => (
            <li key={i} className="text-xs text-slate-500 leading-relaxed flex gap-1.5">
              <span className="shrink-0 mt-0.5">·</span>
              <span className="line-clamp-2">{p}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-slate-400">{row.date}</p>
    </div>
  )
}

interface MacroItem {
  label: string
  value: string
  sub?: string
  status?: 'positive' | 'neutral' | 'negative'
}

function buildMacroItems(vti: ScenarioRow): MacroItem[] {
  const items: MacroItem[] = []

  if (vti.vix != null)
    items.push({
      label: 'VIX',
      value: vti.vix.toFixed(2),
      sub: vti.vix >= 30 ? '고변동성' : vti.vix >= 20 ? '보통' : '저변동성',
      status: vti.vix >= 30 ? 'negative' : vti.vix >= 20 ? 'neutral' : 'positive',
    })

  if (vti.fed_rate != null)
    items.push({
      label: '기준금리',
      value: `${vti.fed_rate.toFixed(2)}%`,
      status: 'neutral',
    })

  if (vti.treasury_10y != null)
    items.push({
      label: '10Y 국채금리',
      value: `${vti.treasury_10y.toFixed(2)}%`,
      status: 'neutral',
    })

  if (vti.treasury_2y != null)
    items.push({
      label: '2Y 국채금리',
      value: `${vti.treasury_2y.toFixed(2)}%`,
      status: 'neutral',
    })

  if (vti.unemployment != null)
    items.push({
      label: '실업률',
      value: `${vti.unemployment.toFixed(1)}%`,
      status: vti.unemployment >= 5 ? 'negative' : vti.unemployment >= 4 ? 'neutral' : 'positive',
    })

  if (vti.cpi_yoy != null)
    items.push({
      label: 'CPI (YoY)',
      value: `${vti.cpi_yoy.toFixed(1)}%`,
      status: vti.cpi_yoy >= 4 ? 'negative' : vti.cpi_yoy >= 2.5 ? 'neutral' : 'positive',
    })

  if (vti.cape != null)
    items.push({
      label: 'CAPE',
      value: vti.cape.toFixed(1),
      sub: vti.cape >= 30 ? '과열' : vti.cape >= 25 ? '고평가' : '적정',
      status: vti.cape >= 30 ? 'negative' : vti.cape >= 25 ? 'neutral' : 'positive',
    })

  return items
}

function MacroCard({ item }: { item: MacroItem }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <p className="text-xs text-slate-500 font-medium">{item.label}</p>
      <p className={`text-2xl font-bold mt-2 ${
        item.status === 'positive' ? 'text-emerald-600' :
        item.status === 'negative' ? 'text-red-500' :
        'text-slate-900'
      }`}>
        {item.value}
      </p>
      {item.sub && (
        <p className="text-xs text-slate-400 mt-0.5">{item.sub}</p>
      )}
    </div>
  )
}

// ── Summary badge ──────────────────────────────────────────────────────────────

function SummaryBadges({ rows }: { rows: ScenarioRow[] }) {
  const counts: Record<string, number> = {}
  for (const r of rows) {
    const key = ['매수', '추가매수', '적립매수'].includes(r.final_judgment) ? '매수계열' : r.final_judgment
    counts[key] = (counts[key] ?? 0) + 1
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {Object.entries(counts).map(([k, v]) => (
        <span key={k} className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
          {k} {v}
        </span>
      ))}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function TodayPage() {
  const rows = await getAllLatestRows()
  const vtiRow = rows.find((r) => r.ticker === 'VTI')
  const macroItems = vtiRow ? buildMacroItems(vtiRow) : []

  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">오늘의 현황</h1>
          <p className="text-sm text-slate-500 mt-0.5">{today}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
          <RefreshCw size={12} />
          <span>최신 분석 기준</span>
        </div>
      </div>

      {/* Judgment Cards */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-700">종목별 판단</h2>
          {rows.length > 0 && <SummaryBadges rows={rows} />}
        </div>

        {rows.length === 0 ? (
          <div className="flex items-center gap-2 text-slate-400 bg-slate-100 rounded-xl p-6">
            <AlertCircle size={16} />
            <span className="text-sm">데이터를 불러올 수 없습니다. Supabase 연결을 확인해주세요.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {rows.map((row) => (
              <JudgmentCard key={row.ticker} row={row} />
            ))}
          </div>
        )}
      </section>

      {/* Macro Indicators */}
      <section>
        <h2 className="text-base font-semibold text-slate-700 mb-3">매크로 지표</h2>
        {macroItems.length === 0 ? (
          <div className="flex items-center gap-2 text-slate-400 bg-slate-100 rounded-xl p-6">
            <AlertCircle size={16} />
            <span className="text-sm">VTI 데이터에서 매크로 지표를 가져올 수 없습니다.</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
            {macroItems.map((item) => (
              <MacroCard key={item.label} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* Rebalancing — 종목 판단 기반 빠른 요약 */}
      <section>
        <h2 className="text-base font-semibold text-slate-700 mb-3">리밸런싱 시그널</h2>
        {rows.length === 0 ? (
          <div className="flex items-center gap-2 text-slate-400 bg-slate-100 rounded-xl p-6">
            <AlertCircle size={16} />
            <span className="text-sm">데이터가 없습니다.</span>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left py-3 px-5 font-semibold text-slate-600">종목</th>
                  <th className="text-right py-3 px-5 font-semibold text-slate-600">현재가</th>
                  <th className="text-right py-3 px-5 font-semibold text-slate-600">RSI</th>
                  <th className="text-center py-3 px-5 font-semibold text-slate-600">판단</th>
                  <th className="text-left py-3 px-5 font-semibold text-slate-600">기준일</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const cfg = getJudgmentCfg(row.final_judgment)
                  const rsi = row.rsi ?? row.rsi_daily
                  return (
                    <tr key={row.ticker} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-5">
                        <p className="font-semibold text-slate-800">{row.ticker}</p>
                        <p className="text-xs text-slate-400">{row.name}</p>
                      </td>
                      <td className="py-3 px-5 text-right font-medium text-slate-700">
                        ${row.current_price.toLocaleString()}
                      </td>
                      <td className="py-3 px-5 text-right">
                        {rsi !== undefined ? (
                          <span className={`text-xs font-medium ${
                            rsi >= 70 ? 'text-red-500' :
                            rsi <= 30 ? 'text-emerald-600' :
                            'text-slate-600'
                          }`}>
                            {rsi.toFixed(1)}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-3 px-5 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.badge}`}>
                          {cfg.icon}
                          {row.final_judgment}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-slate-400 text-xs">{row.date}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
