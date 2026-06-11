import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import BookPickupMap from "./BookPickupMap";
import { BOOK_PICKUP_STORE_COORDINATES } from "../../lib/bookPickupStoreLocations";
import { CONTENT_WIDE, GRID_GAP, SECTION_SPACING } from "../layout/pageLayout";

type PickupStore = {
  name: string;
  address: string;
  hint?: string;
};

interface BookPickupStoresProps {
  className?: string;
  /** Motion entrance delay (seconds). */
  delay?: number;
  titleId?: string;
}

export default function BookPickupStores({
  className = "mx-auto mb-20 max-w-6xl",
  delay = 1,
  titleId = "pickup-stores-title",
}: BookPickupStoresProps) {
  const { t } = useTranslation();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const pickupStores = useMemo(() => {
    const raw = t("book.pickupStores", { returnObjects: true });
    return Array.isArray(raw) ? (raw as PickupStore[]) : [];
  }, [t]);

  const mapStores = useMemo(
    () =>
      pickupStores.map((store, index) => {
        const coord = BOOK_PICKUP_STORE_COORDINATES[index];
        return {
          name: store.name,
          lng: coord?.lng ?? 114.1694,
          lat: coord?.lat ?? 22.3193,
        };
      }),
    [pickupStores],
  );

  if (pickupStores.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
      className={className}
      aria-labelledby={titleId}
    >
      <div className="mb-8 text-center md:text-left">
        <h2 id={titleId} className="font-display text-3xl mb-2">
          {t("book.pickupStoresTitle")}
        </h2>
        <p className="text-sm uppercase tracking-[0.18em] text-gold/90 mb-3">
          {t("book.pickupStoresSubtitle")}
        </p>
        <p className="max-w-3xl text-muted-foreground leading-relaxed mx-auto md:mx-0">
          {t("book.pickupStoresIntro")}
        </p>
      </div>

      <div className={`grid grid-cols-1 lg:grid-cols-2 lg:items-stretch ${GRID_GAP}`}>
        <BookPickupMap
          stores={mapStores}
          selectedIndex={selectedIndex}
          onSelectIndex={setSelectedIndex}
          className="lg:min-h-0 lg:h-full"
        />

        <div className="flex flex-col gap-4">
          {pickupStores.map((store, index) => {
            const isSelected = selectedIndex === index;
            return (
              <motion.article
                key={store.name}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: delay + 0.05 + index * 0.06 }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedIndex(index)}
                  className={`w-full rounded-2xl border p-5 text-left backdrop-blur-sm transition-colors ${
                    isSelected
                      ? "border-gold/55 bg-gold/10 ring-1 ring-gold/35"
                      : "border-border/50 bg-card/30 hover:border-gold/30 hover:bg-card/40"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center font-tech text-lg font-semibold text-gold"
                      aria-hidden
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-display text-lg leading-snug text-foreground">
                        {store.name}
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{store.address}</p>
                      {store.hint ? (
                        <p className="mt-2 text-xs text-muted-foreground/85 leading-relaxed">{store.hint}</p>
                      ) : null}
                    </div>
                  </div>
                </button>
              </motion.article>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}
