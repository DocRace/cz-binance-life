import { useMemo } from "react";
import { motion } from "motion/react";
import { MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";

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
  className = "mx-auto mb-20 max-w-5xl",
  delay = 1,
  titleId = "pickup-stores-title",
}: BookPickupStoresProps) {
  const { t } = useTranslation();

  const pickupStores = useMemo(() => {
    const raw = t("book.pickupStores", { returnObjects: true });
    return Array.isArray(raw) ? (raw as PickupStore[]) : [];
  }, [t]);

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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {pickupStores.map((store, index) => (
          <motion.article
            key={store.name}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: delay + 0.05 + index * 0.06 }}
            className="rounded-2xl border border-border/50 bg-card/30 p-5 backdrop-blur-sm"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/15">
                <MapPin className="h-5 w-5 text-gold" aria-hidden />
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-lg leading-snug text-foreground">
                  <span className="mr-2 font-tech text-sm text-gold/90">{index + 1}.</span>
                  {store.name}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{store.address}</p>
                {store.hint ? (
                  <p className="mt-2 text-xs text-muted-foreground/85 leading-relaxed">{store.hint}</p>
                ) : null}
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </motion.section>
  );
}
