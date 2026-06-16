import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Login from './components/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Rotativa from './pages/Rotativa'
import Sala from './pages/Sala'
import Medicamentos from './pages/Medicamentos'
import Laboratorio from './pages/Laboratorio'
import Pendientes from './pages/Pendientes'
import Turno from './pages/Turno'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

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

  return (
    <BrowserRouter>
      <Layout user={session.user}>
        <Routes>
          <Route path="/" element={<Dashboard user={session.user} />} />
          <Route path="/rotativa" element={<Rotativa />} />
          <Route path="/sala" element={<Sala />} />
          <Route path="/medicamentos" element={<Medicamentos />} />
          <Route path="/laboratorio" element={<Laboratorio />} />
          <Route path="/pendientes" element={<Pendientes />} />
          <Route path="/turno" element={<Turno />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}