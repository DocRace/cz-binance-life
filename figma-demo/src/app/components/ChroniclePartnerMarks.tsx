import { DataDanceWordmark } from "./DataDanceWordmark";

type Props = {
  className?: string;
};

/** Commercial Press × book club × DataDance lockup (intro + cover). */
export default function ChroniclePartnerMarks({ className = "" }: Props) {
  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[10px] tracking-wide text-gold/75 ${className}`}
    >
      <span className="font-cjk font-medium">商务印书馆</span>
      <span className="text-gold/35" aria-hidden>
        ·
      </span>
      <span className="font-cjk font-medium">币安人生书友会</span>
      <span className="text-gold/35" aria-hidden>
        ·
      </span>
      <DataDanceWordmark className="h-3 w-auto text-gold/80" />
    </div>
  );
}
