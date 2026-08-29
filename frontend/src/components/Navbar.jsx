import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, ParkingSquare, Moon, Sun, Globe, Check, Send, LogIn, LogOut, ShieldCheck, UserCircle2 } from 'lucide-react';
import { useTheme } from '../theme/ThemeContext.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { getTelegramBotLink } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

export default function Navbar() {
  const { isDark, toggleTheme } = useTheme();
  const { lang, setLang, t, languages } = useLanguage();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [langOpen, setLangOpen] = useState(false);
  const langBoxRef = useRef(null);
  const telegramLink = getTelegramBotLink();

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  useEffect(() => {
    const onClickOutside = (e) => {
      if (langBoxRef.current && !langBoxRef.current.contains(e.target)) setLangOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const activeLang = languages.find(l => l.code === lang) || languages[0];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur transition-colors dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="#home" className="flex items-center gap-2 font-black text-slate-900 dark:text-white">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20"><ParkingSquare size={22}/></span>
          Park<span className="text-blue-600">Top</span>
        </a>
        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300 md:flex">
          <a className="transition hover:text-blue-600" href="#home">{t('nav.home')}</a>
          <a className="transition hover:text-blue-600" href="#parking">{t('nav.parking')}</a>
          <a className="transition hover:text-blue-600" href="#about">{t('nav.about')}</a>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 sm:flex">
            <MapPin size={17} className="text-blue-600"/> {t('nav.location')}
          </div>

          {telegramLink && (
            <a
              href={telegramLink}
              target="_blank"
              rel="noopener noreferrer"
              title={t('telegram.cta')}
              className="flex items-center gap-1.5 rounded-xl bg-sky-500 px-3 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-sky-600"
            >
              <Send size={16}/> <span className="hidden sm:inline">{t('telegram.cta')}</span><span className="sm:hidden">{t('telegram.navShort')}</span>
            </a>
          )}

          <div className="relative" ref={langBoxRef}>
            <button
              type="button"
              onClick={() => setLangOpen(o => !o)}
              aria-label="Change language"
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-500"
            >
              <Globe size={16}/> {activeLang.short}
            </button>
            {langOpen && (
              <ul className="absolute right-0 top-[calc(100%+8px)] z-30 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                {languages.map(l => (
                  <li key={l.code}>
                    <button
                      type="button"
                      onClick={() => { setLang(l.code); setLangOpen(false); }}
                      className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm ${l.code === lang ? 'bg-blue-50 font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                    >
                      {l.label}
                      {l.code === lang && <Check size={15}/>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? t('theme.light') : t('theme.dark')}
            title={isDark ? t('theme.light') : t('theme.dark')}
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-500"
          >
            {isDark ? <Sun size={17}/> : <Moon size={17}/>}
          </button>

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Link
                  to="/admin"
                  className="hidden items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 sm:flex"
                >
                  <ShieldCheck size={16}/> Admin
                </Link>
              )}
              <span className="hidden items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 md:flex">
                <UserCircle2 size={18} className="text-blue-600"/> {user?.name}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                title="Chiqish"
                className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-red-300 hover:text-red-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                <LogOut size={17}/>
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              <LogIn size={16}/> <span className="hidden sm:inline">Kirish</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
