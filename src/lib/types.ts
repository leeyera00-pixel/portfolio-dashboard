export type Judgment = 'BUY' | 'HOLD' | 'SELL' | 'WATCH'
export type ScenarioType = 'bull' | 'base' | 'bear'

export interface Stock {
  ticker: string
  name: string
  description?: string
  sector?: string
  data_sources?: string[]
}

export interface JudgmentRecord {
  id: string
  date: string
  ticker: string
  stock_name?: string
  judgment: Judgment
  confidence: number
  reason?: string
  price?: number
  created_at: string
}

export interface MacroIndicator {
  id?: string
  date?: string
  name: string
  label: string
  value: number | string
  change?: number
  unit?: string
  status?: 'positive' | 'neutral' | 'negative'
}

export interface TechnicalData {
  ticker: string
  date: string
  rsi?: number
  macd?: number
  macd_signal?: number
  macd_histogram?: number
  bb_upper?: number
  bb_middle?: number
  bb_lower?: number
  sma_20?: number
  sma_50?: number
  sma_200?: number
  volume?: number
  volume_ratio?: number
  price?: number
}

export interface RelativeStrength {
  ticker: string
  date?: string
  rs_1m?: number
  rs_3m?: number
  rs_6m?: number
  rs_12m?: number
  rs_vs_spy?: number
  rs_vs_qqq?: number
  rs_vs_sector?: number
}

export interface Holding {
  ticker: string
  name?: string
  shares: number
  avg_cost: number
  current_price: number
  market_value: number
  unrealized_pnl: number
  unrealized_pnl_pct: number
  weight: number
  target_weight: number
}

export interface Scenario {
  id?: string
  ticker: string
  scenario: ScenarioType
  target_price: number
  probability: number
  description: string
  timeframe: string
  key_triggers?: string[]
}

export interface RebalancingItem {
  ticker: string
  name?: string
  current_weight: number
  target_weight: number
  diff: number
  action: 'BUY' | 'SELL' | 'HOLD'
  amount?: number
}

export interface DailySnapshot {
  date: string
  judgments: JudgmentRecord[]
  macro: MacroIndicator[]
  rebalancing: RebalancingItem[]
}
