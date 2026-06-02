import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { ExternalLink, MessageSquare, Quote, Repeat2, ZoomIn } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogTitle } from "@/app/components/ui/dialog";
import { cn } from "@/app/components/ui/utils";

export type CuratorMeta = {
  tier: "highlight" | "standard" | "exclude";
  score: number;
  method: "heuristic" | "openai";
  reason_en?: string;
};

export type CZTweetRecord = {
  tweet_format_version?: number;
  tweet_id: string;
  created_at?: string | null;
  text?: string;
  author_screen_name?: string;
  url?: string | null;
  retweet_count?: number | null;
  favorite_count?: number | null;
  reply_count?: number | null;
  quote_count?: number | null;
  view_count?: number | string | null;
  is_retweet?: boolean;
  is_quote?: boolean;
  in_reply_to_tweet_id?: string;
  quoted_tweet_id?: string;
  retweeted_tweet_id?: string;
  hashtags?: string[];
  media_count?: number;
  media?: Array<{ type: string; url: string; video_url?: string }>;
  card_thumbnail_url?: string;
  curator?: CuratorMeta;
};

/** width/height — outside band use object-cover in a fixed-height frame */
const ASPECT_CONTAIN_MIN = 0.42;
const ASPECT_CONTAIN_MAX = 2.12;

type NaturalSize = { w: number; h: number };

