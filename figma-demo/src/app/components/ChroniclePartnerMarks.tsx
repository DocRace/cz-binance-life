import czClubMark from "../../assets/cz-club-mark.png";
import PartnerLogoMark from "./PartnerLogoMark";

type Props = {
  className?: string;
};

/** Original three-mark lockup: Press · CZ Club mark · DataDance. */
export default function ChroniclePartnerMarks({ className = "" }: Props) {
  return (
    <div
      className={`flex flex-nowrap items-center justify-center gap-x-2 text-[10px] tracking-wide text-gold-light ${className}`.trim()}
    >
      <PartnerLogoMark id="press" size="sm" className="!h-[15px] shrink-0" />
      <span className="shrink-0 text-[9px] text-gold/35" aria-hidden>
        ·
      </span>
      <img
        src={czClubMark}
        alt="币安人生 Club"
        width={1600}
        height={340}
        className="h-[17px] w-auto shrink-0 object-contain object-center"
      />
      <span className="shrink-0 text-[9px] text-gold/35" aria-hidden>
        ·
      </span>
      <PartnerLogoMark id="datadance" size="sm" className="!h-3 shrink-0" />
    </div>
  );
}
