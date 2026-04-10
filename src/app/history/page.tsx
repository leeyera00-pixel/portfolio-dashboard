'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import type { JudgmentRecord, Judgment } from '@/lib/types'
import { Search, Filter, TrendingUp, TrendingDown, Minus, Eye, AlertCircle } from 'lucide-react'

const JUDGMENT_OPTIONS: { value: Judgment | 'ALL'; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'BUY', label: '매수' },
  { value: 'HOLD', label: '보유' },
  { value: 'SELL', label: '매도' },
  { value: 'WATCH', label: '관망' },
]

const judgmentBadge: Record<Judgment, string> = {
  BUY: 'bg-emerald-100 text-emerald-700',
  HOLD: 'bg-amber-100 text-amber-700',
  SELL: 'bg-red-100 text-red-700',
  WATCH: 'bg-slate-100 text-slate-600',
}

const judgmentLabel: Record<Judgment, string> = {
  BUY: '매수',
  HOLD: '보유',
  SELL: '매도',
  WATCH: '관망',
}

const judgmentIcon: Record<Judgment, React.ReactNode> = {
  BUY: <TrendingUp size={12} />,
  HOLD: <Minus size={12} />,
  SELL: <TrendingDown size={12} />,
  WATCH: <Eye size={12} />,
}

async function fetchHistory(params: {
  ticker?: string
  judgment?: Judgment | 'ALL'
  startDate?: string
  endDate?: string
}): Promise<JudgmentRecord[]> {
  // Try API first
  const apiData = await api.getJudgments({
    ticker: params.ticker || undefined,
    startDate: params.startDate || undefined,
    endDate: params.endDate || undefined,
  })
  if (apiData && apiData.length > 0) return apiData

  // Fallback to Supabase
  let query = supabase
    .from('daily_judgments')
    .select('*')
    .order('date', { ascending: false })
    .limit(200)

  if (params.ticker) query = query.ilike('ticker', `%${params.ticker}%`)
  if (params.judgment && params.judgment !== 'ALL')
    query = query.eq('judgment', params.judgment)
  if (params.startDate) query = query.gte('date', params.startDate)
  if (params.endDate) query = query.lte('date', params.endDate)

  const { data } = await query
  return (data as JudgmentRecord[]) ?? []
}

export default function HistoryPage() {
  const [records, setRecords] = useState<JudgmentRecord[]>([])
  const [loading, setLoading] = useState(true)

  const [ticker, setTicker] = useState('')
  const [judgment, setJudgment] = useState<Judgment | 'ALL'>('ALL')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const data = await fetchHistory({ ticker, judgment, startDate, endDate })
    setRecords(data)
    setLoading(false)
  }, [ticker, judgment, startDate, endDate])

  useEffect(() => {
    load()
  }, [load])

  const handleReset = () => {
    setTicker('')
    setJudgment('ALL')
    setStartDate('')
    setEndDate('')
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">판단 이력</h1>
        <p className="text-sm text-slate-500 mt-0.5">종목별 매매 판단 기록</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4 text-slate-600">
          <Filter size={15} />
          <span className="font-semibold text-sm">필터</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Ticker search */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">종목</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="티커 입력..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
              />
            </div>
          </div>

          {/* Judgment filter */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">판단</label>
            <select
              value={judgment}
              onChange={(e) => setJudgment(e.target.value as Judgment | 'ALL')}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white"
            >
              {JUDGMENT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Start date */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">시작일</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
            />
          </div>

          {/* End date */}
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

        <div className="flex justify-end mt-4">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            초기화
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">
            총 {records.length.toLocaleString()}건
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <div className="animate-pulse text-sm">불러오는 중...</div>
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
            <AlertCircle size={24} />
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
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">확신도</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">가격</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">사유</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{r.date}</td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800">{r.ticker}</p>
                      {r.stock_name && (
                        <p className="text-xs text-slate-400">{r.stock_name}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${judgmentBadge[r.judgment]}`}
                      >
                        {judgmentIcon[r.judgment]}
                        {judgmentLabel[r.judgment]}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-400 rounded-full"
                            style={{ width: `${r.confidence}%` }}
                          />
                        </div>
                        <span className="text-slate-700 font-medium w-10 text-right">
                          {r.confidence}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">
                      {r.price ? `$${r.price.toLocaleString()}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs">
                      <p className="line-clamp-2 text-xs">{r.reason ?? '-'}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
