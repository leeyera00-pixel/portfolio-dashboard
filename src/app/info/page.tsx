import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import type { Stock } from '@/lib/types'
import { Database, Globe, RefreshCw, AlertCircle, Info } from 'lucide-react'

async function getStocks(): Promise<Stock[]> {
  const apiStocks = await api.getStocks()
  if (apiStocks && apiStocks.length > 0) return apiStocks

  const { data } = await supabase
    .from('stocks')
    .select('*')
    .order('ticker')
  return (data as Stock[]) ?? []
}

const DATA_SOURCE_ICONS: Record<string, React.ReactNode> = {
  API: <Globe size={12} />,
  Supabase: <Database size={12} />,
}

function SourceBadge({ source }: { source: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
      {DATA_SOURCE_ICONS[source] ?? <Info size={12} />}
      {source}
    </span>
  )
}

const COLLECTED_DATA_SCHEMA: {
  category: string
  fields: { name: string; description: string; updateFreq: string }[]
}[] = [
  {
    category: '기술지표',
    fields: [
      { name: 'RSI (14)', description: '상대강도지수 — 과매수/과매도 판단', updateFreq: '일봉' },
      { name: 'MACD', description: 'Moving Average Convergence Divergence + Signal', updateFreq: '일봉' },
      { name: '볼린저 밴드', description: '20일 기준 상·중·하단 밴드', updateFreq: '일봉' },
      { name: 'SMA 20/50/200', description: '단순이동평균선', updateFreq: '일봉' },
      { name: '거래량 비율', description: '20일 평균 대비 거래량', updateFreq: '일봉' },
    ],
  },
  {
    category: '상대강도',
    fields: [
      { name: '기간별 수익률', description: '1·3·6·12개월 수익률', updateFreq: '주봉' },
      { name: 'vs SPY / QQQ', description: 'S&P 500, 나스닥 대비 상대강도', updateFreq: '주봉' },
      { name: 'vs 섹터', description: '섹터 ETF 대비 상대강도', updateFreq: '주봉' },
    ],
  },
  {
    category: '매크로',
    fields: [
      { name: 'VIX', description: 'CBOE 변동성 지수', updateFreq: '일봉' },
      { name: 'Fear & Greed', description: 'CNN Fear & Greed Index', updateFreq: '일봉' },
      { name: 'DXY (달러 지수)', description: '미국 달러 강세 지표', updateFreq: '일봉' },
      { name: '10Y 국채금리', description: '미국 10년물 국채 수익률', updateFreq: '일봉' },
      { name: '2Y-10Y 스프레드', description: '장단기 금리 스프레드', updateFreq: '일봉' },
    ],
  },
  {
    category: '보유현황',
    fields: [
      { name: '보유 수량', description: '현재 보유 주식 수', updateFreq: '수동 업데이트' },
      { name: '평균 단가', description: '매수 평균 가격', updateFreq: '수동 업데이트' },
      { name: '목표 비중', description: '포트폴리오 내 목표 배분 비율', updateFreq: '수동 업데이트' },
    ],
  },
  {
    category: '시나리오',
    fields: [
      { name: '강세/기본/약세', description: '3가지 시나리오별 목표가 및 확률', updateFreq: '주간' },
      { name: '핵심 트리거', description: '시나리오 전환을 유발하는 이벤트', updateFreq: '주간' },
    ],
  },
]

function StockCard({ stock }: { stock: Stock }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Stock header */}
      <div className="px-5 py-4 bg-gradient-to-r from-indigo-50 to-slate-50 border-b border-slate-200">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xl font-bold text-slate-900">{stock.ticker}</p>
            <p className="text-sm text-slate-600 mt-0.5">{stock.name}</p>
          </div>
          {stock.sector && (
            <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium">
              {stock.sector}
            </span>
          )}
        </div>
        {stock.description && (
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">{stock.description}</p>
        )}
      </div>

      {/* Data sources */}
      {stock.data_sources && stock.data_sources.length > 0 && (
        <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400">데이터 출처:</span>
          {stock.data_sources.map((src) => (
            <SourceBadge key={src} source={src} />
          ))}
        </div>
      )}
    </div>
  )
}

export default async function InfoPage() {
  const stocks = await getStocks()

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">종목 정보</h1>
        <p className="text-sm text-slate-500 mt-0.5">수집 데이터 및 분석 지표 안내</p>
      </div>

      {/* Stock list */}
      <section>
        <h2 className="text-base font-semibold text-slate-700 mb-3">관리 종목</h2>
        {stocks.length === 0 ? (
          <div className="flex items-center gap-2 text-slate-400 bg-slate-100 rounded-xl p-6">
            <AlertCircle size={16} />
            <span className="text-sm">종목 데이터가 없습니다.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stocks.map((s) => (
              <StockCard key={s.ticker} stock={s} />
            ))}
          </div>
        )}
      </section>

      {/* Collected data schema */}
      <section>
        <h2 className="text-base font-semibold text-slate-700 mb-3">수집 데이터 목록</h2>
        <div className="space-y-4">
          {COLLECTED_DATA_SCHEMA.map((cat) => (
            <div
              key={cat.category}
              className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
                <h3 className="font-semibold text-slate-700 text-sm">{cat.category}</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2.5 px-5 font-medium text-slate-500 text-xs">
                      지표명
                    </th>
                    <th className="text-left py-2.5 px-5 font-medium text-slate-500 text-xs">
                      설명
                    </th>
                    <th className="text-right py-2.5 px-5 font-medium text-slate-500 text-xs">
                      업데이트 주기
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cat.fields.map((f) => (
                    <tr
                      key={f.name}
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-3 px-5 font-medium text-slate-800 whitespace-nowrap">
                        {f.name}
                      </td>
                      <td className="py-3 px-5 text-slate-500">{f.description}</td>
                      <td className="py-3 px-5 text-right">
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                          <RefreshCw size={11} />
                          {f.updateFreq}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </section>

      {/* API & DB info */}
      <section>
        <h2 className="text-base font-semibold text-slate-700 mb-3">데이터 시스템</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-2 text-slate-700">
              <Globe size={16} className="text-indigo-500" />
              <span className="font-semibold text-sm">Railway API 서버</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              데이터 수집·분석 및 판단 로직을 담당하는 백엔드 서버입니다.
              5분 간격으로 시장 데이터를 수집하고 판단을 업데이트합니다.
            </p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-slate-500">
                {process.env.NEXT_PUBLIC_API_URL ?? 'https://web-production-9a9b3.up.railway.app'}
              </span>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-2 text-slate-700">
              <Database size={16} className="text-indigo-500" />
              <span className="font-semibold text-sm">Supabase 데이터베이스</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              판단 이력, 보유현황, 시나리오 등의 데이터를 영구 저장하는
              PostgreSQL 기반 데이터베이스입니다.
            </p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-slate-500">Connected</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
