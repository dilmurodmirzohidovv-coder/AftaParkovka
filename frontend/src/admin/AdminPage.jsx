import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, LogIn, ShieldCheck, ParkingSquare, LogOut, RefreshCw, Pencil, Trash2, Check, X, Send } from 'lucide-react';
import { fetchAdminStats, renameUserAdmin, deleteUserAdmin } from '../api/client.js';
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
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [busyId, setBusyId] = useState(null);

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

  const startEdit = (u) => {
    setEditingId(u.id);
    setEditingName(u.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const saveEdit = async (id) => {
    const name = editingName.trim();
    if (!name) return;
    setBusyId(id);
    setError('');
    try {
      await renameUserAdmin(id, name);
      cancelEdit();
      await load();
    } catch (err) {
      setError(err.message || 'Ismni o\u2018zgartirib bo\u2018lmadi');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`${u.name} (${u.email}) akkauntini o'chirishga ishonchingiz komilmi?`)) return;
    setBusyId(u.id);
    setError('');
    try {
      await deleteUserAdmin(u.id);
      await load();
    } catch (err) {
      setError(err.message || 'Akkauntni o\u2018chirib bo\u2018lmadi');
    } finally {
      setBusyId(null);
    }
  };

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
                      <th className="px-5 py-3">Telegram</th>
                      <th className="px-5 py-3 text-right">Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {stats.users.map((u) => {
                      const isEditing = editingId === u.id;
                      const isBusy = busyId === u.id;
                      const booking = u.telegramBookings?.[0];

                      return (
                        <tr key={u.id} className="text-slate-700 dark:text-slate-300">
                          <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">
                            {isEditing ? (
                              <input
                                autoFocus
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEdit(u.id);
                                  if (e.key === 'Escape') cancelEdit();
                                }}
                                className="w-40 rounded-lg border border-blue-300 bg-white px-2 py-1 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 dark:border-blue-700 dark:bg-slate-800 dark:text-white"
                              />
                            ) : (
                              u.name
                            )}
                          </td>
                          <td className="px-5 py-3">{u.email}</td>
                          <td className="px-5 py-3">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${u.role === 'admin' ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-5 py-3">{formatDate(u.createdAt)}</td>
                          <td className="px-5 py-3">{formatDate(u.lastLoginAt)}</td>
                          <td className="px-5 py-3">{u.loginCount}</td>
                          <td className="px-5 py-3">
                            {!u.telegramLinked ? (
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                Bog'lanmagan
                              </span>
                            ) : booking ? (
                              <span
                                title={booking.address || ''}
                                className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                              >
                                <Send size={12} /> Band: {booking.name || 'Parkovka'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                                <Send size={12} /> Bog'langan
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-2">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => saveEdit(u.id)}
                                    disabled={isBusy}
                                    className="rounded-lg p-1.5 text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-50 dark:hover:bg-emerald-500/10"
                                    title="Saqlash"
                                  >
                                    <Check size={16} />
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    disabled={isBusy}
                                    className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
                                    title="Bekor qilish"
                                  >
                                    <X size={16} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => startEdit(u)}
                                    disabled={isBusy}
                                    className="rounded-lg p-1.5 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50 dark:hover:bg-blue-500/10"
                                    title="Ismini o'zgartirish"
                                  >
                                    <Pencil size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(u)}
                                    disabled={isBusy || u.id === user?.id}
                                    className="rounded-lg p-1.5 text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-500/10"
                                    title={u.id === user?.id ? "O'zingizni o'chira olmaysiz" : "O'chirish"}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {stats.users.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-5 py-8 text-center text-slate-400">Hozircha foydalanuvchilar yo'q</td>
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
