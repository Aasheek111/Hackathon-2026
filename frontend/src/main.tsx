import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { ThemeProvider } from './contexts/ThemeContext.tsx'
import { AccessibilityProvider } from './contexts/AccessibilityContext.tsx'
import { AudioNavigationProvider } from './contexts/AudioNavigationContext.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AccessibilityProvider>
            {/* Inside the Router (it navigates and watches the location) and
                inside Accessibility/Auth (it reads the learner's profile to
                decide whether to switch itself on). */}
            <AudioNavigationProvider>
              <App />
            </AudioNavigationProvider>
          </AccessibilityProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
