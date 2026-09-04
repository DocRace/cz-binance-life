import { partnerLogoById, type PartnerLogoId } from "../../lib/partnerLogos";
import { DataDanceWordmark } from "./DataDanceWordmark";

type Size = "sm" | "md" | "lg";

const HEIGHT: Record<Size, Record<PartnerLogoId, string>> = {
  sm: {
    press: "h-[19px]",
    hash: "h-3.5",
    yafang: "h-7",
    bnb: "h-6",
    datadance: "h-5",
    ipdex: "h-6",
    hku: "h-8 max-w-[9.5rem]",
    onebook: "h-6",
  },
  md: {
    press: "h-[27px]",
    hash: "h-5",
    yafang: "h-9",
    bnb: "h-8",
    datadance: "h-7",
    ipdex: "h-8",
    hku: "h-11 max-w-[13rem]",
    onebook: "h-8",
  },
  lg: {
    press: "h-[30px]",
    hash: "h-6",
    yafang: "h-11",
    bnb: "h-9",
    datadance: "h-8",
    ipdex: "h-9",
    hku: "h-14 max-w-[16rem]",
    onebook: "h-9",
  },
};

type Props = {
  id: PartnerLogoId;
  size?: Size;
  className?: string;
};

export default function PartnerLogoMark({ id, size = "md", className = "" }: Props) {
  const def = partnerLogoById(id);
  const h = HEIGHT[size][id];

  if (id === "datadance") {
    return (
      <DataDanceWordmark
        className={`${h} w-auto ${className}`.trim()}
        title={def.name}
        style={{ color: "#ddc48e" }}
      />
    );
  }

  return (
    <img
      src={def.src}
      alt={def.name}
      className={`w-auto object-contain object-center ${h} ${id === "bnb" ? "mix-blend-screen" : ""} ${className}`.trim()}
    />
  );
}
