import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";

const languages = [
  { code: "zh-TW", label: "繁體中文" },
  { code: "en", label: "English" },
  { code: "ko", label: "한국어" },
  { code: "ja", label: "日本語" }
];

export default function LanguageSwitcher() {
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
    console.log("Changing language to:", langCode);
    i18n.changeLanguage(langCode);
    setIsOpen(false);
  };

  const isCurrentLanguage = (langCode: string) => {
    const currentLang = i18n.language || "zh-TW";
    return currentLang.startsWith(langCode) || langCode.startsWith(currentLang);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
        style={{ pointerEvents: 'auto' }}
      >
        <Globe className="w-4 h-4" />
        <span className="text-sm">{getCurrentLanguage().label}</span>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-40 rounded-xl border border-border bg-card backdrop-blur-xl shadow-lg overflow-hidden"
          style={{ zIndex: 9999 }}
        >
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className={`
                w-full px-4 py-3 text-left text-sm transition-colors cursor-pointer
                ${isCurrentLanguage(language.code)
                  ? 'bg-gold/20 text-gold'
                  : 'text-foreground hover:bg-accent/50'
                }
              `}
              style={{ pointerEvents: 'auto' }}
            >
              {language.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
