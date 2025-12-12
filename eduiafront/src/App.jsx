// src/App.jsx
import { useState } from "react";
import { Route, Routes } from "react-router-dom";
import "./App.css";
import LoginForm from "./components/Auth/LoginForm";
import RegistrationForm from "./components/Auth/RegistrationForm";
import DashboardLayout from "./components/Layout/DashboardLayout";
import Home from "./pages/Home";
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("token")
  );

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Home
            isAuthenticated={isAuthenticated}
            setIsAuthenticated={setIsAuthenticated}
          />
        }
      />
      <Route
        path="/register"
        element={<RegistrationForm setIsAuthenticated={setIsAuthenticated} />}
      />
      <Route
        path="/login"
        element={<LoginForm setIsAuthenticated={setIsAuthenticated} />}
      />
      <Route path="/dashboard" element={<DashboardLayout />} />
      <Route path="/correct_exam" element={<DashboardLayout />} />
      <Route path="/exam_results" element={<DashboardLayout />} />
      <Route path="/recommandations" element={<DashboardLayout />} />
    </Routes>
  );
}

export default App;
