import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, LogIn, ShieldCheck, ParkingSquare, LogOut, RefreshCw } from 'lucide-react';
import { fetchAdminStats } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

function StatCard({ icon, label, value }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
        {icon}
      </span>
      <div>
        <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{value}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('uz-UZ', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

export default function AdminPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAdminStats();
      setStats(data);
    } catch (err) {
      setError(err.message || 'Statistikani yuklab bo\u2018lmadi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2 font-black text-slate-900 dark:text-white">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20"><ParkingSquare size={22} /></span>
            Park<span className="text-blue-600">Top</span> <span className="ml-1 rounded-lg bg-blue-50 px-2 py-1 text-xs font-bold text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">Admin</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 dark:text-slate-400 sm:inline">{user?.name} ({user?.email})</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 transition hover:border-red-300 hover:text-red-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              <LogOut size={16} /> Chiqish
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Admin panel</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Ro'yxatdan o'tgan foydalanuvchilar va statistika</p>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <RefreshCw size={16} /> Yangilash
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-slate-500 dark:text-slate-400">Yuklanmoqda...</p>
        ) : stats && (
          <>
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard icon={<Users size={22} />} label="Jami ro'yxatdan o'tganlar" value={stats.totalUsers} />
              <StatCard icon={<LogIn size={22} />} label="Jami loginlar soni" value={stats.totalLogins} />
              <StatCard icon={<ShieldCheck size={22} />} label="Adminlar soni" value={stats.totalAdmins} />
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                    <tr>
                      <th className="px-5 py-3">Ism</th>
                      <th className="px-5 py-3">Email</th>
                      <th className="px-5 py-3">Rol</th>
                      <th className="px-5 py-3">Ro'yxatdan o'tgan</th>
                      <th className="px-5 py-3">Oxirgi login</th>
                      <th className="px-5 py-3">Login soni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {stats.users.map((u) => (
                      <tr key={u.id} className="text-slate-700 dark:text-slate-300">
                        <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">{u.name}</td>
                        <td className="px-5 py-3">{u.email}</td>
                        <td className="px-5 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${u.role === 'admin' ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-5 py-3">{formatDate(u.createdAt)}</td>
                        <td className="px-5 py-3">{formatDate(u.lastLoginAt)}</td>
                        <td className="px-5 py-3">{u.loginCount}</td>
                      </tr>
                    ))}
                    {stats.users.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-slate-400">Hozircha foydalanuvchilar yo'q</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
