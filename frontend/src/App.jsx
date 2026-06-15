import { useState } from 'react'

export default function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Nursing App
        </h1>
        <p className="text-gray-600 mb-6">
          Hospital Management System
        </p>
        
        <div className="bg-indigo-50 rounded-lg p-4 mb-6">
          <p className="text-center text-2xl font-bold text-indigo-600">
            {count}
          </p>
          <p className="text-center text-sm text-gray-600 mt-2">
            Click count (test)
          </p>
        </div>

        <button
          onClick={() => setCount(count + 1)}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
        >
          Click me
        </button>

        <p className="text-center text-xs text-gray-500 mt-4">
          Frontend setup complete ✓
        </p>
      </div>
    </div>
  )
}