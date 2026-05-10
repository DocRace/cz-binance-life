import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Clapperboard, ExternalLink, Mic, Youtube } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/app/components/ui/utils";

type Localized = { "zh-TW": string; en: string };

export type CZYoutubeArchiveItem = {
  youtubeId: string;
  url: string;
  kind: "video" | "short" | "podcast";
  title: Localized;
  source: Localized;
};

type ArchiveSection = {
  id: string;
  titleKey: string;
  items: CZYoutubeArchiveItem[];
};

type ArchiveDoc = {
  format_version: number;
  sections: ArchiveSection[];
  extras: CZYoutubeArchiveItem[];
};

function pickLocalized(b: Localized, lng: string): string {
  if (lng === "zh-TW" || lng.startsWith("zh")) return b["zh-TW"] || b.en;
  return b.en || b["zh-TW"];
}

function youtubeThumb(id: string): string {
  return `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;
}

function KindIcon({ kind }: { kind: CZYoutubeArchiveItem["kind"] }) {
  if (kind === "podcast") return <Mic className="size-3.5" aria-hidden />;
  if (kind === "short") return <Clapperboard className="size-3.5" aria-hidden />;
  return <Youtube className="size-3.5" aria-hidden />;
}

function VideoCard({
  item,
  watchLabel,
  lng,
  kindLabel,
}: {
  item: CZYoutubeArchiveItem;
  watchLabel: string;
  lng: string;
  kindLabel: string;
}) {
  const title = pickLocalized(item.title, lng);
  const source = pickLocalized(item.source, lng);

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-24px" }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="group min-w-0"
    >
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0c]/85",
          "shadow-sm transition-[border-color,box-shadow] hover:border-gold/35 hover:shadow-[0_16px_48px_-24px_rgba(212,175,55,0.25)]",
          "outline-none focus-visible:ring-2 focus-visible:ring-gold/45",
        )}
        aria-label={`${title} — ${watchLabel}`}
      >
        <div className="relative aspect-video w-full overflow-hidden bg-black/50">
          <img
            src={youtubeThumb(item.youtubeId)}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            className="size-full object-cover transition-[transform,opacity] duration-500 group-hover:scale-[1.03] group-hover:opacity-95"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <span
            className={cn(
              "absolute left-3 top-3 inline-flex items-center gap-1 rounded-md border border-white/15",
              "bg-black/55 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/90 backdrop-blur-sm",
            )}
          >
            <KindIcon kind={item.kind} />
            <span className="ml-0.5">{kindLabel}</span>
          </span>
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-md bg-black/65 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
            <ExternalLink className="size-3 opacity-90" aria-hidden />
            {watchLabel}
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-1 p-4">
          <h3 className="text-sm font-semibold leading-snug tracking-tight text-white/95">{title}</h3>
          <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">{source}</p>
        </div>
      </a>
    </motion.article>
  );
}

export function TimelineYouTubeArchive() {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState<ArchiveDoc | null | undefined>(undefined);
  const lng = i18n.language;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/data/cz_youtube_archive.json", { cache: "force-cache" });
        if (!res.ok) throw new Error(String(res.status));
        const j = (await res.json()) as ArchiveDoc;
        if (!cancelled) setData(j);
      } catch {
        if (!cancelled) setData(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (data === undefined) {
    return (
      <section className="relative mx-auto max-w-6xl px-4 pb-6 sm:px-6 lg:px-10" aria-busy="true">
        <div className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]" />
      </section>
    );
  }

  if (!data || !data.sections?.length) {
    return (
      <section className="relative mx-auto max-w-6xl px-4 pb-6 sm:px-6 lg:px-10">
        <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center text-sm text-muted-foreground">
          {t("timeline.ytMissing")}
        </p>
      </section>
    );
  }

  const watchLabel = t("timeline.ytWatchYoutube");
  const kindVideo = t("timeline.ytKindVideo");
  const kindShort = t("timeline.ytKindShort");
  const kindPodcast = t("timeline.ytKindPodcast");
  const kindLabelFor = (kind: CZYoutubeArchiveItem["kind"]) => {
    if (kind === "podcast") return kindPodcast;
    if (kind === "short") return kindShort;
    return kindVideo;
  };

  return (
      <section
      className="relative mx-auto max-w-6xl px-4 pb-14 sm:px-6 lg:px-10"
      aria-labelledby="timeline-yt-heading"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-px max-w-lg bg-gradient-to-r from-transparent via-red-500/25 to-transparent" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="mb-12 text-center sm:mb-14"
      >
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground backdrop-blur-sm">
          <Youtube className="size-3.5 text-red-400/90" aria-hidden />
          {t("timeline.ytArchiveKicker")}
        </div>
        <h2
          id="timeline-yt-heading"
          className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl"
        >
          <span className="bg-gradient-to-br from-[#fecaca] via-red-300/90 to-amber-200/80 bg-clip-text text-transparent">
            {t("timeline.ytArchiveTitle")}
          </span>
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {t("timeline.ytArchiveSubtitle")}
        </p>
      </motion.div>

      <div className="space-y-20 sm:space-y-24">
        {data.sections.map((section) => (
          <div key={section.id}>
            <h3 className="mb-5 border-b border-white/10 pb-2 font-display text-lg font-semibold text-white/90 sm:text-xl">
              {t(section.titleKey)}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {section.items.map((item) => (
                <VideoCard
                  key={`${section.id}-${item.youtubeId}-${item.url}`}
                  item={item}
                  watchLabel={watchLabel}
                  lng={lng}
                  kindLabel={kindLabelFor(item.kind)}
                />
              ))}
            </div>
          </div>
        ))}

        {data.extras?.length ? (
          <div>
            <h3 className="mb-5 border-b border-white/10 pb-2 font-display text-lg font-semibold text-white/90 sm:text-xl">
              {t("timeline.ytExtrasTitle")}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.extras.map((item) => (
                <VideoCard
                  key={`extra-${item.youtubeId}-${item.url}`}
                  item={item}
                  watchLabel={watchLabel}
                  lng={lng}
                  kindLabel={kindLabelFor(item.kind)}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <p className="mx-auto mt-14 max-w-3xl text-center text-[11px] leading-relaxed text-muted-foreground/80 sm:mt-16">
        {t("timeline.ytDisclaimer")}
      </p>
    </section>
  );
}
