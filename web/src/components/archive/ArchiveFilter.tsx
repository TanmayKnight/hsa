'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Edition } from '@/lib/db'
import { categoryColor } from '@/lib/utils'

// ─── helpers ────────────────────────────────────────────────────────────────

function formatEditionDate(dateStr: string) {
  const d = new Date(`${dateStr}T12:00:00Z`)
  return {
    weekday: d.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }),
    monthDay: d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' }),
    year: d.getFullYear().toString(),
  }
}

function groupByMonth(editions: Edition[]) {
  const groups: Record<string, Edition[]> = {}
  for (const e of editions) {
    const key = e.date.slice(0, 7)
    if (!groups[key]) groups[key] = []
    groups[key].push(e)
  }
  return groups
}

function monthLabel(yyyyMM: string) {
  const [y, m] = yyyyMM.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', {
    month: 'long', year: 'numeric',
  })
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

// ─── Calendar ────────────────────────────────────────────────────────────────

interface CalendarProps {
  editionDates: Set<string>
  onSelect: (date: string) => void
  initialMonth: { year: number; month: number }
}

function Calendar({ editionDates, onSelect, initialMonth }: CalendarProps) {
  const [view, setView] = useState(initialMonth)

  const days = daysInMonth(view.year, view.month)
  const startDay = firstDayOfMonth(view.year, view.month)

  function prevMonth() {
    setView(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 })
  }
  function nextMonth() {
    setView(v => v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 })
  }

  const heading = new Date(view.year, view.month, 1).toLocaleDateString('en-US', {
    month: 'long', year: 'numeric',
  })

  const cells: (number | null)[] = [
    ...Array(startDay).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white">

      {/* Calendar header */}
      <div className="bg-primary px-5 py-4 flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-full
                     text-white/70 hover:text-white hover:bg-white/15 transition-colors text-lg"
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="font-serif font-bold text-white text-base tracking-wide">{heading}</span>
        <button
          onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-full
                     text-white/70 hover:text-white hover:bg-white/15 transition-colors text-lg"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      {/* Day-of-week row */}
      <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/60">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-gray-400 uppercase py-2 tracking-widest">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 p-3 gap-1">
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} />

          const mm = String(view.month + 1).padStart(2, '0')
          const dd = String(day).padStart(2, '0')
          const dateStr = `${view.year}-${mm}-${dd}`
          const hasEdition = editionDates.has(dateStr)

          return (
            <button
              key={dateStr}
              onClick={() => hasEdition && onSelect(dateStr)}
              disabled={!hasEdition}
              title={hasEdition ? `View ${dateStr} edition` : undefined}
              className={`
                relative flex items-center justify-center rounded-lg
                text-sm font-medium h-9 w-full transition-all duration-150
                ${hasEdition
                  ? 'bg-primary text-white shadow-sm hover:bg-primary/80 hover:shadow-md cursor-pointer scale-100 hover:scale-105'
                  : 'text-gray-300 cursor-default'
                }
              `}
            >
              {day}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/60 flex items-center gap-2">
        <span className="w-5 h-5 rounded bg-primary inline-block shrink-0" />
        <span className="text-[11px] text-gray-500">Edition published — click to open</span>
      </div>
    </div>
  )
}

// ─── Edition card ─────────────────────────────────────────────────────────────

