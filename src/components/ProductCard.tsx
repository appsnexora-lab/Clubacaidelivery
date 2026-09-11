import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Heart, Star, Plus, Flame, ChevronLeft, ChevronRight } from "lucide-react";
import { Product, PromoWeekDay, CompanyInfo } from "../types";
import { calculatePromoCountdown } from "../utils";

interface ProductCardProps {
  product: Product;
  isFavorite: boolean;
  isBestSeller: boolean;
  onToggleFavorite: (id: string) => void;
  onAddToCart: (product: Product, size: string) => void;
  onSelectProductForReview: (name: string) => void;
  clientUser: any;
  setNewReviewForm: any;
  newReviewForm: any;
  setActiveTab: any;
  setShowAddReview: any;
  promos?: PromoWeekDay[];
  currentDayId?: string;
  isHighlighted?: boolean;
  companyInfo?: CompanyInfo;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isFavorite,
  isBestSeller,
  onToggleFavorite,
  onAddToCart,
  onSelectProductForReview,
  clientUser,
  setNewReviewForm,
  newReviewForm,
  setActiveTab,
  setShowAddReview,
  promos,
  currentDayId,
  isHighlighted = false,
  companyInfo,
}) => {
  const [activeSize, setActiveSize] = useState(product.sizes?.[0]?.size || "Padrão");
  const [activeImgIdx, setActiveImgIdx] = useState(0);

  // Sincroniza o tamanho selecionado caso o produto seja editado na administração e os tamanhos antigos deixem de existir
  useEffect(() => {
    if (!product.sizes || !product.sizes.some((s) => s.size === activeSize)) {
      setActiveSize(product.sizes?.[0]?.size || "Padrão");
    }
  }, [product.sizes, activeSize]);

  // Gallery support (falls back to main image if none or empty)
  const images = product.images && product.images.length > 0 ? product.images : [product.image];

  // Touch Swipe State
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 40;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) {
      setActiveImgIdx((prev) => (prev + 1) % images.length);
    } else if (isRightSwipe) {
      setActiveImgIdx((prev) => (prev - 1 + images.length) % images.length);
    }
  };

  const basePriceObj = (product.sizes && product.sizes.find((s) => s.size === activeSize)) || product.sizes?.[0] || { size: "Padrão", price: 15.00 };
  
  // Calculate Friday promo override
  const isPromoOnDay = (p: any, dayId: string) => (p.dayOfWeek || p.id) === dayId;
  const todayPromo = promos?.find((p) => isPromoOnDay(p, currentDayId));

  const fridayPromo = promos?.find((p) => p.id === "sex");
  const promoStatus = calculatePromoCountdown(todayPromo, companyInfo);
  const isFriday = todayPromo?.id === "sex";
  const isFridayPromoActive = fridayPromo?.active && fridayPromo?.fridaySelectedProductId === product.id && isFriday && !promoStatus.isExpired;
  const fridaySpecialPrice = fridayPromo?.fridaySpecialPrice || 0;

  // Calculate if it's "Oferta do Dia" based on weekday promotions & store schedule
  const isPromoActive = todayPromo?.active && !promoStatus.isExpired;
  let isOfertaDoDia = false;
  let promoBadgeText = "";
  
  if (isPromoActive) {
    const todayPromoId = todayPromo?.id;
    if (todayPromoId === "seg") {
      // Monday is 10% OFF on all items except combos
      if (product.category !== "combos") {
        isOfertaDoDia = true;
        const disc = todayPromo?.mondayDiscountPercent || 10;
        promoBadgeText = `${disc}% OFF`;
      }
    } else if (todayPromoId === "ter") {
      // Tuesday is Toppings Extra Grátis on all normal Açaí products
      const isAcai = product.category === "tradicionais" || product.category === "gourmets" || product.name.toLowerCase().includes("açaí") || product.name.toLowerCase().includes("açai");
      if (isAcai) {
        isOfertaDoDia = true;
        promoBadgeText = "Toppings Grátis";
      }
    } else if (todayPromoId === "qua") {
      // Wednesday is Free Shipping on all orders until limit time / closing time
      if (!promoStatus.isExpired) {
        isOfertaDoDia = true;
        promoBadgeText = "Frete Grátis";
      }
    } else if (todayPromoId === "qui") {
      // Thursday is Buy 500ml get 330ml free on traditional acai products
      const isTrad = (product.category === "tradicionais" || product.name.toLowerCase().includes("tradicional")) && product.category !== "combos";
      if (isTrad) {
        isOfertaDoDia = true;
        promoBadgeText = "Açaí em Dobro";
      }
    } else if (todayPromoId === "sex") {
      // Friday is Combo Especial de Sexta-feira
      if (product.id === todayPromo?.fridaySelectedProductId || product.isFridayOnly) {
        isOfertaDoDia = true;
        promoBadgeText = "Preço Especial";
      }
    } else {
      // Generic fallback
      isOfertaDoDia = true;
      promoBadgeText = todayPromo?.badge || "Oferta";
    }
  }

  const activePriceObj = (isFriday && isFridayPromoActive && fridaySpecialPrice > 0)
    ? {
        ...basePriceObj,
        originalPrice: basePriceObj.originalPrice || basePriceObj.price,
        price: fridaySpecialPrice
      }
    : basePriceObj;

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImgIdx((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImgIdx((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <motion.div
      layout
      id={`product-card-${product.id}`}
      className={`group relative bg-white rounded-2xl border p-4 sm:p-5 flex flex-row items-stretch justify-between gap-4 w-full text-left select-none h-full transition-all duration-500 ${
        isHighlighted
          ? "border-lime-500 ring-4 ring-lime-400/50 shadow-xl shadow-lime-400/20 scale-[1.02] bg-gradient-to-br from-white via-lime-50/10 to-white"
          : "border-gray-150 shadow-3xs"
      }`}
    >
      {/* 1. LADO ESQUERDO: CONTEÚDO (Textos, Opções de Tamanho, Preço e Botão Adicionar) */}
      <div className="product-card-inner flex-1 flex flex-col justify-between min-w-0 h-full">
        
        {/* Top: Header, Title, Rating, and Description */}
        <div className="space-y-1.5 sm:space-y-2">
          {(isBestSeller || isOfertaDoDia) && (
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              {isBestSeller && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] sm:text-[9px] font-black bg-orange-50 text-orange-600 border border-orange-100 uppercase tracking-wider select-none whitespace-nowrap">
                  O mais pedido
                </span>
              )}
              {isOfertaDoDia && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] sm:text-[9px] font-black bg-purple-50 text-purple-700 border border-purple-100 uppercase tracking-wider select-none whitespace-nowrap">
                  🎁 {promoBadgeText || "Oferta do Dia"}
                </span>
              )}
            </div>
          )}
          
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display font-black text-[13px] min-[375px]:text-sm sm:text-base text-gray-900 hover:text-purple-900 transition-colors duration-200 leading-tight line-clamp-2 pr-1 break-words flex-1">
              {product.name}
            </h3>
            
            {/* Review small button */}
            <button
              type="button"
              onClick={() => {
                if (clientUser) {
                  setNewReviewForm({
                    ...newReviewForm,
                    name: clientUser.name,
                  });
                }
                onSelectProductForReview(product.name);
                setActiveTab("home");
                setShowAddReview(true);
                setTimeout(() => {
                  document.getElementById("testimonials-section")?.scrollIntoView({ behavior: "smooth" });
                }, 300);
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-55/15 hover:bg-amber-100 border border-amber-200 text-amber-700 font-extrabold text-[9px] sm:text-[10px] transition-all cursor-pointer whitespace-nowrap shrink-0"
              title="Avaliar"
            >
              <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
              <span>5.0</span>
            </button>
          </div>

          <p className="text-gray-500 text-[10px] sm:text-[11px] leading-relaxed line-clamp-3 break-words [word-break:break-word] overflow-wrap-anywhere">
            {product.description}
          </p>
        </div>

        {/* Middle: Sizes Option select inline list */}
        {product.sizes && product.sizes.length > 1 && (
          <div className="flex items-center gap-1.5 py-1.5 overflow-x-auto scrollbar-none shrink-0 mt-3">
            <span className="text-[9px] sm:text-[10px] font-extrabold text-purple-950/60 uppercase tracking-tight whitespace-nowrap shrink-0">
              Opções:
            </span>
            <div className="flex gap-1">
              {product.sizes.map((sz) => {
                const isSelected = activeSize === sz.size;
                return (
                  <button
                    key={sz.size}
                    type="button"
                    onClick={() => setActiveSize(sz.size)}
                    className={`px-2 py-0.5 text-[9px] sm:text-[10px] font-bold rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? "bg-purple-900 border-purple-950 text-white shadow-xs"
                        : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {sz.size}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer: Price tag & Premium call to action button (Add to cart) in one beautiful horizontal row */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-55/60 gap-2 shrink-0">
          {/* Prices block */}
          <div className="flex flex-col min-w-0 justify-center">
            <div className="flex flex-wrap items-baseline gap-x-1.5 leading-none">
              {activePriceObj.originalPrice && (
                <span className="text-[10px] sm:text-[11px] text-gray-400 line-through font-semibold font-mono">
                  R$ {activePriceObj.originalPrice.toFixed(2)}
                </span>
              )}
              
              <motion.span
                key={`${product.id}-${activeSize}-${activePriceObj.price}`}
                initial={{ scale: 0.93, opacity: 0.8 }}
                animate={{ scale: 1, opacity: 1 }}
                className="font-display font-black text-sm sm:text-base md:text-lg text-purple-900"
              >
                R$ {activePriceObj.price.toFixed(2)}
              </motion.span>
            </div>
            
            {/* Promotion badge below price */}
            {activePriceObj.originalPrice && activePriceObj.originalPrice > activePriceObj.price && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="bg-purple-600 text-white text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded-md font-black leading-none">
                  -{Math.round(((activePriceObj.originalPrice - activePriceObj.price) / activePriceObj.originalPrice) * 100)}%
                </span>
              </div>
            )}
          </div>

          {/* Inline Action button: Pistache background with purple font for a high-contrast premium visual */}
          <button
            type="button"
            id={`btn-add-${product.id}`}
            onClick={() => onAddToCart(product, activeSize)}
            className="bg-[#DFFF80] text-purple-950 hover:bg-[#cbe665] font-black text-[10px] sm:text-xs py-2 px-3 sm:py-2.5 sm:px-4 rounded-xl transition-all shadow-[0_2px_8px_rgba(168,85,247,0.08)] active:scale-95 flex items-center justify-center gap-1 cursor-pointer uppercase tracking-wider shrink-0 border border-lime-400 mt-auto"
            style={{ marginTop: 'auto' }}
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-950 stroke-[3]" />
            <span>Adicionar</span>
          </button>
        </div>

      </div>

      {/* 2. LADO DIREITO: IMAGEM DO PRODUTO (1:1 ASPECT RATIO COM TAMANHO UNIFORME E PROPORCIONAL) */}
      <div
        className="relative w-[90px] h-[90px] min-[375px]:w-[100px] min-[375px]:h-[100px] sm:w-[110px] sm:h-[110px] md:w-[125px] md:h-[125px] shrink-0 rounded-2xl bg-white border border-gray-100 flex items-center justify-center p-0.5 cursor-grab active:cursor-grabbing group/imgcontainer self-center shadow-3xs"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Subtle, soft visual radial highlight behind the product */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(88,28,135,0.02)_0%,transparent_70%)] pointer-events-none rounded-2xl" />

        <AnimatePresence mode="wait">
          <motion.img
            key={activeImgIdx}
            src={images[activeImgIdx]}
            alt={`${product.name} - Imagem ${activeImgIdx + 1}`}
            initial={{ opacity: 0.3, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0.3, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-full h-full object-cover object-center rounded-xl transition-transform duration-500 group-hover:scale-108"
            referrerPolicy="no-referrer"
          />
        </AnimatePresence>

        {/* Favorite Button (Heart) - Absolutely positioned inside the image canvas container */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleFavorite(product.id);
          }}
          className="absolute top-1.5 right-1.5 bg-white/95 hover:bg-white p-1 rounded-full shadow-xs hover:scale-110 active:scale-95 transition-all cursor-pointer z-10 border border-purple-100/50 flex items-center justify-center"
          title="Favoritar"
        >
          <Heart
            className={`w-3 h-3 transition-colors ${
              isFavorite
                ? "fill-red-500 text-red-500 stroke-red-500"
                : "text-purple-950 hover:text-red-500"
            }`}
          />
        </button>

        {/* Carousel Prev/Next Buttons (Arrows appear on hover inside the image block container) */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={prevImage}
              className="absolute left-1 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-purple-950 p-0.5 rounded-full shadow-xs z-10 opacity-0 group-hover/imgcontainer:opacity-100 transition-opacity flex items-center justify-center border border-purple-100"
              title="Anterior"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={nextImage}
              className="absolute right-1 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-purple-950 p-0.5 rounded-full shadow-xs z-10 opacity-0 group-hover/imgcontainer:opacity-100 transition-opacity flex items-center justify-center border border-purple-100"
              title="Próximo"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Micro Dot Carousel indicators */}
            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-0.5 z-10 bg-white/85 backdrop-blur-xs px-1.5 py-0.5 rounded-full border border-purple-50">
              {images.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-0.5 h-0.5 rounded-full transition-all duration-300 ${
                    activeImgIdx === idx ? "bg-purple-950 w-2" : "bg-purple-200"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};
