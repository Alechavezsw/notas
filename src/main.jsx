import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import App from './App.jsx'
import ContadorDinero from './pages/ContadorDinero.jsx'
import Salud from './pages/Salud.jsx'
import Proyectos from './pages/Proyectos.jsx'
import Calendario from './pages/Calendario.jsx'
import MapaMental from './pages/MapaMental.jsx'
import Opportunity from './pages/Opportunity.jsx'
import MisEmpresas from './pages/MisEmpresas.jsx'
import Entradas from './pages/Entradas.jsx'
import AsistenteAI from './components/AsistenteAI'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/dinero" element={<ContadorDinero />} />
        <Route path="/salud" element={<Salud />} />
        <Route path="/proyectos" element={<Proyectos />} />
        <Route path="/calendario" element={<Calendario />} />
        <Route path="/mapa-mental" element={<MapaMental />} />
        <Route path="/opportunity" element={<Opportunity />} />
        <Route path="/mis-empresas" element={<MisEmpresas />} />
        <Route path="/entradas" element={<Entradas />} />
      </Routes>
      <AsistenteAI />
    </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
)
