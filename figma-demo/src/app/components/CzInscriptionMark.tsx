import czBookClubInscription from "../../assets/cz-book-club-inscription.png";

type Props = {
  alt: string;
  className?: string;
};

/**
 * Full CZ inscription plate (幣安人生Club + -CZ) with gold-marker shimmer.
 */
export default function CzInscriptionMark({ alt, className = "" }: Props) {
  return (
    <div className={`cz-inscription relative mx-auto w-full ${className}`}>
      <img
        src={czBookClubInscription}
        alt={alt}
        width={1600}
        height={634}
        className="cz-inscription-base relative z-0 mx-auto block h-auto w-full object-contain"
        loading="eager"
        decoding="async"
      />

      <img
        src={czBookClubInscription}
        alt=""
        aria-hidden
        width={1600}
        height={634}
        className="cz-inscription-shine pointer-events-none absolute inset-0 z-10 mx-auto h-auto w-full object-contain"
        loading="eager"
        decoding="async"
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 isolate overflow-hidden"
      >
        <div className="cz-inscription-glitter absolute inset-0" />
      </div>
    </div>
  );
}
