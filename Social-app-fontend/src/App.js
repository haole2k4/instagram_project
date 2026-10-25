import React from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import RouterApp from "./Routes/RouterApp";
import { ToastContainer } from "react-toastify";
import TopLoadingBar from "./Components/Common/TopLoadingBar";

function App() {
  return (
    <BrowserRouter>
      <TopLoadingBar />
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route
          path="/*"
          element={
            <div className="min-h-dvh w-full bg-ig-ground text-ig-text">
              <RouterApp />
            </div>
          }
        />
      </Routes>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        theme="dark"
        toastClassName="!bg-ig-raised !text-ig-text !border !border-ig-border !rounded-panel !shadow-lg"
      />
    </BrowserRouter>
  );
}

export default App;
