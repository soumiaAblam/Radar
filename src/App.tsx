import LoginPage from './pages/Login/Login'
import { Routes, Route } from 'react-router-dom'
import DashboardPage from './pages/Dashboard/Dashboard'
import AudiencePage from './pages/Audience/Audience'
import PublicationPage from './pages/Publication/Publication'
import RadarPage from './pages/Radar/Radar'
import ContentManagementPage from './pages/ContentManagement/ContentManagement'
import { AccountProvider } from './context/AccountContext'

/* funcion LoginPage en Login.tsx */
/*type PageName = 'login' | 'dashboard' | 'audience'*/
/*type Status = 'loading' | 'success' | 'error'*/

function App() {
  return (
    <AccountProvider>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/Dashboard" element={<DashboardPage />} />
        <Route path="/audiencia" element={<AudiencePage />} />
        <Route path="/publicaciones" element={<PublicationPage />} />
        <Route path="/gestion-de-contenidos" element={<ContentManagementPage />} />
        <Route path="/radar" element={<RadarPage />} />
      </Routes>
    </AccountProvider>
  )
}

export default App

