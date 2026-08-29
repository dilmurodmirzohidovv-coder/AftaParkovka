import React from 'react';
import { CarFront, Clock3, MapPin, Navigation, Route, Send, Wallet } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext.jsx';

export default function LotCard({ lot, selected, onSelect }) {
  const { t } = useLanguage();
  return (
    <article
      onClick={onSelect}
      className={`cursor-pointer rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:bg-slate-900 dark:shadow-none ${selected ? 'border-blue-500 ring-2 ring-blue-100 dark:ring-blue-500/20' : 'border-slate-200 dark:border-slate-800'}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">{lot.name}</h3>
          <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-500 dark:text-slate-400"><MapPin size={16} className="mt-0.5 shrink-0"/>{lot.address}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${lot.available > 0 || lot.available === null ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'}`}>{lot.available ?? '—'} {t('lot.spots')}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-2"><Route size={16} className="text-blue-600"/>{lot.distance?.toFixed(2)} km</div>
        <div className="flex items-center gap-2"><Wallet size={16} className="text-blue-600"/>{Number(lot.price || 0).toLocaleString()} {t('lot.pricePerHour')}</div>
        <div className="flex items-center gap-2"><CarFront size={16} className="text-blue-600"/>{lot.total || '—'} {t('lot.totalSpots')}</div>
        <div className="flex items-center gap-2"><Clock3 size={16} className="text-blue-600"/>{t('lot.alwaysOpen')}</div>
      </div>
      {lot.booked > 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400">
          <Send size={13}/> {lot.booked} {t('lot.bookedByBot')}
        </p>
      )}
      <button onClick={(e) => { e.stopPropagation(); onSelect(); }} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-bold text-white transition hover:bg-blue-700">
        <Navigation size={18}/> {t('lot.showRoute')}
      </button>
    </article>
  );
}
