import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { TrendingUp, TrendingDown, Minus, Eye, ShoppingCart, PiggyBank, CheckCircle, XCircle, AlertCircle, Calendar } from 'lucide-react'

// ── Config ─────────────────────────────────────────────────────────────────────

const TICKER_CONFIG: Record<string, { table: string; name: string }> = {
  VTI:  { table: 'vti_scenarios',  name: 'Vanguard Total Stock Market ETF' },
  QQQ:  { table: 'qqq_scenarios',  name: 'Invesco QQQ (Nasdaq-100)' },
  ASML: { table: 'asml_scenarios', name: 'ASML Holding N.V.' },
  IWM:  { table: 'iwm_scenarios',  name: 'iShares Russell 2000 ETF' },
  NVDA: { table: 'nvda_scenarios', name: 'NVIDIA Corporation' },
}

// ── Types ──────────────────────────────────────────────────────────────────────

// 전체 컬럼 union (테이블마다 다른 컬럼명 통합)
interface RawRow {
  id: number
  date: string
  current_price: number
  final_judgment: string
  scenario: string
  created_at: string
  // VTI
  rsi?: number
  pct_change?: number
  ma50?: number
  ma200?: number
  above_ma50?: boolean
  above_ma200?: boolean
  vol_today?: number
  vol_avg20?: number
  high_52w?: number
  low_52w?: number
  treasury_10y?: number
  treasury_2y?: number
  cape?: number
  unemployment?: number
  // Others (daily/weekly RSI, MACD)
  rsi_daily?: number
  rsi_weekly?: number
  macd_daily?: string
  macd_weekly?: string
  above_ma50w?: boolean
  above_ma20m?: boolean
  pct_from_high?: number
  pct_from_ath?: number
  // Return vs peers
  qqq_3mo_return?: number
  asml_3mo_return?: number
  iwm_3mo_return?: number
  nvda_3mo_return?: number
  vs_spy?: number
  vs_soxx?: number
  vs_qqq?: number
  vs_mdy?: number
  vs_tsm?: number
  vs_amd?: number
  vs_avgo?: number
  // Valuation
  qqq_pe?: number
  qqq_fpe?: number
  pe_premium?: number
  trailing_pe?: number
  forward_pe?: number
  ev_ebitda?: number
  ps_ratio?: number
  top10_total_weight?: number
  // Fundamentals
  gross_margin?: number
  operating_margin?: number
  fcf_b?: number
  fcf_yield?: number
  rule_of_40?: number
  // IWM
  iwm_pe?: number
  iwm_pb?: number
  pe_ratio?: number
  // Macro
  fed_rate?: number
  cpi_yoy?: number
  vix?: number
  // Earnings
  next_earnings_date?: string
}

// ── Data fetching ──────────────────────────────────────────────────────────────

async function fetchLatest(ticker: string): Promise<RawRow | null> {
  const cfg = TICKER_CONFIG[ticker]
  if (!cfg) return null

  const { data, error } = await supabase
    .from(cfg.table)
    .select('*')
    .order('date', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) return null
  return data as RawRow
}

// ── Scenario text parser ───────────────────────────────────────────────────────

interface ScenarioSection {
  heading: string
  lines: string[]
}

function parseScenario(text: string): ScenarioSection[] {
  const sections: ScenarioSection[] = []
  let current: ScenarioSection | null = null

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue

    // 섹션 헤더: **[...]** 또는 ## 로 시작
    const isHeader =
      (line.startsWith('**[') && line.includes(']')) ||
      line.startsWith('## ') ||
      line.startsWith('**[최종 판단]') ||
      line.startsWith('**[핵심 근거]')

    if (isHeader) {
      if (current) sections.push(current)
      const heading = line.replace(/\*\*/g, '').replace(/^##\s*/, '').trim()
      current = { heading, lines: [] }
    } else if (current) {
      const cleaned = line.replace(/\*\*/g, '').replace(/^[-•]\s*/, '').trim()
      if (cleaned) current.lines.push(cleaned)
    }
  }
  if (current) sections.push(current)
  return sections.filter((s) => s.lines.length > 0 || s.heading)
}

// ── UI components ──────────────────────────────────────────────────────────────

