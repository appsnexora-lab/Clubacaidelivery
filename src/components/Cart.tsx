import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShoppingBag, Plus, Minus, Trash2, MapPin, CreditCard, X, Gift, Smile, Check, ShoppingCart, Send, Ticket, Lock, User, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";
import { CartItem, CompanyInfo, LoyaltyUser, Product, ClientUser, Coupon, PromoWeekDay } from "../types";
import { getStoredCoupons, saveCoupons, getStoredClientUsers, saveClientUsers, getStoredOrders, getStoredCompanyInfo } from "../data/storage";
import { ReceiptModal } from "./ReceiptModal";
import { formatBrazilianPhone, validateBrazilianPhone, generateWhatsAppLink } from "../utils";

function getRecifeTime(): { hour: number; minute: number } {
  try {
    const formatter = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Recife",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date());
    const hourPart = parts.find((p) => p.type === "hour");
    const minutePart = parts.find((p) => p.type === "minute");
    if (hourPart && minutePart) {
      return {
        hour: parseInt(hourPart.value, 10),
        minute: parseInt(minutePart.value, 10),
      };
    }
  } catch (e) {
    console.warn("America/Recife timezone formatting failed, using browser local time:", e);
  }
  const d = new Date();
  return { hour: d.getHours(), minute: d.getMinutes() };
}

export function getRecifeDayOfWeek(): "dom" | "seg" | "ter" | "qua" | "qui" | "sex" | "sab" {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Recife",
      weekday: "short",
    });
    const dayStr = formatter.format(new Date());
    const map: Record<string, "dom" | "seg" | "ter" | "qua" | "qui" | "sex" | "sab"> = {
      Sun: "dom",
      Mon: "seg",
      Tue: "ter",
      Wed: "qua",
      Thu: "qui",
      Fri: "sex",
      Sat: "sab",
    };
    return map[dayStr] || "dom";
  } catch (e) {
    const weekdaysMap = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"] as const;
    return weekdaysMap[new Date().getDay()];
  }
}

export function parseTimeString(timeStr: string): { hour: number; minute: number } {
  const clean = timeStr.replace(/[hH]/, ":").trim();
  const parts = clean.split(":");
  const hour = parseInt(parts[0], 10) || 0;
  const minute = parseInt(parts[1], 10) || 0;
  return { hour, minute };
}

export function parseBusinessHours(hoursStr: string): { startHour: number; endHour: number } {
  // Default values
  let startHour = 16;
  let endHour = 21;

  try {
    if (!hoursStr) return { startHour, endHour };

    // Standardize spaces and case
    const cleanStr = hoursStr.toLowerCase().trim();

    // 1. Try matching something like "11h às 21h", "11:00 às 21:00", etc.
    const match = cleanStr.match(/(\d{1,2})(?::\d{2})?\s*(?:h|hs|hrs|as|às|a|-|\s+)\s*(\d{1,2})(?::\d{2})?/i);
    if (match) {
      const start = parseInt(match[1], 10);
      const end = parseInt(match[2], 10);
      if (start >= 0 && start <= 24 && end >= 0 && end <= 24) {
        return { startHour: start, endHour: end };
      }
    }

    // 2. Fallback: match any two numbers in the string that represent valid hours (e.g. 0 to 24)
    const numbers = cleanStr.match(/\d+/g);
    if (numbers && numbers.length >= 2) {
      const plausible = numbers.map(n => parseInt(n, 10)).filter(num => num >= 0 && num <= 24);
      if (plausible.length >= 2) {
        const hourRegex = /(\d{1,2})(?::|h|\s+às|\s+as|\s+a|\s+-|\s+|$)/gi;
        const matchesArray = [...cleanStr.matchAll(hourRegex)];
        const hoursList = matchesArray
          .map(m => parseInt(m[1], 10))
          .filter(h => h >= 0 && h <= 24);
        
        if (hoursList.length >= 2) {
          return { startHour: hoursList[0], endHour: hoursList[1] };
        }
        
        return { startHour: plausible[0], endHour: plausible[plausible.length - 1] };
      }
    }
  } catch (err) {
    console.warn("Failed to parse hours:", err);
  }

  return { startHour, endHour };
}

export function checkStoreOpenStatus(companyInfo: CompanyInfo): { isOpen: boolean; reason: "manual" | "hours" | "open" } {
  if (companyInfo.isOpen === false) {
    return { isOpen: false, reason: "manual" };
  }
  const time = getRecifeTime();
  const currentMinutes = time.hour * 60 + time.minute;

  if (companyInfo.weeklyHours) {
    const dayCode = getRecifeDayOfWeek();
    const schedule = companyInfo.weeklyHours[dayCode];

    // Determine previous day code
    const weekdays = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"] as const;
    const currentIdx = weekdays.indexOf(dayCode);
    const prevIdx = (currentIdx - 1 + 7) % 7;
    const prevDayCode = weekdays[prevIdx];
    const prevSchedule = companyInfo.weeklyHours[prevDayCode];

    // Check if previous day has an active overnight spillover right now
    if (prevSchedule && prevSchedule.isOpen) {
      const prevStart = parseTimeString(prevSchedule.start);
      const prevEnd = parseTimeString(prevSchedule.end);
      const prevStartMins = prevStart.hour * 60 + prevStart.minute;
      const prevEndMins = prevEnd.hour * 60 + prevEnd.minute;

      if (prevStartMins > prevEndMins) {
        // Overnight spillover is from 00:00 to prevEndMins
        if (currentMinutes < prevEndMins) {
          return { isOpen: true, reason: "open" };
        }
      }
    }

    // Now check current day's schedule
    if (schedule) {
      if (!schedule.isOpen) {
        return { isOpen: false, reason: "hours" };
      }

      const start = parseTimeString(schedule.start);
      const end = parseTimeString(schedule.end);
      const startMins = start.hour * 60 + start.minute;
      const endMins = end.hour * 60 + end.minute;

      if (startMins === endMins) {
        return { isOpen: true, reason: "open" };
      }

      if (startMins < endMins) {
        if (currentMinutes >= startMins && currentMinutes < endMins) {
          return { isOpen: true, reason: "open" };
        }
      } else {
        // Overnight matching for current day
        if (currentMinutes >= startMins || currentMinutes < endMins) {
          return { isOpen: true, reason: "open" };
        }
      }

      return { isOpen: false, reason: "hours" };
    }
  }

  // Fallback to old string matching
  const { startHour, endHour } = parseBusinessHours(companyInfo.hours);

  if (startHour === endHour) {
    return { isOpen: true, reason: "open" };
  }

  if (startHour < endHour) {
    if (time.hour >= startHour && time.hour < endHour) {
      return { isOpen: true, reason: "open" };
    }
  } else {
    if (time.hour >= startHour || time.hour < endHour) {
      return { isOpen: true, reason: "open" };
    }
  }
  return { isOpen: false, reason: "hours" };
}

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  companyInfo: CompanyInfo;
  loyaltyUsers: LoyaltyUser[];
  onUpdateLoyaltyPoints: (phone: string, pointsChange: number) => void;
  onAddOrderToHistory: (
    items: any[],
    total: number,
    address: string,
    status?: "Recebido" | "Em preparo" | "Saiu para entrega" | "Entregue" | "Cancelado" | "Pendente de confirmação no WhatsApp" | "Finalizado",
    paymentMethod?: string,
    changeFor?: string,
    customerName?: string,
    customerPhone?: string,
    discountApplied?: number,
    couponCode?: string,
    rawAddressObject?: {
      street: string;
      number: string;
      neighborhood: string;
      complement?: string;
      city?: string;
      zipCode?: string;
    },
    pointsEarned?: number,
    pointsRedeemed?: number
  ) => Promise<any>;
  currentUser?: ClientUser | null;
  promos?: PromoWeekDay[];
  products?: Product[];
  onOpenAuth: () => void;
  onUpdateCustomizations?: (itemId: string, additionals: string[], additionalPrice: number) => void;
}

const AVAILABLE_FREE_TOPPINGS = [
  "Leite em Pó",
  "Leite Condensado",
  "M&M",
  "Granola",
  "Farinha de Amendoim",
  "Amendoim",
  "Amendoim triturado",
  "Calda de Morango",
  "Calda de Chocolate"
];

const EXTRA_TOPPINGS_LIST = [
  { name: "Leite condensado", price: 1.00, label: "Leite condensado (+R$ 1,00)" },
  { name: "Leite em pó", price: 1.00, label: "Leite em pó (+R$ 1,00)" },
  { name: "Granola", price: 1.00, label: "Granola (+R$ 1,00)" },
  { name: "M&m", price: 1.00, label: "M&m (+R$ 1,00)" },
  { name: "Amendoim", price: 1.00, label: "Amendoim (+R$ 1,00)" },
  { name: "Farinha de amendoim", price: 1.00, label: "Farinha de amendoim (+R$ 1,00)" },
  { name: "Amendoim triturado", price: 1.00, label: "Amendoim triturado (+R$ 1,00)" },
  { name: "Morango Extra", price: 2.00, label: "Morango Extra (+R$ 2,00)" },
  { name: "Kiwi Extra", price: 2.00, label: "Kiwi Extra (+R$ 2,00)" },
  { name: "Banana Extra", price: 2.00, label: "Banana Extra (+R$ 2,00)" },
  { name: "Creme Leitinho", price: 3.00, label: "Creme Leitinho (+R$ 3,00)" },
  { name: "Creme de Avelã", price: 3.00, label: "Creme de Avelã (+R$ 3,00)" },
];

