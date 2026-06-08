import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";

const languages = [
  { code: "zh-TW", label: "繁體中文" },
  { code: "en", label: "English" },
  { code: "ko", label: "한국어" },
  { code: "ja", label: "日本語" }
];

interface LanguageSwitcherProps {
  /** Open menu upward (e.g. mobile nav sheet footer). */
  dropUp?: boolean;
}

export default function LanguageSwitcher({ dropUp = false }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Match language more flexibly
  const getCurrentLanguage = () => {
    const currentLang = i18n.language || "zh-TW";
    return languages.find(lang =>
      currentLang.startsWith(lang.code) || lang.code.startsWith(currentLang)
    ) || languages[0];
  };

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setIsOpen(false);
  };

  const isCurrentLanguage = (langCode: string) => {
    const currentLang = i18n.language || "zh-TW";
    return currentLang.startsWith(langCode) || langCode.startsWith(currentLang);
  };

  // Close dropdown when tapping outside (pointer events cover touch + mouse)
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerOutside = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (dropdownRef.current && target && !dropdownRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    const id = window.setTimeout(() => {
      document.addEventListener("pointerdown", handlePointerOutside);
    }, 0);

    return () => {
      window.clearTimeout(id);
      document.removeEventListener("pointerdown", handlePointerOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex h-9 min-h-9 max-w-[11rem] cursor-pointer items-center gap-2 rounded-full border border-border/40 bg-muted/35 px-3 text-sm shadow-inner backdrop-blur-md transition-colors hover:bg-muted/50 sm:px-3.5"
        style={{ pointerEvents: "auto" }}
      >
        <Globe className="w-4 h-4" />
        <span className="truncate text-left text-sm">{getCurrentLanguage().label}</span>
      </button>

      {isOpen && (
        <div
          role="listbox"
          className={`absolute right-0 z-[220] w-40 overflow-hidden rounded-xl border border-border bg-card shadow-lg backdrop-blur-xl ${
            dropUp ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          {languages.map((language) => (
            <button
              type="button"
              role="option"
              aria-selected={isCurrentLanguage(language.code)}
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className={`
                w-full px-4 py-3 text-left text-sm transition-colors cursor-pointer touch-manipulation
                ${isCurrentLanguage(language.code)
                  ? 'bg-gold/20 text-gold'
                  : 'text-foreground hover:bg-accent/50'
                }
              `}
            >
              {language.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