function ImagePreviewDialog({
  src,
  open,
  onOpenChange,
  title,
}: {
  src: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[96vh] w-auto max-w-[min(98vw,1600px)] gap-0 border-white/15 bg-[#070708]/97 p-1 sm:p-3",
        )}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        {src ? (
          <img
            src={src}
            alt=""
            className="mx-auto max-h-[92vh] max-w-[95vw] object-contain"
            referrerPolicy="no-referrer"
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function TweetZoomableImage({
  src,
  onOpenPreview,
  zoomHint,
}: {
  src: string;
  onOpenPreview: (url: string) => void;
  zoomHint: string;
}) {
  const [dims, setDims] = useState<NaturalSize | null>(null);
  const ratio = dims && dims.h > 0 ? dims.w / dims.h : null;
  const extremeTall = ratio != null && ratio < ASPECT_CONTAIN_MIN;
  const extremeWide = ratio != null && ratio > ASPECT_CONTAIN_MAX;
  const useCover = extremeTall || extremeWide;

  return (
    <button
      type="button"
      onClick={() => onOpenPreview(src)}
      className={cn(
        "group relative w-full overflow-hidden rounded-lg border border-white/10 bg-black/50 text-left",
        "cursor-zoom-in transition-[box-shadow] hover:ring-1 hover:ring-white/25",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/45",
      )}
      aria-label={zoomHint}
    >
      <img
        src={src}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        onLoad={(e) => {
          const el = e.currentTarget;
          setDims({ w: el.naturalWidth, h: el.naturalHeight });
        }}
        className={cn(
          "w-full transition-[transform,filter] duration-300 group-hover:brightness-[1.03]",
          !dims && "max-h-[min(400px,65vh)] object-contain object-center",
          dims && !useCover && "max-h-[min(560px,72vh)] object-contain object-center",
          dims && useCover && extremeTall &&
            "h-[min(440px,58vh)] object-cover object-center sm:h-[min(500px,56vh)]",
          dims && useCover && extremeWide &&
            "h-[min(220px,32vh)] object-cover object-center sm:h-[min(260px,28vh)]",
        )}
      />
      <span
        className="pointer-events-none absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md bg-black/65 px-1.5 py-1 text-[10px] font-medium text-white/90 opacity-0 shadow-sm backdrop-blur-sm transition-opacity group-hover:opacity-100 sm:opacity-90"
        aria-hidden
      >
        <ZoomIn className="size-3 opacity-90" />
        <span className="hidden sm:inline">{zoomHint}</span>
      </span>
    </button>
  );
}

/** Twitter CDN returns 403 for video when Referer is localhost / non-x.com; suppress Referer on the element. */
function TweetInlineVideo({
  videoSrc,
  poster,
  tweetUrl,
  watchOnXLabel,
}: {
  videoSrc: string;
  poster: string;
  tweetUrl: string;
  watchOnXLabel: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <a
        href={tweetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="relative flex max-h-[min(480px,72vh)] min-h-[200px] w-full items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black"
      >
        {poster ? (
          <img
            src={poster}
            alt=""
            referrerPolicy="no-referrer"
            className="absolute inset-0 size-full object-contain opacity-50"
          />
        ) : null}
        <span className="relative z-[1] inline-flex items-center gap-1.5 rounded-lg bg-black/75 px-3 py-2 text-xs font-medium text-white">
          <ExternalLink className="size-3.5 shrink-0 opacity-90" aria-hidden />
          {watchOnXLabel}
        </span>
      </a>
    );
  }

  return (
    <video
      src={videoSrc}
      controls
      className="max-h-[min(480px,72vh)] w-full bg-black object-contain"
      poster={poster || undefined}
      preload="metadata"
      playsInline
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

export function passesTimelineFeaturedFilter(
  curator: CuratorMeta | null | undefined,
): boolean {
  if (!curator) return true;
  if (curator.tier === "exclude") return false;
  return curator.score >= 0.42;
}

function formatTweetDate(raw: string | null | undefined): string {
  if (!raw) return "";
  try {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  } catch {
    /* fall through */
  }
  return raw;
}

function TweetBadges({ tweet }: { tweet: CZTweetRecord }) {
  if (!tweet.is_retweet && !tweet.is_quote && !tweet.in_reply_to_tweet_id) return null;
  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {tweet.is_retweet ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200/90">
          <Repeat2 className="h-3 w-3" aria-hidden />
          RT
        </span>
      ) : null}
      {tweet.is_quote || tweet.quoted_tweet_id ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/25 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-200/90">
          <Quote className="h-3 w-3" aria-hidden />
          Quote
        </span>
      ) : null}
      {tweet.in_reply_to_tweet_id ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/25 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-200/90">
          <MessageSquare className="h-3 w-3" aria-hidden />
          Reply
        </span>
      ) : null}
    </div>
  );
}

type FilterMode = "featured" | "all";

export function TimelineXFeed() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<CZTweetRecord[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("featured");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/data/cz_tweets.json", { cache: "no-store" });
        if (!res.ok) {
          throw new Error(String(res.status));
        }
        const data: unknown = await res.json();
        if (!Array.isArray(data)) throw new Error("not_array");
        if (!cancelled) setRows(data as CZTweetRecord[]);
      } catch {
        if (!cancelled) {
          setRows(null);
          setErr("load_failed");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleRows = useMemo(() => {
    if (!rows) return [];
    if (filterMode === "all") return rows;
    return rows.filter((r) => passesTimelineFeaturedFilter(r.curator));
  }, [rows, filterMode]);

  const countLabel = useMemo(() => {
    if (!rows) return "";
    if (filterMode === "featured") {
      return t("timeline.xFeedCountFiltered", { shown: visibleRows.length, total: rows.length });
    }
    return t("timeline.xFeedCount", { count: rows.length });
  }, [rows, visibleRows.length, filterMode, t]);

  const zoomHint = t("timeline.xFeedZoomHint");
  const previewTitle = t("timeline.xFeedImagePreview");

  if (err && !rows) {
    return (
      <section
        className="relative mx-auto max-w-3xl px-4 pb-8 sm:px-6 lg:px-10"
        aria-labelledby="timeline-x-heading"
      >
        <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center text-sm text-muted-foreground">
          {t("timeline.xFeedMissing")}
        </p>
      </section>
    );
  }

  if (!rows) {
    return (
      <section className="relative mx-auto max-w-3xl px-4 pb-8 sm:px-6 lg:px-10" aria-busy="true">
        <div className="h-24 animate-pulse rounded-xl border border-white/10 bg-white/[0.04]" />
      </section>
    );
  }

  if (rows.length === 0) {
    return null;
  }

  if (visibleRows.length === 0) {
    return (
      <section
        className="relative mx-auto max-w-3xl px-4 pb-16 pt-2 sm:px-6 sm:pb-20 lg:px-10"
        aria-labelledby="timeline-x-heading"
      >
        <h2
          id="timeline-x-heading"
          className="font-display text-center text-2xl font-semibold tracking-tight text-white sm:text-3xl"
        >
          <span className="bg-gradient-to-br from-[#f4e4bc] via-gold to-[#a67c2d] bg-clip-text text-transparent">
            {t("timeline.xFeedTitle")}
          </span>
        </h2>
        <p className="mx-auto mt-6 max-w-lg rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-5 text-center text-sm text-muted-foreground">
          {t("timeline.xFeedFilterEmpty")}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className="rounded-full border border-gold/40 bg-gold/10 px-5 py-2 text-sm font-medium text-gold hover:bg-gold/15"
          >
            {t("timeline.filterAll")}
          </button>
        </div>
      </section>
    );
  }

  return (
      <section
        className="relative mx-auto max-w-3xl px-4 pb-16 pt-2 sm:px-6 sm:pb-20 lg:px-10"
        aria-labelledby="timeline-x-heading"
      >
      <ImagePreviewDialog
        src={previewSrc}
        open={!!previewSrc}
        onOpenChange={(o) => {
          if (!o) setPreviewSrc(null);
        }}
        title={previewTitle}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-px max-w-lg bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8 text-center sm:mb-10"
      >
        <h2
          id="timeline-x-heading"
          className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl"
        >
          <span className="bg-gradient-to-br from-[#f4e4bc] via-gold to-[#a67c2d] bg-clip-text text-transparent">
            {t("timeline.xFeedTitle")}
          </span>
        </h2>
        <p className="mt-2 text-xs text-muted-foreground sm:text-sm">{t("timeline.xFeedSubtitle")}</p>
        <p className="mx-auto mt-3 max-w-xl text-[11px] leading-relaxed text-muted-foreground/85">
          {t("timeline.filterCuratorNote")}
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setFilterMode("featured")}
            className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
              filterMode === "featured"
                ? "border-gold/50 bg-gold/15 text-gold"
                : "border-white/15 bg-white/[0.04] text-muted-foreground hover:border-white/25"
            }`}
          >
            {t("timeline.filterFeatured")}
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
              filterMode === "all"
                ? "border-gold/50 bg-gold/15 text-gold"
                : "border-white/15 bg-white/[0.04] text-muted-foreground hover:border-white/25"
            }`}
          >
            {t("timeline.filterAll")}
          </button>
        </div>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground/80">{countLabel}</p>
      </motion.div>

      <ol className="relative m-0 list-none space-y-5 p-0 sm:space-y-6">
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-6 left-[15px] top-6 w-px bg-gradient-to-b from-gold/45 via-gold/25 to-transparent sm:left-[15px]"
        />
        {visibleRows.map((tweet, idx) => {
          const href =
            tweet.url ||
            `https://x.com/${tweet.author_screen_name ?? "cz_binance"}/status/${tweet.tweet_id}`;
          const when = formatTweetDate(tweet.created_at ?? undefined);
          return (
            <motion.li
              key={tweet.tweet_id}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-20px" }}
              transition={{ delay: Math.min(idx * 0.03, 0.45), duration: 0.35 }}
              className="relative pl-10 sm:pl-11"
            >
              <span
                className="absolute left-[15px] top-[1.15rem] size-2.5 -translate-x-1/2 rounded-full border border-gold/55 bg-gold shadow-[0_0_12px_rgba(212,175,55,0.45)]"
                aria-hidden
              />
              <article className="rounded-2xl border border-white/10 bg-[#0a0a0c]/85 p-4 backdrop-blur-sm sm:p-5">
                <TweetBadges tweet={tweet} />
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
                  <time className="font-mono text-[11px] text-muted-foreground" dateTime={when}>
                    {when || "—"}
                  </time>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-400 transition-colors hover:text-sky-300"
                  >
                    {t("timeline.xFeedOpenX")}
                    <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                </div>
                <p className="mt-3 whitespace-pre-wrap wrap-anywhere text-sm leading-relaxed text-white/90">
                  {tweet.text ?? ""}
                </p>
                {tweet.media && tweet.media.length > 0 ? (
                  <div
                    className={cn(
                      "mt-3 grid gap-2",
                      tweet.media.length > 1 ? "sm:grid-cols-2" : "",
                    )}
                  >
                    {tweet.media.map((m, mi) => (
                      <div
                        key={`${tweet.tweet_id}-m-${mi}`}
                        className="min-w-0 overflow-hidden rounded-lg bg-black/30"
                      >
                        {m.type === "photo" ? (
                          <TweetZoomableImage
                            src={m.url}
                            onOpenPreview={setPreviewSrc}
                            zoomHint={zoomHint}
                          />
                        ) : m.video_url ? (
                          <TweetInlineVideo
                            videoSrc={m.video_url}
                            poster={m.url}
                            tweetUrl={href}
                            watchOnXLabel={t("timeline.xFeedOpenX")}
                          />
                        ) : (
                          <TweetZoomableImage
                            src={m.url}
                            onOpenPreview={setPreviewSrc}
                            zoomHint={zoomHint}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : tweet.card_thumbnail_url ? (
                  <div className="mt-3">
                    <TweetZoomableImage
                      src={tweet.card_thumbnail_url}
                      onOpenPreview={setPreviewSrc}
                      zoomHint={zoomHint}
                    />
                  </div>
                ) : null}
                {(tweet.retweet_count != null ||
                  tweet.favorite_count != null ||
                  tweet.reply_count != null) && (
                  <p className="mt-3 text-[11px] text-muted-foreground">
                    {tweet.retweet_count != null ? (
                      <span title="Reposts">♻ {tweet.retweet_count}</span>
                    ) : null}
                    {tweet.favorite_count != null ? (
                      <span className="ml-2" title="Likes">
                        ♥ {tweet.favorite_count}
                      </span>
                    ) : null}
                    {tweet.reply_count != null ? (
                      <span className="ml-2" title="Replies">
                        ↩ {tweet.reply_count}
                      </span>
                    ) : null}
                  </p>
                )}
              </article>
            </motion.li>
          );
        })}
      </ol>

      <p className="mt-12 text-center text-[11px] leading-relaxed text-muted-foreground/75 sm:mt-14">
        {t("timeline.xFeedDisclaimer")}
      </p>
    </section>
  );
}
