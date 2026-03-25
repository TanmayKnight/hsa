'use client'
import { useEffect, useState } from 'react'
import type { Schedule, WeeklyEdition } from '@/lib/types'
import { formatShortDate } from '@/lib/utils'

const CRON_PRESETS = [
  { label: 'Every Friday at 8am',  value: '0 8 * * 5' },
  { label: 'Every day at 8am',     value: '0 8 * * *' },
  { label: 'Every Monday at 7am',  value: '0 7 * * 1' },
  { label: 'Custom…',              value: 'custom' },
]

const STATUS_COLORS: Record<string, string> = {
  pending:    'bg-yellow-100 text-yellow-700',
  generating: 'bg-blue-100 text-blue-700',
  done:       'bg-green-100 text-green-700',
  failed:     'bg-red-100 text-red-700',
}

export default function ScheduleManager() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [editions, setEditions] = useState<WeeklyEdition[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', cron_preset: CRON_PRESETS[0].value, cron_custom: '' })
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genDate, setGenDate] = useState(() => new Date().toISOString().slice(0, 10))

  function load() {
    setLoading(true)
    Promise.all([
      fetch('/api/admin/schedules').then(r => r.json()),
      fetch('/api/admin/weekly-editions').then(r => r.json()),
    ]).then(([sData, eData]) => {
      setSchedules(sData.schedules ?? [])
      setEditions(eData.editions ?? [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(load, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const cron_expr = form.cron_preset === 'custom' ? form.cron_custom : form.cron_preset
    await fetch('/api/admin/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, cron_expr, task: 'weekly_edition', enabled: true }),
    })
    setSaving(false)
    setShowForm(false)
    setForm({ name: '', cron_preset: CRON_PRESETS[0].value, cron_custom: '' })
    load()
  }

  async function toggleEnabled(s: Schedule) {
    await fetch(`/api/admin/schedules/${s.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !s.enabled }),
    })
    load()
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this schedule?')) return
    await fetch(`/api/admin/schedules/${id}`, { method: 'DELETE' })
    load()
  }

  async function handleGenerateNow() {
    if (!confirm(`Generate weekly edition for ${genDate}?`)) return
    setGenerating(true)
    try {
      await fetch('/api/admin/generate-weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edition_date: genDate }),
      })
      load()
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Scheduled runs ── */}
      <div className="bg-white rounded border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-lg font-bold text-primary">Weekly Edition Schedule</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Configure when the weekly PDF newspaper is auto-generated.
            </p>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="text-xs bg-primary hover:bg-blue-900 text-white px-3 py-1.5 rounded font-semibold transition-colors"
          >
            + Add Schedule
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="px-5 py-4 bg-gray-50 border-b border-gray-200 space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Name</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Friday Weekly Edition"
                required
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Frequency</label>
              <select
                value={form.cron_preset}
                onChange={e => setForm(f => ({ ...f, cron_preset: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {CRON_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            {form.cron_preset === 'custom' && (
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Cron Expression</label>
                <input
                  value={form.cron_custom}
                  onChange={e => setForm(f => ({ ...f, cron_custom: e.target.value }))}
                  placeholder="0 8 * * 5"
                  required
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            )}
            <div className="flex gap-2">
              <button type="submit" disabled={saving}
                className="bg-primary text-white text-xs font-semibold px-4 py-1.5 rounded transition-colors hover:bg-blue-900 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save Schedule'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="text-xs text-gray-500 hover:text-gray-800 px-3 py-1.5">
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-sm text-gray-400 px-5 py-8 text-center">Loading…</p>
        ) : schedules.length === 0 ? (
          <p className="text-sm text-gray-400 px-5 py-8 text-center">No schedules configured.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {schedules.map(s => (
              <div key={s.id} className="px-5 py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{s.name}</p>
                  <p className="text-xs font-mono text-gray-400 mt-0.5">{s.cron_expr}</p>
                  {s.last_run && (
                    <p className="text-xs text-gray-400">Last run: {formatShortDate(s.last_run)}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleEnabled(s)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded transition-colors ${
                      s.enabled
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {s.enabled ? 'Enabled' : 'Paused'}
                  </button>
                  <button
                    onClick={() => handleDelete(s.id!)}
                    className="text-xs text-red-400 hover:text-red-600 px-1"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Generate on demand ── */}
      <div className="bg-white rounded border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-serif text-lg font-bold text-primary">Generate Now</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Trigger a one-off weekly edition PDF immediately. The Python worker will process it in the background.
          </p>
        </div>
        <div className="px-5 py-4 flex items-end gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Edition Date</label>
            <input
              type="date"
              value={genDate}
              onChange={e => setGenDate(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            onClick={handleGenerateNow}
            disabled={generating}
            className="bg-accent hover:bg-red-700 text-white text-xs font-semibold px-4 py-1.5 rounded transition-colors disabled:opacity-50"
          >
            {generating ? 'Queued…' : 'Generate Edition'}
          </button>
        </div>
      </div>

      {/* ── Recent editions ── */}
      <div className="bg-white rounded border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-serif text-lg font-bold text-primary">Recent Editions</h2>
        </div>
        {editions.length === 0 ? (
          <p className="text-sm text-gray-400 px-5 py-8 text-center">No editions generated yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {editions.map(ed => (
              <div key={ed.id} className="px-5 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{ed.edition_date}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {ed.article_count} article{ed.article_count !== 1 ? 's' : ''}
                    {ed.generated_at ? ` · Generated ${formatShortDate(ed.generated_at)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded capitalize ${STATUS_COLORS[ed.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {ed.status}
                  </span>
                  {ed.status === 'done' && ed.pdf_path && (
                    <a
                      href={`/api/admin/weekly-editions/${ed.id}/download`}
                      className="text-xs text-primary hover:underline"
                    >
                      Download PDF
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
