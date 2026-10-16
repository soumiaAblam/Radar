import LoginPage from './pages/Login/Login'
import { Routes, Route } from 'react-router-dom'
import DashboardPage from './pages/Dashboard/Dashboard'

/* funcion LoginPage en Login.tsx */
/*type PageName = 'login' | 'dashboard' | 'audience'*/
/*type Status = 'loading' | 'success' | 'error'*/

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/Dashboard" element={<DashboardPage />} />
    </Routes>
  )
}

export default App

