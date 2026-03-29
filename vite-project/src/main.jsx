import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { MapProvider } from 'react-map-gl'
import HomePage from './homepage.tsx'
import SimulationApp from './App.jsx'
import './index.css'

function SimulateRoute() {
  return (
    <MapProvider>
      <SimulationApp />
    </MapProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/simulate" element={<SimulateRoute />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)