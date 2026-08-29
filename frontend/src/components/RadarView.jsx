import React from 'react';
import { MapContainer, Marker, Popup, TileLayer, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLanguage } from '../i18n/LanguageContext.jsx';

const destinationIcon = new L.DivIcon({ className: '', html: '<div style="background:#ef4444;color:#fff;width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:grid;place-items:center;font-weight:800;border:3px solid #fff;box-shadow:0 3px 12px #0003"><span style="transform:rotate(45deg)">A</span></div>', iconSize:[34,34], iconAnchor:[17,34] });
const parkingIcon = new L.DivIcon({ className: '', html: '<div style="background:#2563eb;color:#fff;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font-weight:900;border:3px solid #fff;box-shadow:0 3px 12px #0003">P</div>', iconSize:[34,34], iconAnchor:[17,17] });

function FitMap({ destination, parkings, route }) {
  const map = useMap();
  React.useEffect(() => {
    const points = route?.length > 1
      ? route
      : [[destination.lat, destination.lng], ...parkings.slice(0, 8).map(p => [p.lat, p.lng])];
    if (points.length > 1) map.fitBounds(points, { padding: [40, 40], maxZoom: 16 });
  }, [destination, parkings, route, map]);
  return null;
}

export default function RadarView({ destination, parkings = [], selected, route = [], routeInfo, routeFrom }) {
  const { t } = useLanguage();
  if (!destination) return null;
  return (
    <div className="sticky top-24 h-[520px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
      <MapContainer center={[destination.lat, destination.lng]} zoom={13} scrollWheelZoom className="h-full w-full">
        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitMap destination={destination} parkings={parkings} route={route}/>
        <Marker position={[destination.lat, destination.lng]} icon={destinationIcon}>
          <Popup><b>{routeFrom ? t('radar.routeStart') : t('radar.destination')}</b><br/>{destination.displayName}</Popup>
        </Marker>
        {parkings.map(p => <Marker key={p.id} position={[p.lat, p.lng]} icon={parkingIcon}><Popup><b>{p.name}</b><br/>{p.distance?.toFixed(2)} km · {p.available ?? '—'} {t('radar.freeSpots')}</Popup></Marker>)}
        {route.length > 1 && <Polyline positions={route} pathOptions={{ color: '#2563eb', weight: 7, opacity: .9 }} />}
        {selected && <Marker position={[selected.lat, selected.lng]} icon={parkingIcon}><Popup><b>{t('radar.selectedLot')}</b><br/>{selected.name}</Popup></Marker>}
      </MapContainer>
      {routeInfo && <div className="absolute bottom-5 left-5 right-5 z-[1000] rounded-2xl border border-white/80 bg-white/95 p-4 shadow-xl backdrop-blur dark:border-slate-700/80 dark:bg-slate-900/95">
        <div className="flex items-center justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-wider text-blue-600">{t('radar.routeReady')}</p><p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-300">{t('radar.routeDesc')}</p></div>
          <div className="text-right"><p className="font-black text-slate-900 dark:text-white">{routeInfo.distanceKm?.toFixed(2)} km</p><p className="text-xs text-slate-500 dark:text-slate-400">≈ {Math.round(routeInfo.durationMin)} {t('radar.minutes')}</p></div>
        </div>
      </div>}
    </div>
  );
}
