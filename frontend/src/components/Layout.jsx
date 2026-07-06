import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const modules = [
  { path: '/',          icon: '🏠', label: 'Dashboard' },
  { path: '/rotativa',  icon: '👤', label: 'Mi Rotativa' },
  { path: '/sala',      icon: '🛏️', label: 'Sala' },
  { path: '/medicamentos', icon: '💊', label: 'Medicamentos' },
  { path: '/laboratorio',  icon: '🔬', label: 'Laboratorio' },
  { path: '/pendientes',   icon: '✅', label: 'Pendientes' },
  { path: '/turno',        icon: '📋', label: 'Entrega de Turno' },
]

export default function Layout({ children, user }) {
  const location = useLocation()

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Navbar superior (fija arriba) */}
      <header className="bg-indigo-700 text-white shadow-md shrink-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <span className="text-xl font-bold tracking-wide">NCM</span>
          <div className="flex items-center gap-3">
            <span className="text-sm hidden sm:block opacity-80">{user?.email}</span>
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-sm bg-indigo-600 hover:bg-indigo-500 px-3 py-1 rounded-lg transition"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar (solo desktop) — fija, con scroll propio si hiciera falta */}
        <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-200 py-4 shrink-0 overflow-y-auto">
          {modules.map((m) => (
            <Link
              key={m.path}
              to={m.path}
              className={`flex items-center gap-3 px-5 py-3 text-sm font-medium transition
                ${location.pathname === m.path
                  ? 'bg-indigo-50 text-indigo-700 border-r-2 border-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              <span>{m.icon}</span>
              <span>{m.label}</span>
            </Link>
          ))}
        </aside>

        {/* Contenido principal — ÚNICA zona con scroll */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-6xl w-full mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Navbar inferior (solo móvil) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2 z-50">
        {modules.slice(0, 6).map((m) => (
          <Link
            key={m.path}
            to={m.path}
            className={`flex flex-col items-center text-xs gap-0.5 px-2 py-1 rounded-lg transition
              ${location.pathname === m.path
                ? 'text-indigo-700'
                : 'text-gray-500'
              }`}
          >
            <span className="text-lg">{m.icon}</span>
            <span className="hidden xs:block">{m.label.split(' ')[0]}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}