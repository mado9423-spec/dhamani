import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import EmployeeLoginPage from "./pages/EmployeeLoginPage";
import HomePage from "./pages/HomePage";
import DeclarationPage from "./pages/DeclarationPage";
import AppointmentBookingPage from "./pages/AppointmentBookingPage";
import TransactionsPage from "./pages/TransactionsPage";
import EmployeeDashboardPage from "./pages/EmployeeDashboardPage";
import EmployeeCitizenDetailPage from "./pages/EmployeeCitizenDetailPage";
import EmployeeChangePasswordPage from "./pages/EmployeeChangePasswordPage";
import { SplashScreen } from "./components/SplashScreen";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/employee/login" element={<EmployeeLoginPage />} />
        <Route path="/employee/dashboard" element={<EmployeeDashboardPage />} />
        <Route path="/employee/citizens/:citizenId" element={<EmployeeCitizenDetailPage />} />
        <Route path="/employee/change-password" element={<EmployeeChangePasswordPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/declaration" element={<DeclarationPage />} />
        <Route path="/appointments/:type" element={<AppointmentBookingPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/transactions/military" element={<TransactionsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