function EditionCard({ edition }: { edition: Edition }) {
  const { weekday, monthDay, year } = formatEditionDate(edition.date)

  return (
    <Link
      href={`/archive/${edition.date}`}
      className="group flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden
                 hover:border-primary hover:shadow-lg transition-all duration-200"
    >
      {/* Image or date masthead */}
      {edition.top_image_url ? (
        <div className="relative h-36 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={edition.top_image_url}
            alt={edition.top_title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          {/* Date overlay on image */}
          <div className="absolute bottom-0 left-0 p-3">
            <p className="text-[10px] text-white/70 uppercase tracking-widest font-semibold">{weekday}</p>
            <p className="font-serif text-lg font-bold text-white leading-tight">{monthDay}</p>
          </div>
        </div>
      ) : (
        /* Date masthead when no image */
        <div className="bg-primary px-4 py-4">
          <p className="text-[10px] text-white/60 uppercase tracking-widest font-semibold">{weekday}</p>
          <p className="font-serif text-xl font-bold text-white leading-tight">{monthDay}</p>
          <p className="text-sm text-white/60 font-medium">{year}</p>
        </div>
      )}

      <div className="flex flex-col flex-1 p-4">
        {/* Accent rule */}
        <div className="w-8 h-0.5 bg-accent mb-3" />

        {/* Top headline */}
        <p className="text-sm font-semibold text-gray-800 line-clamp-3 leading-snug
                       group-hover:text-primary transition-colors flex-1 mb-4">
          {edition.top_title}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <span className={`section-tag text-[10px] ${categoryColor(edition.top_category)}`}>
            {edition.top_category}
          </span>
          <span className="text-xs text-gray-400 font-medium">
            {edition.count} article{edition.count !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </Link>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  editions: Edition[]
}

export default function ArchiveFilter({ editions }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')

  const editionDates = useMemo(() => new Set(editions.map(e => e.date)), [editions])

  const initialMonth = useMemo(() => {
    if (!editions.length) {
      const now = new Date()
      return { year: now.getFullYear(), month: now.getMonth() }
    }
    const latest = editions[0].date
    return { year: Number(latest.slice(0, 4)), month: Number(latest.slice(5, 7)) - 1 }
  }, [editions])

  const filtered = useMemo(() => {
    if (!query.trim()) return editions
    const q = query.trim().toLowerCase()
    return editions.filter(
      e =>
        e.top_title.toLowerCase().includes(q) ||
        formatEditionDate(e.date).monthDay.toLowerCase().includes(q) ||
        e.date.includes(q)
    )
  }, [editions, query])

  const groups = groupByMonth(filtered)
  const months = Object.keys(groups).sort((a, b) => b.localeCompare(a))

  return (
    <div className="flex flex-col lg:flex-row gap-10">

      {/* ── Left: Calendar ── */}
      <aside className="lg:w-72 shrink-0">
        <p className="text-[11px] uppercase tracking-widest text-gray-400 font-bold mb-3">
          Browse by date
        </p>
        <Calendar
          editionDates={editionDates}
          onSelect={date => router.push(`/archive/${date}`)}
          initialMonth={initialMonth}
        />
      </aside>

      {/* ── Right: Search + cards ── */}
      <div className="flex-1 min-w-0">

        {/* Search */}
        <div className="relative mb-6">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"
            fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by headline or date…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-11 pr-10 py-3 border-2 border-gray-200 rounded-xl text-sm
                       bg-white focus:outline-none focus:border-primary transition-colors
                       placeholder-gray-400 shadow-sm"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400
                         hover:text-gray-700 text-xl leading-none transition-colors"
            >
              ×
            </button>
          )}
        </div>

        {/* Result count */}
        {query && (
          <p className="text-sm text-gray-500 mb-5">
            <span className="font-semibold text-primary">{filtered.length}</span> edition{filtered.length !== 1 ? 's' : ''} matching &ldquo;{query}&rdquo;
          </p>
        )}

        {/* No results */}
        {filtered.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <p className="text-2xl mb-1">🔍</p>
            <p className="font-serif text-lg text-gray-500 mb-1">No editions found</p>
            <p className="text-sm mb-4">Try a different headline or date</p>
            <button
              onClick={() => setQuery('')}
              className="text-sm text-accent hover:underline font-semibold"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="space-y-10">
            {months.map(month => (
              <section key={month}>
                {/* Month heading */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-px flex-1 bg-gray-200" />
                  <h2 className="font-serif text-base font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap px-1">
                    {monthLabel(month)}
                  </h2>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                {/* Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {groups[month].map(edition => (
                    <EditionCard key={edition.date} edition={edition} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
