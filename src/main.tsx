import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { getRouter } from './router'
import './styles.css'

console.log("PLATFORM BOOTING...");

// Create a new router instance
const router = getRouter()

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Render the app
const rootElement = document.getElementById('root')
if (rootElement) {
  console.log("ROOT ELEMENT FOUND, MOUNTING...");
  const root = ReactDOM.createRoot(rootElement)
  root.render(<RouterProvider router={router} />)
} else {
  console.error("ROOT ELEMENT NOT FOUND!");
}
