import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

// ─── Configuración ────────────────────────────────────────────────────────────

const TURNO_TYPES = [
  { id: 'dia',    label: 'Día',    bg: '#FEF9C3', text: '#854D0E' },
  { id: 'noche',  label: 'Noche',  bg: '#DBEAFE', text: '#1E40AF' },
  { id: 'diurno', label: 'Diurno', bg: '#FFEDD5', text: '#9A3412' },
  { id: 'libre',  label: 'Libre',  bg: '#F3F4F6', text: '#6B7280' },
  { id: '24hrs',  label: '24 hrs', bg: '#EDE9FE', text: '#6D28D9' }, // ← lavender, no más rojo
]

const MONTHS_ES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]
const DAYS_ES   = ['Lu','Ma','Mi','Ju','Vi','Sa','Do']
const DAYS_LONG = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']

const FALLBACK_HOLIDAYS = {
  '2025-01-01':'Año Nuevo','2025-04-18':'Viernes Santo','2025-04-19':'Sábado Santo',
  '2025-05-01':'Día del Trabajo','2025-05-21':'Glorias Navales',
  '2025-06-29':'San Pedro y San Pablo','2025-07-16':'Virgen del Carmen',
  '2025-08-15':'Asunción de la Virgen','2025-09-18':'Independencia Nacional',
  '2025-09-19':'Glorias del Ejército','2025-10-12':'Encuentro de Dos Mundos',
  '2025-10-31':'Iglesias Evangélicas','2025-11-01':'Todos los Santos',
  '2025-12-08':'Inmaculada Concepción','2025-12-25':'Navidad',
  '2026-01-01':'Año Nuevo','2026-04-03':'Viernes Santo','2026-04-04':'Sábado Santo',
  '2026-05-01':'Día del Trabajo','2026-05-21':'Glorias Navales',
  '2026-06-29':'San Pedro y San Pablo','2026-07-16':'Virgen del Carmen',
  '2026-08-15':'Asunción de la Virgen','2026-09-18':'Independencia Nacional',
  '2026-09-19':'Glorias del Ejército','2026-10-12':'Encuentro de Dos Mundos',
  '2026-10-31':'Iglesias Evangélicas','2026-11-01':'Todos los Santos',
  '2026-12-08':'Inmaculada Concepción','2026-12-25':'Navidad',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getOffset(year, month) {
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1
}
function getDays(year, month) {
  return new Date(year, month + 1, 0).getDate()
}
function toStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
}
function todayStr() {
  const t = new Date()
  return toStr(t.getFullYear(), t.getMonth(), t.getDate())
}
function displayDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dow = new Date(y, m - 1, d).getDay()
  return `${DAYS_LONG[dow === 0 ? 6 : dow - 1]} ${d} de ${MONTHS_ES[m - 1]} ${y}`
}
function normDate(val) {
  if (!val) return ''
  return String(val).substring(0, 10)
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function Rotativa() {
  const today      = new Date()
  const currentRef = useRef(null)

  const [entries,          setEntries]          = useState([])
  const [holidays,         setHolidays]         = useState(FALLBACK_HOLIDAYS)
  const [selectedDay,      setSelectedDay]      = useState(null)
  const [mode,             setMode]             = useState('view')
  const [showDropdown,     setShowDropdown]     = useState(false)
  const [showRotativaMenu, setShowRotativaMenu] = useState(false)
  const [saving,           setSaving]           = useState(false)

  // Formularios
  const [selTurno,    setSelTurno]    = useState(null)
  const [customLabel, setCustomLabel] = useState('')
  const [customColor, setCustomColor] = useState('#818CF8')
  const [eventoTitle, setEventoTitle] = useState('')
  const [remindHours, setRemindHours] = useState(1)
  const [remindMins,  setRemindMins]  = useState(0)
  const [notaText,    setNotaText]    = useState('')

  useEffect(() => { fetchEntries(); fetchHolidays() }, [])

  // Scroll al mes actual al cargar
  useEffect(() => {
    setTimeout(() => currentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 400)
  }, [])

  // Refetch cuando se abre un día (fix "sin registros")
  useEffect(() => { if (selectedDay) fetchEntries() }, [selectedDay])

  // ─── Data ──────────────────────────────────────────────────────────────────

  async function fetchEntries() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data } = await supabase
      .from('rotativa_entries')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('deleted', false)
    if (data) setEntries(data)
  }

  async function fetchHolidays() {
    try {
      const res  = await fetch(`https://apis.digital.gob.cl/fl/feriados/${today.getFullYear()}`)
      const data = await res.json()
      const map  = { ...FALLBACK_HOLIDAYS }
      data.forEach(h => { map[h.date] = h.nombre })
      setHolidays(map)
    } catch { /* usa fallback */ }
  }

  async function saveEntry(payload) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setSaving(true)
    await supabase.from('rotativa_entries').insert([{
      ...payload, user_id: session.user.id, date: selectedDay,
    }])
    await fetchEntries()
    setSaving(false)
    setMode('view')
    reset()
  }

  async function deleteEntry(id) {
    await supabase.from('rotativa_entries').update({ deleted: true }).eq('id', id)
    await fetchEntries()
  }

  function reset() {
    setSelTurno(null); setCustomLabel(''); setCustomColor('#818CF8')
    setEventoTitle(''); setRemindHours(1); setRemindMins(0); setNotaText('')
    setShowDropdown(false); setShowRotativaMenu(false)
  }

  function dayEntries(dateStr) {
    return entries.filter(e => normDate(e.date) === dateStr)
  }

  function turnoForDay(dateStr) {
    return entries.find(e => normDate(e.date) === dateStr && e.type === 'turno')
  }

  // ─── Calcular rotativa ─────────────────────────────────────────────────────

  async function calculateRotativa(type) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    setSaving(true)
    setShowRotativaMenu(false)

    const year       = new Date(selectedDay + 'T12:00:00').getFullYear()
    const endDateStr = `${year}-12-31`

    // Soft-delete turnos existentes desde selectedDay hasta fin de año
    await supabase
      .from('rotativa_entries')
      .update({ deleted: true })
      .eq('user_id', session.user.id)
      .eq('type', 'turno')
      .gte('date', selectedDay)
      .lte('date', endDateStr)

    if (type === 'borrar') {
      await fetchEntries()
      setSaving(false)
      return
    }

    // Generar entradas según patrón
    const tercer  = ['dia','dia','noche','noche','libre','libre']
    const cuarto  = ['dia','noche','libre','libre']
    const newEntries = []
    const current = new Date(selectedDay + 'T12:00:00')
    const end     = new Date(endDateStr + 'T12:00:00')
    let   idx     = 0

    while (current <= end) {
      const y       = current.getFullYear()
      const mo      = current.getMonth()
      const d       = current.getDate()
      const dateStr = toStr(y, mo, d)
      const isHol   = !!holidays[dateStr]
      const dow     = current.getDay()
      const isWE    = dow === 0 || dow === 6

      let tid = null

      if (type === 'diurno') {
        if (!isWE && !isHol) tid = 'diurno'
      } else if (type === 'tercer') {
        tid = tercer[idx % 6]; idx++
      } else if (type === 'cuarto') {
        tid = cuarto[idx % 4]; idx++
      }

      if (tid) {
        const t = TURNO_TYPES.find(x => x.id === tid)
        newEntries.push({
          user_id: session.user.id, date: dateStr, type: 'turno',
          turno_type: tid, turno_color: t?.bg, turno_label: t?.label,
        })
      }

      current.setDate(current.getDate() + 1)
    }

    // Insertar en lotes de 50
    for (let i = 0; i < newEntries.length; i += 50) {
      await supabase.from('rotativa_entries').insert(newEntries.slice(i, i + 50))
    }

    await fetchEntries()
    setSaving(false)
    setMode('view')
  }

  // ─── Save handlers ─────────────────────────────────────────────────────────

  async function saveTurno() {
    if (!selTurno) return
    const isCustom = selTurno === 'custom'
    const t = TURNO_TYPES.find(x => x.id === selTurno)
    await saveEntry({
      type: 'turno',
      turno_type:  isCustom ? 'personalizado' : selTurno,
      turno_color: isCustom ? customColor : t?.bg,
      turno_label: isCustom ? customLabel  : t?.label,
    })
  }

  async function saveEvento() {
    if (!eventoTitle.trim()) return
    const remindAt = new Date(`${selectedDay}T09:00:00`)
    remindAt.setHours(remindAt.getHours() - remindHours)
    remindAt.setMinutes(remindAt.getMinutes() - remindMins)
    await saveEntry({ type: 'evento', evento_title: eventoTitle, evento_remind_at: remindAt.toISOString() })
  }

  async function saveNota() {
    if (!notaText.trim()) return
    await saveEntry({ type: 'nota', nota_text: notaText })
  }

  function openGoogleCalendar() {
    const d   = selectedDay.replace(/-/g, '')
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventoTitle)}&dates=${d}/${d}`
    window.open(url, '_blank')
  }

  // ─── Meses ─────────────────────────────────────────────────────────────────

  const months = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - 2 + i, 1)
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  const TODAY = todayStr()

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="pb-24 md:pb-6 max-w-md mx-auto">

      <h1 className="text-2xl font-bold text-gray-800 mb-3">👤 Mi Rotativa</h1>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {TURNO_TYPES.map(t => (
          <span key={t.id} className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{ backgroundColor: t.bg, color: t.text }}>
            {t.label}
          </span>
        ))}
        <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-rose-100 text-rose-600">
          🇨🇱 Feriado
        </span>
        <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-indigo-600 text-white">
          Hoy
        </span>
      </div>

      {/* Calendario */}
      <div className="space-y-7">
        {months.map(({ year, month }) => {
          const isCurrent = year === today.getFullYear() && month === today.getMonth()
          const offset    = getOffset(year, month)
          const days      = getDays(year, month)

          return (
            <div key={`${year}-${month}`} ref={isCurrent ? currentRef : null}>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">
                {MONTHS_ES[month]} {year}
              </h2>

              <div className="grid grid-cols-7 mb-1">
                {DAYS_ES.map(d => (
                  <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} />)}

                {Array.from({ length: days }, (_, i) => i + 1).map(day => {
                  const dateStr   = toStr(year, month, day)
                  const isToday   = dateStr === TODAY
                  const isHoliday = !!holidays[dateStr]
                  const turno     = turnoForDay(dateStr)
                  const dEnt      = dayEntries(dateStr)
                  const hasEvento = dEnt.some(e => e.type === 'evento')
                  const hasNota   = dEnt.some(e => e.type === 'nota')
                  const dow       = new Date(year, month, day).getDay()
                  const isWeekend = dow === 0 || dow === 6

                  return (
                    <button
                      key={day}
                      onClick={() => {
                        setSelectedDay(dateStr)
                        setMode('view')
                        setShowDropdown(false)
                        setShowRotativaMenu(false)
                      }}
                      className="relative flex flex-col items-center justify-start pt-1 pb-1 rounded-xl transition hover:ring-2 hover:ring-indigo-300 min-h-[46px]"
                      style={{
                        backgroundColor: turno?.turno_color
                          || (isHoliday ? '#FFF1F2' : 'transparent'),
                      }}
                    >
                      <span className={`
                        w-7 h-7 flex items-center justify-center rounded-full text-xs font-medium
                        ${isToday
                          ? 'bg-indigo-600 text-white font-bold'
                          : isWeekend && !turno ? 'text-gray-400' : 'text-gray-700'}
                      `}>
                        {day}
                      </span>

                      {turno && (
                        <span className="text-center truncate w-full px-0.5 text-gray-700"
                          style={{ fontSize: '8px', lineHeight: '1.3' }}>
                          {turno.turno_label}
                        </span>
                      )}

                      <div className="flex gap-0.5 mt-0.5">
                        {hasEvento && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                        {hasNota   && <div className="w-1.5 h-1.5 rounded-full bg-amber-500"  />}
                        {isHoliday && !turno && <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* ─── Modal de día ─────────────────────────────────────────────────── */}
      {selectedDay && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center"
          onClick={e => { if (e.target === e.currentTarget) { setSelectedDay(null); reset() } }}
        >
          <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl p-5 max-h-[85vh] overflow-y-auto">

            {/* Cabecera */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-gray-800 capitalize">{displayDate(selectedDay)}</h3>
                {holidays[selectedDay] && (
                  <span className="text-xs bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full mt-1 inline-block">
                    🇨🇱 {holidays[selectedDay]}
                  </span>
                )}
              </div>
              <button
                onClick={() => { setSelectedDay(null); setMode('view'); reset() }}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >×</button>
            </div>

            {/* ── Vista principal ───────────────────────────────────────── */}
            {mode === 'view' && (() => {
              const dEnt       = dayEntries(selectedDay)
              const turnoOnDay = turnoForDay(selectedDay)
              const hasRotativa = entries.filter(e =>
                e.type === 'turno' && normDate(e.date) > selectedDay
              ).length > 5

              return (
                <>
                  {/* Entradas existentes */}
                  {dEnt.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-2 mb-3">
                      Sin registros para este día.
                    </p>
                  ) : (
                    <div className="space-y-2 mb-3">
                      {dEnt.map(entry => (
                        <div key={entry.id}
                          className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50">
                          <div className="flex items-center gap-2 min-w-0">
                            {entry.type === 'turno' && (
                              <>
                                <span className="w-3 h-3 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: entry.turno_color }} />
                                <span className="text-sm font-medium text-gray-700">
                                  Turno: {entry.turno_label}
                                </span>
                              </>
                            )}
                            {entry.type === 'evento' && (
                              <><span>📅</span>
                              <span className="text-sm text-gray-700 truncate">
                                Evento: {entry.evento_title}
                              </span></>
                            )}
                            {entry.type === 'nota' && (
                              <><span>📝</span>
                              <span className="text-sm text-gray-700 truncate">
                                Nota: {entry.nota_text}
                              </span></>
                            )}
                          </div>
                          <button onClick={() => deleteEntry(entry.id)}
                            className="text-gray-300 hover:text-red-400 text-base ml-2 flex-shrink-0">
                            🗑️
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Botón calcular rotativa */}
                  <button
                    onClick={() => {
                      if (!turnoOnDay) {
                        alert('Asigne un turno primero antes de calcular la rotativa.')
                        return
                      }
                      setShowRotativaMenu(!showRotativaMenu)
                    }}
                    className="w-full mb-2 py-2.5 px-4 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition flex items-center justify-center gap-2"
                  >
                    🔄 {hasRotativa ? 'Recalcular rotativa' : 'Calcular rotativa'}
                    <span className="text-xs opacity-60">{showRotativaMenu ? '▲' : '▼'}</span>
                  </button>

                  {/* Menú rotativa (inline) */}
                  {showRotativaMenu && (
                    <div className="mb-3 border border-indigo-100 rounded-xl overflow-hidden bg-white">
                      <p className="text-xs text-gray-500 px-4 pt-3 pb-1 font-medium uppercase tracking-wide">
                        Seleccione rotativa
                      </p>
                      {[
                        { id: 'diurno', label: '📅 Diurno',        desc: 'Lun–Vie, sin feriados' },
                        { id: 'tercer', label: '🔄 Tercer turno',   desc: '2 día / 2 noche / 2 libre' },
                        { id: 'cuarto', label: '🔄 Cuarto turno',   desc: '1 día / 1 noche / 2 libre' },
                        { id: 'borrar', label: '🗑️ Borrar rotativa', desc: 'Elimina todos los turnos desde hoy' },
                      ].map(opt => (
                        <button key={opt.id}
                          onClick={() => calculateRotativa(opt.id)}
                          disabled={saving}
                          className={`w-full text-left px-4 py-3 text-sm transition border-t border-gray-50
                            hover:bg-indigo-50 disabled:opacity-40
                            ${opt.id === 'borrar' ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'}`}
                        >
                          <span className="font-medium">{opt.label}</span>
                          <span className="text-xs text-gray-400 block">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* + Agregar (inline dropdown) */}
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2"
                  >
                    <span>+ Agregar</span>
                    <span className="text-xs opacity-70">{showDropdown ? '▲' : '▼'}</span>
                  </button>

                  {/* Opciones inline */}
                  {showDropdown && (
                    <div className="mt-2 border border-gray-100 rounded-xl overflow-hidden bg-white shadow-sm">
                      {[
                        { id: 'turno',  label: '🗓️ Turno'  },
                        { id: 'evento', label: '📅 Evento' },
                        { id: 'nota',   label: '📝 Nota'   },
                      ].map(opt => (
                        <button key={opt.id}
                          onClick={() => { setMode(opt.id); setShowDropdown(false) }}
                          className="w-full text-left px-4 py-3.5 text-sm text-gray-700 hover:bg-gray-50 transition border-t border-gray-100 first:border-0">
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )
            })()}

            {/* ── Formulario Turno ──────────────────────────────────────── */}
            {mode === 'turno' && (
              <div>
                <h4 className="font-medium text-gray-700 mb-3">Selecciona el tipo de turno</h4>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {TURNO_TYPES.map(t => (
                    <button key={t.id} onClick={() => setSelTurno(t.id)}
                      className={`py-2.5 px-2 rounded-xl text-sm font-medium transition border-2
                        ${selTurno === t.id ? 'border-indigo-500 scale-105 shadow-sm' : 'border-transparent'}`}
                      style={{ backgroundColor: t.bg, color: t.text }}>
                      {t.label}
                    </button>
                  ))}
                  <button onClick={() => setSelTurno('custom')}
                    className={`py-2.5 px-2 rounded-xl text-sm font-medium transition border-2 bg-indigo-50 text-indigo-700
                      ${selTurno === 'custom' ? 'border-indigo-500 scale-105 shadow-sm' : 'border-transparent'}`}>
                    + Etiqueta
                  </button>
                </div>

                {selTurno === 'custom' && (
                  <div className="space-y-2 mb-3 p-3 bg-gray-50 rounded-xl">
                    <input type="text" placeholder="Nombre de la etiqueta"
                      value={customLabel} onChange={e => setCustomLabel(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    <div className="flex items-center gap-3">
                      <label className="text-sm text-gray-600">Color:</label>
                      <input type="color" value={customColor} onChange={e => setCustomColor(e.target.value)}
                        className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200 p-0.5" />
                      <span className="text-sm text-gray-500 font-mono">{customColor}</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  <button onClick={() => { setMode('view'); reset() }}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition">
                    Cancelar
                  </button>
                  <button onClick={saveTurno} disabled={!selTurno || saving}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition">
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            )}

            {/* ── Formulario Evento ─────────────────────────────────────── */}
            {mode === 'evento' && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700">Nuevo Evento</h4>
                <input type="text" placeholder="Título del evento"
                  value={eventoTitle} onChange={e => setEventoTitle(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />

                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-600 mb-2 font-medium">Recordatorio antes del evento:</p>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-gray-400 mb-1 block">Horas antes</label>
                      <select value={remindHours} onChange={e => setRemindHours(Number(e.target.value))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                        {[0,1,2,3,6,12,24,48].map(h => <option key={h} value={h}>{h}h</option>)}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-400 mb-1 block">Minutos antes</label>
                      <select value={remindMins} onChange={e => setRemindMins(Number(e.target.value))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                        {[0,15,30].map(m => <option key={m} value={m}>{m === 0 ? '0 min' : `${m} min`}</option>)}
                      </select>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    * Notificaciones por email requieren configuración adicional.
                  </p>
                </div>

                <button onClick={openGoogleCalendar}
                  className="w-full py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 transition">
                  📅 Agregar a Google Calendar
                </button>

                <div className="flex gap-2">
                  <button onClick={() => { setMode('view'); reset() }}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition">
                    Cancelar
                  </button>
                  <button onClick={saveEvento} disabled={!eventoTitle.trim() || saving}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition">
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            )}

            {/* ── Formulario Nota ───────────────────────────────────────── */}
            {mode === 'nota' && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700">Nueva Nota</h4>
                <textarea placeholder="Escribe tu nota aquí..."
                  value={notaText} onChange={e => setNotaText(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
                <div className="flex gap-2">
                  <button onClick={() => { setMode('view'); reset() }}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition">
                    Cancelar
                  </button>
                  <button onClick={saveNota} disabled={!notaText.trim() || saving}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition">
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  )
}