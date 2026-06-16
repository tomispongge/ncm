import { Link } from 'react-router-dom'

const modules = [
  {
    path: '/rotativa',
    icon: '👤',
    label: 'Mi Rotativa',
    description: 'Pacientes asignados a tu turno',
    color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
    iconBg: 'bg-blue-100',
    stat: null,
    statLabel: 'Ver pacientes →',
  },
  {
    path: '/sala',
    icon: '🛏️',
    label: 'Sala',
    description: 'Ocupación de camas y asignaciones',
    color: 'bg-green-50 border-green-200 hover:bg-green-100',
    iconBg: 'bg-green-100',
    stat: null,
    statLabel: 'Ver sala →',
  },
  {
    path: '/medicamentos',
    icon: '💊',
    label: 'Librería de Medicamentos',
    description: 'Diluciones, dosis y compatibilidades',
    color: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
    iconBg: 'bg-purple-100',
    stat: null,
    statLabel: 'Ver medicamentos →',
  },
  {
    path: '/laboratorio',
    icon: '🔬',
    label: 'Resultados de Laboratorio',
    description: 'Resultados y tendencias por paciente',
    color: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
    iconBg: 'bg-yellow-100',
    stat: null,
    statLabel: 'Ver laboratorio →',
  },
  {
    path: '/pendientes',
    icon: '✅',
    label: 'Pendientes',
    description: 'Tareas pendientes del turno',
    color: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
    iconBg: 'bg-orange-100',
    stat: null,
    statLabel: 'Ver pendientes →',
  },
  {
    path: '/turno',
    icon: '📋',
    label: 'Entrega de Turno',
    description: 'Resumen y traspaso al turno siguiente',
    color: 'bg-red-50 border-red-200 hover:bg-red-100',
    iconBg: 'bg-red-100',
    stat: null,
    statLabel: 'Ver entrega →',
  },
]

export default function Dashboard({ user }) {
  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div className="pb-20 md:pb-0">
      {/* Saludo */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
          {greeting} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date().toLocaleDateString('es-CL', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Grid de módulos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((m) => (
          <Link
            key={m.path}
            to={m.path}
            className={`border rounded-xl p-5 transition cursor-pointer ${m.color}`}
          >
            <div className="flex items-start gap-4">
              <div className={`${m.iconBg} rounded-xl p-3 text-2xl`}>
                {m.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-gray-800 text-base leading-tight">
                  {m.label}
                </h2>
                <p className="text-sm text-gray-500 mt-1">{m.description}</p>
                <p className="text-xs font-medium text-indigo-600 mt-3">
                  {m.statLabel}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}