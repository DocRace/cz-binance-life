import { useEffect, useState } from "react";
import {
  DEFAULT_AVATAR_GENDER,
  rolePackFallbacks,
  type AvatarGenderId,
} from "../../lib/chronicle/roleArt";
import { ROLE_VISUALS } from "../../lib/chronicle/roleVisuals";
import type { AvatarRoleId } from "../../lib/chronicle/roles";

type Size = "sm" | "md" | "lg" | "xl";

const SIZE_CLASS: Record<Size, string> = {
  sm: "h-10 w-10 text-[11px]",
  md: "h-14 w-14 text-sm",
  lg: "h-20 w-20 text-base",
  xl: "h-28 w-28 text-lg",
};

type Props = {
  roleId: AvatarRoleId | null;
  size?: Size;
  className?: string;
  imageUrl?: string | null;
  gender?: AvatarGenderId;
  /** circle = picker disc; bust = square half-body for cover */
  shape?: "circle" | "bust";
};

/** Role art from the book-club avatar pack, with colored mark fallback. */
export default function RoleAvatar({
  roleId,
  size = "md",
  className = "",
  imageUrl,
  gender = DEFAULT_AVATAR_GENDER,
  shape = "circle",
}: Props) {
  const candidates = roleId
    ? imageUrl
      ? [imageUrl, ...rolePackFallbacks(roleId, gender)]
      : rolePackFallbacks(roleId, gender)
    : imageUrl
      ? [imageUrl]
      : [];
  const [idx, setIdx] = useState(0);
  const [exhausted, setExhausted] = useState(false);

  useEffect(() => {
    setIdx(0);
    setExhausted(false);
  }, [roleId, gender, imageUrl]);

  const src = !exhausted ? candidates[idx] || null : null;
  const shapeClass =
    shape === "bust"
      ? "rounded-xl object-contain bg-black"
      : "rounded-full object-cover object-top";

  if (src) {
    return (
      <img
        key={src}
        src={src}
        alt=""
        onError={() => {
          if (idx + 1 < candidates.length) setIdx(idx + 1);
          else setExhausted(true);
        }}
        className={`${SIZE_CLASS[size]} ${shapeClass} ring-1 ring-gold/35 ${className}`}
      />
    );
  }

  const visual = roleId ? ROLE_VISUALS[roleId] : null;
  return (
    <span
      className={`inline-flex ${SIZE_CLASS[size]} items-center justify-center rounded-full font-tech font-semibold ring-1 ring-black/10 ${className}`}
      style={{
        background: visual?.bg ?? "rgba(240,185,11,0.2)",
        color: visual?.accent ?? "#F0B90B",
      }}
      aria-hidden
    >
      {visual?.mark ?? "?"}
    </span>
  );
}
