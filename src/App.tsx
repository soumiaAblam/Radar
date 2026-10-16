import LoginPage from './pages/Login/Login'
import { Routes, Route } from 'react-router-dom'
import DashboardPage from './pages/Dashboard/Dashboard'

/* funcion LoginPage en Login.tsx */

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/Dashboard" element={<DashboardPage />} />
    </Routes>
  )
}

export default App

