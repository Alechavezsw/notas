import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import ContadorDinero from './pages/ContadorDinero.jsx'
import Salud from './pages/Salud.jsx'
import Proyectos from './pages/Proyectos.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/dinero" element={<ContadorDinero />} />
        <Route path="/salud" element={<Salud />} />
        <Route path="/proyectos" element={<Proyectos />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
