import { motion } from "motion/react";
import { Award, Users, Globe, BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import bookCover from "../../imports/Gemini_Generated_Image_77551s77551s7755.png";

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

      {/* Book Cover */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="max-w-2xl mx-auto mb-20"
      >
        <div className="relative">
          <div className="absolute inset-0 bg-gold blur-3xl opacity-20" />
          <motion.div
            initial={{ rotateY: -15 }}
            animate={{ rotateY: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
            whileHover={{ scale: 1.05, rotateY: 5 }}
            style={{ transformStyle: "preserve-3d" }}
            className="relative flex flex-col items-center"
          >
            <img
              src={bookCover}
              alt="Freedom of Money Book Cover"
              className="w-80 md:w-96 h-auto shadow-2xl rounded-lg mb-6"
            />
            <div className="text-center">
              <p className="text-muted-foreground text-lg">{t("book.publisher")}</p>
              <p className="text-muted-foreground">{t("book.version")}</p>
            </div>
          </motion.div>
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
        </div>
      </motion.div>

      {/* Key Features */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-20"
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
              className="group relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-gold/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative p-6 rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm">
                <div className="w-12 h-12 mb-4 rounded-xl bg-gold/20 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-gold" />
                </div>
                <h3 className="font-display text-xl mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Author Bio */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="max-w-4xl mx-auto"
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
