import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Mail, CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface EventRegistrationModalProps {
  onClose: () => void;
  eventTitle: string;
}

type Step = "login" | "success";

export default function EventRegistrationModal({ onClose, eventTitle }: EventRegistrationModalProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("login");

  const handleGoogleLogin = () => {
    // Simulate login
    setTimeout(() => {
      setStep("success");
    }, 500);
  };

  const handleAppleLogin = () => {
    setTimeout(() => {
      setStep("success");
    }, 500);
  };

  const handleEmailLogin = () => {
    setTimeout(() => {
      setStep("success");
    }, 500);
  };

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full max-w-md bg-card rounded-2xl border border-border overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-accent transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Login Step */}
            {step === "login" && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-8"
              >
                <div className="text-center mb-8">
                  <h2 className="font-display text-2xl mb-2">{t("eventRegistration.title")}</h2>
                  <p className="text-sm text-muted-foreground">{t("eventRegistration.registerFor")}：{eventTitle}</p>
                </div>

                <div className="space-y-3">
                  {/* Google Login */}
                  <button
                    onClick={handleGoogleLogin}
                    className="w-full flex items-center gap-3 p-4 rounded-xl border border-border hover:border-gold/50 hover:bg-accent/50 transition-all duration-300"
                  >
                    <div className="w-6 h-6 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="w-5 h-5">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    </div>
                    <span>{t("reservation.googleLogin")}</span>
                  </button>

                  {/* Apple Login */}
                  <button
                    onClick={handleAppleLogin}
                    className="w-full flex items-center gap-3 p-4 rounded-xl border border-border hover:border-gold/50 hover:bg-accent/50 transition-all duration-300"
                  >
                    <div className="w-6 h-6 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                      </svg>
                    </div>
                    <span>{t("reservation.appleLogin")}</span>
                  </button>

                  {/* Email Login */}
                  <button
                    onClick={handleEmailLogin}
                    className="w-full flex items-center gap-3 p-4 rounded-xl border border-border hover:border-gold/50 hover:bg-accent/50 transition-all duration-300"
                  >
                    <Mail className="w-5 h-5" />
                    <span>{t("reservation.emailLogin")}</span>
                  </button>
                </div>

                <p className="text-xs text-muted-foreground text-center mt-6">
                  {t("reservation.termsNote")}
                </p>
              </motion.div>
            )}

            {/* Success Step */}
            {step === "success" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-20 h-20 mx-auto mb-6 rounded-full bg-gold/20 flex items-center justify-center"
                >
                  <CheckCircle className="w-10 h-10 text-gold" />
                </motion.div>

                <h2 className="font-display text-2xl mb-2">{t("eventRegistration.successTitle")}</h2>
                <p className="text-muted-foreground mb-4">
                  {t("eventRegistration.successMessage")}：{eventTitle}
                </p>
                <div className="p-4 rounded-xl bg-gold/10 border border-gold/30 mb-8">
                  <p className="text-sm text-muted-foreground mb-2">
                    {t("eventRegistration.successNote1")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("eventRegistration.successNote2")}
                  </p>
                </div>

                <button
                  onClick={onClose}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-gold to-gold-dark hover:from-gold-light hover:to-gold transition-all duration-300"
                >
                  <span className="text-primary-foreground font-medium">{t("eventRegistration.confirmButton")}</span>
                </button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
