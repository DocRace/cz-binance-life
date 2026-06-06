import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import type { BookClubStory } from "../../lib/bookClubStories";

export default function ClubStoryAvatar({ story }: { story: BookClubStory }) {
  const handleGuess = story.author_display
    .replace(/^@/, "")
    .trim()
    .split(/[\s·|,]/)[0]
    .trim();
  const candidates = [
    story.author_avatar_url?.trim(),
    handleGuess && /^[A-Za-z0-9_]{1,30}$/.test(handleGuess)
      ? `https://unavatar.io/x/${encodeURIComponent(handleGuess)}`
      : "",
  ].filter(Boolean) as string[];

  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(0);
  }, [story.id, story.author_avatar_url, story.author_display]);

  if (idx >= candidates.length) {
    return (
      <div
        className="flex size-11 shrink-0 items-center justify-center rounded-full border border-gold/20 bg-gold/10"
        aria-hidden
      >
        <Users className="size-5 text-gold/70" />
      </div>
    );
  }

  return (
    <img
      src={candidates[idx]}
      alt=""
      width={44}
      height={44}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className="size-11 shrink-0 rounded-full border border-gold/25 object-cover bg-card/40"
      onError={() => setIdx((k) => k + 1)}
    />
  );
}
