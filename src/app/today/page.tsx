import { supabase } from '@/lib/supabase'
import TodayClient, { type ScenarioRow, type MacroItem } from '@/components/TodayClient'

// ── Config ─────────────────────────────────────────────────────────────────────

const TICKERS: { table: string; ticker: string; name: string }[] = [
  { table: 'vti_scenarios',  ticker: 'VTI',  name: 'Vanguard Total Stock Market' },
  { table: 'qqq_scenarios',  ticker: 'QQQ',  name: 'Invesco QQQ (Nasdaq-100)' },
  { table: 'asml_scenarios', ticker: 'ASML', name: 'ASML Holding N.V.' },
  { table: 'iwm_scenarios',  ticker: 'IWM',  name: 'iShares Russell 2000' },
  { table: 'nvda_scenarios', ticker: 'NVDA', name: 'NVIDIA Corporation' },
]

// ── Data fetching ──────────────────────────────────────────────────────────────

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

function buildMacroItems(vti: ScenarioRow): MacroItem[] {
  const items: MacroItem[] = []

  if (vti.vix != null)
    items.push({
      label: 'VIX', value: vti.vix.toFixed(2),
      sub: vti.vix >= 30 ? '고변동성' : vti.vix >= 20 ? '보통' : '저변동성',
      status: vti.vix >= 30 ? 'negative' : vti.vix >= 20 ? 'neutral' : 'positive',
    })

  if (vti.fed_rate != null)
    items.push({ label: '기준금리', value: `${vti.fed_rate.toFixed(2)}%`, status: 'neutral' })

  if (vti.treasury_10y != null)
    items.push({ label: '10Y 국채금리', value: `${vti.treasury_10y.toFixed(2)}%`, status: 'neutral' })

  if (vti.treasury_2y != null)
    items.push({ label: '2Y 국채금리', value: `${vti.treasury_2y.toFixed(2)}%`, status: 'neutral' })

  if (vti.unemployment != null)
    items.push({
      label: '실업률', value: `${vti.unemployment.toFixed(1)}%`,
      status: vti.unemployment >= 5 ? 'negative' : vti.unemployment >= 4 ? 'neutral' : 'positive',
    })

  if (vti.cpi_yoy != null)
    items.push({
      label: 'CPI (YoY)', value: `${vti.cpi_yoy.toFixed(1)}%`,
      status: vti.cpi_yoy >= 4 ? 'negative' : vti.cpi_yoy >= 2.5 ? 'neutral' : 'positive',
    })

  if (vti.cape != null)
    items.push({
      label: 'CAPE', value: vti.cape.toFixed(1),
      sub: vti.cape >= 30 ? '과열' : vti.cape >= 25 ? '고평가' : '적정',
      status: vti.cape >= 30 ? 'negative' : vti.cape >= 25 ? 'neutral' : 'positive',
    })

  return items
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function TodayPage() {
  const rows = await getAllLatestRows()
  const vtiRow = rows.find((r) => r.ticker === 'VTI')
  const macroItems = vtiRow ? buildMacroItems(vtiRow) : []

  return <TodayClient rows={rows} macroItems={macroItems} />
}
