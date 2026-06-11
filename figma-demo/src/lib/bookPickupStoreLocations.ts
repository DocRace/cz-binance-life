/** WGS84 coordinates for Hong Kong pickup stores (index matches `book.pickupStores` i18n order). */
export const BOOK_PICKUP_STORE_COORDINATES = [
  { lng: 114.18389, lat: 22.28056 }, // Commercial Press · Causeway Bay
  { lng: 114.17204, lat: 22.29758 }, // Commercial Press · Tsim Sha Tsui
  { lng: 114.15538, lat: 22.28204 }, // Joint Publishing · Central
  { lng: 114.17382, lat: 22.27852 }, // Joint Publishing · Wan Chai
] as const;

export function getMapboxAccessToken(): string {
  return (import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || "").trim();
}
