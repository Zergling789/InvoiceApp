import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConfirmProvider, ToastProvider } from "@/ui/FeedbackProvider";
import App from "./App";
import "./styles/index.css";


ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ToastProvider>
      <ConfirmProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ConfirmProvider>
    </ToastProvider>
  </React.StrictMode>
);
