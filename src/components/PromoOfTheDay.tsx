import React, { useState, useEffect } from "react";
import { Clock, Flame, ShoppingCart, Sparkles, Check } from "lucide-react";
import { Product, PromoWeekDay, CompanyInfo } from "../types";
import { calculatePromoCountdown, PromoCountdownResult } from "../utils";

interface PromoOfTheDayProps {
  promos: PromoWeekDay[];
  products: Product[];
  companyInfo: CompanyInfo;
  onAddToCart: (product: Product, forcedSize?: string) => void;
  currentDayId: string;
}

export const PromoOfTheDay: React.FC<PromoOfTheDayProps> = ({
  promos,
  products,
  companyInfo,
  onAddToCart,
  currentDayId,
}) => {
  // Find active promo of today
  const activePromoToday = promos.find((p) => p.id === currentDayId && p.active);

  // Fallback map of products for each promo day
  const promoProductMap: Record<string, string> = {
    seg: "p1", // Açaí Tradicional
    ter: "p1", // Açaí Tradicional
    qua: "p6", // Açaí Ninhotella
    qui: "p1", // Açaí Tradicional
    sex: "p13", // Combo Açaí Trufado
    sab: "p12", // Combo 1 Litro
    dom: "p1"  // Açaí Tradicional
  };

  const promoProductId = activePromoToday?.fridaySelectedProductId || promoProductMap[currentDayId] || "p1";
  const promoProduct = products.find((p) => p.id === promoProductId) || products[0];

  const [selectedSize, setSelectedSize] = useState<string>("");
  const [promoCountdown, setPromoCountdown] = useState<PromoCountdownResult>(() =>
    calculatePromoCountdown(activePromoToday, companyInfo)
  );

  // Update product's initial size
  useEffect(() => {
    if (promoProduct && promoProduct.sizes && promoProduct.sizes.length > 0) {
      setSelectedSize(promoProduct.sizes[0].size);
    }
  }, [promoProduct]);

  // Set up the countdown timer synchronized with store hours
  useEffect(() => {
    setPromoCountdown(calculatePromoCountdown(activePromoToday, companyInfo));
    const interval = setInterval(() => {
      setPromoCountdown(calculatePromoCountdown(activePromoToday, companyInfo));
    }, 1000);
    return () => clearInterval(interval);
  }, [activePromoToday, companyInfo]);

  const timeLeft = {
    hours: promoCountdown.hours,
    minutes: promoCountdown.minutes,
    seconds: promoCountdown.seconds,
    isClosed: promoCountdown.isExpired || promoCountdown.isBeforeOpening,
  };

  if (!activePromoToday) {
    return null;
  }

  // Find price for the selected size
  const selectedSizeObj = promoProduct?.sizes?.find((s) => s.size === selectedSize) || promoProduct?.sizes?.[0];
  const displayPrice = selectedSizeObj ? selectedSizeObj.price : 0;

  // Formatting helper for numbers
  const formatTimeNum = (num: number) => num.toString().padStart(2, "0");

  return (
    <div id="promo_of_the_day_section" className="bg-gradient-to-br from-purple-900 via-indigo-950 to-purple-950 text-white rounded-3xl p-6 shadow-2xl border border-purple-500/30 overflow-hidden relative group">
      {/* Background radial highlight */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none group-hover:bg-purple-600/15 transition-all duration-700" />
      
      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10 items-center">
        
        {/* Left Side: Promo Header and Countdown */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 bg-lime-400 text-purple-950 font-black text-[9.5px] uppercase tracking-wider px-3 py-1 rounded-full shadow-md">
              <Flame className="w-3.5 h-3.5 fill-purple-950 text-purple-950 animate-pulse" />
              Promoção do Dia
            </span>
            <span className="bg-white/10 text-purple-200 font-extrabold text-[9.5px] uppercase tracking-wider px-3 py-1 rounded-full border border-white/10">
              {activePromoToday.dayName}
            </span>
          </div>

          <div className="space-y-1.5">
            <h2 className="font-display font-black text-2xl md:text-3xl tracking-tight leading-none text-white flex items-center gap-2">
              {activePromoToday.title}
              <Sparkles className="w-5 h-5 text-lime-400 shrink-0" />
            </h2>
            <p className="text-gray-300 text-xs md:text-sm leading-relaxed max-w-xl">
              {activePromoToday.description}
              {activePromoToday.id === "seg" && !activePromoToday.description.toLowerCase().includes("combos") && (
                <span className="block mt-1 text-lime-300 font-extrabold text-[10.5px] uppercase tracking-wide">
                  ⚠️ Atenção: Esta promoção NÃO se aplica a Combos!
                </span>
              )}
              {activePromoToday.id === "qua" && (
                (() => {
                  const limitTime = activePromoToday.wednesdayLimitTime || "18:00";
                  const [limitHour, limitMinute] = limitTime.split(":").map(Number);
                  const now = new Date();
                  const currentHour = now.getHours();
                  const currentMinute = now.getMinutes();
                  const limitTotalMinutes = limitHour * 60 + limitMinute;
                  const currentTotalMinutes = currentHour * 60 + currentMinute;
                  const isPast = currentTotalMinutes > limitTotalMinutes;
                  
                  return (
                    <span className={`block mt-1.5 font-extrabold text-[11px] uppercase tracking-wide ${isPast ? "text-amber-400 font-bold" : "text-lime-300 font-black animate-pulse"}`}>
                      {isPast 
                        ? `⏰ O frete grátis encerrou às ${limitTime} de hoje!` 
                        : `🛵 Frete grátis ativo somente até as ${limitTime} de hoje! Aproveite!`
                      }
                    </span>
                  );
                })()
              )}
            </p>
          </div>

          {/* Countdown Block */}
          <div className="bg-black/30 backdrop-blur-md rounded-2xl p-4 border border-white/5 inline-block w-full sm:w-auto">
            <div className="text-gray-400 text-[10px] uppercase font-bold tracking-widest mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-lime-400 shrink-0" />
              {timeLeft.isClosed ? "Contagem para abertura da loja:" : "Oferta termina em:"}
            </div>
            
            <div className="flex items-center gap-3">
              {/* Hours */}
              <div className="flex flex-col items-center">
                <span className="font-mono text-2xl md:text-3xl font-black tracking-tight text-white bg-white/5 rounded-xl px-3 py-1.5 min-w-[50px] text-center border border-white/10">
                  {formatTimeNum(timeLeft.hours)}
                </span>
                <span className="text-[9px] text-gray-400 uppercase tracking-wider mt-1 font-bold">h</span>
              </div>
              <span className="text-xl font-bold text-lime-400 -mt-5">:</span>
              
              {/* Minutes */}
              <div className="flex flex-col items-center">
                <span className="font-mono text-2xl md:text-3xl font-black tracking-tight text-white bg-white/5 rounded-xl px-3 py-1.5 min-w-[50px] text-center border border-white/10">
                  {formatTimeNum(timeLeft.minutes)}
                </span>
                <span className="text-[9px] text-gray-400 uppercase tracking-wider mt-1 font-bold">m</span>
              </div>
              <span className="text-xl font-bold text-lime-400 -mt-5">:</span>

              {/* Seconds */}
              <div className="flex flex-col items-center">
                <span className="font-mono text-2xl md:text-3xl font-black tracking-tight text-lime-400 bg-lime-400/5 rounded-xl px-3 py-1.5 min-w-[50px] text-center border border-lime-400/20">
                  {formatTimeNum(timeLeft.seconds)}
                </span>
                <span className="text-[9px] text-lime-400/80 uppercase tracking-wider mt-1 font-bold">s</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Featured Offer Product Card */}
        {promoProduct && (
          <div className="lg:col-span-5 bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 space-y-4">
            <div className="flex gap-4 items-center">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden relative bg-purple-950 shrink-0 border border-white/10">
                <img
                  src={promoProduct.image}
                  alt={promoProduct.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="space-y-1">
                <span className="inline-block bg-purple-500/20 text-purple-200 font-extrabold text-[8.5px] uppercase tracking-widest px-2 py-0.5 rounded-full">
                  Destaque Especial
                </span>
                <h4 className="font-display font-black text-base md:text-lg tracking-tight text-white">
                  {promoProduct.name}
                </h4>
                <p className="text-gray-300 text-[10px] md:text-xs leading-normal line-clamp-2">
                  {promoProduct.description}
                </p>
              </div>
            </div>

            {/* Custom Interactive Size Pill Selector */}
            {promoProduct.sizes && promoProduct.sizes.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Escolha o tamanho:</span>
                <div className="flex flex-wrap gap-2">
                  {promoProduct.sizes.map((s) => {
                    const isSelected = selectedSize === s.size;
                    return (
                      <button
                        key={s.size}
                        type="button"
                        onClick={() => setSelectedSize(s.size)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                          isSelected
                            ? "bg-lime-400 text-purple-950 shadow-md scale-102"
                            : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-purple-950 stroke-[3]" />}
                        {s.size}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Bottom */}
            <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-white/5">
              <div>
                <span className="text-[9px] text-gray-400 uppercase tracking-widest block font-bold">Valor hoje:</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-black text-lime-400">R$</span>
                  <span className="text-xl md:text-2xl font-black text-lime-400 tracking-tight">
                    {displayPrice.toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onAddToCart(promoProduct, selectedSize)}
                className="flex items-center gap-2 bg-lime-400 hover:bg-lime-500 text-purple-950 text-xs font-black px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-lime-400/10 active:scale-95"
              >
                <ShoppingCart className="w-4 h-4 text-purple-950" />
                Adicionar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
