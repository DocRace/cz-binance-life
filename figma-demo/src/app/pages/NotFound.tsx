import { motion } from "motion/react";
import { Link } from "react-router";
import { Home } from "lucide-react";
import { PAGE_SHELL } from "../layout/pageLayout";

export default function NotFound() {
  return (
    <div className={`${PAGE_SHELL} flex min-h-[60vh] items-center justify-center`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="text-9xl font-tech text-gold mb-6 opacity-50">404</div>
        <h1 className="font-display text-3xl mb-4">找不到頁面</h1>
        <p className="text-muted-foreground mb-8">
          抱歉，您訪問的頁面不存在
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-gold to-gold-dark hover:from-gold-light hover:to-gold transition-all duration-300"
        >
          <Home className="w-5 h-5" />
          <span className="text-primary-foreground font-medium">返回首頁</span>
        </Link>
      </motion.div>
    </div>
  );
}
