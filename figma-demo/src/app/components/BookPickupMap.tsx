import { useEffect, useRef, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTranslation } from "react-i18next";

export type PickupMapStore = {
  name: string;
  lng: number;
  lat: number;
};

interface BookPickupMapProps {
  stores: PickupMapStore[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  className?: string;
}

const TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

const MARKER_BUTTON_CLASS =
  "flex h-8 w-8 items-center justify-center rounded-full border-2 border-gold bg-background/95 text-xs font-tech font-medium text-gold shadow-md transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60";

export default function BookPickupMap({
  stores,
  selectedIndex,
  onSelectIndex,
  className = "",
}: BookPickupMapProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const onSelectRef = useRef(onSelectIndex);
  onSelectRef.current = onSelectIndex;

  const storeKey = useMemo(
    () => stores.map((s) => `${s.lng},${s.lat}`).join("|"),
    [stores],
  );

  useEffect(() => {
    if (!containerRef.current || stores.length === 0) return;

    const map = L.map(containerRef.current, {
      center: [stores[0].lat, stores[0].lng],
      zoom: 11.2,
      zoomControl: false,
      attributionControl: true,
    });

    L.control.zoom({ position: "topright" }).addTo(map);

    const layer = L.tileLayer(TILE_URL, {
      attribution: TILE_ATTRIBUTION,
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map);

    const bounds = L.latLngBounds([]);
    const markers: L.Marker[] = [];

    stores.forEach((store, index) => {
      bounds.extend([store.lat, store.lng]);
      const icon = L.divIcon({
        className: "book-pickup-marker !bg-transparent !border-0",
        html: `<button type="button" aria-label="${store.name.replace(/"/g, "&quot;")}" class="${MARKER_BUTTON_CLASS}">${index + 1}</button>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      const marker = L.marker([store.lat, store.lng], { icon }).addTo(map);
      marker.on("click", () => onSelectRef.current(index));
      markers.push(marker);
    });

    if (stores.length > 1) {
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 13.5, animate: false });
    }

    mapRef.current = map;
    markersRef.current = markers;

    return () => {
      markers.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [storeKey, stores]);

  useEffect(() => {
    const map = mapRef.current;
    const store = stores[selectedIndex];
    if (!map || !store) return;

    map.flyTo([store.lat, store.lng], 14.2, { duration: 0.7 });

    markersRef.current.forEach((marker, index) => {
      const el = marker.getElement()?.querySelector("button");
      if (!el) return;
      const active = index === selectedIndex;
      el.style.transform = active ? "scale(1.12)" : "scale(1)";
      el.style.boxShadow = active ? "0 0 0 2px rgba(212, 175, 55, 0.85)" : "0 2px 8px rgba(0,0,0,0.35)";
    });
  }, [selectedIndex, stores]);

  return (
    <div
      className={`relative min-h-[280px] overflow-hidden rounded-2xl border border-border/50 bg-card/20 lg:min-h-[420px] ${className}`}
      aria-label={t("book.pickupMapLabel")}
    >
      <div ref={containerRef} className="absolute inset-0 h-full w-full [&_.leaflet-control-attribution]:text-[10px]" />
    </div>
  );
}
