'use client'

import { useState } from 'react'
import { RefreshCw, Globe, Database } from 'lucide-react'

// ── Stock meta ─────────────────────────────────────────────────────────────────

const STOCKS = [
  {
    ticker: 'VTI',
    name: 'Vanguard Total Stock Market ETF',
    role: '코어',
    period: '장기',
    roleColor: 'bg-indigo-100 text-indigo-700',
    description: '미국 전체 주식 시장을 추종. 대형·중형·소형주 약 3,600종목을 포함하며 포트폴리오의 시장 베타를 담당합니다.',
  },
  {
    ticker: 'QQQ',
    name: 'Invesco QQQ (Nasdaq-100)',
    role: '코어',
    period: '장기',
    roleColor: 'bg-indigo-100 text-indigo-700',
    description: '나스닥 100 지수를 추종. 애플·MS·엔비디아 등 기술 대형주 중심으로 구성되며 성장 편향 코어 포지션입니다.',
  },
  {
    ticker: 'ASML',
    name: 'ASML Holding N.V.',
    role: '위성',
    period: '중기',
    roleColor: 'bg-amber-100 text-amber-700',
    description: '반도체 노광 장비 독점 공급사. EUV 장비 독점력 기반의 장기 해자를 보유하며 반도체 산업 성장의 핵심 인프라 기업입니다.',
  },
  {
    ticker: 'IWM',
    name: 'iShares Russell 2000 ETF',
    role: '위성',
    period: '중기',
    roleColor: 'bg-amber-100 text-amber-700',
    description: '미국 소형주 약 2,000종목을 추종. 경기 회복 국면에서 대형주 대비 초과 수익을 노리는 경기순환 위성 포지션입니다.',
  },
  {
    ticker: 'NVDA',
    name: 'NVIDIA Corporation',
    role: '위성',
    period: '중기',
    roleColor: 'bg-amber-100 text-amber-700',
    description: 'AI·데이터센터 GPU 시장 지배자. H100/B100 수요를 바탕으로 고성장을 이어가는 테마 위성 포지션입니다.',
  },
]

// ── Per-ticker data schema ─────────────────────────────────────────────────────

type Field = { name: string; description: string; updateFreq: string }
type Category = { category: string; accent: string; fields: Field[] }

