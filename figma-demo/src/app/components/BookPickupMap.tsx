import { useEffect, useRef, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useTranslation } from "react-i18next";
import { getMapboxAccessToken } from "../../lib/bookPickupStoreLocations";

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

export default function BookPickupMap({
  stores,
  selectedIndex,
  onSelectIndex,
  className = "",
}: BookPickupMapProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const onSelectRef = useRef(onSelectIndex);
  onSelectRef.current = onSelectIndex;

  const token = getMapboxAccessToken();
  const storeKey = useMemo(
    () => stores.map((s) => `${s.lng},${s.lat}`).join("|"),
    [stores],
  );

  useEffect(() => {
    if (!token || !containerRef.current || stores.length === 0) return;

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [stores[0].lng, stores[0].lat],
      zoom: 11.2,
      attributionControl: true,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    const bounds = new mapboxgl.LngLatBounds();
    const markers: mapboxgl.Marker[] = [];

    stores.forEach((store, index) => {
      bounds.extend([store.lng, store.lat]);

      const el = document.createElement("button");
      el.type = "button";
      el.className =
        "flex h-8 w-8 items-center justify-center rounded-full border-2 border-gold bg-background/95 text-xs font-tech font-medium text-gold shadow-md transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60";
      el.setAttribute("aria-label", store.name);
      el.textContent = `${index + 1}`;
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectRef.current(index);
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat([store.lng, store.lat])
        .addTo(map);

      markers.push(marker);
    });

    if (stores.length > 1) {
      map.fitBounds(bounds, { padding: 48, maxZoom: 13.5, duration: 0 });
    }

    mapRef.current = map;
    markersRef.current = markers;

    return () => {
      markers.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [token, storeKey, stores]);

  useEffect(() => {
    const map = mapRef.current;
    const store = stores[selectedIndex];
    if (!map || !store) return;

    map.flyTo({
      center: [store.lng, store.lat],
      zoom: 14.2,
      duration: 700,
      essential: true,
    });

    markersRef.current.forEach((marker, index) => {
      const el = marker.getElement();
      const active = index === selectedIndex;
      el.style.transform = active ? "scale(1.12)" : "scale(1)";
      el.style.boxShadow = active ? "0 0 0 2px rgba(212, 175, 55, 0.85)" : "0 2px 8px rgba(0,0,0,0.35)";
    });
  }, [selectedIndex, stores]);

  if (!token) {
    return (
      <div
        className={`flex min-h-[280px] items-center justify-center rounded-2xl border border-border/50 bg-card/20 px-6 text-center text-sm text-muted-foreground ${className}`}
      >
        {t("book.pickupMapUnavailable")}
      </div>
    );
  }

  return (
    <div
      className={`relative min-h-[280px] overflow-hidden rounded-2xl border border-border/50 bg-card/20 lg:min-h-[420px] ${className}`}
      aria-label={t("book.pickupMapLabel")}
    >
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