export default function Cart({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  companyInfo: propCompanyInfo,
  loyaltyUsers,
  onUpdateLoyaltyPoints,
  onAddOrderToHistory,
  currentUser,
  promos = [],
  products = [],
  onOpenAuth,
  onUpdateCustomizations,
}: CartProps) {
  const companyInfo = propCompanyInfo || getStoredCompanyInfo();
  const storeStatus = checkStoreOpenStatus(companyInfo);

  const [selectedFreeToppings, setSelectedFreeToppings] = useState<string[]>([]);
  const [openToppingPickerItemId, setOpenToppingPickerItemId] = useState<string | null>(null);

  const [address, setAddress] = useState({
    street: "",
    number: "",
    neighborhood: "",
    complement: "",
    city: "São Paulo",
    zipCode: "",
  });

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Pix");
  const [changeFor, setChangeFor] = useState("");
  const [isLoyalMember, setIsLoyalMember] = useState(false);
  const [redeemFreeAcai, setRedeemFreeAcai] = useState(false);
  const [lastAutofilledPhone, setLastAutofilledPhone] = useState("");

  // Auto-fill customer details from storage when WhatsApp number is entered
  useEffect(() => {
    const cleanPhone = customerPhone.replace(/\D/g, "");
    // Wait until they have inserted a minimum valid length (Brazilian phone with DDD: at least 10 or 11 digits)
    if (cleanPhone.length >= 10 && cleanPhone !== lastAutofilledPhone) {
      let foundName = "";
      let foundAddress: {
        street: string;
        number: string;
        neighborhood: string;
        complement: string;
        city: string;
        zipCode: string;
      } | null = null;

      // 1. Check registered client database
      try {
        const clients = getStoredClientUsers();
        const matchedClient = clients.find(c => c.phone.replace(/\D/g, "") === cleanPhone);
        if (matchedClient) {
          foundName = matchedClient.name;
          if (matchedClient.address) {
            foundAddress = {
              street: matchedClient.address.street || "",
              number: matchedClient.address.number || "",
              neighborhood: matchedClient.address.neighborhood || "",
              complement: matchedClient.address.complement || "",
              city: matchedClient.address.city || "São Paulo",
              zipCode: matchedClient.address.zipCode || "",
            };
          }
        }
      } catch (e) {
        console.warn("Could not load clients for auto-fill:", e);
      }

      // 2. Check past order history (usually has the most up to date address)
      try {
        const savedOrders = getStoredOrders();
        const sortedOrders = [...savedOrders].reverse();
        const matchedOrder = sortedOrders.find(
          (o) => o.customerPhone && o.customerPhone.replace(/\D/g, "") === cleanPhone
        );
        if (matchedOrder) {
          if (matchedOrder.customerName) {
            foundName = matchedOrder.customerName;
          }
          if (matchedOrder.rawAddress) {
            foundAddress = {
              street: matchedOrder.rawAddress.street || "",
              number: matchedOrder.rawAddress.number || "",
              neighborhood: matchedOrder.rawAddress.neighborhood || "",
              complement: matchedOrder.rawAddress.complement || "",
              city: matchedOrder.rawAddress.city || "São Paulo",
              zipCode: matchedOrder.rawAddress.zipCode || "",
            };
          }
        }
      } catch (e) {
        console.warn("Could not load past orders for auto-fill:", e);
      }

      if (foundName || foundAddress) {
        if (foundName) {
          setCustomerName(foundName);
        }
        if (foundAddress) {
          setAddress(foundAddress);
        }
        setLastAutofilledPhone(cleanPhone);
      }
    }
  }, [customerPhone, lastAutofilledPhone]);

  // Receipt Modal state management
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [submittedOrderId, setSubmittedOrderId] = useState("");
  const [pendingWhatsAppUrl, setPendingWhatsAppUrl] = useState("");

  // Coupons state management
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");

  // Synchronize client details when logged in with smart fallback address lookup from order history
  useEffect(() => {
    if (currentUser) {
      setCustomerName(currentUser.name);
      setCustomerPhone(currentUser.phone);

      // Try to find address in profile first
      if (currentUser.address) {
        setAddress({
          street: currentUser.address.street || "",
          number: currentUser.address.number || "",
          neighborhood: currentUser.address.neighborhood || "",
          complement: currentUser.address.complement || "",
          city: currentUser.address.city || "São Paulo",
          zipCode: currentUser.address.zipCode || "",
        });
      } else {
        // Fallback: If not in profile, search order history for latest order matching their phone
        try {
          const savedOrders = getStoredOrders();
          const userPhoneClean = currentUser.phone.replace(/\D/g, "");
          const matchingOrder = savedOrders.find(
            (o) => o.customerPhone && o.customerPhone.replace(/\D/g, "") === userPhoneClean
          );

          if (matchingOrder && matchingOrder.rawAddress) {
            setAddress({
              street: matchingOrder.rawAddress.street || "",
              number: matchingOrder.rawAddress.number || "",
              neighborhood: matchingOrder.rawAddress.neighborhood || "",
              complement: matchingOrder.rawAddress.complement || "",
              city: matchingOrder.rawAddress.city || "São Paulo",
              zipCode: matchingOrder.rawAddress.zipCode || "",
            });
          } else if (matchingOrder && matchingOrder.address) {
            // Safe fallback parsing if rawAddress not present
            // Formatted address: "Rua X, Nº 123 (Complemento), Bairro: Y, Cidade"
            const addrStr = matchingOrder.address;
            const parts = addrStr.split(", ");
            let streetStr = "";
            let numStr = "";
            let compStr = "";
            let neighStr = "";
            let cityStr = "São Paulo";

            if (parts.length > 0) {
              streetStr = parts[0];
            }
            if (parts.length > 1) {
              const numPart = parts[1]; // e.g. "Nº 123 (Apto 2)"
              const numMatch = numPart.match(/Nº\s*([^\s(]+)/);
              if (numMatch) {
                numStr = numMatch[1];
              }
              const compMatch = numPart.match(/\(([^)]+)\)/);
              if (compMatch) {
                compStr = compMatch[1];
              }
            }
            if (parts.length > 2) {
              const neighPart = parts[2];
              if (neighPart.startsWith("Bairro:")) {
                neighStr = neighPart.replace("Bairro:", "").trim();
              }
            }
            if (parts.length > 3) {
              cityStr = parts[3];
            }

            if (streetStr || numStr || neighStr) {
              setAddress({
                street: streetStr,
                number: numStr,
                neighborhood: neighStr,
                complement: compStr,
                city: cityStr,
                zipCode: "",
              });
            }
          }
        } catch (e) {
          console.error("Error reading fallback from orders history", e);
        }
      }
    }
  }, [currentUser]);

  // Search for the user in loyalty program to check for points
  const matchedPhoneClean = customerPhone.replace(/\D/g, "");
  const matchedLoyaltyUser = loyaltyUsers.find(
    (u) => u.phone.replace(/\D/g, "") === matchedPhoneClean && matchedPhoneClean.length >= 8
  ) || (currentUser ? { name: currentUser.name, phone: currentUser.phone, points: currentUser.points } : null);

  // Automatically activate free acai redemption if client reaches 100 points and has an eligible item in cart
  useEffect(() => {
    if (matchedLoyaltyUser) {
      const targetPoints = companyInfo.loyaltyPointsTarget || 100;
      const hasEligibleItem = cartItems.some((item) => {
        const nameClean = item.product.name.toLowerCase();
        const sizeClean = item.selectedSize.toLowerCase();
        const isEligibleName = nameClean.includes("tradicional") || nameClean.includes("kids") || nameClean.includes("tropical");
        const isEligibleSize = sizeClean.includes("300") || sizeClean.includes("330");
        return isEligibleName && isEligibleSize;
      });

      if (matchedLoyaltyUser.points >= targetPoints && hasEligibleItem) {
        if (!redeemFreeAcai) {
          setRedeemFreeAcai(true);
        }
      } else {
        if (redeemFreeAcai && (!hasEligibleItem || matchedLoyaltyUser.points < targetPoints)) {
          setRedeemFreeAcai(false);
        }
      }
    } else {
      if (redeemFreeAcai) {
        setRedeemFreeAcai(false);
      }
    }
  }, [matchedLoyaltyUser?.points, matchedLoyaltyUser?.phone, cartItems, companyInfo.loyaltyPointsTarget, redeemFreeAcai]);

  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  // Automatic Weekday Promotions Calculation
  // - Segunda: 10% off em todo açaí do cardápio.
  // - Terça: Toppings grátis. (Visual alert + free toppings selection)
  // - Quarta: Frete grátis. (deliveryFee = 0)
  // - Quinta: Compre 500ml ganhe 330ml.
  // - Sexta: Combo especial do cardápio.
  const currentDayId = getRecifeDayOfWeek();

  const isPromoOnDay = (p: PromoWeekDay, dayId: string) => (p.dayOfWeek || p.id) === dayId;
  const todayPromo = promos?.find((p) => isPromoOnDay(p, currentDayId) && p.active);
  const wednesdayPromo = promos?.find((p) => p.id === "qua");
  const isWednesdayActive = todayPromo?.id === "qua";
  const isFreeDeliveryToday = (() => {
    // Wednesday (or the "qua" free delivery promo) free delivery is NOT automatically active/assumed in the cart,
    // because the customer must send their location and the attendant will manually check if it is within the 3km limit.
    if (todayPromo?.id === "qua") {
      return false;
    }
    
    if (todayPromo) {
      const titleClean = todayPromo.title.toLowerCase();
      const descClean = todayPromo.description.toLowerCase();
      const badgeClean = todayPromo.badge ? todayPromo.badge.toLowerCase() : "";
      
      const isFreeDeliveryText = 
        titleClean.includes("frete grátis") ||
        titleClean.includes("frete gratis") ||
        titleClean.includes("entrega grátis") ||
        titleClean.includes("entrega gratis") ||
        descClean.includes("frete grátis") ||
        descClean.includes("frete gratis") ||
        descClean.includes("entrega grátis") ||
        descClean.includes("entrega gratis") ||
        badgeClean.includes("frete grátis") ||
        badgeClean.includes("frete gratis") ||
        badgeClean.includes("entrega grátis") ||
        badgeClean.includes("entrega gratis");

      if (isFreeDeliveryText) {
        return true;
      }
    }
    return false;
  })();

  const eligibleForFreeToppings = todayPromo && todayPromo.active && todayPromo.id === "ter" && cartItems.some((item) => {
    const sizeClean = item.selectedSize.toLowerCase();
    const nameClean = item.product.name.toLowerCase();
    const catClean = item.product.category.toLowerCase();
    const isCupSize = sizeClean.includes("300") || sizeClean.includes("330") || sizeClean.includes("500");
    const isAcai = nameClean.includes("açaí") || nameClean.includes("açai") || catClean.includes("açai") || catClean.includes("açaí");
    return isCupSize && isAcai;
  });

  // Since delivery fee is defined on WhatsApp, we set it to 0 in internal math calculations
  const deliveryFee = 0;

  // Thursday ("qui") promo items check: Buy X traditional açaí, get Y traditional açaí for free
  const thursdayPromo = promos?.find((p) => p.id === "qui");
  const buySize = (thursdayPromo?.thursdayBuySize || "500ml").toLowerCase();
  const getSize = (thursdayPromo?.thursdayGetSize || "330ml").toLowerCase();

  const traditionalBuyItems = cartItems.filter((item) => {
    const isTrad = item.product.id === "p1" || 
      (item.product.name.toLowerCase().includes("tradicional") && item.product.category.toLowerCase() !== "combos");
    return isTrad && item.selectedSize.toLowerCase().includes(buySize);
  });

  const traditionalGetItems = cartItems.filter((item) => {
    const isTrad = item.product.id === "p1" || 
      (item.product.name.toLowerCase().includes("tradicional") && item.product.category.toLowerCase() !== "combos");
    return isTrad && item.selectedSize.toLowerCase().includes(getSize);
  });

  const totalBuyQty = traditionalBuyItems.reduce((acc, item) => acc + item.quantity, 0);
  const totalGetQty = traditionalGetItems.reduce((acc, item) => acc + item.quantity, 0);

  const total500Qty = totalBuyQty;
  const total300Qty = totalGetQty;

  let autoPromoDiscount = 0;
  if (todayPromo?.id === "seg") {
    // Monday: 10% OFF on all acai products except combos
    const mondayPromo = promos?.find((p) => p.id === "seg");
    if (mondayPromo?.active) {
      const discountPercent = mondayPromo.mondayDiscountPercent !== undefined ? mondayPromo.mondayDiscountPercent : 10;
      const eligibleSubtotal = cartItems
        .filter((item) => item.product.category !== "combos")
        .reduce((acc, item) => acc + item.price * item.quantity, 0);
      autoPromoDiscount = eligibleSubtotal * (discountPercent / 100);
    }
  } else if (todayPromo?.id === "sex") {
    // Friday: Special Price on the selected Combo of the Week
    const fridayPromo = promos?.find((p) => p.id === "sex");
    if (fridayPromo?.active && fridayPromo.fridaySelectedProductId) {
      const matchInCart = cartItems.find((item) => item.product.id === fridayPromo.fridaySelectedProductId);
      if (matchInCart) {
        const specialPrice = fridayPromo.fridaySpecialPrice || 0;
        if (specialPrice > 0 && matchInCart.price > specialPrice) {
          const discountPerUnit = matchInCart.price - specialPrice;
          autoPromoDiscount = discountPerUnit * matchInCart.quantity;
        }
      }
    }
  } else if (todayPromo?.id === "qui") {
    // Thursday: Buy size X get size Y free
    const quiPromo = promos?.find((p) => p.id === "qui");
    if (quiPromo?.active && totalBuyQty > 0 && totalGetQty > 0) {
      let discountableQty = Math.min(totalBuyQty, totalGetQty);
      let calculatedDiscount = 0;
      for (const item of traditionalGetItems) {
        if (discountableQty <= 0) break;
        const qtyToDiscount = Math.min(item.quantity, discountableQty);
        calculatedDiscount += item.price * qtyToDiscount;
        discountableQty -= qtyToDiscount;
      }
      autoPromoDiscount = calculatedDiscount;
    }
  }

  // Fallback: If no custom rule discount was applied, but the active promo mentions a percentage like "10% off" or "10%", calculate it dynamically on subtotal
  if (todayPromo && todayPromo.active && autoPromoDiscount === 0) {
    const promoText = `${todayPromo.title} ${todayPromo.description} ${todayPromo.badge || ""}`.toLowerCase();
    const percentMatch = promoText.match(/(\d+)\s*(?:%\s*off|%)/);
    if (percentMatch) {
      const percentVal = parseInt(percentMatch[1], 10);
      if (percentVal > 0 && percentVal <= 100) {
        if (todayPromo?.id === "seg") {
          const eligibleSubtotal = cartItems
            .filter((item) => item.product.category !== "combos")
            .reduce((acc, item) => acc + item.price * item.quantity, 0);
          autoPromoDiscount = eligibleSubtotal * (percentVal / 100);
        } else {
          autoPromoDiscount = subtotal * (percentVal / 100);
        }
      }
    }
  }

  // Find an eligible item for free loyalty reward: Açaí Tradicional, Kids or Tropical of 300ml/330ml
  const eligibleLoyaltyItems = cartItems.filter((item) => {
    const nameClean = item.product.name.toLowerCase();
    const sizeClean = item.selectedSize.toLowerCase();
    const isEligibleName = nameClean.includes("tradicional") || nameClean.includes("kids") || nameClean.includes("tropical");
    const isEligibleSize = sizeClean.includes("300") || sizeClean.includes("330");
    return isEligibleName && isEligibleSize;
  });

  // Calculate potential loyalty discount
  let loyaltyDiscount = 0;
  if (redeemFreeAcai && matchedLoyaltyUser && matchedLoyaltyUser.points >= (companyInfo.loyaltyPointsTarget || 100) && eligibleLoyaltyItems.length > 0) {
    // Discount the price of one qualified item (highest/first eligible)
    loyaltyDiscount = eligibleLoyaltyItems[0].price;
  }

  // Coupon application logic
  const handleApplyCoupon = (e: React.MouseEvent) => {
    e.preventDefault();
    setCouponError("");
    setCouponSuccess("");

    if (!couponCode.trim()) {
      setCouponError("Insira um código de cupom.");
      return;
    }

    const cleanCode = couponCode.trim().toUpperCase();

    if (cleanCode === "ACAI10") {
      setCouponError("O código ACAI10 era apenas um exemplo e não é um cupom válido.");
      setAppliedCoupon(null);
      return;
    }

    const storeCoupons = getStoredCoupons();
    const found = storeCoupons.find((c) => c.code.toUpperCase() === cleanCode);

    if (!found) {
      setCouponError("Cupom inválido ou inexistente.");
      setAppliedCoupon(null);
      return;
    }

    if (!found.active) {
      setCouponError("Este cupom está inativo.");
      setAppliedCoupon(null);
      return;
    }

    if (found.usageCount >= found.usageLimit) {
      setCouponError("Cupom esgotado (limite de uso atingido).");
      setAppliedCoupon(null);
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    if (found.expirationDate && found.expirationDate < todayStr) {
      setCouponError("Este cupom está expirado.");
      setAppliedCoupon(null);
      return;
    }

    setAppliedCoupon(found);
    const amountText = found.discountType === "percent" ? `${found.value}%` : `R$ ${found.value.toFixed(2)}`;
    setCouponSuccess(`Cupom "${cleanCode}" de ${amountText} aplicado!`);
  };

  let couponDiscount = 0;
  if (appliedCoupon && appliedCoupon.code?.toUpperCase() !== "ACAI10") {
    if (appliedCoupon.discountType === "percent") {
      couponDiscount = subtotal * (appliedCoupon.value / 100);
    } else {
      couponDiscount = appliedCoupon.value;
    }
  }

  const totalDiscounts = loyaltyDiscount + autoPromoDiscount + couponDiscount;
  const total = Math.max(0, subtotal - totalDiscounts + deliveryFee);

  const handleApplyAddressDefault = () => {
    setAddress({
      street: "Av. Paulista",
      number: "1150",
      neighborhood: "Bela Vista",
      complement: "Apto 12",
      city: "São Paulo",
      zipCode: "01310-100",
    });
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();

    const storeStatus = checkStoreOpenStatus(companyInfo);
    if (!storeStatus.isOpen) {
      if (storeStatus.reason === "manual") {
        alert("⚠️ Desculpe! Estamos fechados temporariamente no momento. Não é possível enviar pedidos online neste momento.");
      } else {
        alert(`⏳ Desculpe! Estamos fora do nosso horário de funcionamento (${companyInfo.hours}). Não é possível enviar pedidos online neste momento. Nosso horário de atendimento é: ${companyInfo.hours}.`);
      }
      return;
    }

    if (cartItems.length === 0) {
      alert("Seu carrinho está vazio!");
      return;
    }

    const rawCompanyPhone = companyInfo.whatsapp || "";
    const cleanCompanyPhone = formatBrazilianPhone(rawCompanyPhone);
    const companyPhoneValidation = validateBrazilianPhone(cleanCompanyPhone);

    if (!companyPhoneValidation.isValid) {
      alert(`⚠️ Erro de Configuração de WhatsApp:\n\n${companyPhoneValidation.error}`);
      return;
    }

    if (!customerName || !customerPhone) {
      alert("Por favor, preencha seu Nome e Telefone de contato.");
      return;
    }

    if (eligibleForFreeToppings && selectedFreeToppings.length < 1) {
      const confirmProceed = window.confirm(
        `Você tem direito a 1 Topping Extra Grátis na promoção de hoje e selecionou apenas ${selectedFreeToppings.length}. Deseja escolher agora? Clique em OK para escolher ou Cancelar para prosseguir sem o brinde.`
      );
      if (confirmProceed) {
        return; // Stop checkout so they can select
      }
    }

    if (redeemFreeAcai && eligibleLoyaltyItems.length === 0) {
      alert("Para resgatar seu prêmio do Clube de Fidelidade, adicione pelo menos um Açaí Tradicional, Kids ou Tropical de 300ml/330ml ao carrinho.");
      return;
    }

    const fullAddressString = `${address.street}, Nº ${address.number}${address.complement ? ` (${address.complement})` : ""}, Bairro: ${address.neighborhood}, ${address.city}`;

    if (!address.street || !address.number || !address.neighborhood) {
      alert("Por favor, preencha o endereço completo para entrega.");
      return;
    }

    // Increment coupon count if used
    if (appliedCoupon) {
      const storeCoupons = getStoredCoupons();
      const updated = storeCoupons.map((c) =>
        c.id === appliedCoupon.id ? { ...c, usageCount: c.usageCount + 1 } : c
      );
      saveCoupons(updated);
    }

    // Prepare WhatsApp Message - EMOJI FREE as requested by the user
    let message = `*NOVO PEDIDO - ${companyInfo.name.toUpperCase()}*\n`;
    message += `----------------------------------------------\n`;
    message += `*Cliente:* ${customerName}\n`;
    message += `*WhatsApp:* ${customerPhone}\n`;
    message += `*Endereço:* ${fullAddressString}\n`;
    message += `*Pagamento:* ${paymentMethod}${paymentMethod === "Dinheiro" && changeFor ? ` (Troco para R$ ${changeFor})` : ""}\n`;

    if (redeemFreeAcai && matchedLoyaltyUser) {
      message += `*RESGATOU:* 1 Açaí Grátis (Fidelidade -100pts)\n`;
    }

    message += `----------------------------------------------\n\n`;

    if (eligibleForFreeToppings && selectedFreeToppings.length > 0) {
      message += `*TOPPINGS GRÁTIS ESCOLHIDOS:*\n`;
      selectedFreeToppings.forEach((top) => {
        message += `- ${top}\n`;
      });
      message += `----------------------------------------------\n\n`;
    }

    message += `*ITENS DO PEDIDO:*\n`;

    cartItems.forEach((item) => {
      const itemSub = item.price * item.quantity;
      message += `- *${item.quantity}x* ${item.product.name} (${item.selectedSize})\n`;
      
      // Print Customizations details if they are personal custom built açaí
      if (item.customizations) {
        if (item.customizations.complements?.length > 0) {
          message += `   - Complementos: ${item.customizations.complements.join(", ")}\n`;
        }
        if (item.customizations.fruits?.length > 0) {
          message += `   - Frutas: ${item.customizations.fruits.join(", ")}\n`;
        }
        if (item.customizations.sauces?.length > 0) {
          message += `   - Caldas: ${item.customizations.sauces.join(", ")}\n`;
        }
        if (item.customizations.additionals?.length > 0) {
          message += `   - Adicionais: ${item.customizations.additionals.join(", ")}\n`;
        }
      }
      
      message += `   - Valor unit.: R$ ${item.price.toFixed(2)} | Subtotal: R$ ${itemSub.toFixed(2)}\n`;
    });

    // Append dynamic weekday promos applied
    let promosAppliedText = "";
    const todayPromo = promos?.find((p) => p.id === currentDayId);
    if (todayPromo && todayPromo.active) {
      if (autoPromoDiscount > 0) {
        promosAppliedText = `${todayPromo.dayName}: ${todayPromo.title} (R$ ${autoPromoDiscount.toFixed(2)})`;
      } else {
        promosAppliedText = `${todayPromo.dayName}: ${todayPromo.title} - ${todayPromo.description}`;
      }
    }

    message += `\n----------------------------------------------\n`;
    message += `*Subtotal:* R$ ${subtotal.toFixed(2)}\n`;
    
    if (loyaltyDiscount > 0) {
      message += `*Cortesia Fidelidade:* - R$ ${loyaltyDiscount.toFixed(2)}\n`;
    }
    if (autoPromoDiscount > 0) {
      message += `*Promoção do Dia (${todayPromo?.dayName || currentDayId.toUpperCase()}):* - R$ ${autoPromoDiscount.toFixed(2)}\n`;
    } else if (promosAppliedText) {
      message += `*Promo Ativa:* ${promosAppliedText}\n`;
    }
    if (appliedCoupon) {
      message += `*Cupom Aplicado (${appliedCoupon.code}):* - R$ ${couponDiscount.toFixed(2)}\n`;
    }
    
    const isWednesdayActive = todayPromo?.id === "qua";

    if (isFreeDeliveryToday) {
      message += `*Taxa de Entrega:* Grátis (Promoção)\n`;
      message += `*VALOR TOTAL:* R$ ${total.toFixed(2)}\n\n`;
    } else if (isWednesdayActive) {
      message += `*Taxa de Entrega:* Grátis até 3km (A confirmar via localização)\n`;
      message += `*VALOR TOTAL:* R$ ${total.toFixed(2)} (Sujeito a verificação de distância)\n\n`;
      message += `*Observação:* Quero participar da promoção de Frete Grátis até 3km. Vou enviar minha localização atual em tempo real a seguir para verificação da distância! 🛵📍\n`;
    } else {
      message += `*Taxa de Entrega:* A definir no WhatsApp\n`;
      message += `*VALOR TOTAL:* R$ ${total.toFixed(2)}\n\n`;
      message += `*Observação:* Enviarei minha localização atual em tempo real para cálculo exato da taxa de entrega.\n`;
    }
    message += `----------------------------------------------\n`;
    message += `*Gerado pelo App Açaí Delivery - Aguardando Confirmação*`;

     // Process Loyalty points (kept pending, only updated when owner completes purchase on WhatsApp)
     // Rule 1: Every standard cup/bowl yields 10 points.
     // Rule 2: If the customer buys ANY item in the "combos" category, the whole combo yields only 10 points in total (counts as one unit).
     // Rule 3: For the Thursday ("qui") promo: Buy 500ml traditional, get a 300ml/330ml traditional for free. Since one of them is a free gift,
     //        the pair counts as only a single unit of açaí, yielding exactly 10 points for the pair in total.
     let calculatedEarnedPoints = 0;

     if (todayPromo?.id === "qui") {
       // Let's count how many promo pairs are formed
       const promoPairsCount = Math.min(total500Qty, total300Qty);
       
       // Each promo pair (which contains 1x 500ml + 1x 300ml/330ml traditional) yields 10 points total
       calculatedEarnedPoints += promoPairsCount * 10;

       // Leftover 500ml items and 300ml/330ml items that were not paired:
       const leftover500 = Math.max(0, total500Qty - promoPairsCount);
       const leftover300 = Math.max(0, total300Qty - promoPairsCount);

       // These leftovers are processed normally (10 points each):
       calculatedEarnedPoints += leftover500 * 10;
       calculatedEarnedPoints += leftover300 * 10;

       // Now add other items (which are neither part of the combo category nor the traditional 500ml/300ml/330ml items)
       cartItems.forEach((item) => {
         const isCombo = item.product.category.toLowerCase() === "combos";
         const isTrad = item.product.id === "p1" || 
           (item.product.name.toLowerCase().includes("tradicional") && item.product.category.toLowerCase() !== "combos");
         const is500 = item.selectedSize.toLowerCase().includes("500");
         const is300OR330 = item.selectedSize.toLowerCase().includes("300") || item.selectedSize.toLowerCase().includes("330");

         if (isCombo) {
           calculatedEarnedPoints += item.quantity * 10;
         } else if (!(isTrad && (is500 || is300OR330))) {
           // Standard item, not involved in Thursday promotion
           calculatedEarnedPoints += item.quantity * 10;
         }
       });
     } else {
       // On other days:
       cartItems.forEach((item) => {
         const isCombo = item.product.category.toLowerCase() === "combos";
         if (isCombo) {
           // Any combo yields exactly 10 points total (counts as single cup)
           calculatedEarnedPoints += item.quantity * 10;
         } else {
           // Regular items yield 10 points per unit
           calculatedEarnedPoints += item.quantity * 10;
         }
       });
     }

     const earnedPoints = redeemFreeAcai ? 0 : calculatedEarnedPoints;
     const redeemedPoints = redeemFreeAcai ? (companyInfo.loyaltyPointsTarget || 100) : 0;
 
     // Add to local history with full relational parameter metadata
     const historyItems = cartItems.map((item) => ({
       name: item.product.name,
       size: item.selectedSize,
       quantity: item.quantity,
       price: item.price,
       customizations: item.customizations,
     }));
     
     setIsSubmittingOrder(true);
     let savedOrder;
     try {
       savedOrder = await onAddOrderToHistory(
         historyItems,
         total,
         fullAddressString,
         "Pendente de confirmação no WhatsApp",
         paymentMethod,
         paymentMethod === "Dinheiro" ? changeFor : undefined,
         customerName,
         customerPhone,
         totalDiscounts,
         appliedCoupon?.code || undefined,
         {
           street: address.street,
           number: address.number,
           neighborhood: address.neighborhood,
           complement: address.complement,
           city: address.city,
           zipCode: address.zipCode
         },
         earnedPoints,
         redeemedPoints
       );
       if (savedOrder && savedOrder.id) {
         setSubmittedOrderId(savedOrder.id);
       }
     } catch (err) {
       console.error("Erro fatal ao processar e salvar pedido no banco de dados:", err);
       alert("⚠️ Falha na conexão ou erro ao salvar pedido. Por favor, verifique sua internet e tente enviar novamente.");
       setIsSubmittingOrder(false);
       return;
     }
     setIsSubmittingOrder(false);

    const rawWhatsapp = companyInfo.whatsapp || "";
    const cleanPhone = formatBrazilianPhone(rawWhatsapp);
    let shortIntroText = "";
    if (redeemFreeAcai) {
      shortIntroText = `Olá! Acabei de fazer o resgate de 1 Açaí Grátis (Prêmio Fidelidade de 100 pontos) no App! 🍧\n\nEstou enviando esta mensagem para acompanhar o envio do meu brinde. Estou ciente de que o açaí é cortesia, mas a entrega é cobrada à parte.\n\nEstou enviando em anexo a imagem do meu cupom de cortesia e, a seguir, vou encaminhar meu endereço/localização para cálculo da entrega! 📍`;
    } else {
      shortIntroText = `Olá! Acabei de realizar uma compra de açaí pelo App! 🍧\n\nEstou enviando em anexo a imagem do meu recibo digital com os detalhes do meu pedido.\n\nA seguir, vou confirmar meu endereço e enviar minha localização atual para cálculo da taxa de entrega! 📍`;
    }

     const whatsappUrl = generateWhatsAppLink(rawWhatsapp);
     // Auditoria solicitada pelo usuário (Logs de depuração oficiais)
     console.log("Número original:", rawWhatsapp);
     console.log("Número formatado:", cleanPhone);
     console.log("URL WhatsApp:", whatsappUrl);

     console.log("================= WHATSAPP FINALIZE DEBUG LOG =================");
     console.log("[WhatsApp Finalize Debug] Número bruto recuperado:", rawWhatsapp);
     console.log("[WhatsApp Finalize Debug] Número formatado:", cleanPhone);
     console.log("[WhatsApp Finalize Debug] Link temporário gerado:", whatsappUrl);
     console.log("===============================================================");
     setPendingWhatsAppUrl(whatsappUrl);
     setIsReceiptModalOpen(true);
  };

  return (
    <>
      <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-50 pointer-events-auto"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full md:max-w-md bg-white shadow-2xl z-50 flex flex-col pointer-events-auto overflow-hidden text-gray-900"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-purple-900 text-white shadow-sm">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-lime-400" />
                <span className="font-sans font-black tracking-tight text-base uppercase">Seu Carrinho</span>
                <span className="bg-lime-400 text-purple-950 font-black text-xs px-2 py-0.5 rounded-full">
                  {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              </div>
              <button
                id="close-cart-btn"
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Confirm closed cart info"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Cart Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 bg-purple-50 text-purple-900 rounded-full flex items-center justify-center mb-4">
                    <ShoppingCart className="w-8 h-8" />
                  </div>
                  <h3 className="font-sans font-bold text-base text-gray-950 mb-1">Seu carrinho está vazio</h3>
                  <p className="text-gray-500 text-xs max-w-xs mb-6">
                    Navegue pelas categorias e adicione os melhores açaís ao seu pedido!
                  </p>
                  <button
                    onClick={onClose}
                    className="bg-purple-900 hover:bg-purple-950 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all cursor-pointer"
                  >
                    Voltar para o Menu
                  </button>
                </div>
              ) : (
                <>
                  {/* Automated weekday promotion banner info */}
                  {(() => {
                    const todayPromo = promos?.find((p) => p.id === currentDayId);
                    if (!todayPromo || !todayPromo.active) return null;

                    return (
                      <div className="bg-lime-50 border border-lime-200 text-purple-950 rounded-xl p-3.5 text-xs flex items-start gap-2.5 mb-2.5">
                        <Gift className="w-4.5 h-4.5 text-purple-900 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-purple-950">
                            Promoção Especial de {todayPromo.dayName}: {todayPromo.title} {todayPromo.badge && `(${todayPromo.badge})`}
                          </p>
                          <p className="text-[11px] text-gray-700 font-medium mt-1 leading-relaxed">
                            {todayPromo.id === "sex" ? (() => {
                              const prod = products.find(prodItem => prodItem.id === todayPromo?.fridaySelectedProductId);
                              if (prod) {
                                return `Preço Especial de R$ ${todayPromo?.fridaySpecialPrice?.toFixed(2) || "19.99"} no ${prod.name}! (${todayPromo.description})`;
                              }
                              return todayPromo.description;
                            })() : todayPromo.description}
                          </p>

                          {/* Thursday Promo Interactive status updates */}
                          {todayPromo.id === "qui" && (
                            <div className="mt-2 pt-2 border-t border-lime-200 text-[11px] font-sans font-bold leading-snug">
                              {total500Qty > 0 && total300Qty > 0 ? (
                                <p className="text-emerald-700 flex items-center gap-1 animate-pulse">
                                  <span>🎉 Promoção ATIVADA!</span>
                                  <span>{Math.min(total500Qty, total300Qty)} copo(s) de Açaí Tradicional de 300ml/330ml saiu 100% de GRAÇA! (- R$ {autoPromoDiscount.toFixed(2)})</span>
                                </p>
                              ) : total500Qty > 0 && total300Qty === 0 ? (
                                <p className="text-amber-750">
                                  ⚠️ QUASE LÁ: Você já adicionou o copo de 500ml! Adicione agora um copo de Açaí Tradicional de 330ml ao carrinho para que ele saia totalmente grátis! 🍧
                                </p>
                              ) : (
                                <p className="text-purple-900/80">
                                  💡 Como resgatar: adicione 1 Açaí Tradicional 500ml + 1 Açaí Tradicional 330ml ao carrinho. O menor sairá inteiramente de brinde!
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Cart Items List */}
                  <div className="space-y-3">
                    <h3 className="text-xs uppercase font-bold text-gray-400 tracking-wider">Itens Escolhidos</h3>
                    {cartItems.map((item) => (
                      <motion.div
                        key={item.id}
                        layout
                        className="bg-gray-50 rounded-xl p-3 flex flex-col gap-2.5 border border-gray-100"
                      >
                        <div className="flex gap-3">
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="w-16 h-16 rounded-lg object-cover bg-gray-200 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm truncate text-gray-900">{item.product.name}</h4>
                            <span className="inline-block bg-purple-100 text-purple-900 text-[10px] font-bold px-1.5 py-0.5 rounded-md mt-0.5">
                              {item.selectedSize}
                            </span>
                            
                            {/* Rich list of selections if customized */}
                            {item.customizations && (
                              <div className="mt-1.5 text-[10px] text-gray-500 font-medium space-y-0.5">
                                {item.customizations.complements?.length > 0 && (
                                  <p>• <b className="text-gray-600">Toppings:</b> {item.customizations.complements.join(", ")}</p>
                                )}
                                {item.customizations.fruits?.length > 0 && (
                                  <p>• <b className="text-gray-600">Frutas:</b> {item.customizations.fruits.join(", ")}</p>
                                )}
                                {item.customizations.sauces?.length > 0 && (
                                  <p>• <b className="text-gray-600">Caldas:</b> {item.customizations.sauces.join(", ")}</p>
                                )}
                                {item.customizations.additionals?.length > 0 && (
                                  <p className="text-emerald-700 font-extrabold flex items-start gap-1">
                                    <span>🚀</span>
                                    <span>
                                      <b className="text-emerald-800">Turbinado:</b> {item.customizations.additionals.join(", ")}
                                    </span>
                                  </p>
                                )}
                              </div>
                            )}

                            <div className="flex items-center justify-between mt-2 pt-1">
                              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white">
                                <button
                                  type="button"
                                  onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                                  className="p-1 px-2 hover:bg-gray-50 transition-colors text-gray-500"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="px-2.5 text-xs font-semibold">{item.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                                  className="p-1 px-2 hover:bg-gray-50 transition-colors text-gray-500"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-sm text-purple-900">
                                  R$ {(item.price * item.quantity).toFixed(2)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onRemoveItem(item.id)}
                                  className="p-1 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Collapsible turbinar açaí button and options */}
                        {item.product.category !== "combos" && onUpdateCustomizations && (
                          <div className="border-t border-gray-150 pt-2 mt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setOpenToppingPickerItemId(openToppingPickerItemId === item.id ? null : item.id);
                              }}
                              className="w-full flex items-center justify-between py-1.5 px-2.5 bg-emerald-50 hover:bg-emerald-100/80 rounded-lg text-[10px] font-black text-emerald-800 transition-all border border-emerald-200/50 cursor-pointer"
                            >
                              <span className="flex items-center gap-1">
                                🚀 Turbinar este Açaí (Toppings Extra)
                              </span>
                              <span className="flex items-center gap-1">
                                {item.customizations?.additionals?.length ? (
                                  <span className="bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none">
                                    {item.customizations.additionals.length}
                                  </span>
                                ) : null}
                                {openToppingPickerItemId === item.id ? (
                                  <ChevronUp className="w-3.5 h-3.5 text-emerald-700" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5 text-emerald-700" />
                                )}
                              </span>
                            </button>

                            {/* Collapsible panel */}
                            <AnimatePresence>
                              {openToppingPickerItemId === item.id && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden mt-2 bg-white rounded-xl p-2.5 border border-emerald-100/80 shadow-inner space-y-3 text-left"
                                >
                                  {/* Group 1: Toppings R$ 1,00 */}
                                  <div>
                                    <h5 className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
                                      Toppings Extras (R$ 1,00 cada)
                                    </h5>
                                    <div className="grid grid-cols-2 gap-1.5">
                                      {EXTRA_TOPPINGS_LIST.filter(t => t.price === 1.00).map((topping) => {
                                        const isSelected = item.customizations?.additionals?.includes(topping.label);
                                        return (
                                          <button
                                            key={topping.name}
                                            type="button"
                                            onClick={() => {
                                              const currentAdd = item.customizations?.additionals || [];
                                              let newAdd: string[];
                                              if (isSelected) {
                                                newAdd = currentAdd.filter(x => x !== topping.label);
                                              } else {
                                                newAdd = [...currentAdd, topping.label];
                                              }
                                              const totalPrice = EXTRA_TOPPINGS_LIST.reduce((sum, t) => {
                                                return sum + (newAdd.includes(t.label) ? t.price : 0);
                                              }, 0);
                                              onUpdateCustomizations(item.id, newAdd, totalPrice);
                                            }}
                                            className={`flex items-center justify-between p-1.5 px-2 text-[10px] font-bold rounded-lg border text-left transition-all cursor-pointer ${
                                              isSelected
                                                ? "bg-emerald-50 text-emerald-950 border-emerald-400 shadow-sm"
                                                : "bg-gray-50 text-gray-600 border-gray-150 hover:bg-gray-100"
                                            }`}
                                          >
                                            <span className="truncate">{topping.name}</span>
                                            <span className="text-emerald-700 font-extrabold text-[9px] shrink-0 ml-1">
                                              {isSelected ? "✓" : "+R$1"}
                                            </span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* Group 2: Frutas R$ 2,00 */}
                                  <div>
                                    <h5 className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
                                      Frutas Extras (R$ 2,00 cada)
                                    </h5>
                                    <div className="grid grid-cols-2 gap-1.5">
                                      {EXTRA_TOPPINGS_LIST.filter(t => t.price === 2.00).map((topping) => {
                                        const isSelected = item.customizations?.additionals?.includes(topping.label);
                                        return (
                                          <button
                                            key={topping.name}
                                            type="button"
                                            onClick={() => {
                                              const currentAdd = item.customizations?.additionals || [];
                                              let newAdd: string[];
                                              if (isSelected) {
                                                newAdd = currentAdd.filter(x => x !== topping.label);
                                              } else {
                                                newAdd = [...currentAdd, topping.label];
                                              }
                                              const totalPrice = EXTRA_TOPPINGS_LIST.reduce((sum, t) => {
                                                return sum + (newAdd.includes(t.label) ? t.price : 0);
                                              }, 0);
                                              onUpdateCustomizations(item.id, newAdd, totalPrice);
                                            }}
                                            className={`flex items-center justify-between p-1.5 px-2 text-[10px] font-bold rounded-lg border text-left transition-all cursor-pointer ${
                                              isSelected
                                                ? "bg-emerald-50 text-emerald-950 border-emerald-400 shadow-sm"
                                                : "bg-gray-50 text-gray-600 border-gray-150 hover:bg-gray-100"
                                            }`}
                                          >
                                            <span className="truncate">{topping.name}</span>
                                            <span className="text-emerald-700 font-extrabold text-[9px] shrink-0 ml-1">
                                              {isSelected ? "✓" : "+R$2"}
                                            </span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* Group 3: Cremes R$ 3,00 */}
                                  <div>
                                    <h5 className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
                                      Cremes Extras (R$ 3,00 cada)
                                    </h5>
                                    <div className="grid grid-cols-2 gap-1.5">
                                      {EXTRA_TOPPINGS_LIST.filter(t => t.price === 3.00).map((topping) => {
                                        const isSelected = item.customizations?.additionals?.includes(topping.label);
                                        return (
                                          <button
                                            key={topping.name}
                                            type="button"
                                            onClick={() => {
                                              const currentAdd = item.customizations?.additionals || [];
                                              let newAdd: string[];
                                              if (isSelected) {
                                                newAdd = currentAdd.filter(x => x !== topping.label);
                                              } else {
                                                newAdd = [...currentAdd, topping.label];
                                              }
                                              const totalPrice = EXTRA_TOPPINGS_LIST.reduce((sum, t) => {
                                                return sum + (newAdd.includes(t.label) ? t.price : 0);
                                              }, 0);
                                              onUpdateCustomizations(item.id, newAdd, totalPrice);
                                            }}
                                            className={`flex items-center justify-between p-1.5 px-2 text-[10px] font-bold rounded-lg border text-left transition-all cursor-pointer ${
                                              isSelected
                                                ? "bg-emerald-50 text-emerald-950 border-emerald-400 shadow-sm"
                                                : "bg-gray-50 text-gray-600 border-gray-150 hover:bg-gray-100"
                                            }`}
                                          >
                                            <span className="truncate">{topping.name}</span>
                                            <span className="text-emerald-700 font-extrabold text-[9px] shrink-0 ml-1">
                                              {isSelected ? "✓" : "+R$3"}
                                            </span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>

                  {!currentUser ? (
                    <div className="space-y-4 pt-4">
                      {/* Summary calculations block for non-logged in users */}
                      <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-200/65 space-y-2.5">
                        <div className="flex justify-between text-gray-500 text-xs">
                          <span>Subtotal do Carrinho</span>
                          <span className="font-semibold text-gray-900 font-mono">R$ {subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-500 text-xs pb-2 border-b border-gray-100">
                          <span>Taxa de Entrega</span>
                          <span className="font-semibold text-purple-950">A definir no WhatsApp</span>
                        </div>
                        <div className="flex justify-between font-bold text-sm text-purple-900 pt-1">
                          <span>Total Estimado</span>
                          <span className="font-mono font-black text-lime-600">R$ {subtotal.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Prominent Login/Register CTA Card */}
                      <div className="bg-gradient-to-br from-purple-950 to-indigo-950 text-white rounded-3xl p-6 border border-white/10 space-y-4 text-center my-4 relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-lime-500/10 rounded-full blur-xl pointer-events-none" />
                        
                        <div className="relative z-10 flex flex-col items-center">
                          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-3 border border-white/10 shadow-sm">
                            <Lock className="w-5 h-5 text-lime-400" />
                          </div>
                          
                          <h4 className="font-display font-black text-xs uppercase tracking-wider text-lime-300">
                            Falta Pouco! Cadastre-se primeiro
                          </h4>
                          <p className="text-[11px] text-purple-100 leading-relaxed max-w-[270px] mt-1.5 opacity-90">
                            Para enviar o pedido e participar automaticamente de nosso maravilhoso <b>Clube de Fidelidade</b>, faça seu cadastro rápido no aplicativo antes de comprar!
                          </p>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => {
                            onOpenAuth();
                          }}
                          className="relative z-10 w-full bg-lime-400 hover:bg-lime-500 text-purple-950 font-black py-4 px-4 rounded-xl shadow-lg hover:shadow-xl active:scale-95 cursor-pointer transition-all flex items-center justify-center gap-2 text-xs uppercase"
                        >
                          <User className="w-4 h-4 text-purple-955" />
                          <span>Cadastrar-se ou Entrar no App</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Coupon Discount Entry Section */}
                  <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-200 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                      <Ticket className="w-4 h-4 text-purple-900" />
                      <span>Cupom de Desconto</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Digite seu cupom"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs uppercase outline-none focus:border-purple-950 font-bold"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        className="bg-purple-900 hover:bg-purple-950 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer transition-all shrink-0"
                      >
                        Aplicar
                      </button>
                    </div>
                    {couponError && <p className="text-[10px] text-red-600 font-bold">{couponError}</p>}
                    {couponSuccess && <p className="text-[10px] text-lime-700 font-bold flex items-center gap-1"><Check className="w-3 h-3"/>{couponSuccess}</p>}
                  </div>

                  {/* Loyalty Verification Integration */}
                  <div className="bg-purple-50/50 border border-purple-150 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Gift className="w-5 h-5 text-purple-900" />
                      <h4 className="font-bold text-xs uppercase tracking-tight text-purple-900">Fidelidade Integrada</h4>
                    </div>
                    <p className="text-[11px] text-gray-600 leading-relaxed">
                      Identifique-se com seu WhatsApp e ganhe 10 pontos automáticos ou resgate açaí grátis!
                    </p>

                    {customerPhone.length >= 8 && (
                      <div className="pt-2 border-t border-purple-200/40">
                        {matchedLoyaltyUser ? (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-700 font-medium">Benvindo, <b>{matchedLoyaltyUser.name}</b></span>
                              <span className="text-purple-900 font-black">{matchedLoyaltyUser.points} Pontos</span>
                            </div>
                            {matchedLoyaltyUser.points >= (companyInfo.loyaltyPointsTarget || 100) ? (
                              <div className="space-y-1.5">
                                <label className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-purple-200/30 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    className="rounded text-purple-900 focus:ring-purple-900 w-4 h-4 cursor-pointer"
                                    checked={redeemFreeAcai}
                                    onChange={(e) => setRedeemFreeAcai(e.target.checked)}
                                  />
                                  <div className="text-xs text-purple-950 font-bold flex flex-col sm:flex-row sm:items-center gap-1.5">
                                    <span>Resgatar 1 Açaí Tradicional, Kids ou Tropical de 300ml Grátis (-{companyInfo.loyaltyPointsTarget || 100} PTS)</span>
                                    {redeemFreeAcai && (
                                      <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[9px] px-1.5 py-0.5 rounded-md font-mono font-black uppercase tracking-wider self-start sm:self-auto animate-pulse">
                                        ⚡ ATIVADO AUTOMATICAMENTE
                                      </span>
                                    )}
                                  </div>
                                </label>
                                {redeemFreeAcai && eligibleLoyaltyItems.length === 0 && (
                                  <p className="text-[10px] text-red-600 font-bold bg-red-50 border border-red-100 rounded-lg p-2 leading-tight">
                                    Adicione um Açaí Tradicional, Kids ou Tropical de 330ml ao carrinho para aplicar o desconto de resgate!
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div className="text-[10px] text-gray-500 font-medium italic">
                                Você precisa de {companyInfo.loyaltyPointsTarget || 100} pontos para resgatar. Faltam {(companyInfo.loyaltyPointsTarget || 100) - matchedLoyaltyUser.points} pontos.
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-purple-900 bg-white/70 px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1">
                            <Smile className="w-3.5 h-3.5 text-lime-600" />
                            <span className="font-semibold">Novo cliente! Você ganhará 10 pontos nesta compra.</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Delivery & Address Form */}
                  <form onSubmit={handleCheckout} className="space-y-4 pt-2">
                    <h3 className="text-xs uppercase font-bold text-gray-400 tracking-wider">Identificação e Entrega</h3>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Seu Nome *</label>
                        <input
                          type="text"
                          required
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Ex: João Silva"
                          className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-2.5 outline-none focus:border-purple-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Seu Telefone / WhatsApp *</label>
                        <input
                          type="tel"
                          required
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="Ex: 11999999999"
                          className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-2.5 outline-none focus:border-purple-900"
                        />
                      </div>
                    </div>

                    <div className="space-y-3 border-t border-gray-100 pt-3">
                      <div className="flex justify-between items-center">
                        <label className="block text-xs font-bold text-gray-700">Endereço de Entrega *</label>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <input
                            type="text"
                            placeholder="Rua / Avenida"
                            required
                            value={address.street}
                            onChange={(e) => setAddress({ ...address, street: e.target.value })}
                            className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-2.5 outline-none focus:border-purple-900"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            placeholder="Número"
                            required
                            value={address.number}
                            onChange={(e) => setAddress({ ...address, number: e.target.value })}
                            className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-2.5 outline-none focus:border-purple-900"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <input
                            type="text"
                            placeholder="Bairro"
                            required
                            value={address.neighborhood}
                            onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })}
                            className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-2.5 outline-none focus:border-purple-900"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            placeholder="Complemento (Apto, bloco)"
                            value={address.complement}
                            onChange={(e) => setAddress({ ...address, complement: e.target.value })}
                            className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-2.5 outline-none focus:border-purple-900"
                          />
                        </div>
                      </div>

                      {/* Delivery Verification Notice */}
                      <div className="mt-3 p-3 bg-purple-50/50 rounded-2xl border border-purple-100/50 text-[10.5px] space-y-1.5 leading-relaxed text-purple-950">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-purple-900">
                          <MapPin className="w-4 h-4 shrink-0" />
                          <span>Cálculo da Taxa de Entrega</span>
                        </div>
                        <p className="text-gray-600">
                          A taxa de entrega é calculada e confirmada pelo atendente diretamente no WhatsApp.
                        </p>
                        {isWednesdayActive && todayPromo?.active && (
                          <div className="mt-2 bg-purple-100/60 p-2.5 rounded-xl border border-purple-200 text-purple-950">
                            <p className="font-extrabold text-[11px] uppercase tracking-wider text-purple-900">🎁 {todayPromo?.dayName || "Quarta-feira"}: Frete Grátis até 3km!</p>
                            <p className="text-[10.5px] text-purple-900 font-medium mt-1">
                              Para validar o frete grátis hoje, você <strong>deve enviar sua localização atual em tempo real no WhatsApp</strong> após finalizar. O atendente verificará se a distância não ultrapassou o limite de 3km para liberar a entrega gratuita!
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Free Toppings Selection for Promo */}
                    {eligibleForFreeToppings && (
                      <div className="bg-purple-50/70 border border-purple-100 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center gap-1.5">
                          <Gift className="w-5 h-5 text-purple-900" />
                          <h4 className="font-bold text-xs uppercase tracking-tight text-purple-900">BRINDES DA PROMOÇÃO DE HOJE</h4>
                        </div>
                        <p className="text-[11px] text-purple-950 font-medium leading-tight">
                          Você ganhou <b className="text-purple-900">1 Topping Extra Grátis</b> ao comprar o seu Açaí de 300ml, 330ml ou 500ml! Escolha o seu brinde favorito:
                        </p>
                        <div className="grid grid-cols-2 xs:grid-cols-3 gap-1.5">
                          {(() => {
                            const tuesdayPromo = promos?.find((p) => p.id === "ter");
                            const currentFreeToppingsList = (tuesdayPromo && tuesdayPromo.active && tuesdayPromo.tuesdayToppings && tuesdayPromo.tuesdayToppings.length > 0)
                              ? tuesdayPromo.tuesdayToppings
                              : AVAILABLE_FREE_TOPPINGS;
                            
                            return currentFreeToppingsList.map((top) => {
                              const isSelected = selectedFreeToppings.includes(top);
                              return (
                                <button
                                  key={top}
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedFreeToppings((prev) => prev.filter((t) => t !== top));
                                    } else {
                                      if (selectedFreeToppings.length < 1) {
                                        setSelectedFreeToppings((prev) => [...prev, top]);
                                      } else {
                                        alert("Você já escolheu o seu topping gratuito de brinde! Para trocar, desmarque antes.");
                                      }
                                    }
                                  }}
                                  className={`px-2.5 py-1.5 text-[10px] font-bold rounded-xl border text-center transition-all cursor-pointer truncate ${
                                    isSelected
                                      ? "bg-purple-900 text-white border-purple-900 shadow-sm"
                                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900"
                                  }`}
                                  title={top}
                                >
                                  {top}
                                </button>
                              );
                            });
                          })()}
                        </div>
                        <div className="text-[10px] text-purple-800 font-bold flex items-center justify-between">
                          <span>Selecionados: {selectedFreeToppings.length}/1</span>
                          {selectedFreeToppings.length === 1 && (
                            <span className="text-emerald-700 font-bold">✓ Prontinho! Brinde adicionado.</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Payment Selection */}
                    <div className="space-y-3 border-t border-gray-100 pt-3">
                      <label className="block text-xs font-bold text-gray-700">Forma de Pagamento</label>
                      <div className="grid grid-cols-3 gap-2">
                        {["Pix", "Cartão", "Dinheiro"].map((method) => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => {
                              setPaymentMethod(method);
                              if (method !== "Dinheiro") setChangeFor("");
                            }}
                            className={`py-2 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                              paymentMethod === method
                                ? "bg-purple-900 text-white border-purple-900"
                                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                            }`}
                          >
                            {method}
                          </button>
                        ))}
                      </div>

                      {paymentMethod === "Dinheiro" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="pt-2"
                        >
                          <input
                            type="text"
                            placeholder="Troco para quanto? (Ex: R$ 50)"
                            value={changeFor}
                            onChange={(e) => setChangeFor(e.target.value)}
                            className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-2.5 outline-none focus:border-purple-900"
                          />
                        </motion.div>
                      )}

                      {paymentMethod === "Pix" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="pt-2"
                        >
                          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3 text-xs shadow-xs">
                            <div className="flex items-center justify-between gap-2 border-b border-emerald-200 pb-1.5">
                              <span className="font-bold text-emerald-950 uppercase tracking-tight text-[11px]">💸 PAGAMENTO VIA PIX</span>
                              {companyInfo.pixKey && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(companyInfo.pixKey || "");
                                    alert("Chave Pix copiada com sucesso!");
                                  }}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black px-2.5 py-1 rounded-xl transition-all active:scale-95 cursor-pointer flex items-center gap-1 shadow-sm"
                                >
                                  Copiar Chave Pix
                                </button>
                              )}
                            </div>
                            
                            <div className="space-y-1">
                              <span className="text-[10px] text-emerald-800 uppercase font-bold tracking-wider">Chave Pix Cadastrada:</span>
                              <span className="font-mono font-black text-emerald-950 block bg-white/60 p-2.5 rounded-xl border border-emerald-100 text-center break-all select-all">
                                {companyInfo.pixKey || "Chave Pix não configurada pelo administrador."}
                              </span>
                            </div>

                            <div className="pt-2.5 space-y-2 border-t border-emerald-200/50">
                              <span className="text-[10px] text-emerald-900 uppercase font-extrabold tracking-wider block">ℹ️ Instruções Importantes para seu Pagamento Pix:</span>
                              <p className="text-gray-700 leading-relaxed text-[11px]">
                                Para sua maior comodidade e segurança, a escolha de como realizar o Pix é inteiramente sua. Oferecemos três opções profissionais para sua livre escolha:
                              </p>
                              
                              <ul className="space-y-2 pl-0.5">
                                <li className="flex gap-2 items-start text-gray-700 text-[10.5px] leading-relaxed">
                                  <span className="text-emerald-600 shrink-0 mt-0.5">🔹</span>
                                  <span>
                                    <strong>Só fazer o Pix quando souber o valor da entrega:</strong> Se preferir, você pode aguardar até ser redirecionado para o WhatsApp, receber o cálculo exato do valor da entrega por nossa equipe e transferir o valor total (produtos + entrega).
                                  </span>
                                </li>
                                <li className="flex gap-2 items-start text-gray-700 text-[10.5px] leading-relaxed">
                                  <span className="text-emerald-600 shrink-0 mt-0.5">🔹</span>
                                  <span>
                                    <strong>Fazer o Pix do valor do açaí agora:</strong> Você pode transferir o valor dos produtos agora para agilizar, e após ser redirecionado para o WhatsApp e souber o valor da entrega, fazer o Pix do valor da entrega separadamente.
                                  </span>
                                </li>
                                <li className="flex gap-2 items-start text-gray-700 text-[10.5px] leading-relaxed">
                                  <span className="text-emerald-600 shrink-0 mt-0.5">🔹</span>
                                  <span>
                                    <strong>Fazer o Pix somente após confirmação completa:</strong> Se preferir, realize toda a transferência somente no momento em que for redirecionado ao WhatsApp e souber o valor exato da entrega juntamente com o valor do seu pedido.
                                  </span>
                                </li>
                              </ul>

                              <p className="text-[10px] text-emerald-800 font-bold leading-normal bg-emerald-100/50 p-2 rounded-lg border border-emerald-200/50 mt-1">
                                💡 Ao clicar em "Enviar Pedido", o aplicativo gerará o seu recibo e abrirá o WhatsApp para você nos encaminhar os detalhes e o respectivo comprovante Pix.
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {/* Summary calculations block */}
                    <div className="border-t border-gray-100 pt-3.5 space-y-2 text-sm">
                      <div className="flex justify-between text-gray-500 text-xs">
                        <span>Subtotal</span>
                        <span className="font-semibold text-gray-900">R$ {subtotal.toFixed(2)}</span>
                      </div>

                      {loyaltyDiscount > 0 && (
                        <div className="flex justify-between text-purple-900 text-xs font-bold">
                          <span>Prêmio Fidelidade (-{companyInfo.loyaltyPointsTarget || 100}pts)</span>
                          <span>- R$ {loyaltyDiscount.toFixed(2)}</span>
                        </div>
                      )}

                      {autoPromoDiscount > 0 && (
                        <div className="flex justify-between text-lime-700 text-xs font-bold">
                          <span>Promo do Dia ({currentDayId.toUpperCase()})</span>
                          <span>- R$ {autoPromoDiscount.toFixed(2)}</span>
                        </div>
                      )}

                      {appliedCoupon && (
                        <div className="flex justify-between text-indigo-700 text-xs font-bold">
                          <span>Cupom ({appliedCoupon.code})</span>
                          <span>- R$ {couponDiscount.toFixed(2)}</span>
                        </div>
                      )}

                      <div className="flex justify-between text-gray-500 text-xs">
                        <span>Taxa de Entrega</span>
                        <span className={`font-semibold ${isFreeDeliveryToday ? "text-emerald-700" : isWednesdayActive ? "text-purple-700" : "text-purple-950"}`}>
                          {isFreeDeliveryToday 
                            ? "GRÁTIS (Promoção)" 
                            : isWednesdayActive 
                              ? "A confirmar (Grátis até 3km)" 
                              : "A definir no WhatsApp"
                          }
                        </span>
                      </div>

                      <div className="flex justify-between font-bold text-base text-purple-900 pt-2 border-t border-dashed border-gray-100">
                        <span>Total Geral</span>
                        <span>R$ {total.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Warning about delivery location calculation */}
                    {storeStatus.isOpen !== false && (
                      isFreeDeliveryToday ? (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-2xl p-4 space-y-2 text-xs mt-3 shadow-xs">
                          <div className="flex items-center gap-2 font-bold text-emerald-950 border-b border-emerald-200 pb-1.5">
                            <ShieldCheck className="w-4.5 h-4.5 text-emerald-700 shrink-0" />
                            <span className="uppercase tracking-tight text-[11px]">FRETE GRÁTIS ATIVO</span>
                          </div>
                          <p className="text-emerald-800 leading-relaxed font-semibold text-[11.5px]">
                            Aproveite! Hoje a taxa de entrega é totalmente gratuita devido à promoção da semana. Não se preocupe com taxas de frete!
                          </p>
                        </div>
                      ) : isWednesdayActive ? (
                        <div className="bg-purple-50 border border-purple-200 text-purple-950 rounded-2xl p-4 space-y-2 text-xs mt-3 shadow-xs">
                          <div className="flex items-center gap-2 font-bold text-purple-950 border-b border-purple-200 pb-1.5">
                            <MapPin className="w-4.5 h-4.5 text-purple-700 shrink-0 animate-bounce" />
                            <span className="uppercase tracking-tight text-[11px]">🎁 FRETE GRÁTIS ATÉ 3KM (A VERIFICAR)</span>
                          </div>
                          <p className="text-purple-900 leading-relaxed font-semibold text-[11.5px]">
                            Hoje é {todayPromo?.dayName || "Quarta-feira"}! Oferecemos frete grátis exclusivamente para endereços até 3km de distância.
                          </p>
                          <p className="text-gray-700 text-[11px] leading-relaxed">
                            📍 **Como funciona?** Para receber o desconto, após finalizar o pedido você <strong className="text-purple-950 underline decoration-wavy decoration-purple-400">DEVE enviar sua localização atual em tempo real no WhatsApp</strong>. Nosso atendente calculará a distância e confirmará a validação do seu frete grátis!
                          </p>
                        </div>
                      ) : (
                        <div className="bg-amber-50 border border-amber-200 text-amber-950 rounded-2xl p-4 space-y-2 text-xs mt-3 shadow-xs">
                          <div className="flex items-center gap-2 font-bold text-amber-950 border-b border-amber-200 pb-1.5">
                            <MapPin className="w-4.5 h-4.5 text-amber-700 shrink-0 animate-bounce" />
                            <span className="uppercase tracking-tight text-[11px]">📍 CÁLCULO DA TAXA DE ENTREGA</span>
                          </div>
                          <p className="text-gray-700 leading-relaxed font-semibold text-[11.5px]">
                            Para calcularmos a taxa de entrega da sua região, após enviar o pedido você <span className="text-purple-950 font-black underline decoration-wavy decoration-amber-500">DEVE enviar a sua LOCALIZAÇÃO EM FORMATO DE LOCALIZAÇÃO ATUAL (tempo real)</span> no WhatsApp para o nosso atendente.
                          </p>
                        </div>
                      )
                    )}

                    {/* Send Order Trigger Button */}
                    {storeStatus.isOpen === false ? (
                      <div className="space-y-2 mt-4 text-center">
                        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3.5 text-xs font-semibold leading-relaxed text-left">
                          {storeStatus.reason === "manual" ? (
                            <span>⏳ Olá! No momento estamos fechados temporariamente. Aproveite para planejar seus itens, mas novos pedidos online não podem ser transmitidos no momento. Retorne em breve!</span>
                          ) : (
                            <span>⏳ Desculpe! Estamos fora do horário de funcionamento ({companyInfo.hours}). No momento as transmissões de pedidos pelo carrinho estão fechadas. Esperamos você em nosso horário de atendimento: {companyInfo.hours}! ❤️</span>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled
                          className="w-full bg-gray-100 text-gray-400 font-bold py-4 px-4 rounded-xl cursor-not-allowed flex items-center justify-center gap-2 text-xs uppercase border border-gray-200"
                        >
                          Açaíteria Fechada
                        </button>
                      </div>
                    ) : (
                      <button
                        id="submit-order-btn"
                        type="submit"
                        disabled={isSubmittingOrder}
                        className="w-full mt-4 bg-lime-400 hover:bg-lime-500 disabled:opacity-50 disabled:cursor-not-allowed text-purple-950 font-black py-4 px-4 rounded-xl shadow-lg hover:shadow-xl active:scale-95 cursor-pointer transition-all flex items-center justify-center gap-2 text-xs uppercase"
                      >
                        {isSubmittingOrder ? (
                          <>
                            <div className="w-4 h-4 border-2 border-purple-950 border-t-transparent rounded-full animate-spin"></div>
                            <span>Registrando Pedido...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 text-purple-955" />
                            <span>Enviar Pedido via WhatsApp</span>
                          </>
                        )}
                      </button>
                    )}
                  </form>
                </>
              )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>

    <ReceiptModal
      isOpen={isReceiptModalOpen}
      onClose={() => setIsReceiptModalOpen(false)}
      companyInfo={companyInfo}
      customerName={customerName}
      customerPhone={customerPhone}
      address={address}
      cartItems={cartItems}
      subtotal={subtotal}
      total={total}
      loyaltyDiscount={loyaltyDiscount}
      autoPromoDiscount={autoPromoDiscount}
      couponDiscount={couponDiscount}
      appliedCoupon={appliedCoupon}
      redeemFreeAcai={redeemFreeAcai}
      paymentMethod={paymentMethod}
      changeFor={changeFor}
      selectedFreeToppings={selectedFreeToppings}
      earnedPoints={redeemFreeAcai ? 0 : cartItems.reduce((sum, item) => sum + (item.quantity * 10), 0)}
      redeemedPoints={redeemFreeAcai ? (companyInfo.loyaltyPointsTarget || 100) : 0}
      isFreeDeliveryToday={isFreeDeliveryToday}
      orderId={submittedOrderId}
      onProceedToWhatsApp={() => {
        onClearCart();
        setAppliedCoupon(null);
        setCouponCode("");
        setCouponSuccess("");
        setIsReceiptModalOpen(false);
        onClose();
      }}
    />
    </>
  );
}
