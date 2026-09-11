import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Heart, Sparkles, X, Baby, Calendar, Clock } from "lucide-react";
import { AnnouncementInfo } from "../types";

interface AnnouncementModalProps {
  announcement?: AnnouncementInfo;
  isOpen: boolean;
  onClose: () => void;
}

export const AnnouncementModal: React.FC<AnnouncementModalProps> = ({
  announcement,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !announcement || !announcement.active) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-purple-950/70 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg bg-gradient-to-b from-white via-purple-50/50 to-pink-50/40 rounded-3xl shadow-2xl border-2 border-pink-200 overflow-hidden my-8"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/80 hover:bg-white text-gray-500 hover:text-gray-800 flex items-center justify-center shadow-md transition-all cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header Visual Banner */}
          <div className="relative bg-gradient-to-r from-purple-800 via-pink-700 to-purple-900 p-8 text-center text-white overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff22_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none" />
            <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-pink-400/20 rounded-full blur-xl pointer-events-none" />
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-purple-400/20 rounded-full blur-xl pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center">
              {/* Animated Baby Badge */}
              <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center text-3xl shadow-lg mb-3 animate-bounce">
                🍼
              </div>

              <span className="bg-pink-300/30 text-pink-100 font-display font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-full border border-pink-200/40 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-pink-200" />
                {announcement.badge || "COMUNICADO ESPECIAL"}
              </span>

              <h2 className="font-display font-black text-2xl md:text-3xl text-white tracking-tight leading-tight">
                {announcement.title}
              </h2>
            </div>
          </div>

          {/* Content Body */}
          <div className="p-6 md:p-8 space-y-6 text-center">
            <div className="inline-flex items-center gap-2 bg-pink-100/80 text-pink-900 font-bold text-xs px-3.5 py-1.5 rounded-full border border-pink-200">
              <Baby className="w-4 h-4 text-pink-600" />
              <span>Pausa temporária de alguns dias para adaptação</span>
            </div>

            <div className="space-y-4 text-gray-700 text-sm md:text-base leading-relaxed font-sans text-left bg-white/80 p-5 rounded-2xl border border-purple-100/80 shadow-sm">
              {announcement.message.split("\n\n").map((paragraph, idx) => (
                <p key={idx} className={idx === 0 ? "font-medium text-gray-900" : ""}>
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Heartfelt Blessing Box */}
            <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-4 rounded-2xl border border-pink-200/60 flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-full bg-pink-200/80 flex items-center justify-center shrink-0">
                <Heart className="w-5 h-5 text-pink-600 fill-pink-500 animate-pulse" />
              </div>
              <div>
                <p className="text-xs font-bold text-pink-950">Agradecemos de coração!</p>
                <p className="text-[11px] text-pink-800">
                  Obrigado por fazer parte da nossa história e por todo o carinho e paciência.
                </p>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-purple-800 via-pink-700 to-purple-900 hover:from-purple-900 hover:to-pink-800 text-white font-display font-black text-sm uppercase py-4 px-6 rounded-2xl shadow-xl shadow-pink-900/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Entendi! Felicidades à Família ❤️</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
