import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App"
import "./desktop.css"

const root = document.getElementById("root")
if (!root) throw new Error("FetchMoji desktop UI root element is missing")

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
