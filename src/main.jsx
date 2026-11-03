import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./Shell.jsx";
import "./product.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
