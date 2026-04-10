'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  TrendingUp, TrendingDown, Minus, Eye, ShoppingCart, PiggyBank,
  AlertCircle, RefreshCw, Pencil, Wallet,
} from 'lucide-react'

// ── Shared types (exported for page.tsx) ──────────────────────────────────────

export interface ScenarioRow {
  ticker: string
  name: string
  date: string
  current_price: number
  final_judgment: string
  scenario: string
  rsi?: number
  rsi_daily?: number
  vix?: number
  fed_rate?: number
  unemployment?: number
  treasury_10y?: number
  treasury_2y?: number
  cape?: number
  cpi_yoy?: number
}

export interface MacroItem {
  label: string
  value: string
  sub?: string
  status?: 'positive' | 'neutral' | 'negative'
}

// ── Holdings types ─────────────────────────────────────────────────────────────

interface HoldingInput {
  shares: string
  avgCost: string
  targetWeight: string
}

interface PortfolioStore {
  totalPortfolioKRW: string   // 한화 총 투자금액
  exchangeRate: string        // KRW/USD 환율
  holdings: Record<string, HoldingInput>
}

const EMPTY_HOLDING: HoldingInput = { shares: '', avgCost: '', targetWeight: '' }
const STORAGE_KEY = 'portfolio-holdings'
const DEFAULT_EXCHANGE_RATE = '1400'

function loadStore(): PortfolioStore {
  if (typeof window === 'undefined')
    return { totalPortfolioKRW: '', exchangeRate: DEFAULT_EXCHANGE_RATE, holdings: {} }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { totalPortfolioKRW: '', exchangeRate: DEFAULT_EXCHANGE_RATE, holdings: {} }
    const parsed = JSON.parse(raw) as Partial<PortfolioStore> & { totalPortfolio?: string }
    return {
      // 이전 버전 데이터(totalPortfolio)를 마이그레이션
      totalPortfolioKRW: parsed.totalPortfolioKRW ?? parsed.totalPortfolio ?? '',
      exchangeRate: parsed.exchangeRate ?? DEFAULT_EXCHANGE_RATE,
      holdings: parsed.holdings ?? {},
    }
  } catch {
    return { totalPortfolioKRW: '', exchangeRate: DEFAULT_EXCHANGE_RATE, holdings: {} }
  }
}

// ── Calculation ────────────────────────────────────────────────────────────────

interface Calc {
  // USD 기준 (주가가 USD이므로)
  marketValueUSD: number
  pnlUSD: number
  pnlPct: number
  // KRW 환산
  marketValueKRW: number
  pnlKRW: number
  // 비중
  currentWeight: number
  targetAmountKRW: number
  rebalanceAmountKRW: number
  rebalanceShares: number
  action: '매수' | '매도' | '유지'
}

function calcHolding(
  currentPriceUSD: number,
  h: HoldingInput,
  totalPortfolioKRW: number,
  exchangeRate: number,
): Calc | null {
  const shares = parseFloat(h.shares)
  const avgCost = parseFloat(h.avgCost)   // USD
  if (!shares || !avgCost || shares <= 0 || avgCost <= 0 || exchangeRate <= 0) return null

  const totalPortfolioUSD = totalPortfolioKRW / exchangeRate

  const marketValueUSD = shares * currentPriceUSD
  const costBasisUSD   = shares * avgCost
  const pnlUSD         = marketValueUSD - costBasisUSD
  const pnlPct         = (pnlUSD / costBasisUSD) * 100

  const marketValueKRW = marketValueUSD * exchangeRate
  const pnlKRW         = pnlUSD * exchangeRate

  const currentWeight  = totalPortfolioUSD > 0 ? (marketValueUSD / totalPortfolioUSD) * 100 : 0

  const tw = parseFloat(h.targetWeight)
  const targetAmountKRW =
    totalPortfolioKRW > 0 && !isNaN(tw) && tw > 0
      ? (totalPortfolioKRW * tw) / 100
      : 0
  const targetAmountUSD    = targetAmountKRW / exchangeRate
  const rebalanceAmountUSD = targetAmountUSD > 0 ? targetAmountUSD - marketValueUSD : 0
  const rebalanceAmountKRW = rebalanceAmountUSD * exchangeRate
  const rebalanceShares    = currentPriceUSD > 0 ? rebalanceAmountUSD / currentPriceUSD : 0
  const action: Calc['action'] =
    rebalanceAmountUSD > 50 ? '매수' : rebalanceAmountUSD < -50 ? '매도' : '유지'

  return {
    marketValueUSD, pnlUSD, pnlPct,
    marketValueKRW, pnlKRW,
    currentWeight,
    targetAmountKRW, rebalanceAmountKRW, rebalanceShares,
    action,
  }
}