const TICKER_DATA: Record<string, Category[]> = {
  VTI: [
    {
      category: '기술지표 (멀티타임프레임)',
      accent: 'border-l-indigo-400',
      fields: [
        { name: 'RSI (14일)',        description: '일봉 상대강도지수 — 과매수(70↑) / 과매도(30↓)',    updateFreq: '일봉' },
        { name: 'RSI (주봉)',        description: '주봉 기준 중기 추세 강도',                          updateFreq: '주봉' },
        { name: 'MACD (일봉)',       description: '단기 모멘텀 방향 및 골든/데드 크로스',              updateFreq: '일봉' },
        { name: 'MA 50 / MA 200',   description: '이동평균선 값 및 현재가 위/아래 여부',              updateFreq: '일봉' },
        { name: '거래량 비율',       description: '당일 거래량 vs 20일 평균 거래량',                  updateFreq: '일봉' },
        { name: '52주 범위',         description: '52주 최고가·최저가 및 현재가 위치',                updateFreq: '일봉' },
        { name: '전일 등락률',       description: '전일 대비 가격 변화율(%)',                         updateFreq: '일봉' },
      ],
    },
    {
      category: '매크로 지표',
      accent: 'border-l-blue-400',
      fields: [
        { name: 'VIX',              description: 'CBOE 변동성 지수 — 공포·탐욕 국면 판단',           updateFreq: '일봉' },
        { name: '기준금리 (Fed)',    description: '미국 연준 기준금리',                                updateFreq: 'FOMC 일정' },
        { name: '10Y 국채금리',      description: '미국 10년물 국채 수익률',                          updateFreq: '일봉' },
        { name: '2Y 국채금리',       description: '미국 2년물 국채 수익률 (단기금리)',                 updateFreq: '일봉' },
        { name: '실업률',            description: '미국 비농업 고용 실업률',                          updateFreq: '월간' },
        { name: 'CPI (YoY)',        description: '소비자물가지수 전년 대비 상승률',                   updateFreq: '월간' },
      ],
    },
    {
      category: '밸류에이션',
      accent: 'border-l-violet-400',
      fields: [
        { name: 'CAPE (쉴러 P/E)',  description: '10년 물가조정 주가수익비율 — 시장 전체 고평가 여부', updateFreq: '월간' },
        { name: 'Buffett Indicator', description: '시가총액 / GDP 비율 — 전통적 시장 밸류에이션 척도', updateFreq: '분기' },
      ],
    },
  ],

  QQQ: [
    {
      category: '기술지표',
      accent: 'border-l-indigo-400',
      fields: [
        { name: 'RSI (14일)',        description: '일봉 상대강도지수',                                 updateFreq: '일봉' },
        { name: 'MACD (일봉)',       description: '단기 모멘텀 방향 및 크로스 신호',                  updateFreq: '일봉' },
        { name: 'MA 50 / MA 200',   description: '이동평균선 및 골든/데드 크로스',                   updateFreq: '일봉' },
        { name: '52주 범위·ATH',    description: '52주 범위 및 역대 최고가 대비 거리',               updateFreq: '일봉' },
        { name: '거래량 비율',       description: '20일 평균 대비 거래량 배수',                       updateFreq: '일봉' },
      ],
    },
    {
      category: '보유 종목 집중도',
      accent: 'border-l-sky-400',
      fields: [
        { name: '상위 10종목 비중',  description: 'QQQ 내 상위 10개 구성 종목 합산 비중(%)',          updateFreq: '분기' },
        { name: 'vs SPY 상대강도',  description: '3개월 기준 S&P 500 대비 초과/부진 수익률',         updateFreq: '주봉' },
        { name: '3개월 수익률',      description: 'QQQ 직전 3개월 가격 변화율',                       updateFreq: '주봉' },
      ],
    },
    {
      category: 'P/E 프리미엄',
      accent: 'border-l-violet-400',
      fields: [
        { name: 'QQQ P/E (Trailing)', description: '나스닥 100 추적 주가수익비율',                   updateFreq: '주봉' },
        { name: 'QQQ Forward P/E',   description: '향후 12개월 예상 이익 기반 P/E',                  updateFreq: '주봉' },
        { name: 'S&P 500 대비 P/E 프리미엄', description: 'QQQ P/E와 SPY P/E의 차이(%) — 성장 프리미엄 수준', updateFreq: '주봉' },
      ],
    },
    {
      category: '금리 민감도',
      accent: 'border-l-blue-400',
      fields: [
        { name: '10Y 국채금리',      description: '성장주 할인율에 직접 영향을 미치는 장기금리',       updateFreq: '일봉' },
        { name: 'VIX',              description: '나스닥 고베타 특성상 변동성 국면 영향 큼',           updateFreq: '일봉' },
        { name: '기준금리',          description: '연준 금리 방향성 — QQQ 밸류에이션 전반에 영향',    updateFreq: 'FOMC 일정' },
      ],
    },
  ],

  ASML: [
    {
      category: '펀더멘털',
      accent: 'border-l-emerald-400',
      fields: [
        { name: '매출총이익률',      description: '매출 대비 매출총이익 비율 — 가격 결정력 지표',     updateFreq: '분기' },
        { name: '영업이익률',        description: '영업비용 제외 실제 수익성',                        updateFreq: '분기' },
        { name: 'FCF (잉여현금흐름)', description: '자본지출 차감 후 실제 현금 창출력 (단위: $B)',    updateFreq: '분기' },
        { name: 'FCF Yield',        description: 'FCF / 시가총액 — 현금 창출 효율 대비 가격',        updateFreq: '분기' },
        { name: 'Rule of 40',       description: '매출성장률 + 영업이익률 ≥ 40 기준 고성장 검증',    updateFreq: '분기' },
      ],
    },
    {
      category: 'EUV 사이클',
      accent: 'border-l-sky-400',
      fields: [
        { name: '신규 수주잔고',      description: '분기별 수주잔고 및 전분기 대비 변화',              updateFreq: '분기' },
        { name: 'EUV 출하 대수',     description: '분기 EUV 리소그라피 장비 납품 수량',               updateFreq: '분기' },
        { name: 'EUV 수익 비중',     description: '전체 매출 중 EUV 장비 비중',                       updateFreq: '분기' },
      ],
    },
    {
      category: '분기 실적',
      accent: 'border-l-amber-400',
      fields: [
        { name: 'Trailing P/E',     description: '최근 12개월 실적 기준 주가수익비율',                updateFreq: '분기' },
        { name: 'Forward P/E',      description: '향후 12개월 컨센서스 기반 P/E',                     updateFreq: '분기' },
        { name: 'EV/EBITDA',        description: '기업가치 대비 EBITDA 배수',                         updateFreq: '분기' },
        { name: 'P/S',              description: '주가매출비율 — 성장 프리미엄 가늠',                 updateFreq: '분기' },
        { name: '다음 실적 발표일',  description: '다음 분기 실적 발표 예정일',                       updateFreq: '분기' },
      ],
    },
    {
      category: '기술지표',
      accent: 'border-l-indigo-400',
      fields: [
        { name: 'RSI (일봉/주봉)',   description: '단기·중기 과매수·과매도 수준',                     updateFreq: '일봉/주봉' },
        { name: 'MACD (일봉/주봉)', description: '모멘텀 방향 및 전환 신호',                          updateFreq: '일봉/주봉' },
        { name: '50주 MA / 20월 MA', description: '장기 이동평균선 위/아래 여부',                    updateFreq: '주봉/월봉' },
        { name: 'ATH 대비 거리',     description: '역대 최고가 대비 현재 가격 차이(%)',               updateFreq: '일봉' },
        { name: 'vs SOXX / TSM',    description: '반도체 지수·동종 기업 대비 상대강도',              updateFreq: '주봉' },
      ],
    },
  ],

  IWM: [
    {
      category: '섹터 배분',
      accent: 'border-l-teal-400',
      fields: [
        { name: '섹터별 비중',       description: 'Russell 2000 내 금융·산업·헬스케어 등 섹터 배분',  updateFreq: '분기' },
        { name: 'IWM vs VTI',       description: '소형주 대형주 상대강도 — 경기 싸이클 포지셔닝',     updateFreq: '주봉' },
        { name: 'IWM vs MDY',       description: '소형주 대비 중형주 상대강도',                       updateFreq: '주봉' },
        { name: '3개월 수익률',      description: '직전 3개월 가격 변화율',                           updateFreq: '주봉' },
      ],
    },
    {
      category: '소형주 밸류에이션',
      accent: 'border-l-violet-400',
      fields: [
        { name: 'P/E (Russell 2000)', description: 'Russell 2000 지수 전체 주가수익비율',             updateFreq: '주봉' },
        { name: 'P/B',               description: '주가순자산비율 — 소형주 역사적 할인/프리미엄',    updateFreq: '주봉' },
        { name: '대형주 대비 P/E',   description: 'IWM P/E / SPY P/E — 상대 밸류에이션 비율',        updateFreq: '주봉' },
      ],
    },
    {
      category: 'NFIB 중소기업 심리',
      accent: 'border-l-sky-400',
      fields: [
        { name: 'NFIB 소기업 낙관지수', description: '미국 중소기업 경기심리 지수 — 소형주 선행 지표', updateFreq: '월간' },
      ],
    },
    {
      category: '금리 민감도',
      accent: 'border-l-blue-400',
      fields: [
        { name: '기준금리',          description: '소형주는 변동금리 부채 비중이 높아 금리 민감도 큼', updateFreq: 'FOMC 일정' },
        { name: '10Y / 2Y 국채금리', description: '금리 방향 및 장단기 스프레드',                     updateFreq: '일봉' },
        { name: 'VIX',              description: '고베타 소형주 특성상 변동성 국면 노출 큼',           updateFreq: '일봉' },
      ],
    },
    {
      category: '기술지표',
      accent: 'border-l-indigo-400',
      fields: [
        { name: 'RSI (일봉/주봉)',   description: '단기·중기 과매수·과매도 수준',                     updateFreq: '일봉/주봉' },
        { name: 'MACD (일봉/주봉)', description: '모멘텀 방향 및 크로스 신호',                        updateFreq: '일봉/주봉' },
        { name: 'MA 50/200 위/아래', description: '주요 이동평균선 위치',                             updateFreq: '일봉' },
        { name: '52주 범위',         description: '52주 최고가·최저가',                              updateFreq: '일봉' },
      ],
    },
  ],

  NVDA: [
    {
      category: 'Rule of 40 · 수익성',
      accent: 'border-l-emerald-400',
      fields: [
        { name: 'Rule of 40',       description: '매출성장률 + 영업이익률 — 40 초과 시 고성장 우량',  updateFreq: '분기' },
        { name: 'FCF ($B)',         description: '잉여현금흐름 절대값 — 실제 현금 창출력',            updateFreq: '분기' },
        { name: 'FCF Yield',        description: 'FCF / 시가총액 — 현금 창출 효율 대비 밸류에이션',  updateFreq: '분기' },
        { name: '매출총이익률',      description: '반도체 설계 회사의 핵심 가격 결정력 지표',         updateFreq: '분기' },
        { name: '영업이익률',        description: '비용 효율성 및 이익 창출력',                       updateFreq: '분기' },
      ],
    },
    {
      category: 'AI 사이클 · 수요 지표',
      accent: 'border-l-sky-400',
      fields: [
        { name: '데이터센터 매출 비중', description: 'NVDA 전체 매출 중 데이터센터(AI GPU) 비중',      updateFreq: '분기' },
        { name: '수주잔고 / Backlog', description: '분기말 미납 주문 잔고 — AI 수요 선행 지표',       updateFreq: '분기' },
        { name: 'vs SOXX / AMD',     description: '반도체 지수·경쟁사 대비 상대강도',                updateFreq: '주봉' },
        { name: 'vs AVGO',          description: '주요 AI 반도체 경쟁사 대비 성과',                  updateFreq: '주봉' },
      ],
    },
    {
      category: '실적 추정 · 밸류에이션',
      accent: 'border-l-violet-400',
      fields: [
        { name: 'Trailing P/E',     description: '최근 12개월 실적 기준 주가수익비율',                updateFreq: '분기' },
        { name: 'Forward P/E',      description: '향후 12개월 컨센서스 예상 이익 기반 P/E',           updateFreq: '분기' },
        { name: 'EV/EBITDA',        description: '기업가치 대비 EBITDA 배수',                         updateFreq: '분기' },
        { name: 'P/S',              description: '주가매출비율 — AI 성장 프리미엄 수준',              updateFreq: '분기' },
        { name: '다음 실적 발표일',  description: '분기 실적 발표 예정일 — 단기 이벤트 리스크',       updateFreq: '분기' },
      ],
    },
    {
      category: '기술지표',
      accent: 'border-l-indigo-400',
      fields: [
        { name: 'RSI (일봉/주봉)',   description: '단기·중기 과매수·과매도 수준',                     updateFreq: '일봉/주봉' },
        { name: 'MACD (일봉/주봉)', description: '모멘텀 방향 및 전환 신호',                          updateFreq: '일봉/주봉' },
        { name: '50주 MA / 20월 MA', description: '장기 추세선 위/아래 여부',                        updateFreq: '주봉/월봉' },
        { name: 'ATH 대비 거리',     description: '역대 최고가 대비 현재가 괴리율(%)',                updateFreq: '일봉' },
        { name: '52주 범위',         description: '52주 최고가·최저가',                              updateFreq: '일봉' },
      ],
    },
  ],
}

