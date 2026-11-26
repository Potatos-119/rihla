import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource/instrument-sans/400.css'
import '@fontsource/instrument-sans/500.css'
import '@fontsource/instrument-sans/600.css'
import '@fontsource/reem-kufi/500.css'
import './index.css'
import App from './App.tsx'
import { applyTheme, initialTheme } from './lib/themes'

// paint the saved theme before React renders, so there is no flash of the default colours
applyTheme(initialTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
