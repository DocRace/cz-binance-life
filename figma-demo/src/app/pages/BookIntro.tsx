import { motion } from "motion/react";
import { Award, BookOpen, Globe, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import Book3DCover from "../components/Book3DCover";
import bookCover from "../../assets/book-cover-hero.png";

export default function BookIntro() {
  const { t } = useTranslation();
  return (
    <div className="container mx-auto px-6 py-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-20"
      >
        <h1 className="font-display text-5xl md:text-6xl mb-6">
          <span className="bg-gradient-to-r from-gold to-gold-light bg-clip-text text-transparent">
            {t("book.title")}
          </span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          {t("book.subtitle")}
        </p>
      </motion.div>

      {/* Book Cover — same interactive 3D treatment as home hero */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="mx-auto mb-20 flex max-w-2xl flex-col items-center"
      >
        <div className="relative w-full">
          <div className="pointer-events-none absolute inset-0 bg-gold opacity-20 blur-3xl" aria-hidden />
          <div className="relative z-10 flex justify-center pt-2">
            <Book3DCover
              src={bookCover}
              alt={`${t("home.title")} — ${t("book.version")}`}
              showSyntheticDepth={false}
              className="mx-auto"
            />
          </div>
        </div>
        <div className="mt-2 text-center">
          <p className="text-lg text-muted-foreground">{t("book.publisher")}</p>
          <p className="text-muted-foreground">{t("book.version")}</p>
        </div>
      </motion.div>

      {/* Book Description */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="max-w-4xl mx-auto mb-20"
      >
        <div className="prose prose-invert prose-lg max-w-none">
          <h2 className="font-display text-3xl mb-6">{t("book.contentTitle")}</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            {t("book.content1")}
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            {t("book.content2")}
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            {t("book.content3")}
          </p>
          <p className="text-muted-foreground leading-relaxed">
            {t("book.content4")}
          </p>
        </div>
      </motion.div>

      {/* Key Features */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="grid grid-cols-1 md:grid-cols-2 md:items-stretch gap-8 max-w-5xl mx-auto mb-20"
      >
        {[
          {
            icon: Award,
            title: t("book.feature1Title"),
            description: t("book.feature1Desc")
          },
          {
            icon: Globe,
            title: t("book.feature2Title"),
            description: t("book.feature2Desc")
          },
          {
            icon: BookOpen,
            title: t("book.feature3Title"),
            description: t("book.feature3Desc")
          },
          {
            icon: Users,
            title: t("book.feature4Title"),
            description: t("book.feature4Desc")
          }
        ].map((feature, index) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + index * 0.1 }}
              className="group relative flex h-full min-h-0 flex-col"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-gold/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <div className="relative flex h-full min-h-0 flex-col rounded-2xl border border-border/50 bg-card/30 p-6 backdrop-blur-sm">
                <div className="mb-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold/20">
                  <Icon className="h-6 w-6 text-gold" />
                </div>
                <h3 className="mb-2 font-display text-xl">{feature.title}</h3>
                <p className="min-h-0 flex-1 text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Author Bio — same width as Key Features grid above */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="mx-auto max-w-5xl"
      >
        <div className="p-8 rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm">
          <h2 className="font-display text-3xl mb-6">{t("book.authorTitle")}</h2>
          <div className="space-y-4 text-muted-foreground">
            <p className="leading-relaxed">
              {t("book.authorBio1")}
            </p>
            <p className="leading-relaxed">
              {t("book.authorBio2")}
            </p>
            <p className="leading-relaxed">
              {t("book.authorBio3")}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
