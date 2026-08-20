import { INVITE_PARTNER_LOGOS, type PartnerLogoId } from "../../lib/partnerLogos";
import PartnerLogoMark from "./PartnerLogoMark";

type Props = {
  ids?: PartnerLogoId[];
  size?: "sm" | "md" | "lg";
  className?: string;
};

export default function PartnerLogoRow({ ids, size = "md", className = "" }: Props) {
  const list = ids
    ? INVITE_PARTNER_LOGOS.filter((p) => ids.includes(p.id))
    : INVITE_PARTNER_LOGOS;

  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-x-5 gap-y-3 ${className}`.trim()}
    >
      {list.map((p) => (
        <PartnerLogoMark key={p.id} id={p.id} size={size} />
      ))}
    </div>
  );
}
