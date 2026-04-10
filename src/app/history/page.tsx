'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import {
  TrendingUp, TrendingDown, Minus, Eye, ShoppingCart, PiggyBank,
  Filter, AlertCircle, RefreshCw,
} from 'lucide-react'

// ── Config ─────────────────────────────────────────────────────────────────────

const TICKER_CONFIG = [
  { ticker: 'VTI',  table: 'vti_scenarios',  name: 'Vanguard Total Market' },
  { ticker: 'QQQ',  table: 'qqq_scenarios',  name: 'Invesco Nasdaq-100' },
  { ticker: 'ASML', table: 'asml_scenarios', name: 'ASML Holding' },
  { ticker: 'IWM',  table: 'iwm_scenarios',  name: 'iShares Russell 2000' },
  { ticker: 'NVDA', table: 'nvda_scenarios', name: 'NVIDIA Corporation' },
]

const JUDGMENT_OPTIONS = [
  '전체', '매수', '추가매수', '적립매수', '보유', '관망', '매도',
]

// ── Types ──────────────────────────────────────────────────────────────────────

interface HistoryRow {
  id: number
  ticker: string
  name: string
  date: string
  final_judgment: string
  current_price: number
  scenario: string
}

// ── Badge config ───────────────────────────────────────────────────────────────

const BADGE: Record<string, { cls: string; icon: React.ReactNode }> = {
  매수:     { cls: 'bg-emerald-100 text-emerald-700', icon: <TrendingUp size={11} /> },
  추가매수: { cls: 'bg-emerald-100 text-emerald-700', icon: <ShoppingCart size={11} /> },
  적립매수: { cls: 'bg-teal-100 text-teal-700',       icon: <PiggyBank size={11} /> },
  보유:     { cls: 'bg-amber-100 text-amber-700',     icon: <Minus size={11} /> },
  관망:     { cls: 'bg-slate-100 text-slate-600',     icon: <Eye size={11} /> },
  매도:     { cls: 'bg-red-100 text-red-700',         icon: <TrendingDown size={11} /> },
}

function getBadge(j: string) {
  return BADGE[j] ?? BADGE['관망']
}

// ── Scenario summary extractor ─────────────────────────────────────────────────

function extractSummary(scenario: string): string {
  // 핵심 근거 섹션 이후 첫 번째 항목 추출
  const lines = scenario.split('\n')
  for (const line of lines) {
    const t = line.trim()
    if ((t.startsWith('•') || t.startsWith('-')) && !t.startsWith('--')) {
      const text = t.replace(/^[•\-]\s*/, '').trim()
      if (text.length > 10) return text
    }
  }
  // fallback: 첫 비어있지 않은 일반 텍스트
  for (const line of lines) {
    const t = line.replace(/\*\*/g, '').replace(/^#+\s*/, '').trim()
    if (t.length > 15 && !t.startsWith('[') && !t.startsWith('-')) return t
  }
  return ''
}

// ── Data fetching ──────────────────────────────────────────────────────────────

async function fetchAllHistory(): Promise<HistoryRow[]> {
  const results = await Promise.all(
    TICKER_CONFIG.map(async ({ ticker, table, name }) => {
      const { data, error } = await supabase
        .from(table)
        .select('id, date, final_judgment, current_price, scenario')
        .order('date', { ascending: false })
      if (error || !data) return []
      return data.map((row) => ({ ...row, ticker, name })) as HistoryRow[]
    })
  )
  // 전체 합쳐서 날짜 내림차순 정렬
  return results
    .flat()
    .sort((a, b) => b.date.localeCompare(a.date))
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const [allRows, setAllRows]     = useState<HistoryRow[]>([])
  const [loading, setLoading]     = useState(true)

  // 필터 상태
  const [ticker, setTicker]       = useState('전체')
  const [judgment, setJudgment]   = useState('전체')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate]     = useState('')

  useEffect(() => {
    fetchAllHistory().then((rows) => {
      setAllRows(rows)
      setLoading(false)
    })
  }, [])

  // 클라이언트 사이드 필터링
  const filtered = useMemo(() => {
    return allRows.filter((r) => {
      if (ticker !== '전체' && r.ticker !== ticker) return false
      if (judgment !== '전체' && r.final_judgment !== judgment) return false
      if (startDate && r.date < startDate) return false
      if (endDate && r.date > endDate) return false
      return true
    })
  }, [allRows, ticker, judgment, startDate, endDate])

  const handleReset = () => {
    setTicker('전체')
    setJudgment('전체')
    setStartDate('')
    setEndDate('')
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">판단 이력</h1>
          <p className="text-sm text-slate-500 mt-0.5">5개 종목 전체 분석 기록</p>
        </div>
        {loading && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <RefreshCw size={12} className="animate-spin" />
            불러오는 중...
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4 text-slate-600">
          <Filter size={15} />
          <span className="font-semibold text-sm">필터</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* 종목 */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">종목</label>
            <select
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white"
            >
              <option value="전체">전체</option>
              {TICKER_CONFIG.map((t) => (
                <option key={t.ticker} value={t.ticker}>{t.ticker}</option>
              ))}
            </select>
          </div>

          {/* 판단 */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">판단</label>
            <select
              value={judgment}
              onChange={(e) => setJudgment(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white"
            >
              {JUDGMENT_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          {/* 시작일 */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">시작일</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
            />
          </div>

          {/* 종료일 */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">종료일</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
            />
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-slate-400">
            {!loading && `전체 ${allRows.length}건 중 ${filtered.length}건`}
          </span>
          <button
            onClick={handleReset}
            className="px-4 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            초기화
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <div className="text-sm animate-pulse">데이터를 불러오는 중...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-slate-400">
            <AlertCircle size={22} />
            <p className="text-sm">조건에 맞는 이력이 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">날짜</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">종목</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600">판단</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">현재가</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">핵심 근거</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const badge = getBadge(r.final_judgment)
                  const summary = extractSummary(r.scenario)
                  return (
                    <tr
                      key={`${r.ticker}-${r.id}`}
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap text-xs">
                        {r.date}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-800">{r.ticker}</p>
                        <p className="text-xs text-slate-400">{r.name}</p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge.cls}`}>
                          {badge.icon}
                          {r.final_judgment}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700 whitespace-nowrap">
                        ${r.current_price.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-sm">
                        <p className="line-clamp-2 text-xs leading-relaxed">
                          {summary || '—'}
                        </p>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
