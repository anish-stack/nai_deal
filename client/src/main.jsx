import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { HelmetProvider } from 'react-helmet-async';
import { LocationProvider } from './context/LocationContext';
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>

    <HelmetProvider>
      <LocationProvider>

        <App />
      </LocationProvider>
    </HelmetProvider>
  </React.StrictMode>,
)