// ── Format helpers ─────────────────────────────────────────────────────────────

const fmtKRW = (n: number) =>
  '₩' + Math.round(n).toLocaleString('ko-KR')

const fmtUSD = (n: number, digits = 2) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })

const fmtPct = (n: number, digits = 2) =>
  (n >= 0 ? '+' : '') + n.toFixed(digits) + '%'

// ── Judgment config ────────────────────────────────────────────────────────────

const JCfg: Record<string, { bg: string; border: string; badge: string; icon: React.ReactNode }> = {
  매수:     { bg: 'bg-emerald-50', border: 'border-emerald-400', badge: 'bg-emerald-100 text-emerald-700', icon: <TrendingUp size={13} /> },
  추가매수: { bg: 'bg-emerald-50', border: 'border-emerald-400', badge: 'bg-emerald-100 text-emerald-700', icon: <ShoppingCart size={13} /> },
  적립매수: { bg: 'bg-teal-50',    border: 'border-teal-400',    badge: 'bg-teal-100 text-teal-700',       icon: <PiggyBank size={13} /> },
  보유:     { bg: 'bg-amber-50',   border: 'border-amber-400',   badge: 'bg-amber-100 text-amber-700',     icon: <Minus size={13} /> },
  관망:     { bg: 'bg-slate-50',   border: 'border-slate-300',   badge: 'bg-slate-100 text-slate-600',     icon: <Eye size={13} /> },
  매도:     { bg: 'bg-red-50',     border: 'border-red-400',     badge: 'bg-red-100 text-red-700',         icon: <TrendingDown size={13} /> },
}
const getJCfg = (j: string) => JCfg[j] ?? JCfg['관망']

function extractKeyPoints(scenario: string): string[] {
  const points: string[] = []
  for (const line of scenario.split('\n')) {
    const t = line.trim()
    if (t.startsWith('•') || t.startsWith('-')) {
      const text = t.replace(/^[•\-]\s*/, '').trim()
      if (text.length > 5) { points.push(text); if (points.length >= 2) break }
    }
  }
  return points
}

// ── MacroCard ──────────────────────────────────────────────────────────────────

function MacroCard({ item }: { item: MacroItem }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <p className="text-xs text-slate-500 font-medium">{item.label}</p>
      <p className={`text-2xl font-bold mt-2 ${
        item.status === 'positive' ? 'text-emerald-600' :
        item.status === 'negative' ? 'text-red-500' : 'text-slate-900'}`}>
        {item.value}
      </p>
      {item.sub && <p className="text-xs text-slate-400 mt-0.5">{item.sub}</p>}
    </div>
  )
}

function SummaryBadges({ rows }: { rows: ScenarioRow[] }) {
  const counts: Record<string, number> = {}
  for (const r of rows) {
    const key = ['매수','추가매수','적립매수'].includes(r.final_judgment) ? '매수계열' : r.final_judgment
    counts[key] = (counts[key] ?? 0) + 1
  }
  return (
    <div className="flex gap-2 flex-wrap">
      {Object.entries(counts).map(([k, v]) => (
        <span key={k} className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
          {k} {v}
        </span>
      ))}
    </div>
  )
}

