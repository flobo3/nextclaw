import React from "react";
import ReactDOM from "react-dom/client";
import "@nextclaw/ncp-react-ui/styles.css";
import { App } from "./app";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
