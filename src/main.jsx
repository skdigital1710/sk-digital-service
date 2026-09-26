import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import Admin from "./Admin";
import "./styles.css";

const isAdminPage = /^\/admin(?:\/)?$/.test(window.location.pathname);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isAdminPage ? <Admin /> : <App />}
  </React.StrictMode>
);
