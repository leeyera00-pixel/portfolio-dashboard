import type {
  JudgmentRecord,
  MacroIndicator,
  TechnicalData,
  RelativeStrength,
  Holding,
  Scenario,
  RebalancingItem,
  Stock,
} from './types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? ''

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      next: { revalidate: 300 },
      ...options,
    })
    if (!res.ok) return null
    return res.json() as Promise<T>
  } catch {
    return null
  }
}

export const api = {
  getStocks: () => fetchApi<Stock[]>('/api/stocks'),
  getTodayJudgments: () => fetchApi<JudgmentRecord[]>('/api/judgments/today'),
  getJudgments: (params?: { ticker?: string; startDate?: string; endDate?: string }) => {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : ''
    return fetchApi<JudgmentRecord[]>(`/api/judgments${qs}`)
  },
  getMacroIndicators: () => fetchApi<MacroIndicator[]>('/api/macro'),
  getRebalancing: () => fetchApi<RebalancingItem[]>('/api/rebalancing'),
  getTechnicalData: (ticker: string) => fetchApi<TechnicalData>(`/api/stocks/${ticker}/technical`),
  getRelativeStrength: (ticker: string) => fetchApi<RelativeStrength>(`/api/stocks/${ticker}/rs`),
  getHolding: (ticker: string) => fetchApi<Holding>(`/api/stocks/${ticker}/holding`),
  getScenarios: (ticker: string) => fetchApi<Scenario[]>(`/api/stocks/${ticker}/scenarios`),
  getStockJudgmentHistory: (ticker: string) =>
    fetchApi<JudgmentRecord[]>(`/api/stocks/${ticker}/judgments`),
}
