import { motion, AnimatePresence } from "motion/react";
import { X, AlertTriangle } from "lucide-react";

interface RedeemBookModalProps {
  onClose: () => void;
  onConfirm: () => void;
  tokenId: string;
}

export default function RedeemBookModal({ onClose, onConfirm }: RedeemBookModalProps) {
  return (
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

          <div className="p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 mx-auto mb-6 rounded-full bg-gold/20 flex items-center justify-center"
            >
              <AlertTriangle className="w-10 h-10 text-gold" />
            </motion.div>

            <h2 className="font-display text-2xl mb-4">確認領取書籍</h2>
            <p className="text-muted-foreground mb-2">
              您確認正在領取現場並核銷發行徽章？
            </p>
            <p className="text-sm text-muted-foreground mb-8">
              核銷後發行徽章將自動銷毀並獲得<span className="text-gold">已領取書籍紀念徽章</span>
            </p>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl border border-border hover:bg-accent transition-colors duration-300"
              >
                <span className="text-muted-foreground">取消</span>
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-gold to-gold-dark hover:from-gold-light hover:to-gold transition-all duration-300"
              >
                <span className="text-primary-foreground font-medium">確認</span>
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