// ── Components ──────────────────────────────────────────────────────────────────

function DataTable({ categories }: { categories: Category[] }) {
  return (
    <div className="space-y-4">
      {categories.map((cat) => (
        <div
          key={cat.category}
          className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden border-l-4 ${cat.accent}`}
        >
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
            <h3 className="font-semibold text-slate-700 text-sm">{cat.category}</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2.5 px-5 font-medium text-slate-500 text-xs w-44">지표명</th>
                <th className="text-left py-2.5 px-5 font-medium text-slate-500 text-xs">설명</th>
                <th className="text-right py-2.5 px-5 font-medium text-slate-500 text-xs whitespace-nowrap">업데이트 주기</th>
              </tr>
            </thead>
            <tbody>
              {cat.fields.map((f) => (
                <tr
                  key={f.name}
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors"
                >
                  <td className="py-3 px-5 font-medium text-slate-800 whitespace-nowrap">{f.name}</td>
                  <td className="py-3 px-5 text-slate-500 leading-relaxed">{f.description}</td>
                  <td className="py-3 px-5 text-right">
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500 whitespace-nowrap">
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
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function InfoPage() {
  const [active, setActive] = useState('VTI')

  const stock = STOCKS.find((s) => s.ticker === active)!
  const categories = TICKER_DATA[active]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">종목 정보</h1>
        <p className="text-sm text-slate-500 mt-0.5">종목별 수집 데이터 및 분석 지표 안내</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap">
        {STOCKS.map((s) => (
          <button
            key={s.ticker}
            onClick={() => setActive(s.ticker)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              s.ticker === active
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {s.ticker}
          </button>
        ))}
      </div>

      {/* Stock overview card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4 flex items-start justify-between gap-4 bg-gradient-to-r from-indigo-50/60 to-slate-50">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xl font-bold text-slate-900">{stock.ticker}</p>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${stock.roleColor}`}>
              {stock.role}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
              {stock.period}
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-0.5">{stock.name}</p>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-2xl">{stock.description}</p>
        </div>
        <div className="shrink-0 text-right text-xs text-slate-400">
          {categories.reduce((acc, c) => acc + c.fields.length, 0)}개 지표
        </div>
      </div>

      {/* Data table */}
      <DataTable categories={categories} />

      {/* System info */}
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
              주기적으로 시장 데이터를 수집하고 판단을 업데이트합니다.
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
              판단 이력 및 시나리오 데이터를 영구 저장하는 PostgreSQL 기반 데이터베이스입니다.
              각 종목별 테이블(vti/qqq/asml/iwm/nvda_scenarios)에 기록됩니다.
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
