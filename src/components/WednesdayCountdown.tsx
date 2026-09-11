import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Clock, Truck, ArrowRight, Sparkles } from "lucide-react";
import { PromoWeekDay, CompanyInfo } from "../types";
import { calculatePromoCountdown, PromoCountdownResult } from "../utils";

interface WednesdayCountdownProps {
  promo: PromoWeekDay;
  companyInfo?: CompanyInfo;
  onGoToMenu: () => void;
}

const formatTimeLabel = (timeStr: string) => {
  if (!timeStr) return "18h";
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  const hour = parts[0];
  const minute = parts[1];
  if (minute === "00" || minute === "0") {
    return `${parseInt(hour, 10)}h`;
  }
  return `${hour}:${minute}h`;
};

export const WednesdayCountdown: React.FC<WednesdayCountdownProps> = ({
  promo,
  companyInfo,
  onGoToMenu,
}) => {
  const limitTime = promo.wednesdayLimitTime || "18:00";
  const [timeLeft, setTimeLeft] = useState<PromoCountdownResult>(() =>
    calculatePromoCountdown(promo, companyInfo)
  );

  useEffect(() => {
    setTimeLeft(calculatePromoCountdown(promo, companyInfo));

    const interval = setInterval(() => {
      setTimeLeft(calculatePromoCountdown(promo, companyInfo));
    }, 1000);

    return () => clearInterval(interval);
  }, [promo, companyInfo, limitTime]);

  const padZero = (num: number) => String(num).padStart(2, "0");

  if (timeLeft.isExpired) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-gradient-to-r from-red-950 via-slate-900 to-red-950 border-2 border-red-500/40 text-white rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl shadow-red-950/20 text-left"
      >
        <div className="absolute inset-0 bg-[radial-gradient(#ef44440c_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
        
        <div className="flex items-center gap-4 relative z-10 w-full sm:w-auto">
          <span className="text-3xl p-3 bg-red-500/10 rounded-2xl border border-red-500/20 shrink-0 select-none">
            ⏰
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-red-500 text-white font-display font-black text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-lg">
                Promoção Encerrada
              </span>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                • {promo.dayName || "Quarta-feira"}
              </span>
            </div>
            <h3 className="font-display font-black text-lg md:text-xl text-red-200 tracking-tight mt-1.5 leading-snug">
              {promo.title}
            </h3>
            <p className="text-gray-300 text-xs mt-1 max-w-xl font-sans leading-relaxed">
              O horário limite de <b className="text-red-400 font-black">{timeLeft.targetFormatted}</b> foi atingido. A taxa de entrega gratuita automática foi finalizada para hoje, mas você ainda pode pedir seus açaís preferidos com nossa entrega rápida padrão!
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onGoToMenu}
          className="w-full sm:w-auto bg-gray-800 hover:bg-gray-700 text-white font-display font-black text-xs md:text-sm uppercase py-3 px-6 rounded-2xl shadow-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 border border-gray-700 shrink-0 relative z-10"
        >
          <span>Ir para o Cardápio</span>
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden bg-gradient-to-r from-purple-900 via-indigo-950 to-purple-950 border-2 border-lime-400 text-white rounded-3xl p-6 flex flex-col gap-6 shadow-xl shadow-purple-950/20"
    >
      {/* Visual flare background */}
      <div className="absolute inset-0 bg-[radial-gradient(#dfff800c_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
      <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-lime-400/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -right-10 -top-10 w-40 h-40 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10 w-full">
        <div className="flex items-center gap-4 text-left w-full md:w-auto">
          <span className="text-3xl p-3 bg-white/10 rounded-2xl border border-white/10 shrink-0 select-none animate-bounce">
            🛵
          </span>
          <div className="space-y-1">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-purple-200 font-bold uppercase tracking-wider">
                {promo.dayName || "Quarta-feira"}
              </span>
              <span className="bg-[#DFFF80] text-purple-950 font-display font-black text-[10px] md:text-xs uppercase tracking-wider px-3 py-1 rounded-lg w-fit flex items-center gap-1.5 animate-pulse shadow-sm">
                Ativa Hoje até às {formatTimeLabel(timeLeft.targetFormatted)}! ⏰
              </span>
            </div>
            <h3 className="font-display font-black text-lg md:text-2xl text-white tracking-tight leading-snug pt-1">
              {promo.title}
            </h3>
            <p className="text-purple-150 text-xs md:text-sm max-w-xl font-sans leading-relaxed">
              {promo.description}
            </p>
          </div>
        </div>

        {/* Dynamic Countdown Display */}
        <div className="bg-purple-950/80 border border-purple-500/30 rounded-2xl p-4 text-center min-w-[200px] shadow-inner relative flex flex-col items-center">
          <span className="text-[9px] text-purple-300 uppercase font-bold tracking-wider mb-1.5 flex items-center gap-1">
            <Clock className="w-3 h-3 text-lime-400 animate-spin" /> TEMPO RESTANTE
          </span>
          <div className="flex items-center gap-1 font-mono text-xl md:text-2xl font-black text-[#DFFF80] tracking-widest justify-center">
            <span className="bg-purple-900/50 px-2 py-1 rounded-md">{padZero(timeLeft.hours)}</span>
            <span className="text-white/40">:</span>
            <span className="bg-purple-900/50 px-2 py-1 rounded-md">{padZero(timeLeft.minutes)}</span>
            <span className="text-white/40">:</span>
            <span className="bg-purple-900/50 px-2 py-1 rounded-md text-red-400">{padZero(timeLeft.seconds)}</span>
          </div>
          <span className="text-[8px] text-gray-400 mt-1.5 uppercase font-bold">
            Até às {formatTimeLabel(timeLeft.targetFormatted)} de hoje
          </span>
        </div>

        {/* CTA Button */}
        <button
          type="button"
          onClick={onGoToMenu}
          className="w-full md:w-auto bg-[#DFFF80] hover:bg-lime-300 text-purple-950 font-display font-black text-xs md:text-sm uppercase py-4 px-6 rounded-2xl shadow-lg shadow-lime-400/10 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 border border-lime-400 shrink-0 relative z-10"
        >
          <span>Aproveitar Frete Grátis</span>
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

      {/* Urgency Progress Bar */}
      <div className="relative w-full bg-purple-950/60 rounded-full h-1.5 overflow-hidden border border-purple-800 z-10">
        <motion.div
          initial={{ width: "0%" }}
          animate={{ width: `${timeLeft.progressPercent}%` }}
          transition={{ duration: 1 }}
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 via-pink-500 to-lime-400"
        />
      </div>
    </motion.div>
  );
};