// ── Portfolio Input (KRW + 환율) ───────────────────────────────────────────────

function PortfolioInput({
  totalKRW, exchangeRate, onChangeTotalKRW, onChangeRate,
}: {
  totalKRW: string
  exchangeRate: string
  onChangeTotalKRW: (v: string) => void
  onChangeRate: (v: string) => void
}) {
  const krwNum = parseFloat(totalKRW) || 0
  const rate   = parseFloat(exchangeRate) || 0
  const usd    = rate > 0 && krwNum > 0 ? krwNum / rate : 0

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
      <div className="flex items-center gap-2 mb-3">
        <Wallet size={15} className="text-indigo-500" />
        <span className="text-sm font-semibold text-slate-700">포트폴리오 설정</span>
      </div>
      <div className="flex flex-wrap gap-4 items-end">
        {/* 총 투자금액 */}
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">
            총 투자금액 (현금 포함)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">₩</span>
            <input
              type="number"
              min="0"
              step="1"
              value={totalKRW}
              onChange={(e) => onChangeTotalKRW(e.target.value)}
              placeholder="0"
              className="w-full pl-7 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
            />
          </div>
          {krwNum > 0 && (
            <p className="text-xs text-slate-500 mt-1">
              {fmtKRW(krwNum)}
              {usd > 0 && <span className="text-slate-400 ml-1">≈ {fmtUSD(usd, 0)}</span>}
            </p>
          )}
        </div>

        {/* 환율 */}
        <div className="w-[140px]">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">
            환율 (KRW/USD)
          </label>
          <div className="relative">
            <input
              type="number"
              min="1"
              step="1"
              value={exchangeRate}
              onChange={(e) => onChangeRate(e.target.value)}
              className="w-full pl-3 pr-16 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
              KRW/USD
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Judgment Card ──────────────────────────────────────────────────────────────

function JudgmentCard({
  row, holding, totalPortfolioKRW, exchangeRate, onClick,
}: {
  row: ScenarioRow
  holding: HoldingInput | undefined
  totalPortfolioKRW: number
  exchangeRate: number
  onClick: () => void
}) {
  const cfg = getJCfg(row.final_judgment)
  const rsi = row.rsi ?? row.rsi_daily
  const points = extractKeyPoints(row.scenario)
  const result = holding ? calcHolding(row.current_price, holding, totalPortfolioKRW, exchangeRate) : null
  const hasHolding = holding && parseFloat(holding.shares) > 0

  return (
    <button
      onClick={onClick}
      className={`group relative w-full text-left rounded-xl border-l-4 ${cfg.border} ${cfg.bg} p-5 flex flex-col gap-3 shadow-sm min-h-[200px] cursor-pointer hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-indigo-300`}
    >
      <span className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400">
        <Pencil size={13} />
      </span>

      {/* Header */}
      <div className="flex items-start justify-between gap-2 pr-4">
        <div>
          <p className="text-xs text-slate-500 font-medium leading-none">{row.name}</p>
          <p className="text-2xl font-black text-slate-900 mt-1 tracking-tight">{row.ticker}</p>
        </div>
        <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${cfg.badge}`}>
          {cfg.icon}{row.final_judgment}
        </span>
      </div>

      {/* Price & RSI */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-lg font-semibold text-slate-800">
          {fmtUSD(row.current_price)}
        </span>
        {rsi != null && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${
            rsi >= 70 ? 'bg-red-100 text-red-600' :
            rsi <= 30 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
            RSI {rsi.toFixed(1)}
          </span>
        )}
      </div>

      {/* Holdings summary */}
      {hasHolding && result ? (
        <div className="mt-auto rounded-lg bg-white/60 border border-slate-200 px-3 py-2 space-y-0.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">{parseFloat(holding!.shares).toLocaleString('ko-KR', { maximumFractionDigits: 3 })}주 보유</span>
            <span className="font-semibold text-slate-800">{fmtKRW(result.marketValueKRW)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">평가손익</span>
            <span className={`font-semibold ${result.pnlKRW >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {result.pnlKRW >= 0 ? '+' : ''}{fmtKRW(result.pnlKRW)}&nbsp;
              <span className="font-normal">({fmtPct(result.pnlPct)})</span>
            </span>
          </div>
          {holding!.targetWeight && totalPortfolioKRW > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">현재/목표 비중</span>
              <span className={`font-semibold ${
                result.action === '매수' ? 'text-emerald-600' :
                result.action === '매도' ? 'text-red-500' : 'text-slate-600'}`}>
                {result.currentWeight.toFixed(1)}% / {holding!.targetWeight}%
              </span>
            </div>
          )}
        </div>
      ) : (
        <>
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
          <p className="text-xs text-slate-400 mt-auto">{row.date}</p>
        </>
      )}
    </button>
  )
}

