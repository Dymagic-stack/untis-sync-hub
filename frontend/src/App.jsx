import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  GraduationCap,
  Users,
} from 'lucide-react'

const demoData = {
  stats: {
    totalStudents: 248,
    totalClasses: 12,
    todayAbsences: 14,
  },
  absences: [
    { id: 1, studentName: 'Anna Müller', className: '9A', date: '2026-11-09', reason: 'Erkrankung' },
    { id: 2, studentName: 'Tim Becker', className: '8C', date: '2026-11-09', reason: 'Arztbesuch' },
    { id: 3, studentName: 'Lina Fischer', className: '10B', date: '2026-11-09', reason: 'Familienangelegenheit' },
  ],
  classes: ['9A', '9B', '10A', '10B', '11C', '12A'],
}

function App() {
  const [data, setData] = useState(demoData)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    fetch('http://localhost:8000/api/dashboard-stats')
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Backend request failed: ${res.status}`)
        }
        const payload = await res.json()
        if (active) {
          setData(payload)
        }
      })
      .catch((err) => {
        console.warn('Backend nicht erreichbar, nutze Demodaten', err)
        if (active) {
          setData(demoData)
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const stats = useMemo(
    () => [
      { label: 'Schüler:innen', value: data.stats?.totalStudents ?? 0, icon: Users },
      { label: 'Klassen', value: data.stats?.totalClasses ?? 0, icon: GraduationCap },
      { label: 'Fehlzeiten', value: data.stats?.todayAbsences ?? 0, icon: AlertTriangle },
      { label: 'Aktive Kurse', value: data.classes?.length ?? 0, icon: BookOpen },
    ],
    [data],
  )

  const absences = Array.isArray(data.absences) ? data.absences : demoData.absences

  return (
    <div className="min-h-screen bg-slate-100 p-6 text-slate-800">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-sky-600">WebUntis Sync-Hub</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Übersicht</h1>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-700">
            <CalendarDays className="h-4 w-4" />
            {loading ? 'Lädt...' : 'Live-Daten'}
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-slate-500">{label}</span>
                <div className="rounded-full bg-sky-100 p-2 text-sky-700">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Fehlzeiten heute</h2>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                {absences.length} Einträge
              </span>
            </div>

            <div className="space-y-3">
              {absences.map((absence) => (
                <div key={absence.id ?? absence.studentName} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <p className="font-semibold text-slate-900">{absence.studentName ?? 'Unbekannt'}</p>
                    <p className="text-sm text-slate-500">{absence.className ?? 'Keine Klasse'} • {absence.date ?? 'Heute'}</p>
                  </div>
                  <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                    {absence.reason ?? 'Unbekannt'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-semibold text-slate-900">Top-Klassen</h2>
            <ul className="space-y-3">
              {(data.classes ?? demoData.classes).map((className, index) => (
                <li key={className} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <span className="font-medium text-slate-700">{className}</span>
                  <span className="text-sm text-slate-500">#{index + 1}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  )
}

export default App
