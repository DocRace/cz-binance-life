import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { chronicleLongPath, resolveChronicleShareLink } from "../../lib/chronicle/shareLinkClient";

export default function ChronicleShareRedirect() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { code = "" } = useParams();

  useEffect(() => {
    let cancelled = false;
    void resolveChronicleShareLink(code).then((row) => {
      if (cancelled) return;
      if (!row) {
        navigate("/club/chronicle", { replace: true });
        return;
      }
      navigate(chronicleLongPath(row.shareToken, row.ref), { replace: true });
    });
    return () => {
      cancelled = true;
    };
  }, [code, navigate]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#1a1714] px-6 text-center text-sm text-[#ddc48e]">
      {t("common.loading")}
    </div>
  );
}
