import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Game from "./Game";
import Backoffice from "./Backoffice";

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Game />} />
        <Route path="/backoffice" element={<Backoffice />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;


