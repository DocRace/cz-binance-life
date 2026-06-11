import { useEffect, useMemo, useState } from "react";
import { Users } from "lucide-react";
import type { BookClubStory } from "../../lib/bookClubStories";
import { buildClubStoryAvatarCandidates } from "../../lib/clubStoryAvatar";

export default function ClubStoryAvatar({ story }: { story: BookClubStory }) {
  const candidates = useMemo(() => buildClubStoryAvatarCandidates(story), [story]);
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
