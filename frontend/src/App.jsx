import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Login from './components/Login'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Recupera la sesión guardada al cargar (recuerda al usuario)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Escucha login/logout en tiempo real
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    )

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Cargando...</p>
      </div>
    )
  }

  if (!session) return <Login />

  // Vista autenticada (placeholder — aquí irá el dashboard)
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">NCM</h1>
            <p className="text-sm text-gray-600">{session.user.email}</p>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition"
          >
            Cerrar sesión
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mt-4">
          <p className="text-gray-700">✓ Sesión iniciada. Aquí irá el dashboard.</p>
        </div>
      </div>
    </div>
  )
}