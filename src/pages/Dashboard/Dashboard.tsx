import Header from '../../components/Header/Header'
import Sidebar from '../../components/Sidebar/Sidebar'
import './dashboard.css'


function DashboardPage() {
  return (
    <div className="dashboardLayout">
    <Sidebar/>

     <div className="dashboardMain">
      <Header title="Dashboard" />

      <main className="dashboardMain">
        <h1>Dashboard</h1>
        <p>Bienvenido al panel de control.</p>
      </main>
    </div>
    </div>
  )
}

export default DashboardPage