const JUDGMENT_CONFIG: Record<string, { badge: string; icon: React.ReactNode }> = {
  매수:     { badge: 'bg-emerald-100 text-emerald-700', icon: <TrendingUp size={13} /> },
  추가매수: { badge: 'bg-emerald-100 text-emerald-700', icon: <ShoppingCart size={13} /> },
  적립매수: { badge: 'bg-teal-100 text-teal-700',       icon: <PiggyBank size={13} /> },
  보유:     { badge: 'bg-amber-100 text-amber-700',     icon: <Minus size={13} /> },
  관망:     { badge: 'bg-slate-100 text-slate-600',     icon: <Eye size={13} /> },
  매도:     { badge: 'bg-red-100 text-red-700',         icon: <TrendingDown size={13} /> },
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="font-semibold text-slate-800">{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

function Row({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: 'pos' | 'neg' | 'neutral' }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0 gap-4">
      <span className="text-sm text-slate-500 shrink-0">{label}</span>
      <span className={`text-sm font-semibold text-right ${
        highlight === 'pos' ? 'text-emerald-600' :
        highlight === 'neg' ? 'text-red-500' :
        'text-slate-800'
      }`}>
        {value}
      </span>
    </div>
  )
}

function BoolBadge({ value, label }: { value: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
      value ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
    }`}>
      {value ? <CheckCircle size={12} /> : <XCircle size={12} />}
      {label}
    </span>
  )
}

function RsiBar({ value, label }: { value: number; label?: string }) {
  const color = value >= 70 ? 'bg-red-400' : value <= 30 ? 'bg-emerald-400' : 'bg-amber-400'
  const status = value >= 70 ? '과매수' : value <= 30 ? '과매도' : '중립'
  return (
    <div className="space-y-1.5 py-2">
      <div className="flex justify-between text-xs text-slate-500">
        <span>{label ?? 'RSI'}</span>
        <span className="font-bold text-slate-700">{value.toFixed(1)} <span className="font-normal text-slate-400">({status})</span></span>
      </div>
      <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="absolute inset-0 flex">
          <div className="w-[30%] bg-emerald-50" />
          <div className="w-[40%] bg-slate-50" />
          <div className="w-[30%] bg-red-50" />
        </div>
        <div
          className={`absolute top-0 h-full w-2 ${color} rounded-full -translate-x-1/2 shadow`}
          style={{ left: `${Math.min(99, Math.max(1, value))}%` }}
        />
      </div>
    </div>
  )
}

// ── Section builders ───────────────────────────────────────────────────────────

function TechnicalSection({ row }: { row: RawRow }) {
  const rsiPrimary = row.rsi ?? row.rsi_daily
  const hasVol = row.vol_today != null && row.vol_avg20 != null
  const volRatio = hasVol ? (row.vol_today! / row.vol_avg20!) : null

  return (
    <div className="space-y-1">
      {/* RSI bars */}
      {rsiPrimary != null && (
        <RsiBar value={rsiPrimary} label={row.rsi != null ? 'RSI' : 'RSI (일봉)'} />
      )}
      {row.rsi_weekly != null && (
        <RsiBar value={row.rsi_weekly} label="RSI (주봉)" />
      )}

      <div className="pt-1 space-y-0">
        {/* MACD */}
        {row.macd_daily != null && (
          <Row
            label="MACD (일봉)"
            value={row.macd_daily}
            highlight={row.macd_daily.includes('골든') ? 'pos' : 'neg'}
          />
        )}
        {row.macd_weekly != null && (
          <Row
            label="MACD (주봉)"
            value={row.macd_weekly}
            highlight={row.macd_weekly.includes('골든') ? 'pos' : 'neg'}
          />
        )}

        {/* MA (숫자형 - VTI) */}
        {row.ma50 != null && (
          <Row label="MA 50" value={`$${row.ma50.toLocaleString()}`} />
        )}
        {row.ma200 != null && (
          <Row label="MA 200" value={`$${row.ma200.toLocaleString()}`} />
        )}

        {/* Volume */}
        {volRatio != null && (
          <Row
            label="거래량 비율"
            value={`${volRatio.toFixed(2)}x (20일 평균 대비)`}
            highlight={volRatio >= 1.5 ? 'pos' : volRatio <= 0.7 ? 'neg' : 'neutral'}
          />
        )}

        {/* 52w range */}
        {row.high_52w != null && row.low_52w != null && (
          <Row
            label="52주 범위"
            value={`$${row.low_52w.toLocaleString()} – $${row.high_52w.toLocaleString()}`}
          />
        )}

        {/* ATH/High distance */}
        {row.pct_from_high != null && (
          <Row
            label="고점 대비"
            value={`${row.pct_from_high >= 0 ? '+' : ''}${row.pct_from_high.toFixed(1)}%`}
            highlight={row.pct_from_high >= 0 ? 'pos' : 'neg'}
          />
        )}
        {row.pct_from_ath != null && (
          <Row
            label="ATH 대비"
            value={`${row.pct_from_ath >= 0 ? '+' : ''}${row.pct_from_ath.toFixed(1)}%`}
            highlight={row.pct_from_ath >= 0 ? 'pos' : 'neg'}
          />
        )}
      </div>

      {/* MA 위/아래 badges */}
      <div className="flex flex-wrap gap-2 pt-3">
        {row.above_ma200 != null && <BoolBadge value={row.above_ma200} label="200MA 위" />}
        {row.above_ma50 != null  && <BoolBadge value={row.above_ma50}  label="50MA 위" />}
        {row.above_ma50w != null && <BoolBadge value={row.above_ma50w} label="50주MA 위" />}
        {row.above_ma20m != null && <BoolBadge value={row.above_ma20m} label="20월MA 위" />}
      </div>
    </div>
  )
}

function RelativeSection({ row, ticker }: { row: RawRow; ticker: string }) {
  // 3개월 수익률 (티커마다 컬럼명 다름)
  const ret3m =
    row.qqq_3mo_return ?? row.asml_3mo_return ?? row.iwm_3mo_return ?? row.nvda_3mo_return ?? row.pct_change

  return (
    <div className="space-y-0">
      {ret3m != null && (
        <Row
          label="3개월 수익률"
          value={`${ret3m >= 0 ? '+' : ''}${ret3m.toFixed(2)}%`}
          highlight={ret3m >= 0 ? 'pos' : 'neg'}
        />
      )}
      {row.vs_spy != null && (
        <Row
          label="vs SPY"
          value={`${row.vs_spy >= 0 ? '+' : ''}${row.vs_spy.toFixed(2)}%`}
          highlight={row.vs_spy >= 0 ? 'pos' : 'neg'}
        />
      )}
      {row.vs_soxx != null && (
        <Row
          label="vs SOXX"
          value={`${row.vs_soxx >= 0 ? '+' : ''}${row.vs_soxx.toFixed(2)}%`}
          highlight={row.vs_soxx >= 0 ? 'pos' : 'neg'}
        />
      )}
      {row.vs_qqq != null && (
        <Row
          label="vs QQQ"
          value={`${row.vs_qqq >= 0 ? '+' : ''}${row.vs_qqq.toFixed(2)}%`}
          highlight={row.vs_qqq >= 0 ? 'pos' : 'neg'}
        />
      )}
      {row.vs_mdy != null && (
        <Row
          label="vs MDY (중형주)"
          value={`${row.vs_mdy >= 0 ? '+' : ''}${row.vs_mdy.toFixed(2)}%`}
          highlight={row.vs_mdy >= 0 ? 'pos' : 'neg'}
        />
      )}
      {row.vs_tsm != null && (
        <Row
          label="vs TSM"
          value={`${row.vs_tsm >= 0 ? '+' : ''}${row.vs_tsm.toFixed(2)}%`}
          highlight={row.vs_tsm >= 0 ? 'pos' : 'neg'}
        />
      )}
      {row.vs_amd != null && (
        <Row
          label="vs AMD"
          value={`${row.vs_amd >= 0 ? '+' : ''}${row.vs_amd.toFixed(2)}%`}
          highlight={row.vs_amd >= 0 ? 'pos' : 'neg'}
        />
      )}
      {row.vs_avgo != null && (
        <Row
          label="vs AVGO"
          value={`${row.vs_avgo >= 0 ? '+' : ''}${row.vs_avgo.toFixed(2)}%`}
          highlight={row.vs_avgo >= 0 ? 'pos' : 'neg'}
        />
      )}

      {/* 밸류에이션 */}
      {(row.trailing_pe != null || row.qqq_pe != null || row.iwm_pe != null) && (
        <div className="pt-1 border-t border-slate-100 mt-1">
          {(row.qqq_pe ?? row.trailing_pe ?? row.iwm_pe) != null && (
            <Row
              label={ticker === 'QQQ' ? 'P/E (QQQ)' : 'P/E (Trailing)'}
              value={`${(row.trailing_pe ?? row.qqq_pe ?? row.iwm_pe)!.toFixed(1)}x`}
            />
          )}
          {row.forward_pe != null && (
            <Row label="Forward P/E" value={`${row.forward_pe.toFixed(1)}x`} />
          )}
          {row.ev_ebitda != null && (
            <Row label="EV/EBITDA" value={`${row.ev_ebitda.toFixed(1)}x`} />
          )}
          {row.ps_ratio != null && (
            <Row label="P/S" value={`${row.ps_ratio.toFixed(1)}x`} />
          )}
          {row.iwm_pb != null && (
            <Row label="P/B" value={`${row.iwm_pb.toFixed(2)}x`} />
          )}
          {row.pe_ratio != null && (
            <Row label="대형주 대비 P/E" value={`${row.pe_ratio.toFixed(2)}x`} />
          )}
          {row.pe_premium != null && (
            <Row label="S&P 500 대비 P/E 프리미엄" value={`+${row.pe_premium.toFixed(1)}%`} />
          )}
        </div>
      )}

      {/* 펀더멘털 */}
      {(row.gross_margin != null || row.operating_margin != null || row.fcf_b != null) && (
        <div className="pt-1 border-t border-slate-100 mt-1">
          {row.gross_margin != null && (
            <Row label="매출총이익률" value={`${row.gross_margin.toFixed(1)}%`} highlight="pos" />
          )}
          {row.operating_margin != null && (
            <Row label="영업이익률" value={`${row.operating_margin.toFixed(1)}%`} highlight="pos" />
          )}
          {row.fcf_b != null && (
            <Row label="FCF" value={`$${row.fcf_b.toFixed(2)}B`} />
          )}
          {row.fcf_yield != null && (
            <Row label="FCF Yield" value={`${row.fcf_yield.toFixed(2)}%`} />
          )}
          {row.rule_of_40 != null && (
            <Row
              label="Rule of 40"
              value={`${row.rule_of_40.toFixed(1)}`}
              highlight={row.rule_of_40 >= 40 ? 'pos' : 'neg'}
            />
          )}
        </div>
      )}

      {/* ETF 집중도 */}
      {row.top10_total_weight != null && (
        <Row label="상위 10종목 비중" value={`${row.top10_total_weight.toFixed(2)}%`} />
      )}
    </div>
  )
}

function ScenarioSection({ text }: { text: string }) {
  const sections = parseScenario(text)

  // 헤더 스타일 매핑
  const headingStyle = (heading: string) => {
    if (heading.includes('추가매수') || heading.includes('매수')) return 'text-emerald-700 bg-emerald-50 border-emerald-200'
    if (heading.includes('매도')) return 'text-red-700 bg-red-50 border-red-200'
    if (heading.includes('보유') || heading.includes('관망')) return 'text-amber-700 bg-amber-50 border-amber-200'
    if (heading.includes('최종 판단') || heading.includes('핵심 근거')) return 'text-indigo-700 bg-indigo-50 border-indigo-200'
    return 'text-slate-700 bg-slate-50 border-slate-200'
  }

  return (
    <div className="space-y-4">
      {sections.map((section, i) => (
        <div key={i}>
          <div className={`inline-block px-3 py-1 rounded-lg border text-xs font-bold mb-2 ${headingStyle(section.heading)}`}>
            {section.heading}
          </div>
          <ul className="space-y-1.5">
            {section.lines.map((line, j) => (
              <li key={j} className="flex gap-2 text-sm text-slate-600 leading-relaxed">
                <span className="text-slate-300 shrink-0 mt-0.5">·</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ ticker: string }>
}

export default async function StockDetailPage({ params }: Props) {
  const { ticker } = await params
  const upper = ticker.toUpperCase()

  if (!TICKER_CONFIG[upper]) notFound()

  const [row] = await Promise.all([fetchLatest(upper)])

  const cfg = TICKER_CONFIG[upper]
  const judgmentCfg = JUDGMENT_CONFIG[row?.final_judgment ?? ''] ?? JUDGMENT_CONFIG['관망']

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{upper}</h1>
            {row && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${judgmentCfg.badge}`}>
                {judgmentCfg.icon}
                {row.final_judgment}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">{cfg.name}</p>
        </div>
        {row && (
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold text-slate-900">
              ${row.current_price.toLocaleString()}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">기준일: {row.date}</p>
            {row.next_earnings_date && (
              <p className="flex items-center justify-end gap-1 text-xs text-indigo-500 mt-1">
                <Calendar size={11} />
                실적 발표 {row.next_earnings_date}
              </p>
            )}
          </div>
        )}
      </div>

      {!row ? (
        <div className="flex items-center gap-2 text-slate-400 bg-slate-100 rounded-xl p-8">
          <AlertCircle size={18} />
          <span className="text-sm">
            {upper} 데이터를 불러올 수 없습니다. Supabase 연결 및 테이블을 확인해주세요.
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 기술지표 */}
          <SectionCard title="기술지표">
            <TechnicalSection row={row} />
          </SectionCard>

          {/* 상대강도 & 밸류에이션 */}
          <SectionCard title="상대강도 · 밸류에이션">
            <RelativeSection row={row} ticker={upper} />
          </SectionCard>

          {/* 시나리오 — 전체 너비 */}
          <div className="lg:col-span-2">
            <SectionCard title="시나리오 분석">
              {row.scenario ? (
                <ScenarioSection text={row.scenario} />
              ) : (
                <p className="text-sm text-slate-400">시나리오 데이터가 없습니다.</p>
              )}
            </SectionCard>
          </div>
        </div>
      )}
    </div>
  )
}