// ── Holding Modal ──────────────────────────────────────────────────────────────

function HoldingModal({
  row, draft, totalPortfolioKRW, exchangeRate, setDraft, onSave, onClose,
}: {
  row: ScenarioRow
  draft: HoldingInput
  totalPortfolioKRW: number
  exchangeRate: number
  setDraft: (v: HoldingInput) => void
  onSave: () => void
  onClose: () => void
}) {
  const result = calcHolding(row.current_price, draft, totalPortfolioKRW, exchangeRate)
  const cfg = getJCfg(row.final_judgment)

  const field = (
    label: string,
    key: keyof HoldingInput,
    prefix?: string,
    suffix?: string,
    step = 'any',
  ) => (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{prefix}</span>
        )}
        <input
          type="number"
          min="0"
          step={step}
          value={draft[key]}
          onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
          className={`w-full py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 ${prefix ? 'pl-7' : 'pl-3'} ${suffix ? 'pr-8' : 'pr-3'}`}
          placeholder="0"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{suffix}</span>
        )}
      </div>
    </div>
  )

  const calcRow = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-800">{value}</span>
    </div>
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-5 border-b border-slate-100 ${cfg.bg}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900">{row.ticker}</h2>
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${cfg.badge}`}>
                  {cfg.icon}{row.final_judgment}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{row.name}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-slate-900">{fmtUSD(row.current_price)}</p>
              {exchangeRate > 0 && (
                <p className="text-xs text-slate-400">
                  ≈ {fmtKRW(row.current_price * exchangeRate)}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Inputs */}
          <div className="grid grid-cols-3 gap-3">
            {field('보유 주수', 'shares', undefined, '주', '0.001')}
            {field('평균 매입가', 'avgCost', '$')}
            {field('목표 비중', 'targetWeight', undefined, '%')}
          </div>

          {/* Calculated results */}
          {result ? (
            <div className="bg-slate-50 rounded-xl px-4 py-1">
              {calcRow('총 평가금액',
                <span>
                  {fmtKRW(result.marketValueKRW)}
                  <span className="text-xs font-normal text-slate-400 ml-1">({fmtUSD(result.marketValueUSD, 0)})</span>
                </span>
              )}
              {calcRow('평가손익',
                <span className={result.pnlKRW >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                  {result.pnlKRW >= 0 ? '+' : ''}{fmtKRW(result.pnlKRW)}&nbsp;
                  <span className="text-xs font-normal">({fmtPct(result.pnlPct)})</span>
                </span>
              )}
              {totalPortfolioKRW > 0 && (
                <>
                  {calcRow('현재 비중',
                    <span>{result.currentWeight.toFixed(1)}%</span>
                  )}
                  {draft.targetWeight && (
                    <>
                      {calcRow('목표 금액',
                        <span>{fmtKRW(result.targetAmountKRW)}</span>
                      )}
                      {calcRow(
                        result.action === '매수' ? '매수 필요 금액' :
                        result.action === '매도' ? '매도 필요 금액' : '리밸런싱',
                        result.action === '유지' ? (
                          <span className="text-slate-400">균형</span>
                        ) : (
                          <span className={result.action === '매수' ? 'text-emerald-600' : 'text-red-500'}>
                            {result.action === '매수' ? '+' : ''}
                            {fmtKRW(Math.abs(result.rebalanceAmountKRW))}&nbsp;
                            <span className="text-xs font-normal">
                              ({result.rebalanceShares >= 0 ? '+' : ''}
                              {result.rebalanceShares.toFixed(3)}주)
                            </span>
                          </span>
                        )
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-2">
              보유 주수와 평균 매입가를 입력하면 자동 계산됩니다.
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              취소
            </button>
            <button onClick={onSave}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors">
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Rebalancing Table ──────────────────────────────────────────────────────────

function RebalancingTable({
  rows, holdings, totalPortfolioKRW, exchangeRate, onOpenModal,
}: {
  rows: ScenarioRow[]
  holdings: Record<string, HoldingInput>
  totalPortfolioKRW: number
  exchangeRate: number
  onOpenModal: (ticker: string) => void
}) {
  const hasAny = rows.some((r) => {
    const h = holdings[r.ticker]
    return h && parseFloat(h.shares) > 0
  })

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left py-3 px-5 font-semibold text-slate-600">종목</th>
            <th className="text-right py-3 px-5 font-semibold text-slate-600">현재가</th>
            <th className="text-right py-3 px-5 font-semibold text-slate-600">RSI</th>
            <th className="text-center py-3 px-5 font-semibold text-slate-600">판단</th>
            {hasAny && (
              <>
                <th className="text-right py-3 px-5 font-semibold text-slate-600">평가금액 (₩)</th>
                <th className="text-right py-3 px-5 font-semibold text-slate-600">손익</th>
                <th className="text-right py-3 px-5 font-semibold text-slate-600">현재/목표</th>
                <th className="text-right py-3 px-5 font-semibold text-slate-600">필요금액 (₩)</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const cfg = getJCfg(row.final_judgment)
            const rsi = row.rsi ?? row.rsi_daily
            const h = holdings[row.ticker]
            const result = h ? calcHolding(row.current_price, h, totalPortfolioKRW, exchangeRate) : null
            return (
              <tr
                key={row.ticker}
                className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => onOpenModal(row.ticker)}
              >
                <td className="py-3 px-5">
                  <p className="font-semibold text-slate-800">{row.ticker}</p>
                  <p className="text-xs text-slate-400">{row.name}</p>
                </td>
                <td className="py-3 px-5 text-right font-medium text-slate-700">
                  {fmtUSD(row.current_price)}
                </td>
                <td className="py-3 px-5 text-right">
                  {rsi != null ? (
                    <span className={`text-xs font-medium ${
                      rsi >= 70 ? 'text-red-500' : rsi <= 30 ? 'text-emerald-600' : 'text-slate-600'}`}>
                      {rsi.toFixed(1)}
                    </span>
                  ) : '-'}
                </td>
                <td className="py-3 px-5 text-center">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.badge}`}>
                    {cfg.icon}{row.final_judgment}
                  </span>
                </td>
                {hasAny && (
                  <>
                    <td className="py-3 px-5 text-right text-slate-700">
                      {result ? fmtKRW(result.marketValueKRW) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-3 px-5 text-right">
                      {result ? (
                        <span className={result.pnlKRW >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                          {result.pnlKRW >= 0 ? '+' : ''}{fmtKRW(result.pnlKRW)}<br />
                          <span className="text-xs">({fmtPct(result.pnlPct)})</span>
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-3 px-5 text-right">
                      {result && h?.targetWeight ? (
                        <span className="text-slate-700">
                          {result.currentWeight.toFixed(1)}%<br />
                          <span className="text-xs text-slate-400">/ {h.targetWeight}%</span>
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-3 px-5 text-right">
                      {result && h?.targetWeight && result.action !== '유지' ? (
                        <span className={result.action === '매수' ? 'text-emerald-600' : 'text-red-500'}>
                          {result.action} {fmtKRW(Math.abs(result.rebalanceAmountKRW))}<br />
                          <span className="text-xs">
                            ({Math.abs(result.rebalanceShares).toFixed(3)}주)
                          </span>
                        </span>
                      ) : result ? (
                        <span className="text-slate-400 text-xs">균형</span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                  </>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Main Client Component ──────────────────────────────────────────────────────

interface Props {
  rows: ScenarioRow[]
  macroItems: MacroItem[]
}

export default function TodayClient({ rows, macroItems }: Props) {
  const [store, setStore] = useState<PortfolioStore>({
    totalPortfolioKRW: '', exchangeRate: DEFAULT_EXCHANGE_RATE, holdings: {},
  })
  const [modalTicker, setModalTicker] = useState<string | null>(null)
  const [draft, setDraft] = useState<HoldingInput>(EMPTY_HOLDING)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setStore(loadStore())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  }, [store, hydrated])

  const totalPortfolioKRW = parseFloat(store.totalPortfolioKRW) || 0
  const exchangeRate      = parseFloat(store.exchangeRate) || parseFloat(DEFAULT_EXCHANGE_RATE)

  const openModal = useCallback((ticker: string) => {
    setDraft(store.holdings[ticker] ?? EMPTY_HOLDING)
    setModalTicker(ticker)
  }, [store.holdings])

  const saveModal = useCallback(() => {
    if (!modalTicker) return
    setStore((prev) => ({
      ...prev,
      holdings: { ...prev.holdings, [modalTicker]: draft },
    }))
    setModalTicker(null)
  }, [modalTicker, draft])

  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  })

  const modalRow = rows.find((r) => r.ticker === modalTicker)

  return (
    <>
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

        {/* Portfolio input */}
        <PortfolioInput
          totalKRW={store.totalPortfolioKRW}
          exchangeRate={store.exchangeRate}
          onChangeTotalKRW={(v) => setStore((p) => ({ ...p, totalPortfolioKRW: v }))}
          onChangeRate={(v) => setStore((p) => ({ ...p, exchangeRate: v }))}
        />

        {/* Judgment cards */}
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
                <JudgmentCard
                  key={row.ticker}
                  row={row}
                  holding={store.holdings[row.ticker]}
                  totalPortfolioKRW={totalPortfolioKRW}
                  exchangeRate={exchangeRate}
                  onClick={() => openModal(row.ticker)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Macro indicators */}
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

        {/* Rebalancing */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-700">리밸런싱 현황</h2>
            <span className="text-xs text-slate-400">카드 또는 행을 클릭해 보유 수량 입력</span>
          </div>
          {rows.length === 0 ? (
            <div className="flex items-center gap-2 text-slate-400 bg-slate-100 rounded-xl p-6">
              <AlertCircle size={16} />
              <span className="text-sm">데이터가 없습니다.</span>
            </div>
          ) : (
            <RebalancingTable
              rows={rows}
              holdings={store.holdings}
              totalPortfolioKRW={totalPortfolioKRW}
              exchangeRate={exchangeRate}
              onOpenModal={openModal}
            />
          )}
        </section>
      </div>

      {/* Modal */}
      {modalTicker && modalRow && (
        <HoldingModal
          row={modalRow}
          draft={draft}
          totalPortfolioKRW={totalPortfolioKRW}
          exchangeRate={exchangeRate}
          setDraft={setDraft}
          onSave={saveModal}
          onClose={() => setModalTicker(null)}
        />
      )}
    </>
  )
}
