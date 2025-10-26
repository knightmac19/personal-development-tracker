import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthWrapper } from "./components/auth/AuthWrapper";
import { Header } from "./components/layout/Header";

// Pages
import { Dashboard } from "./pages/Dashboard";
import { Journal } from "./pages/Journal";
import { Goals } from "./pages/Goals";
import { Stats } from "./pages/Stats";
import { Settings } from "./pages/Settings";
import { LifeSubsection } from "./pages/LifeSubsection";

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                background: "rgb(31 41 55)",
                color: "#fff",
              },
              success: {
                iconTheme: {
                  primary: "rgb(34 197 94)",
                  secondary: "#fff",
                },
              },
              error: {
                iconTheme: {
                  primary: "rgb(239 68 68)",
                  secondary: "#fff",
                },
              },
            }}
          />
          <AuthWrapper>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
              <Header />
              <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/journal" element={<Journal />} />
                  <Route path="/goals" element={<Goals />} />
                  <Route path="/stats" element={<Stats />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route
                    path="/subsection/:subsectionName"
                    element={<LifeSubsection />}
                  />
                </Routes>
              </main>
            </div>
          </AuthWrapper>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
