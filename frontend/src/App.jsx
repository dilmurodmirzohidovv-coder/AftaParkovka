import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import SearchPage from './pages/SearchPage.jsx';
import Login from './auth/Login.jsx';
import Signup from './auth/Signup.jsx';
import ProtectedRoute from './auth/ProtectedRoute.jsx';
import AdminPage from './admin/AdminPage.jsx';
import { useLanguage } from './i18n/LanguageContext.jsx';

function HomePage() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-slate-50 transition-colors dark:bg-slate-950">
      <Navbar/>
      <SearchPage/>
      <footer id="about" className="border-t border-slate-800 bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-10 text-sm text-slate-400 sm:px-6 lg:px-8">{t('footer.text')}</div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage/>} />
      <Route path="/login" element={<Login/>} />
      <Route path="/signup" element={<Signup/>} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute requireAdmin>
            <AdminPage/>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<HomePage/>} />
    </Routes>
  );
}
