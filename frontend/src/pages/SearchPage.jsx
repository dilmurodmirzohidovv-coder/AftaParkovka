import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Car, LoaderCircle, MapPinned, Search, Sparkles, LocateFixed } from 'lucide-react';
import { getRoute, searchParking, autocompleteAddress } from '../api/client.js';
import LotCard from '../components/LotCard.jsx';
import RadarView from '../components/RadarView.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';

export default function SearchPage() {
  const { t } = useLanguage();
  const [q, setQ] = useState('');
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [route, setRoute] = useState(null);
  const [routeFrom, setRouteFrom] = useState(null);
  const [locating, setLocating] = useState(false);

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef(null);
  const boxRef = useRef(null);
  const skipNextFetch = useRef(false);

  // Debounced autocomplete: har bir kirituvdan 350ms keyin so'rov yuboradi
  useEffect(() => {
    if (skipNextFetch.current) { skipNextFetch.current = false; return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (q.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setSuggestLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const list = await autocompleteAddress(q.trim());
        setSuggestions(list);
        setShowSuggestions(list.length > 0);
        setActiveIndex(-1);
      } catch {
        setSuggestions([]);
      } finally {
        setSuggestLoading(false);
      }
    }, 350);

    return () => clearTimeout(debounceRef.current);
  }, [q]);

  // Tashqariga bosilganda ro'yxatni yopish
  useEffect(() => {
    const onClickOutside = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const runSearch = async (query) => {
    if (!query.trim()) return;
    setLoading(true); setError('');
    try {
      const result = await searchParking(query);
      setData(result);
      setSelected(null);
      setRoute(null);
      setRouteFrom(null);
    } catch (err) { setError(err.message); setData(null); }
    finally { setLoading(false); }
  };

  const pickSuggestion = (item) => {
    skipNextFetch.current = true;
    setQ(item.label || item.displayName);
    setShowSuggestions(false);
    setSuggestions([]);
    runSearch(item.label || item.displayName);
  };

  const onKeyDown = (e) => {
    if (!showSuggestions || !suggestions.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { if (activeIndex >= 0) { e.preventDefault(); pickSuggestion(suggestions[activeIndex]); } }
    else if (e.key === 'Escape') { setShowSuggestions(false); }
  };

  const loadRoute = async (lot, from = data?.destination) => {
    if (!from) return;
    setSelected(lot);
    setError('');
    try {
      const r = await getRoute(from, lot);
      setRoute(r);
      setRouteFrom(from);
    } catch (e) {
      setRoute(null);
      setError(e.message || t('errors.routeFailed'));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setShowSuggestions(false);
    runSearch(q);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError(t('errors.geoNotSupported'));
      return;
    }
    setLocating(true); setError('');
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      const from = { lat: coords.latitude, lng: coords.longitude, displayName: t('results.myLocation') };
      try {
        // Current location is sent as a coordinate query so the backend can find nearby parking.
        const result = await searchParking(`${coords.latitude}, ${coords.longitude}`);
        setData({ ...result, destination: from });
        setQ(t('results.myLocation'));
        setSelected(null); setRoute(null); setRouteFrom(null);
      } catch (e) {
        setError(t('errors.locationSearchFailed'));
      } finally { setLocating(false); }
    }, () => {
      setError(t('errors.geoDenied'));
      setLocating(false);
    }, { enableHighAccuracy: true, timeout: 10000 });
  };

  return <main id="home">
    <section className="overflow-hidden bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_.85fr] lg:px-8 lg:py-24">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-extrabold tracking-widest text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"><Sparkles size={14}/> {t('hero.badge')}</div>
          <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-6xl dark:text-white">{t('hero.title1')}<br/><span className="text-blue-600">{t('hero.title2')}</span></h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg dark:text-slate-400">{t('hero.subtitle')}</p>
          <form onSubmit={submit} className="mt-8 flex max-w-2xl flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10 sm:flex-row dark:border-slate-800 dark:bg-slate-900 dark:shadow-none" ref={boxRef} style={{ position: 'relative' }}>
            <div className="relative flex min-w-0 flex-1 items-center gap-3 px-3">
              <Search className="shrink-0 text-slate-400" size={20}/>
              <input
                value={q}
                onChange={e=>setQ(e.target.value)}
                onFocus={() => { if (suggestions.length) setShowSuggestions(true); }}
                onKeyDown={onKeyDown}
                autoComplete="off"
                className="w-full border-0 bg-transparent py-3 text-slate-900 outline-none dark:text-white dark:placeholder:text-slate-500"
                placeholder={t('hero.placeholder')}
              />
              {suggestLoading && <LoaderCircle className="animate-spin shrink-0 text-slate-400" size={16}/>}
              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 max-h-72 overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                  {suggestions.map((s, i) => (
                    <li
                      key={`${s.lat}-${s.lng}-${i}`}
                      onMouseDown={(e) => { e.preventDefault(); pickSuggestion(s); }}
                      onMouseEnter={() => setActiveIndex(i)}
                      className={`flex cursor-pointer items-start gap-2 px-4 py-2.5 text-sm ${activeIndex === i ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}
                    >
                      <MapPinned size={16} className="mt-0.5 shrink-0 text-slate-400"/>
                      <span className="truncate">{s.label || s.displayName}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button disabled={loading} className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-60">{loading ? <><LoaderCircle className="animate-spin" size={18}/> {t('hero.searching')}</> : <>{t('hero.find')} <ArrowRight size={18}/></>}</button>
          </form>
          <button type="button" onClick={useMyLocation} disabled={locating} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-60 dark:border-blue-500/30 dark:bg-slate-900 dark:text-blue-400 dark:hover:bg-slate-800">
            {locating ? <LoaderCircle className="animate-spin" size={17}/> : <LocateFixed size={17}/>} {locating ? t('hero.locating') : t('hero.useLocation')}
          </button>
          {error && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">{error}</div>}
          <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-500 dark:text-slate-400"><span className="flex items-center gap-1.5"><MapPinned size={16} className="text-blue-600"/> {t('hero.featureAuto')}</span><span className="flex items-center gap-1.5"><Car size={16} className="text-blue-600"/> {t('hero.featureNear')}</span></div>
        </div>
        <div className="hidden lg:block"><div className="relative mx-auto max-w-md rounded-[2rem] border border-white bg-white/70 p-4 shadow-2xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/70"><div className="rounded-[1.5rem] bg-slate-900 p-6"><div className="mb-4 flex items-center justify-between text-white"><span className="font-bold">{t('hero.mapLabel')}</span><span className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs text-emerald-300">{t('hero.live')}</span></div><div className="relative h-80 overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800"><div className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-red-500 font-black text-white shadow-xl ring-4 ring-white dark:ring-slate-900">A</div><div className="absolute left-[20%] top-[22%] grid h-10 w-10 place-items-center rounded-full bg-blue-600 font-black text-white shadow-lg">P</div><div className="absolute right-[20%] top-[32%] grid h-10 w-10 place-items-center rounded-full bg-blue-600 font-black text-white shadow-lg">P</div><div className="absolute left-[27%] bottom-[18%] grid h-10 w-10 place-items-center rounded-full bg-blue-600 font-black text-white shadow-lg">P</div></div></div></div></div>
      </div>
    </section>

    <section id="parking" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="mb-7"><p className="text-sm font-bold uppercase tracking-widest text-blue-600">{t('results.label')}</p><h2 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{data ? t('results.titleFound') : t('results.titleEmpty')}</h2><p className="mt-2 max-w-3xl text-slate-500 dark:text-slate-400">{data ? data.destination.displayName : t('results.subtitleHint')}</p></div>
      {data && <div className="grid gap-6 lg:grid-cols-[.85fr_1.15fr]">
        <div>
          {data.parkings.length ? data.parkings.map(lot => <LotCard key={lot.id} lot={lot} selected={selected?.id === lot.id} onSelect={() => loadRoute(lot)}/>) : <div className="rounded-2xl bg-white p-8 text-center text-slate-500 dark:bg-slate-900 dark:text-slate-400">{t('results.noParkingFound')}</div>}
        </div>
        <RadarView destination={data.destination} parkings={data.parkings} selected={selected} route={route?.geometry || []} routeInfo={route} routeFrom={routeFrom}/>
      </div>}
    </section>
  </main>;
}
