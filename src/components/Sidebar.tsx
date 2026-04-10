'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  TrendingUp,
  History,
  Info,
  ChevronDown,
  ChevronRight,
  BarChart2,
} from 'lucide-react'
import { useState } from 'react'

const STOCK_LINKS = [
  { ticker: 'VTI',  name: 'Vanguard Total Market' },
  { ticker: 'QQQ',  name: 'Invesco Nasdaq-100' },
  { ticker: 'ASML', name: 'ASML Holding N.V.' },
  { ticker: 'IWM',  name: 'iShares Russell 2000' },
  { ticker: 'NVDA', name: 'NVIDIA Corporation' },
]

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  children?: { label: string; href: string }[]
}

export default function Sidebar() {
  const pathname = usePathname()
  const [stocksOpen, setStocksOpen] = useState(
    pathname.startsWith('/stocks')
  )

  const navItems: NavItem[] = [
    {
      label: '오늘의 현황',
      href: '/today',
      icon: <LayoutDashboard size={18} />,
    },
    {
      label: '종목 상세',
      href: '/stocks',
      icon: <TrendingUp size={18} />,
      children: STOCK_LINKS.map((s) => ({
        label: `${s.ticker} · ${s.name}`,
        href: `/stocks/${s.ticker}`,
      })),
    },
    {
      label: '이력',
      href: '/history',
      icon: <History size={18} />,
    },
    {
      label: '종목 정보',
      href: '/info',
      icon: <Info size={18} />,
    },
  ]

  const isActive = (href: string) => {
    if (href === '/stocks') return pathname.startsWith('/stocks')
    return pathname === href
  }

  return (
    <aside className="flex flex-col w-60 min-h-screen bg-slate-900 text-slate-100 border-r border-slate-800">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-slate-800">
        <BarChart2 size={22} className="text-indigo-400" />
        <span className="font-semibold text-base tracking-tight">Portfolio Dashboard</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => (
          <div key={item.href}>
            {item.children ? (
              <>
                <button
                  onClick={() => setStocksOpen((o) => !o)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    {item.icon}
                    {item.label}
                  </span>
                  {stocksOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                {stocksOpen && (
                  <div className="mt-1 ml-4 space-y-0.5">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`block px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          pathname === child.href
                            ? 'bg-indigo-500/20 text-indigo-300'
                            : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'
                        }`}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-slate-800">
        <p className="text-xs text-slate-600">
          {new Date().toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>
    </aside>
  )
}
