import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MapPin, Clock, Smartphone, Instagram, ShoppingBag, Award, Tag, Heart,
  CheckCircle, Truck, Star, Sparkles, Plus, ArrowRight, UserPlus, Search,
  ChevronLeft, ChevronRight, MessageSquare, Check, RotateCcw, Shield,
  ExternalLink, User, CheckCircle2, ChevronDown, Flame, ShoppingCart, X, Trash2, Pencil, Upload,
  Bell, BellRing, FileText, Download
} from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { Product, VitrineItem, SocialProof, PromoWeekDay, CompanyInfo, LoyaltyUser, OrderHistory, CartItem, AppletNotification, DEFAULT_AVATAR_URL, WeeklyHours } from "./types";
import {
  getStoredProducts, saveProducts,
  getStoredVitrine, saveVitrine,
  getStoredSocialProofs, saveSocialProofs,
  getStoredPromos, savePromos,
  getStoredCompanyInfo, saveCompanyInfo,
  getStoredLoyaltyUsers, saveLoyaltyUsers,
  getStoredOrders, saveOrders, saveSingleOrderToCloud,
  getStoredClientUsers, saveClientUsers,
  getStoredNotifications, saveNotifications,
  resolveProductsImages,
  resolveVitrineImages,
  resolveSocialProofsImages,
  resolveCompanyInfoImages,
  fetchProductsCloud,
  fetchVitrineCloud,
  fetchSocialProofsCloud,
  fetchPromosCloud,
  fetchCompanyInfoCloud,
  fetchLoyaltyUsersCloud,
  fetchOrdersCloud,
  fetchNotificationsCloud,
  fetchCouponsCloud,
  fetchClientUsersCloud,
  fetchAdminCredentialsCloud,
  sortPromos
} from "./data/storage";
import Cart from "./components/Cart";
import AdminPanel from "./components/AdminPanel";
import { ErrorBoundary } from "./components/ErrorBoundary";
import ClientAuthModal from "./components/ClientAuthModal";
import { ProductCard } from "./components/ProductCard";
import { PromoOfTheDay } from "./components/PromoOfTheDay";
import { WednesdayCountdown } from "./components/WednesdayCountdown";
import { PromoCountdownBanner } from "./components/PromoCountdownBanner";
import { AnnouncementModal } from "./components/AnnouncementModal";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { formatBrazilianPhone, generateWhatsAppLink, calculatePromoCountdown } from "./utils";
import { compressImageBase64, uploadImageToStorage } from "./lib/firebase";

export function getRecifeTime(): { hour: number; minute: number } {
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

interface CatalogTag {
  id: string;
  label: string;
  emoji: string;
  filter: (p: Product) => boolean;
}

const CATALOG_TAGS: CatalogTag[] = [
  {
    id: "avela",
    label: "Com avelã",
    emoji: "🍫",
    filter: (p) => {
      const q = (p.name + " " + p.description).toLowerCase();
      return q.includes("avela") || q.includes("avelã") || q.includes("nutella");
    },
  },
  {
    id: "no-fruits",
    label: "Sem Frutas",
    emoji: "🥥",
    filter: (p) => {
      const desc = p.description.toLowerCase();
      const name = p.name.toLowerCase();
      const forbidden = ["morango", "banana", "laranja", "fruta", "frutas", "limão", "maracujá", "açai do pará", "kiwi"];
      return !forbidden.some((word) => desc.includes(word) || name.includes(word));
    },
  },
  {
    id: "leite-po",
    label: "Com Leite em pó",
    emoji: "🥛",
    filter: (p) => {
      const q = (p.name + " " + p.description).toLowerCase();
      return q.includes("ninho") || q.includes("leite em pó") || q.includes("leite em po") || q.includes("leite pó") || q.includes("leite po");
    },
  },
  {
    id: "morango",
    label: "Com Morango",
    emoji: "🍓",
    filter: (p) => p.name.toLowerCase().includes("morango") || p.description.toLowerCase().includes("morango"),
  },
  {
    id: "banana",
    label: "Com Banana",
    emoji: "🍌",
    filter: (p) => p.name.toLowerCase().includes("banana") || p.description.toLowerCase().includes("banana"),
  },
  {
    id: "creme-leitinho",
    label: "Com Creme de leitinho",
    emoji: "🍦",
    filter: (p) => {
      const q = (p.name + " " + p.description).toLowerCase();
      return q.includes("leitinho") || q.includes("creme de leitinho") || q.includes("leite ninho");
    },
  },
  {
    id: "kiwi",
    label: "Com kiwi",
    emoji: "🥝",
    filter: (p) => p.name.toLowerCase().includes("kiwi") || p.description.toLowerCase().includes("kiwi"),
  },
  {
    id: "farinha-amendoim",
    label: "Com farinha de Amendoim",
    emoji: "🥜",
    filter: (p) => {
      const q = (p.name + " " + p.description).toLowerCase();
      return q.includes("amendoim") || q.includes("paçoca") || q.includes("pacoca");
    },
  },
  {
    id: "ferrero-rocher",
    label: "Com Ferrero Rocher",
    emoji: "🍬",
    filter: (p) => {
      const q = (p.name + " " + p.description).toLowerCase();
      return q.includes("ferrero") || q.includes("rocher");
    },
  },
];

export function getAvatarGradient(name: string): string {
  const gradients = [
    "from-purple-500 to-pink-500 text-white",
    "from-amber-400 to-orange-500 text-white",
    "from-rose-400 to-red-500 text-white",
    "from-teal-400 to-emerald-500 text-white",
    "from-blue-500 to-indigo-600 text-white",
    "from-indigo-400 to-purple-500 text-white",
  ];
  let sum = 0;
  for (let i = 0; i < (name || "").length; i++) {
    sum += (name || "").charCodeAt(i);
  }
  return gradients[sum % gradients.length];
}

const formatPromoTimeLabel = (timeStr?: string) => {
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

export default function App() {
  // --- DATABASE STATES ---
  const [isSyncing, setIsSyncing] = useState(true);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(getStoredCompanyInfo());
  const [products, setProducts] = useState<Product[]>(getStoredProducts());
  const [vitrine, setVitrine] = useState<VitrineItem[]>(getStoredVitrine());
  const [socialProofs, setSocialProofs] = useState<SocialProof[]>(getStoredSocialProofs());
  const [isReviewImageUploading, setReviewImageUploading] = useState(false);
  const [promos, setPromos] = useState<PromoWeekDay[]>(getStoredPromos());
  const [loyaltyUsers, setLoyaltyUsers] = useState<LoyaltyUser[]>(getStoredLoyaltyUsers());
  const [orders, setOrders] = useState<OrderHistory[]>(getStoredOrders());

  // --- VISUAL NOTIFICATIONS SYSTEM ---
  const [notifications, setNotifications] = useState<AppletNotification[]>(() => {
    return getStoredNotifications();
  });
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // --- ANNOUNCEMENT POPUP MODAL STATE ---
  const [isAnnouncementOpen, setIsAnnouncementOpen] = useState<boolean>(false);

  const processOrderPoints = (order: OrderHistory, targetOrders: OrderHistory[]): OrderHistory[] => {
    if (order.pointsProcessed) return targetOrders;

    const earned = order.pointsEarned || 0;
    const redeemed = order.pointsRedeemed || 0;
    const phone = order.customerPhone;
    
    if (phone && (earned > 0 || redeemed > 0)) {
      const netPoints = earned - redeemed;
      const cleanPhone = phone.replace(/\D/g, "");
      const isRedemption = redeemed > 0;
      
      // Ensure they have a registered account in the app first!
      const allClients = getStoredClientUsers();
      const registeredClient = allClients.find(c => c.phone.replace(/\D/g, "") === cleanPhone);

      if (!registeredClient) {
        // Cannot participate in loyalty program without an app registration
        showToast(`ℹ️ Cliente sem cadastro no aplicativo não acumula pontos fidelidade.`);
        return targetOrders.map(o => {
          if (o.id === order.id) {
            return { ...o, pointsProcessed: true };
          }
          return o;
        });
      }

      // Let's find or register this loyalty user in database!
      const allLoyaltyUsers = getStoredLoyaltyUsers();
      const existingUser = allLoyaltyUsers.find((u) => u.phone.replace(/\D/g, "") === cleanPhone);

      let updatedLoyaltyList = allLoyaltyUsers;
      if (!existingUser) {
        // Automatically create a loyalty profile using their app registration details!
        const newUser: LoyaltyUser = {
          id: "loyalty_" + registeredClient.id,
          name: registeredClient.name,
          phone: registeredClient.phone,
          points: isRedemption ? 0 : Math.max(0, netPoints),
          createdAt: new Date().toISOString().split("T")[0],
          birthday: registeredClient.birthday
        };
        updatedLoyaltyList = [newUser, ...allLoyaltyUsers];
        setLoyaltyUsers(updatedLoyaltyList);
        saveLoyaltyUsers(updatedLoyaltyList);
        showToast(`✨ @${registeredClient.name} cadastrado automaticamente no Programa Fidelidade!`);
      } else {
        // Update existing user points
        const updated = allLoyaltyUsers.map((user) => {
          if (user.phone.replace(/\D/g, "") === cleanPhone) {
            return { 
              ...user, 
              name: registeredClient.name, // Keep name synchronized
              points: isRedemption ? 0 : Math.max(0, user.points + netPoints) 
            };
          }
          return user;
        });
        updatedLoyaltyList = updated;
        setLoyaltyUsers(updated);
        saveLoyaltyUsers(updated);
      }

      // Synchronize currently logged-in active clientUser points if their phone matches
      if (clientUser && clientUser.phone.replace(/\D/g, "") === cleanPhone) {
        const updatedClient = {
          ...clientUser,
          points: isRedemption ? 0 : Math.max(0, (clientUser.points || 0) + netPoints)
        };
        setClientUser(updatedClient);
        localStorage.setItem("acai_client_user", JSON.stringify(updatedClient));

        // Sync to client users database
        const updatedClients = allClients.map(c => {
          if (c.id === clientUser.id) {
            return { ...c, points: updatedClient.points };
          }
          return c;
        });
        saveClientUsers(updatedClients);
      } else {
        // Even if they aren't logged in right now, update their record in client users table if it exists
        const updatedClients = allClients.map(c => {
          if (c.phone.replace(/\D/g, "") === cleanPhone) {
            return { ...c, points: isRedemption ? 0 : Math.max(0, (c.points || 0) + netPoints) };
          }
          return c;
        });
        saveClientUsers(updatedClients);
      }

      // Synchronize loyalty search result if it matches the processed order
      if (loyaltySearchResult && loyaltySearchResult.phone.replace(/\D/g, "") === cleanPhone) {
        setLoyaltySearchResult({
          ...loyaltySearchResult,
          points: isRedemption ? 0 : Math.max(0, loyaltySearchResult.points + netPoints)
        });
      }

      showToast(`⭐ Pontos creditados: ${order.customerName || "Cliente"} ganhou ${earned} pts${redeemed > 0 ? ` (Gastou ${redeemed} pts e recomeçou do zero!)` : ""}!`);

      // Add points notification strictly for this customer
      if (phone && (earned > 0 || redeemed > 0)) {
        const pointsNotif: AppletNotification = {
          id: "notif_pts_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
          orderId: order.id,
          customerPhone: phone,
          customerName: order.customerName,
          type: "points",
          message: isRedemption 
            ? `🍧 Você resgatou seu Açaí Grátis no Programa Fidelidade com o pedido ${order.id}!`
            : `⭐ Você acumulou +${earned} pontos no Programa Fidelidade com o pedido ${order.id}!`,
          status: "Finalizado",
          date: new Date().toISOString(),
          read: false,
        };
        setNotifications((prev) => {
          const updated = [pointsNotif, ...prev];
          saveNotifications(updated);
          return updated;
        });
      }
    }

    // Return updated orders with pointsProcessed set to true for this order
    return targetOrders.map(o => {
      if (o.id === order.id) {
        return { ...o, pointsProcessed: true };
      }
      return o;
    });
  };

  const handleConfirmWhatsAppPurchase = async (orderId: string) => {
    const orderObj = orders.find(o => o.id === orderId);
    if (!orderObj) {
      showToast("⚠️ Pedido não localizado.");
      return;
    }

    if (orderObj.pointsProcessed) {
      showToast("⚠️ Os pontos deste pedido já foram processados.");
      return;
    }

    if (orderObj.status === "Cancelado") {
      showToast("⚠️ Não é possível confirmar pontos de um pedido cancelado.");
      return;
    }

    // Explicitly transition status to Finalizado and record confirmation timestamp
    let updatedOrders = orders.map((o) => {
      if (o.id === orderId) {
        return { 
          ...o, 
          status: "Finalizado" as const,
          confirmedAt: new Date().toISOString()
        };
      }
      return o;
    });

    const updatedOrderObj = updatedOrders.find(o => o.id === orderId);
    if (updatedOrderObj) {
      updatedOrders = processOrderPoints(updatedOrderObj, updatedOrders);
    }

    setOrders(updatedOrders);
    localStorage.setItem("acai_delivery_orders", JSON.stringify(updatedOrders));

    // Instantly sync confirmed order to cloud database
    const finalOrderObj = updatedOrders.find(o => o.id === orderId);
    if (finalOrderObj) {
      try {
        await saveSingleOrderToCloud(finalOrderObj);
      } catch (err) {
        console.error("[Firebase] Fatal error syncing confirmed order status to database:", err);
      }
    }
    
    // Add a status change notification
    const newNotification: AppletNotification = {
      id: "notif_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
      orderId,
      customerPhone: finalOrderObj?.customerPhone,
      customerName: finalOrderObj?.customerName,
      type: "order",
      message: `Seu pedido ${orderId} foi concluído no WhatsApp! Seus pontos foram liberados!`,
      status: "Finalizado",
      date: new Date().toISOString(),
      read: false,
    };
    const updatedNotifs = [newNotification, ...notifications];
    setNotifications(updatedNotifs);
    saveNotifications(updatedNotifs);

    showToast(`🚀 Venda ${orderId} confirmada com sucesso! Status alterado para "Finalizado".`);
  };

  const handleUpdateOrderStatus = async (
    orderId: string, 
    newStatus: "Recebido" | "Em preparo" | "Saiu para entrega" | "Entregue" | "Cancelado" | "Pendente de confirmação no WhatsApp" | "Finalizado"
  ) => {
    let orderChanged = false;
    let oldStatus = "";
    
    let updatedOrders = orders.map((order) => {
      if (order.id === orderId) {
        if (order.status !== newStatus) {
          orderChanged = true;
          oldStatus = order.status;
        }
        const updatedFields: any = { ...order, status: newStatus };
        if (newStatus === "Finalizado" && !order.confirmedAt) {
          updatedFields.confirmedAt = new Date().toISOString();
        }
        return updatedFields;
      }
      return order;
    });

    if (orderChanged) {
      let statusText = newStatus === "Saiu para entrega" ? "A caminho" : newStatus;
      const message = `Seu pedido ${orderId} foi atualizado para: ${statusText}`;
      
      const matchedOrder = orders.find(o => o.id === orderId);
      const newNotification: AppletNotification = {
        id: "notif_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
        orderId,
        customerPhone: matchedOrder?.customerPhone,
        customerName: matchedOrder?.customerName,
        type: "order",
        message,
        status: newStatus,
        date: new Date().toISOString(),
        read: false,
      };

      const updatedNotifs = [newNotification, ...notifications];
      setNotifications(updatedNotifs);
      saveNotifications(updatedNotifs);
      
      showToast(`🔔 ${orderId}: Atualizado para "${statusText}"!`);

      // IF status transitions to "Finalizado" (or "Entregue" for backward compatibility) and points are not yet processed, process them!
      if (newStatus === "Finalizado" || newStatus === "Entregue") {
        const orderObj = updatedOrders.find(o => o.id === orderId);
        if (orderObj && !orderObj.pointsProcessed) {
          updatedOrders = processOrderPoints(orderObj, updatedOrders);
        }
      } else if (newStatus === "Cancelado") {
        // If canceled, mark the points as processed so they aren't pending anymore without giving points
        updatedOrders = updatedOrders.map(o => {
          if (o.id === orderId) {
            return { ...o, pointsProcessed: true };
          }
          return o;
        });
      }
    }

    setOrders(updatedOrders);
    localStorage.setItem("acai_delivery_orders", JSON.stringify(updatedOrders));

    const finalOrderObj = updatedOrders.find(o => o.id === orderId);
    if (finalOrderObj) {
      try {
        await saveSingleOrderToCloud(finalOrderObj);
      } catch (err) {
        console.error("[Firebase] Fatal error syncing updated order to database:", err);
      }
    }
  };

  const handleMarkAllNotificationsAsRead = () => {
    const userNotifIds = new Set(userNotifications.map(n => n.id));
    const updated = notifications.map((n) => userNotifIds.has(n.id) ? { ...n, read: true } : n);
    setNotifications(updated);
    saveNotifications(updated);
    showToast("✓ Todas as suas notificações foram marcadas como lidas.");
  };

  const handleClearNotifications = () => {
    const userNotifIds = new Set(userNotifications.map(n => n.id));
    const updated = notifications.filter((n) => !userNotifIds.has(n.id));
    setNotifications(updated);
    saveNotifications(updated);
    showToast("🗑️ Seu histórico de notificações foi limpo.");
  };

  const handleAddGlobalNotification = (
    message: string,
    status: "Recebido" | "Em preparo" | "Saiu para entrega" | "Entregue" | "Cancelado" | "Promoção" | "Geral" = "Promoção"
  ) => {
    const newNotification: AppletNotification = {
      id: "notif_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
      orderId: "promo",
      message,
      status,
      date: new Date().toISOString(),
      read: false,
    };
    const updatedNotifs = [newNotification, ...notifications];
    setNotifications(updatedNotifs);
    saveNotifications(updatedNotifs);
    showToast(`📢 Comunicado enviado: "${message.substring(0, 30)}..."`);
  };

  const storeStatus = checkStoreOpenStatus(companyInfo);

  // --- CLIENT AUTH STATE ---
  const [clientUser, setClientUser] = useState<any | null>(() => {
    try {
      const saved = localStorage.getItem("acai_client_user");
      if (saved && saved !== "undefined" && saved !== "null") {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Error parsing acai_client_user, clearing...", e);
      localStorage.removeItem("acai_client_user");
    }
    return null;
  });

  const userNotifications = React.useMemo(() => {
    // Helper to normalize phone digits (strips non-digits and optional Brazil +55 country code)
    const normalizeDigits = (p?: string): string => {
      if (!p) return "";
      let digits = p.replace(/\D/g, "");
      if (digits.startsWith("55") && digits.length >= 12) {
        digits = digits.slice(2);
      }
      return digits;
    };

    // Active user phone either from logged-in clientUser or device order session
    const activePhoneRaw = clientUser?.phone || localStorage.getItem("acai_device_phone") || "";
    const cleanActivePhone = normalizeDigits(activePhoneRaw);

    // If no active user is identified on this device (guest who hasn't bought or logged in),
    // they must see 0 notifications (no notifications of other users' orders or points!)
    if (!cleanActivePhone || cleanActivePhone.length < 8) {
      return [];
    }

    // Filter notifications strictly for this specific active user
    return notifications.filter((n) => {
      // Direct phone match on the notification
      if (n.customerPhone) {
        const notifPhone = normalizeDigits(n.customerPhone);
        if (notifPhone.length >= 8 && notifPhone === cleanActivePhone) {
          return true;
        }
      }

      // Order match fallback
      if (n.orderId && n.orderId !== "promo") {
        const matchedOrder = orders.find((o) => o.id === n.orderId);
        if (matchedOrder && matchedOrder.customerPhone) {
          const orderPhone = normalizeDigits(matchedOrder.customerPhone);
          if (orderPhone.length >= 8 && orderPhone === cleanActivePhone) {
            return true;
          }
        }
      }

      return false;
    });
  }, [notifications, clientUser, orders]);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [selectedProductForReview, setSelectedProductForReview] = useState("geral");

  // --- CORE UI STATES ---
  const [activeTab, setActiveTab] = useState<"home" | "menu" | "fidelidade" | "historico" | "admin">("home");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [lastAddedItem, setLastAddedItem] = useState<CartItem | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedPromoDayPreview, setSelectedPromoDayPreview] = useState<string>(
    ["dom", "seg", "ter", "qua", "qui", "sex", "sab"][new Date().getDay()]
  );
  const [menuFilter, setMenuFilter] = useState<"todos" | "tradicionais" | "gourmets" | "combos" | "favoritos">("todos");
  const [menuImageLayout, setMenuImageLayout] = useState<"banner" | "list" | "circle" | "gourmet" | "modern" | "full" | "bento" | "acai">("acai");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [mobileMenuFiltersOpen, setMobileMenuFiltersOpen] = useState(false);
  const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null);

  const getTargetProductForPromo = (promo: PromoWeekDay, productsList: Product[]): Product | undefined => {
    if (promo.id === "sex") {
      // Prioritize explicit fridaySelectedProductId if it exists in the products list
      if (promo.fridaySelectedProductId) {
        const found = productsList.find(p => p.id === promo.fridaySelectedProductId);
        if (found) return found;
      }
      const comboTrufado = productsList.find(p => p.id === "p13") || productsList.find(p => p.name.toLowerCase().includes("trufado") && p.name.toLowerCase().includes("combo"));
      if (comboTrufado) return comboTrufado;
      const pId = "p13";
      return productsList.find(p => p.id === pId);
    }
    if (promo.id === "qui") {
      return productsList.find(p => p.id === "p1") || productsList.find(p => p.name.toLowerCase().includes("tradicional"));
    }
    
    // Scan products to see if any product's name is mentioned in the promo title or description
    const sortedProducts = [...productsList].sort((a, b) => b.name.length - a.name.length);
    for (const product of sortedProducts) {
      if (product.name && product.name.length > 3) {
        const pNameLower = product.name.toLowerCase();
        const titleLower = (promo.title || "").toLowerCase();
        const descLower = (promo.description || "").toLowerCase();
        if (titleLower.includes(pNameLower) || descLower.includes(pNameLower)) {
          return product;
        }
      }
    }
    return undefined;
  };

  const handleGoToPromoProduct = (promo: PromoWeekDay) => {
    setActiveTab("menu");
    
    const targetProduct = getTargetProductForPromo(promo, products);
    if (targetProduct) {
      // Clear filters so the product is visible
      setSearchQuery("");
      setSelectedTags([]);
      setMenuFilter("todos");
      
      const targetId = targetProduct.id;
      setHighlightedProductId(targetId);
      
      // Scroll to the product
      setTimeout(() => {
        const element = document.getElementById(`product-card-${targetId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }, 150);
      
      // Auto clear highlight after 3 seconds
      setTimeout(() => {
        setHighlightedProductId((prev) => prev === targetId ? null : prev);
      }, 3000);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  
  // Custom Reviews State
  const [newReviewForm, setNewReviewForm] = useState({ name: "", instagram: "", comment: "", rating: 5, storyImage: "" });
  const [showAddReview, setShowAddReview] = useState(false);
  const [selectedStoryImage, setSelectedStoryImage] = useState<string | null>(null);
  const [storyPlayerIndex, setStoryPlayerIndex] = useState<number | null>(null);
  const [reviewsLayout, setReviewsLayout] = useState<"smartphones" | "polaroid" | "minimalist">("smartphones");
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: number; storyId: string; emoji: string; delay: number; x: number }[]>([]);

  const triggerStoryReaction = (storyId: string) => {
    const emojis = ["❤️", "💖", "🥰", "🍓", "🍇", "🍦", "🔥", "✨", "😋", "👏"];
    const newReactions = Array.from({ length: 7 }).map((_, i) => ({
      id: Date.now() + i + Math.random(),
      storyId,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      delay: i * 0.08,
      x: (Math.random() - 0.5) * 60, // random side deviation
    }));
    setFloatingEmojis((prev) => [...prev, ...newReactions]);
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((r) => !newReactions.some((nr) => nr.id === r.id)));
    }, 2000);
  };

  useEffect(() => {
    if (lastAddedItem) {
      const timer = setTimeout(() => {
        setLastAddedItem(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [lastAddedItem]);

  useEffect(() => {
    if (storyPlayerIndex === null) return;
    const activeProofs = socialProofs.filter(item => item.storyImage);
    if (activeProofs.length === 0) return;

    const timer = setTimeout(() => {
      if (storyPlayerIndex < activeProofs.length - 1) {
        setStoryPlayerIndex(storyPlayerIndex + 1);
      } else {
        setStoryPlayerIndex(null); // close when finished last story
      }
    }, 5000); // 5 seconds per story

    return () => clearTimeout(timer);
  }, [storyPlayerIndex, socialProofs]);

  // Loyalty Inquiry State
  const [loyaltySearchPhone, setLoyaltySearchPhone] = useState("");
  const [loyaltySearchResult, setLoyaltySearchResult] = useState<LoyaltyUser | null | undefined>(undefined);
  const [loyaltyRegisterName, setLoyaltyRegisterName] = useState("");
  const [loyaltyRegisterPhone, setLoyaltyRegisterPhone] = useState("");

  // Product size state resolver map e.g: { [productId]: selectedSizeString }
  const [selectedProductSize, setSelectedProductSize] = useState<{ [productId: string]: string }>({});

  // Product additions tracker (number of times each product has been added to the cart)
  const [productAdditions, setProductAdditions] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem("acai_product_additions");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Calculate dynamic count of additions for a product based on real-time adds + historical order counts
  const getProductAdditionsCount = (productId: string, productName: string): number => {
    const localCount = productAdditions[productId] || 0;
    let orderCount = 0;
    orders.forEach((order) => {
      if (order.status !== "Cancelado") {
        order.items.forEach((item) => {
          if (item.name.trim().toLowerCase() === productName.trim().toLowerCase()) {
            orderCount += item.quantity || 1;
          }
        });
      }
    });
    return localCount + orderCount;
  };

  // Dynamic vitrine highlights
  const displayVitrine = React.useMemo(() => {
    return vitrine;
  }, [vitrine]);

  // Dynamic weekly promos - ensure Friday's selected product is synced to our Trufado product dynamically!
  const displayPromos = React.useMemo(() => {
    const comboTrufadoProduct = products.find(p => p.id === "p13") || products.find(
      (p) => p.name.toLowerCase().includes("trufado") && p.name.toLowerCase().includes("combo")
    ) || products.find(
      (p) => p.name.toLowerCase().includes("trufado")
    );
    if (!comboTrufadoProduct) return promos;

    return promos.map((p) => {
      if (p.id === "sex") {
        return {
          ...p,
          fridaySelectedProductId: comboTrufadoProduct.id,
          fridaySpecialPrice: p.fridaySpecialPrice && p.fridaySpecialPrice !== 29.99 ? p.fridaySpecialPrice : 31.90,
        };
      }
      return p;
    });
  }, [promos, products]);

  // Global visual toast/status alert
  const [toastMessage, setToastMessage] = useState("");

  // Sync state data with Firestore database on startup (with instant UI fallback to local cache)
  useEffect(() => {
    let active = true;
    const syncCloudData = async () => {
      try {
        console.log("[Firebase] Syncing cloud data...");
        const [
          cloudCompanyInfo,
          cloudProducts,
          cloudVitrine,
          cloudSocialProofs,
          cloudPromos,
          cloudLoyaltyUsers,
          cloudOrders,
          cloudNotifications,
          _cloudCoupons,
          _cloudClientUsers
        ] = await Promise.all([
          fetchCompanyInfoCloud(),
          fetchProductsCloud(),
          fetchVitrineCloud(),
          fetchSocialProofsCloud(),
          fetchPromosCloud(),
          fetchLoyaltyUsersCloud(),
          fetchOrdersCloud(),
          fetchNotificationsCloud(),
          fetchCouponsCloud(),
          fetchClientUsersCloud(),
          fetchAdminCredentialsCloud() // Sync admin credentials on startup
        ]);

        if (!active) return;

        // Immediately resolve any "idb_img_" references that might exist in old cloud documents
        const resolvedCompany = await resolveCompanyInfoImages(cloudCompanyInfo);
        const resolvedProducts = await resolveProductsImages(cloudProducts);
        const resolvedVitrine = await resolveVitrineImages(cloudVitrine);
        const resolvedProofs = await resolveSocialProofsImages(cloudSocialProofs);

        setCompanyInfo(resolvedCompany);
        setProducts(resolvedProducts.filter(p => p.id !== "product_1781898758676"));
        setVitrine(resolvedVitrine);
        setSocialProofs(resolvedProofs);
        setPromos(cloudPromos);
        setLoyaltyUsers(cloudLoyaltyUsers);
        setOrders(cloudOrders);
        setNotifications(cloudNotifications);

        // Synchronize active clientUser with cloud clientUsers list if logged in
        const storedUserJson = localStorage.getItem("acai_client_user");
        if (storedUserJson && storedUserJson !== "undefined" && storedUserJson !== "null") {
          try {
            const storedUser = JSON.parse(storedUserJson);
            const freshUser = _cloudClientUsers.find((u: any) => u.id === storedUser.id || (u.phone && u.phone.replace(/\D/g, "") === storedUser.phone.replace(/\D/g, "")));
            if (freshUser) {
              setClientUser(freshUser);
              localStorage.setItem("acai_client_user", JSON.stringify(freshUser));
            }
          } catch (e) {
            console.error("Error synchronizing active user on startup:", e);
          }
        }

        console.log("[Firebase] Cloud sync completed successfully!");
        setIsSyncing(false);

        // --- AUTOMATIC BACKGROUND MIGRATION ---
        // All images are stored permanently as compressed Base64 strings directly in Firestore.
        // No external migration needed.
      } catch (err) {
        console.error("[Firebase] Error during cloud synchronization:", err);
        setIsSyncing(false);
      }
    };

    syncCloudData();
    return () => {
      active = false;
    };
  }, []);

  // Auto scroll vitrine carousel every 5 seconds
  useEffect(() => {
    if (displayVitrine.length === 0) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % displayVitrine.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [displayVitrine.length]);

  // Handle active weekday identification (Brazilian locale)
  const currentDayId = getRecifeDayOfWeek();
  const activePromoToday = displayPromos.find((p) => (p.dayOfWeek || p.id) === currentDayId);

  // Trigger global mini toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // --- CLIENT FAVORITES OPERATIONS ---
  const handleToggleFavorite = (productId: string) => {
    if (!clientUser) {
      showToast("🔐 Faça login para salvar seus açaís nos favoritos!");
      setIsAuthOpen(true);
      return;
    }
    const currentFavs = clientUser.favorites || [];
    const isFav = currentFavs.includes(productId);
    const updatedFavs = isFav
      ? currentFavs.filter((id: string) => id !== productId)
      : [...currentFavs, productId];

    const updatedUser = {
      ...clientUser,
      favorites: updatedFavs,
    };

    setClientUser(updatedUser);
    localStorage.setItem("acai_client_user", JSON.stringify(updatedUser));

    // Sync to persistent storage list
    const allUsers = getStoredClientUsers();
    const userIndex = allUsers.findIndex((u) => u.id === clientUser.id);
    if (userIndex !== -1) {
      allUsers[userIndex].favorites = updatedFavs;
      saveClientUsers(allUsers);
    }

    showToast(
      isFav ? "💔 Removido dos favoritos" : "💖 Adicionado aos seus favoritos!"
    );
  };

  // --- CART OPERATIONS ---
  const handleAddToCart = (product: Product, forcedSize?: string) => {
    if (!product) {
      console.error("Tentativa de adicionar produto nulo ao carrinho");
      return;
    }
    const sizes = product.sizes && product.sizes.length > 0 ? product.sizes : [{ size: "Padrão", price: 15.00 }];
    const sizeToUse = forcedSize || selectedProductSize[product.id] || sizes[0].size;
    const sizeObj = sizes.find((s) => s.size === sizeToUse) || sizes[0];
    
    const cartItemId = `${product.id}-${sizeToUse}`;
    const newCartItem = {
      id: cartItemId,
      product,
      selectedSize: sizeToUse,
      price: sizeObj.price,
      quantity: 1,
    };
    setLastAddedItem(newCartItem);

    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === cartItemId);
      if (existing) {
        return prev.map((item) =>
          item.id === cartItemId ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        newCartItem,
      ];
    });

    // Update product additions count tracker
    setProductAdditions((prev) => {
      const updated = { ...prev, [product.id]: (prev[product.id] || 0) + 1 };
      try {
        localStorage.setItem("acai_product_additions", JSON.stringify(updated));
      } catch (e) {
        console.error("Failed saving additions:", e);
      }
      return updated;
    });

    showToast(`🛒 ${product.name} (${sizeToUse}) adicionado ao carrinho!`);
    setIsCartOpen(true);
  };

  const handleUpdateCartQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveCartItem(id);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const handleRemoveCartItem = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
    showToast("Item removido do carrinho.");
  };

  const handleUpdateCustomizations = (itemId: string, additionals: string[], additionalPrice: number) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const baseSizePrice = item.product.sizes.find((s) => s.size === item.selectedSize)?.price || item.product.sizes[0]?.price || 15.00;
          return {
            ...item,
            price: baseSizePrice + additionalPrice,
            customizations: {
              ...(item.customizations || { size: item.selectedSize, complements: [], fruits: [], sauces: [] }),
              additionals,
            },
          };
        }
        return item;
      })
    );
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  // --- PERSISTENCE UPDATE PASSTHROUGHS ---
  const handleUpdateProducts = async (updated: Product[]) => {
    setProducts(updated);
    try {
      const finalProducts = await saveProducts(updated);
      setProducts(finalProducts);
    } catch (err) {
      console.error("Erro ao salvar produtos no Firebase:", err);
    }
  };

  const handleUpdateVitrine = async (updated: VitrineItem[]) => {
    setVitrine(updated);
    setCurrentSlide(0);
    try {
      const finalVitrine = await saveVitrine(updated);
      setVitrine(finalVitrine);
    } catch (err) {
      console.error("Erro ao salvar vitrine no Firebase:", err);
    }
  };



  const handleUpdateSocialProofs = async (updated: SocialProof[]) => {
    setSocialProofs(updated);
    try {
      const finalProofs = await saveSocialProofs(updated);
      setSocialProofs(finalProofs);
    } catch (err) {
      console.error("Erro ao salvar depoimentos no Firebase:", err);
    }
  };

  const handleUpdatePromos = (updated: PromoWeekDay[]) => {
    const sorted = sortPromos(updated);
    setPromos(sorted);
    savePromos(sorted);
  };

  const handleUpdateCompanyInfo = async (updated: CompanyInfo) => {
    setCompanyInfo(updated);
    try {
      const finalCompany = await saveCompanyInfo(updated);
      setCompanyInfo(finalCompany);
    } catch (err) {
      console.error("Erro ao salvar dados da empresa no Firebase:", err);
    }
  };

  // Handle live fidelity scores changes (either via Cart or Admin)
  const handleUpdateLoyaltyPoints = (phone: string, pointsChange: number) => {
    const rawTarget = phone.replace(/\D/g, "");
    const target = companyInfo.loyaltyPointsTarget || 100;
    const isRedemption = pointsChange < 0 && Math.abs(pointsChange) >= target;

    const updated = loyaltyUsers.map((user) => {
      if (user.phone.replace(/\D/g, "") === rawTarget) {
        return { ...user, points: isRedemption ? 0 : Math.max(0, user.points + pointsChange) };
      }
      return user;
    });
    setLoyaltyUsers(updated);
    saveLoyaltyUsers(updated);

    // Always synchronize points in the client users database (for any registered client, not just the active logged-in one)
    const allClients = getStoredClientUsers();
    let clientDbUpdated = false;
    const updatedClients = allClients.map((c) => {
      if (c.phone.replace(/\D/g, "") === rawTarget) {
        clientDbUpdated = true;
        return { ...c, points: isRedemption ? 0 : Math.max(0, (c.points || 0) + pointsChange) };
      }
      return c;
    });
    if (clientDbUpdated) {
      saveClientUsers(updatedClients);
    }

    // Also synchronize logged-in active clientUser state if their phone matches
    if (clientUser && clientUser.phone.replace(/\D/g, "") === rawTarget) {
      const updatedClient = {
        ...clientUser,
        points: isRedemption ? 0 : Math.max(0, (clientUser.points || 0) + pointsChange)
      };
      setClientUser(updatedClient);
      localStorage.setItem("acai_client_user", JSON.stringify(updatedClient));
    }

    // Update query result if screen open
    const currentQueryRaw = loyaltySearchPhone.replace(/\D/g, "");
    if (currentQueryRaw === rawTarget) {
      const match = updated.find((u) => u.phone.replace(/\D/g, "") === rawTarget);
      setLoyaltySearchResult(match);
    }

    // Trigger visual toast if client approaches or achieves their reward
    const userAfter = updated.find((u) => u.phone.replace(/\D/g, "") === rawTarget);
    if (userAfter && pointsChange > 0) {
      const target = companyInfo.loyaltyPointsTarget || 100;
      const remaining = target - userAfter.points;
      const firstName = userAfter.name ? userAfter.name.split(" ")[0].trim() : "Cliente";

      if (remaining > 0 && remaining <= 20) {
        showToast(`🧁 Quase lá, ${firstName}! Faltam apenas ${remaining} pontos para você liberar seu Açaí Grátis! 💜`);
      } else if (remaining <= 0) {
        showToast(`🎉 Parabéns, ${firstName}! Você atingiu a meta de ${target} pontos e ganhou seu Açaí Grátis! 🍧`);
      }
    }
  };

  const handleRegisterLoyaltyUser = (name: string, phone: string, points = 0) => {
    const cleanPhone = phone.replace(/\D/g, "");

    // Only allow registering if they have an active app profile!
    const allClients = getStoredClientUsers();
    const registeredClient = allClients.find(c => c.phone.replace(/\D/g, "") === cleanPhone);

    if (!registeredClient) {
      alert("⚠️ Este cliente não possui cadastro no aplicativo! O cliente precisa fazer o cadastro no app primeiro para participar do programa de fidelidade.");
      return;
    }

    const alreadyExists = loyaltyUsers.find((u) => u.phone.replace(/\D/g, "") === cleanPhone);
    if (alreadyExists) {
      alert("Este telefone já está registrado no programa de fidelidade!");
      return;
    }

    const newUser: LoyaltyUser = {
      id: "loyalty_" + registeredClient.id,
      name: registeredClient.name,
      phone: registeredClient.phone,
      points,
      createdAt: new Date().toISOString().split("T")[0],
    };

    const updated = [newUser, ...loyaltyUsers];
    setLoyaltyUsers(updated);
    saveLoyaltyUsers(updated);
    
    // Auto query newly registered user
    setLoyaltySearchPhone(phone);
    setLoyaltySearchResult(newUser);
    showToast(`🎁 Bem-vindo ${registeredClient.name}! Registro de fidelidade efetuado.`);
  };

  const handleDeleteLoyaltyUser = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    
    // 1. Delete from loyaltyUsers state
    const updatedLoyalty = loyaltyUsers.filter(u => u.phone.replace(/\D/g, "") !== cleanPhone);
    setLoyaltyUsers(updatedLoyalty);
    saveLoyaltyUsers(updatedLoyalty);

    // 2. Delete from registered clients
    const allClients = getStoredClientUsers();
    const updatedClients = allClients.filter(c => c.phone.replace(/\D/g, "") !== cleanPhone);
    saveClientUsers(updatedClients);

    // 3. If currently logged in client is the deleted one, clear their session
    if (clientUser && clientUser.phone.replace(/\D/g, "") === cleanPhone) {
      setClientUser(null);
      localStorage.removeItem("acai_client_user");
      localStorage.removeItem("acai_device_phone");
    }

    showToast("✓ Cliente excluído permanentemente.");
  };

  const handleAddOrderToHistory = async (
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
    rawAddress?: {
      street: string;
      number: string;
      neighborhood: string;
      complement?: string;
      city?: string;
      zipCode?: string;
    },
    pointsEarned?: number,
    pointsRedeemed?: number
  ): Promise<OrderHistory> => {
    const uuid = "ord-" + "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });

    const newOrder: OrderHistory = {
      id: uuid,
      date: new Date().toISOString(),
      items,
      total,
      address,
      whatsappSent: true,
      status: "Pendente de confirmação no WhatsApp",
      paymentMethod,
      changeFor,
      customerName,
      customerPhone,
      discountApplied,
      couponCode,
      rawAddress,
      pointsEarned,
      pointsRedeemed,
      pointsProcessed: false,
    };

    const updated = [newOrder, ...orders];
    setOrders(updated);
    localStorage.setItem("acai_delivery_orders", JSON.stringify(updated));

    // Create an initial notification for this new order so it shows up in the user's notification center
    const initialNotification: AppletNotification = {
      id: "notif_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
      orderId: uuid,
      customerPhone,
      customerName,
      type: "order",
      message: `Seu pedido ${uuid} no valor de R$ ${total.toFixed(2)} foi recebido! Acompanhe o status aqui.`,
      status: "Recebido",
      date: new Date().toISOString(),
      read: false,
    };
    const updatedNotifs = [initialNotification, ...notifications];
    setNotifications(updatedNotifs);
    saveNotifications(updatedNotifs);

    // Save order permanently and reliably to cloud first
    try {
      await saveSingleOrderToCloud(newOrder);
    } catch (err) {
      console.error("[Firebase] Fatal error saving order to cloud database:", err);
      // We will let the app continue locally, but warn in logs
    }

    // --- IDENTIFY ACTIVE USER ON DEVICE AND LINK SESSION ---
    if (customerPhone) {
      const cleanPhone = customerPhone.replace(/\D/g, "");
      localStorage.setItem("acai_device_phone", cleanPhone);

      const allClients = getStoredClientUsers();
      let matchedClient = allClients.find((c) => c.phone && c.phone.replace(/\D/g, "") === cleanPhone);

      if (!clientUser) {
        if (!matchedClient) {
          matchedClient = {
            id: `usr_${Date.now()}`,
            name: customerName || "Cliente",
            phone: customerPhone,
            points: 0,
            createdAt: new Date().toISOString().split("T")[0],
            favorites: [],
            blocked: false,
            address: rawAddress,
          };
          const updatedClients = [...allClients, matchedClient];
          saveClientUsers(updatedClients);
        } else {
          matchedClient = {
            ...matchedClient,
            name: customerName || matchedClient.name,
            address: rawAddress || matchedClient.address,
          };
          const updatedClients = allClients.map((c) => c.id === matchedClient!.id ? matchedClient! : c);
          saveClientUsers(updatedClients);
        }
        setClientUser(matchedClient);
        localStorage.setItem("acai_client_user", JSON.stringify(matchedClient));
      } else {
        const updatedClients = allClients.map((u) => {
          if (u.id === clientUser.id) {
            return {
              ...u,
              name: customerName || u.name,
              phone: customerPhone || u.phone,
              address: rawAddress || u.address,
            };
          }
          return u;
        });
        saveClientUsers(updatedClients);

        const updatedActiveUser = {
          ...clientUser,
          name: customerName || clientUser.name,
          phone: customerPhone || clientUser.phone,
          address: rawAddress || clientUser.address,
        };
        setClientUser(updatedActiveUser);
        localStorage.setItem("acai_client_user", JSON.stringify(updatedActiveUser));
      }
    }

    // --- REFERRAL (INDICAÇÃO) DEPOSIT TRIGGER ---
    if (clientUser) {
      const allClients = getStoredClientUsers();
      const dbUser = allClients.find((u) => u.id === clientUser.id);
      
      if (dbUser && dbUser.referredBy && !dbUser.referralAwarded) {
        const parentReferrerId = dbUser.referredBy;
        
        // Find referrer in client users database
        const referrerIndex = allClients.findIndex((u) => u.id === parentReferrerId);
        if (referrerIndex !== -1) {
          const referrerUser = allClients[referrerIndex];
          
          // Award 10 points to the friend who invited this customer!
          referrerUser.points = (referrerUser.points || 0) + 10;
          
          // Set referral completed on current user so they don't award duplicate points
          dbUser.referralAwarded = true;
          
          // Save updated client users database
          saveClientUsers(allClients);

          // Update current active clientUser state so local UI reflects their first purchase is completed
          const updatedActiveUser = {
            ...clientUser,
            name: customerName || clientUser.name,
            phone: customerPhone || clientUser.phone,
            address: rawAddress || clientUser.address,
            referralAwarded: true
          };
          setClientUser(updatedActiveUser);
          localStorage.setItem("acai_client_user", JSON.stringify(updatedActiveUser));

          // Also synchronize referrer's points in the active loyaltyUsers list if exists
          const cleanReferrerPhone = referrerUser.phone.replace(/\D/g, "");
          const updatedLoyaltyList = loyaltyUsers.map((lUser) => {
            if (lUser.phone.replace(/\D/g, "") === cleanReferrerPhone) {
              return { ...lUser, points: lUser.points + 10 };
            }
            return lUser;
          });
          setLoyaltyUsers(updatedLoyaltyList);
          saveLoyaltyUsers(updatedLoyaltyList);

          // Generate loyalty notification for the referring friend
          const referralNotif: AppletNotification = {
            id: "notif_ref_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
            orderId: uuid,
            customerPhone: referrerUser.phone,
            customerName: referrerUser.name,
            type: "points",
            message: `🎉 Indicação Premiada! Você ganhou +10 pontos Club porque seu amigo ${customerName || "indicado"} fez a 1ª compra!`,
            status: "Finalizado",
            date: new Date().toISOString(),
            read: false,
          };
          const updatedWithRefNotif = [referralNotif, ...updatedNotifs];
          setNotifications(updatedWithRefNotif);
          saveNotifications(updatedWithRefNotif);

          // Friendly notification toast
          setTimeout(() => {
            showToast(`🎟️ Indicação Premiada! ${referrerUser.name.split(" ")[0]} ganhou 10 pontos Club por indicar você! 💜`);
          }, 1500);
        }
      }
    }
    return newOrder;
  };

  // Peça Novamente quick loop adder
  const handleOrderAgain = (order: OrderHistory) => {
    let countAdded = 0;
    order.items.forEach((item) => {
      // Find the corresponding product in current catalog
      const match = products.find((p) => p.name.trim() === item.name.trim());
      if (match) {
        // Find if selected size exists or default
        const sizes = match.sizes && match.sizes.length > 0 ? match.sizes : [{ size: "Padrão", price: 15.00 }];
        const sizeMatch = sizes.find((s) => s.size === item.size) || sizes[0];
        // Add item with quantities
        for (let i = 0; i < item.quantity; i++) {
          handleAddToCart(match, sizeMatch.size);
        }
        countAdded += item.quantity;
      }
    });

    if (countAdded > 0) {
      setIsCartOpen(true);
      showToast(`🍧 ${countAdded} itens restaurados do histórico de pedidos!`);
    } else {
      alert("Não foi possível encontrar esses produtos no cardápio ativo para re-pedido.");
    }
  };

  // Add custom client testimonial via front-end
  const handleAddCustomerReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewForm.name) {
      showToast("❌ Por favor, preencha o seu nome!");
      return;
    }
    if (!newReviewForm.storyImage) {
      showToast("📸 Por favor, anexe o print dos Stories do cliente!");
      return;
    }

    const newProof: SocialProof = {
      id: "customer_pr_" + Date.now(),
      name: newReviewForm.name,
      instagram: newReviewForm.instagram || "cliente_acai",
      image: DEFAULT_AVATAR_URL,
      rating: newReviewForm.rating || 5,
      comment: "",
      storyImage: newReviewForm.storyImage,
    };

    handleUpdateSocialProofs([newProof, ...socialProofs]);
    setNewReviewForm({ name: "", instagram: "", comment: "", rating: 5, storyImage: "" });
    setSelectedProductForReview("geral");
    setShowAddReview(false);
    showToast("📸 Story do cliente adicionado com sucesso!");
  };

  // Filter categorization
  const filteredProducts = products.filter((p) => {
    // Exclude inactive products from customer-facing catalog
    if (p.active === false) return false;

    // Exclude Friday-only special combos/products unless today is Friday (getDay() === 5)
    if (p.isFridayOnly) {
      const isFriday = new Date().getDay() === 5;
      if (!isFriday) return false;
    }

    // 1. Category / favorites filter
    let matchesCategory = true;
    if (menuFilter === "favoritos") {
      matchesCategory = clientUser?.favorites?.includes(p.id) || false;
    } else {
      matchesCategory = menuFilter === "todos" || p.category === menuFilter;
    }

    // 2. Search query filter (name or description)
    let matchesSearch = true;
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim();
      const matchesName = p.name.toLowerCase().includes(query);
      const matchesDesc = p.description.toLowerCase().includes(query);
      matchesSearch = matchesName || matchesDesc;
    }

    // 3. Selected Tags filter
    let matchesTags = true;
    if (selectedTags.length > 0) {
      matchesTags = selectedTags.every((tagId) => {
        const tag = CATALOG_TAGS.find((t) => t.id === tagId);
        return tag ? tag.filter(p) : true;
      });
    }

    return matchesCategory && matchesSearch && matchesTags;
  }).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  // Calculate maximum additions count across all products
  const maxAdditionsCount = Math.max(
    ...products.map((p) => getProductAdditionsCount(p.id, p.name)),
    0
  );

  if (isSyncing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#1c0c24] text-white font-sans">
        <div className="flex flex-col items-center justify-center">
          <div className="relative flex items-center justify-center w-36 h-36 rounded-full bg-white p-1 shadow-[0_0_60px_rgba(168,85,247,0.35)] animate-pulse">
            <img
              src={companyInfo.logo || "https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=150&h=150&q=80"}
              alt={companyInfo.name || "Açaí Delivery"}
              className="w-full h-full object-cover rounded-full"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=150&h=150&q=80";
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-br from-[#12051a] via-[#1b082e] to-[#0A0310] flex items-center justify-center p-0 sm:p-4 select-none font-sans overflow-x-hidden relative">
      
      {/* Visual background ambient glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none hidden sm:block"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-fuchsia-500/10 rounded-full blur-[100px] pointer-events-none hidden sm:block"></div>

      {/* Main simulated mobile device container */}
      <div className="w-full max-w-[460px] h-[100dvh] sm:h-[860px] sm:max-h-[95vh] bg-white text-gray-900 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5),0_0_50px_rgba(168,85,247,0.1)] rounded-none sm:rounded-[36px] border-0 sm:border-[8px] sm:border-slate-900 overflow-hidden flex flex-col relative select-text">
        
        {/* Toast Alert Notifications */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="absolute top-16 left-1/2 -translate-x-1/2 bg-brand-charcoal text-white font-semibold text-xs px-5 py-3 rounded-xl shadow-2xl z-[100] flex items-center gap-2 border border-brand-pistachio/30 max-w-sm pointer-events-none"
            >
              <Sparkles className="w-4 h-4 text-brand-pistachio animate-bounce" />
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* TOP HEADER CONTROLS (COMPACT & MOBILE-FIRST) */}
        <header className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-100 z-10 shrink-0 select-text">
          {/* Left Side: Brand Logo and Title */}
          <div onClick={() => setActiveTab("home")} className="flex items-center gap-2 cursor-pointer select-none">
            <div className="w-10 h-10 bg-purple-900 rounded-full flex items-center justify-center overflow-hidden border border-purple-100 shadow-sm shrink-0">
              {companyInfo.logo ? (
                <img
                  src={companyInfo.logo}
                  alt={companyInfo.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=150&h=150&q=80";
                  }}
                />
              ) : (
                <div className="text-lime-400 font-black italic text-sm">AD</div>
              )}
            </div>
            <div className="flex flex-col text-left">
              <h1 className="text-xs font-black text-purple-900 tracking-tight leading-none uppercase">
                {companyInfo.name}
              </h1>
              <span className={`text-[8px] font-extrabold uppercase mt-0.5 px-1.5 py-0.5 rounded-full w-fit leading-none ${
                storeStatus.isOpen ? "bg-green-100 text-green-805" : "bg-rose-100 text-rose-805"
              }`}>
                {storeStatus.isOpen ? "🟢 Aberto" : "🔴 Fechado"}
              </span>
            </div>
          </div>

          {/* Right Side: Auth / Notifications */}
          <div className="flex items-center gap-1.5">
            {clientUser ? (
              <div className="flex items-center gap-1">
                <div className="flex flex-col text-right leading-none mr-1">
                  <span className="text-[8px] font-black uppercase text-purple-900">Olá, {clientUser.name.split(" ")[0]}</span>
                  <span className="text-[7px] font-extrabold text-lime-600 mt-0.5">{clientUser.points} pts</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setClientUser(null);
                    localStorage.removeItem("acai_client_user");
                    localStorage.removeItem("acai_device_phone");
                    showToast("👋 Até logo! Você saiu de sua conta.");
                  }}
                  className="py-1 px-1.5 border border-red-100 hover:bg-red-50 text-red-650 hover:text-red-700 font-bold text-[8px] rounded-md cursor-pointer transition-colors"
                  title="Desconectar"
                >
                  Sair
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="py-1 px-2 bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold text-[9px] rounded-lg border border-purple-150 active:scale-95 transition-all text-center cursor-pointer flex items-center gap-1"
              >
                <User className="w-3 h-3 text-purple-900" />
                <span>Entrar</span>
              </button>
            )}

            {/* Install App Button */}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-pwa-install'))}
              className="p-1.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-900 transition-all cursor-pointer flex items-center gap-1 shadow-xs"
              title="Instalar App na tela inicial"
            >
              <Download className="w-3.5 h-3.5 text-purple-700" />
              <span className="hidden sm:inline text-[9px] font-bold text-purple-900">Instalar</span>
            </button>

            {/* Visual Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={`p-1.5 rounded-lg border transition-all relative cursor-pointer ${
                  isNotificationsOpen 
                    ? "bg-purple-100 border-purple-300 text-purple-900" 
                    : "bg-gray-50 border-gray-150 hover:bg-gray-100 text-purple-900"
                }`}
                title="Notificações de Pedidos"
              >
                {userNotifications.some(n => !n.read) ? (
                  <BellRing className="w-3.5 h-3.5 text-purple-800 animate-bounce" />
                ) : (
                  <Bell className="w-3.5 h-3.5 text-purple-950" />
                )}
                {userNotifications.some(n => !n.read) && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[7px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center animate-pulse border border-white">
                    {userNotifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* MAIN VIEWPORT LAYOUT */}
        <main className="flex-1 flex flex-col relative w-full min-h-0 overflow-hidden bg-gray-50/50">
          
          {/* CENTER CONTENT STREAM */}
          <section className="flex-1 min-w-0 flex flex-col p-4 pb-20 overflow-y-auto overflow-x-hidden">
          
          {/* Header page label */}
          <div className="flex items-center justify-between mb-5 sm:mb-8 flex-wrap gap-4 shrink-0 border-b border-gray-100/80 pb-4">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">
              {activeTab === "home" && (
                <div className="flex flex-col text-left">
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-lime-400 text-purple-950 font-display font-black text-sm md:text-base lg:text-lg uppercase tracking-wider rounded-xl shadow-md w-fit">
                    Página Inicial
                  </span>
                </div>
              )}
              {activeTab === "menu" && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-lime-400 text-purple-950 font-display font-black text-sm md:text-base lg:text-lg uppercase tracking-wider rounded-xl shadow-md w-fit">
                  Catálogo de Produtos
                </span>
              )}
              {activeTab === "fidelidade" && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-lime-400 text-purple-950 font-display font-black text-sm md:text-base lg:text-lg uppercase tracking-wider rounded-xl shadow-md w-fit">
                  Fidelidade & Vantagens
                </span>
              )}
              {activeTab === "historico" && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-lime-400 text-purple-950 font-display font-black text-sm md:text-base lg:text-lg uppercase tracking-wider rounded-xl shadow-md w-fit">
                  Peça Novamente
                </span>
              )}
              {activeTab === "admin" && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-lime-400 text-purple-950 font-display font-black text-sm md:text-base lg:text-lg uppercase tracking-wider rounded-xl shadow-md w-fit">
                  Painel de Administração
                </span>
              )}
            </h2>
          </div>

        {/* 1. TELA INICIAL (TAB HOME) */}
        {activeTab === "home" && (
          <div className="space-y-10 pb-16">
            {storeStatus.isOpen === false && (
              companyInfo.announcement?.active ? (
                <div className="relative overflow-hidden bg-gradient-to-r from-purple-950 via-pink-950 to-purple-900 border-2 border-pink-300/50 text-pink-100 rounded-3xl p-6 shadow-2xl shadow-pink-950/20">
                  <div className="flex items-start gap-4 text-left relative z-10">
                    <span className="text-3xl shrink-0 p-3 bg-white/10 rounded-2xl border border-white/20 animate-bounce">🍼</span>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="bg-pink-400/30 text-pink-200 font-bold text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-lg border border-pink-300/30">
                          {companyInfo.announcement.badge || "COMUNICADO ESPECIAL"}
                        </span>
                      </div>
                      <h4 className="font-display font-black text-lg md:text-xl text-white tracking-tight">
                        {companyInfo.announcement.title}
                      </h4>
                      <div className="text-xs md:text-sm text-pink-100/90 leading-relaxed font-sans space-y-2 pt-1 border-t border-pink-300/20">
                        {companyInfo.announcement.message.split("\n\n").map((paragraph, idx) => (
                          <p key={idx} className={idx === 0 ? "font-semibold text-white" : ""}>
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative overflow-hidden bg-gradient-to-r from-amber-950 to-orange-950 border border-amber-500/30 text-amber-100 rounded-3xl p-6 flex items-start gap-4 shadow-2xl shadow-amber-950/10">
                  {/* Cyberpunk grid overlay for the warning */}
                  <div className="absolute inset-0 bg-[radial-gradient(#f59e0b10_1px,transparent_1px)] [background-size:12px_12px] opacity-60" />
                  <span className="text-2xl shrink-0 relative z-10 animate-pulse">⏳</span>
                  <div className="space-y-1 text-left relative z-10">
                    <h4 className="font-mono font-extrabold text-xs tracking-wider text-amber-400 uppercase">
                      [ ESTADO DO SISTEMA // FECHADO ]
                    </h4>
                    <p className="text-xs text-amber-200/90 leading-relaxed font-sans pt-1">
                      {storeStatus.reason === "manual" ? (
                        "Olá! No momento estamos fechados para organizar tudo por aqui e garantir a melhor experiência para você. Aproveite este tempo para conhecer e simular suas combinações favoritas no nosso aplicativo, mas as transmissões de novos pedidos estão desativadas temporariamente. Voltamos logo! ❤️"
                      ) : (
                        `Olá! No momento estamos fechados pois estamos fora do nosso horário de funcionamento (${companyInfo.hours}). Aproveite este tempo para dar uma olhadinha no nosso cardápio e montar seu açaí, mas as finalizações de pedidos no carrinho só serão liberadas no horário de atendimento (${companyInfo.hours}). Esperamos você! ❤️`
                      )}
                    </p>
                  </div>
                </div>
              )
            )}

            {/* Premium Today's active promo banner */}
            {activePromoToday?.active && (
              activePromoToday.id === "qua" ? (
                <WednesdayCountdown
                  promo={activePromoToday}
                  companyInfo={companyInfo}
                  onGoToMenu={() => handleGoToPromoProduct(activePromoToday)}
                />
              ) : (
                <PromoCountdownBanner
                  promo={activePromoToday}
                  companyInfo={companyInfo}
                  onGoToMenu={() => handleGoToPromoProduct(activePromoToday)}
                />
              )
            )}

            {/* Immersive Cinematic Hero Slider */}
            {displayVitrine.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pl-1 pt-2">
                  <span className="text-xl">⭐</span>
                  <h2 className="font-display font-black text-lg md:text-xl text-purple-950 uppercase tracking-wider">
                    Destaque Vitrine
                  </h2>
                  <div className="h-[2px] flex-1 bg-gradient-to-r from-purple-200 to-transparent ml-2 opacity-50" />
                </div>
                <div className="relative rounded-3xl h-[280px] md:h-[420px] overflow-hidden bg-[#0A0713] border border-purple-500/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] group">
                  {/* Tech HUD Frame Overlay */}
                  <div className="absolute inset-0 border border-white/5 pointer-events-none z-30" />
                  <div className="absolute top-3 left-4 z-30 hidden md:flex items-center gap-1.5 font-mono text-[9px] text-white/40 tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
                    <span>PREVIEW TRANSMISSION SYSTEM_OK</span>
                  </div>
                  <div className="absolute top-3 right-4 z-30 hidden md:block font-mono text-[9px] text-white/40">
                    LAT: -08° 12&apos; 04&quot; // LNG: -35° 42&apos; 11&quot;
                  </div>
                  
                  {/* Decorative horizontal lasers */}
                  <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/40 to-transparent z-20 pointer-events-none" />
                  <div className="absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-lime-400/30 to-transparent z-20 pointer-events-none" />

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentSlide}
                      initial={{ opacity: 0, scale: 1.01 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.99 }}
                      transition={{ duration: 0.7 }}
                      className="absolute inset-0"
                    >
                      {/* Shadow Gradient Mask */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0713]/50 via-transparent to-transparent z-10" />
                      <div className="absolute inset-0 bg-gradient-to-r from-[#0A0713]/40 via-transparent to-transparent z-10" />
                      
                      <img
                        src={displayVitrine[currentSlide]?.image}
                        alt={displayVitrine[currentSlide]?.title}
                        className="w-full h-full object-cover opacity-90 transition-all duration-1000 ease-out scale-[1.01] group-hover:scale-[1.03]"
                        referrerPolicy="no-referrer"
                      />
                    </motion.div>
                  </AnimatePresence>

                  {/* Left/Right manual triggers buttons on slider */}
                  <button
                    type="button"
                    onClick={() => setCurrentSlide((prev) => (prev - 1 + displayVitrine.length) % displayVitrine.length)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/5 hover:bg-lime-400 hover:text-purple-950 text-white p-3 rounded-xl border border-white/10 hover:border-lime-400 cursor-pointer opacity-0 group-hover:opacity-100 transition-all z-20 shadow-lg"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentSlide((prev) => (prev + 1) % displayVitrine.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/5 hover:bg-lime-400 hover:text-purple-950 text-white p-3 rounded-xl border border-white/10 hover:border-lime-400 cursor-pointer opacity-0 group-hover:opacity-100 transition-all z-20 shadow-lg"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  {/* Indicator dots */}
                  <div className="absolute bottom-4 right-6 z-20 flex gap-2">
                    {displayVitrine.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentSlide(idx)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          idx === currentSlide ? "w-6 bg-lime-400" : "w-1.5 bg-white/30"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Elegant, Futuristic Caption Box below the slider */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSlide}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.4 }}
                    className="bg-[#0C0819] border border-purple-500/15 rounded-2xl p-5 text-left relative overflow-hidden shadow-lg shadow-purple-950/10"
                  >
                    <div className="absolute -right-12 -top-12 w-24 h-24 bg-purple-500/10 rounded-full blur-xl pointer-events-none" />
                    <div className="space-y-1.5 relative z-10">
                      <h3 className="font-display font-black text-base md:text-lg tracking-tight text-white">
                        {displayVitrine[currentSlide]?.title}
                      </h3>
                      <p className="text-gray-300 text-xs md:text-sm leading-relaxed max-w-4xl font-sans">
                        {displayVitrine[currentSlide]?.description}
                      </p>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            )}
            {displayPromos.some((p) => p.active) && (
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-lime-400 text-purple-950 font-display font-black text-sm md:text-base lg:text-lg uppercase tracking-wider rounded-xl shadow-md w-fit">
                      Promoções Especiais da Semana!
                    </span>
                  </div>
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-extrabold px-3 py-1.5 rounded-xl uppercase tracking-wider animate-pulse font-mono">
                    DESCONTOS ATIVOS
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {displayPromos
                    .filter((p) => p.active)
                    .map((promo) => {
                      const isToday = (promo.dayOfWeek || promo.id) === currentDayId;
                      return (
                        <div
                          key={promo.id}
                          className={`relative overflow-hidden rounded-3xl border p-6 transition-all duration-300 flex flex-col justify-between gap-5 ${
                            isToday
                              ? "bg-gradient-to-br from-[#0E0A24] via-[#1D1445] to-[#0A0714] text-white border-purple-500/40 shadow-xl shadow-purple-900/10 scale-[1.01]"
                              : "bg-white border-gray-100 shadow-md hover:border-purple-200"
                          }`}
                        >
                          {/* Corner Accent for Today */}
                          {isToday && (
                            <div className="absolute -right-12 -top-12 w-24 h-24 bg-lime-400/10 rounded-full blur-xl pointer-events-none" />
                          )}

                          {/* Top Tag & Badge */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className={`font-display font-black text-xs md:text-sm uppercase px-3 py-1 rounded-xl tracking-wider ${
                              isToday
                                ? "bg-lime-400 text-purple-950"
                                : "bg-purple-50 text-purple-900"
                            }`}>
                              {promo.dayName}
                            </span>
                            {isToday && (() => {
                              const promoStatus = calculatePromoCountdown(promo, companyInfo);
                              if (promoStatus.isExpired) {
                                return (
                                  <span className="bg-gray-600 text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                                    Encerrada por hoje! ⏰
                                  </span>
                                );
                              }
                              return (
                                <span className="bg-red-500 text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-lg animate-bounce flex items-center gap-1 shadow-sm">
                                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                  {promoStatus.isCustomLimit
                                    ? `Ativa Hoje até às ${formatPromoTimeLabel(promo.wednesdayLimitTime)}! ⏰`
                                    : `Ativa Hoje até às ${promoStatus.targetFormatted}! ⏰`}
                                </span>
                              );
                            })()}
                          </div>

                          {/* Info */}
                          <div className="space-y-2 flex-1 text-left">
                            <h4 className={`font-display font-black text-base tracking-tight leading-snug ${
                              isToday ? "text-lime-400" : "text-brand-purple"
                            }`}>
                              {promo.title}
                            </h4>
                            <p className={`text-xs leading-relaxed ${
                              isToday ? "text-gray-300/90" : "text-gray-500 font-sans"
                            }`}>
                              {promo.description}
                              {promo.id === "seg" && !promo.description.toLowerCase().includes("combos") && (
                                <span className={`block mt-1 font-extrabold text-[10px] uppercase tracking-wide ${
                                  isToday ? "text-lime-400" : "text-purple-600"
                                }`}>
                                  ⚠️ Atenção: Esta promoção NÃO se aplica a Combos!
                                </span>
                              )}
                            </p>
                          </div>

                          {/* Footer with action button */}
                          <div className={`flex items-center justify-between gap-3 border-t pt-4 border-dashed shrink-0 ${
                            isToday ? "border-white/10" : "border-gray-100"
                          }`}>
                            <span className={`text-[9px] font-mono font-bold px-2.5 py-1 rounded-lg ${
                              isToday
                                ? "bg-white/10 text-white border border-white/10"
                                : "bg-purple-100 text-purple-900"
                            }`}>
                              {promo.badge}
                            </span>
                            
                            <button
                              type="button"
                              onClick={() => handleGoToPromoProduct(promo)}
                              className={`flex items-center gap-1.5 text-xs md:text-sm font-black uppercase py-2 px-4 rounded-xl transition-all active:scale-95 cursor-pointer font-display ${
                                isToday
                                  ? "bg-lime-400 hover:bg-lime-500 text-purple-950 shadow-md shadow-lime-400/20"
                                  : "bg-purple-900 hover:bg-purple-950 text-white"
                              }`}
                            >
                              Ver no Cardápio
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* INSTITUTIONAL INFO (Futuristic Bento Grid Style) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              
              {/* Card 1: Brand presentation (Spans 6 columns) */}
              <div className="lg:col-span-6 bg-[#0E0A24] text-white rounded-3xl p-6 md:p-8 flex flex-col justify-between border border-purple-500/20 shadow-xl relative overflow-hidden group">
                {/* Tech grid overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(#8b5cf608_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
                <div className="absolute -right-16 -top-16 w-44 h-44 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/25 transition-all duration-700 pointer-events-none" />
                <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-lime-400/5 rounded-full blur-xl pointer-events-none" />
                
                <div className="relative z-10 space-y-4 text-left">
                  <div className="flex items-center gap-4">
                    {companyInfo.logo ? (
                      <img
                        src={companyInfo.logo}
                        alt={companyInfo.name}
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-purple-500/30 shadow-lg shadow-black/40 shrink-0"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=150&h=150&q=80";
                        }}
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-purple-950/40 border-2 border-purple-500/30 shadow-lg shadow-black/40 shrink-0 flex items-center justify-center text-lime-400 font-black italic text-xl">
                        AD
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display font-black text-xl md:text-2xl tracking-tight text-white">
                          {companyInfo.name}
                        </h3>
                      </div>
                      <p className="text-xs text-purple-300 font-mono mt-0.5 uppercase tracking-wider">Sistema de Delivery de Açaí</p>
                    </div>
                  </div>
                  
                  <p className="text-xs md:text-sm text-purple-200/90 leading-relaxed font-sans pt-2">
                    Descubra uma experiência única com nossos açaís preparados com ingredientes frescos, cremes especiais, frutas selecionadas e os melhores acompanhamentos. Faça seu pedido online, aproveite nossas promoções e receba seu açaí geladinho sem sair de casa.
                  </p>
                </div>

                <div className="relative z-10 pt-6 border-t border-purple-500/10 mt-6 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${storeStatus.isOpen ? "bg-lime-400" : "bg-rose-500"} animate-pulse`} />
                    <span className={`text-[10px] font-mono font-bold tracking-wider uppercase ${storeStatus.isOpen ? "text-lime-300" : "text-rose-400"}`}>
                      {storeStatus.isOpen 
                        ? "Aberto para pedidos" 
                        : storeStatus.reason === "manual" 
                          ? "Fechado temporariamente" 
                          : "Fora do Horário (Fechado)"}
                    </span>
                  </div>
                  <span className="text-[10px] text-purple-400 font-mono">
                    GRAVATÁ - PE // BRASIL
                  </span>
                </div>
              </div>

              {/* Card 2: Location & Hours Information (Spans 3 columns) */}
              <div className="lg:col-span-3 bg-white rounded-3xl p-6 md:p-8 flex flex-col justify-between border border-gray-100 shadow-md group hover:border-purple-300/40 hover:shadow-lg transition-all duration-300 text-left">
                <div className="space-y-6">
                  {/* Address Section */}
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0 group-hover:bg-purple-100 transition-all border border-purple-100/50">
                      <MapPin className="w-5 h-5 text-purple-900" />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">Módulo Local</h4>
                      <p className="text-xs text-gray-700 leading-relaxed font-semibold mt-1">
                        {companyInfo.address}
                      </p>
                    </div>
                  </div>

                  {/* Hours Section */}
                  <div className="space-y-3 pt-4 border-t border-gray-100">
                    <div className="w-10 h-10 rounded-xl bg-lime-50 flex items-center justify-center shrink-0 border border-lime-100">
                      <Clock className="w-5 h-5 text-lime-800" />
                    </div>
                    <div className="w-full">
                      <h4 className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">Atendimento</h4>
                      <p className="text-xs text-lime-800 font-black mt-1 bg-lime-50 inline-block px-2.5 py-1 rounded-lg mb-2">
                        {companyInfo.hours}
                      </p>
                      
                      {companyInfo.weeklyHours && (
                        <div className="space-y-1 bg-gray-50/50 p-2.5 rounded-xl border border-gray-100 w-full mt-2">
                          <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Mural Semanal:</span>
                          {[
                            { key: "seg", label: "Segunda-feira" },
                            { key: "ter", label: "Terça-feira" },
                            { key: "qua", label: "Quarta-feira" },
                            { key: "qui", label: "Quinta-feira" },
                            { key: "sex", label: "Sexta-feira" },
                            { key: "sab", label: "Sábado" },
                            { key: "dom", label: "Domingo" },
                          ].map((day) => {
                            const sched = companyInfo.weeklyHours?.[day.key as keyof WeeklyHours];
                            const isOpen = sched ? sched.isOpen : true;
                            const start = sched ? sched.start : "10:00";
                            const end = sched ? sched.end : "00:00";
                            return (
                              <div key={day.key} className="flex justify-between items-center text-[10px] font-semibold py-0.5 border-b border-gray-100/50 last:border-0">
                                <span className="text-gray-500">{day.label}</span>
                                <span>
                                  {isOpen ? (
                                    <span className="text-gray-900 font-bold">{start} - {end}</span>
                                  ) : (
                                    <span className="text-rose-600 font-extrabold italic bg-rose-50 px-1 rounded text-[8px]">Não Abre</span>
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-6 text-[9px] text-gray-400 font-mono mt-6 uppercase">
                  *Acessos controlados
                </div>
              </div>

              {/* Card 3: Quick Links & Connections (Spans 3 columns) */}
              <div className="lg:col-span-3 bg-gray-50/50 rounded-3xl p-6 md:p-8 border border-gray-150/80 shadow-xs flex flex-col justify-between text-left">
                <div>
                  <h4 className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest mb-4">Redes de Conexão</h4>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {/* WhatsApp action */}
                    <a
                      href={generateWhatsAppLink(companyInfo.whatsapp, "Olá, gostaria de fazer um pedido.")}
                      target="_blank"
                      rel="noreferrer"
                      className="group/btn flex items-center justify-between text-xs font-bold p-3.5 bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-100 hover:border-emerald-600 rounded-2xl transition-all duration-300 text-emerald-800 shadow-xs"
                    >
                      <span className="flex items-center gap-2">
                        <Smartphone className="w-4.5 h-4.5 text-emerald-600 group-hover/btn:text-white transition-colors animate-pulse" />
                        Falar no WhatsApp
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-600 group-hover/btn:text-white transition-colors" />
                    </a>

                    {/* Instagram action */}
                    <a
                      href={`https://instagram.com/${companyInfo.instagram}`}
                      target="_blank"
                      rel="noreferrer"
                      className="group/btn flex items-center justify-between text-xs font-bold p-3.5 bg-purple-50 hover:bg-purple-900 hover:text-white border border-purple-100/50 hover:border-purple-900 rounded-2xl transition-all duration-300 text-purple-900 shadow-xs"
                    >
                      <span className="flex items-center gap-2">
                        <Instagram className="w-4.5 h-4.5 text-purple-700 group-hover/btn:text-white transition-colors" />
                        Seguir Instagram
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-purple-700 group-hover/btn:text-white transition-colors" />
                    </a>

                    {/* Maps action */}
                    <a
                      href={companyInfo.mapsLink}
                      target="_blank"
                      rel="noreferrer"
                      className="group/btn flex items-center justify-between text-xs font-bold p-3.5 bg-amber-50 hover:bg-amber-600 hover:text-white border border-amber-100 rounded-2xl transition-all duration-300 text-amber-900 shadow-xs"
                    >
                      <span className="flex items-center gap-2">
                        <MapPin className="w-4.5 h-4.5 text-amber-600 group-hover/btn:text-white transition-colors" />
                        Ver Google Maps
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-amber-600 group-hover/btn:text-white transition-colors" />
                    </a>
                  </div>
                </div>

                <div className="pt-6 text-[10px] text-gray-500 font-mono text-center border-t border-gray-200/50 mt-6 lg:mt-0 uppercase">
                  Conexões Seguras
                </div>
              </div>

            </div>

            {/* ABA QUALIDADE (Value cards display) */}
            <section className="space-y-4">
              <div className="text-center flex flex-col items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest font-bold text-purple-900 font-mono bg-purple-100 px-3 py-1 rounded-full">
                  Selo de Compromisso
                </span>
                <h3 className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-lime-400 text-purple-950 font-display font-black text-sm md:text-base lg:text-lg uppercase tracking-wider rounded-xl shadow-md w-fit">
                  Por que escolher a Açaí Delivery?
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    title: "Açaí Selecionado",
                    desc: "Produzido com açaí de alta qualidade, garantindo sabor intenso, cremosidade e frescor em cada pedido.",
                    icon: Heart,
                  },
                  {
                    title: "Entrega Rápida",
                    desc: "Seu pedido preparado na hora e entregue com agilidade para chegar perfeito até você.",
                    icon: Truck,
                  },
                  {
                    title: "Qualidade Garantida",
                    desc: "Ingredientes selecionados, atendimento dedicado e o compromisso de levar qualidade, sabor e cuidado em cada entrega.",
                    icon: Star,
                  },
                  {
                    title: "Ingredientes Frescos",
                    desc: "Frutas, cremes e complementos cuidadosamente escolhidos para proporcionar a melhor experiência.",
                    icon: Sparkles,
                  },
                ].map((item, idx) => {
                  const IconComp = item.icon;
                  return (
                    <motion.div
                      key={idx}
                      whileHover={{ y: -4 }}
                      className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm text-center flex flex-col items-center space-y-3 transition-shadow hover:shadow-md"
                    >
                      <div className="w-12 h-12 bg-purple-50 text-purple-900 rounded-2xl flex items-center justify-center shrink-0 border border-purple-100">
                        <IconComp className="w-6 h-6 text-purple-900" />
                      </div>
                      <h4 className="font-display font-black text-xs text-purple-950 uppercase tracking-tight">{item.title}</h4>
                      <p className="text-[11px] text-gray-500 leading-relaxed font-sans font-medium">{item.desc}</p>
                    </motion.div>
                  );
                })}
              </div>
            </section>

            {/* ABA PROVA SOCIAL (Testimonials slider with ability to register recommendations) */}
            <section className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-100 pb-4">
                <div className="text-left flex flex-col gap-2">
                  <h3 className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-lime-400 text-purple-950 font-display font-black text-sm md:text-base lg:text-lg uppercase tracking-wider rounded-xl shadow-md w-fit">
                    📸 Mural de Prints & Stories
                  </h3>
                  <p className="text-xs text-gray-500">Confira a experiência real compartilhada por quem ama nosso açaí!</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setShowAddReview(!showAddReview)}
                    className="bg-brand-purple text-white hover:bg-brand-purple-light px-4 py-2 text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 border border-transparent"
                  >
                    {showAddReview ? "✕ Fechar Formulário" : "✓ Postar meu Print"}
                  </button>
                </div>
              </div>

              {/* Form to append new recommendation on the fly */}
              <AnimatePresence>
                {showAddReview && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-white border p-5 rounded-2xl shadow-sm space-y-4 text-left"
                  >
                    <h4 className="font-display font-bold text-sm text-brand-purple">Compartilhe um Print de Story!</h4>
                    <form onSubmit={handleAddCustomerReview} className="space-y-4 text-xs">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">Seu Nome / Nome do Cliente</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Clara Silva"
                            value={newReviewForm.name}
                            onChange={(e) => setNewReviewForm({ ...newReviewForm, name: e.target.value })}
                            className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-brand-purple"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">Instagram (@usuario)</label>
                          <input
                            type="text"
                            placeholder="Ex: clarasilva"
                            value={newReviewForm.instagram}
                            onChange={(e) => setNewReviewForm({ ...newReviewForm, instagram: e.target.value })}
                            className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-brand-purple"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Print do Story (Instagram)</label>
                          {isReviewImageUploading ? (
                            <div className="border border-dashed border-gray-200 bg-gray-50/50 p-4 rounded-xl flex flex-col items-center justify-center space-y-2">
                              <div className="w-5 h-5 border-2 border-brand-purple border-t-transparent rounded-full animate-spin"></div>
                              <span className="text-[10px] font-bold text-purple-950 animate-pulse">Enviando imagem para a nuvem...</span>
                            </div>
                          ) : newReviewForm.storyImage ? (
                            <div className="border border-gray-150 p-3 rounded-xl flex items-center justify-between gap-3 bg-gray-50/50">
                              <div className="flex items-center gap-2">
                                <div className="w-12 h-12 bg-white rounded-lg border border-gray-200 overflow-hidden shrink-0">
                                  <img 
                                    src={newReviewForm.storyImage} 
                                    alt="Depoimento Preview" 
                                    className="w-full h-full object-cover" 
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <span className="text-[10px] text-green-700 font-bold block">✓ Enviado com sucesso</span>
                                  <span className="text-[8px] text-gray-400 font-mono truncate block max-w-[150px]">{newReviewForm.storyImage}</span>
                                </div>
                              </div>
                              <div className="flex gap-1.5">
                                <label className="px-2.5 py-1.5 bg-brand-purple hover:bg-brand-purple-light text-white text-[10px] font-bold rounded-lg cursor-pointer transition-all shrink-0 active:scale-95 shadow-sm">
                                  Alterar
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;

                                      setReviewImageUploading(true);
                                      try {
                                        const reader = new FileReader();
                                        reader.onloadend = async () => {
                                          if (typeof reader.result === "string") {
                                            try {
                                              const compressed = await compressImageBase64(reader.result);
                                              try {
                                                const url = await uploadImageToStorage(compressed);
                                                if (url) {
                                                  setNewReviewForm({ ...newReviewForm, storyImage: url });
                                                }
                                              } catch (cloudErr) {
                                                console.warn("[Cloudinary] Upload failed for review, using base64 fallback:", cloudErr);
                                                setNewReviewForm({ ...newReviewForm, storyImage: compressed });
                                              }
                                            } catch (error) {
                                              console.error("Erro no processamento do depoimento:", error);
                                              alert("Erro ao processar a imagem.");
                                            } finally {
                                              setReviewImageUploading(false);
                                            }
                                          } else {
                                            setReviewImageUploading(false);
                                          }
                                        };
                                        reader.readAsDataURL(file);
                                      } catch (err) {
                                        console.error(err);
                                        setReviewImageUploading(false);
                                      }
                                    }}
                                    className="hidden"
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => setNewReviewForm({ ...newReviewForm, storyImage: "" })}
                                  className="px-2.5 py-1.5 bg-white border border-gray-250 hover:bg-red-50 hover:text-red-600 text-gray-650 text-[10px] font-bold rounded-lg transition-all active:scale-95"
                                >
                                  Remover
                                </button>
                              </div>
                            </div>
                          ) : (
                            <label className="border-2 border-dashed border-gray-200 hover:border-brand-purple/50 bg-gray-50/50 hover:bg-purple-50/20 p-4 rounded-xl flex flex-col items-center justify-center space-y-1 cursor-pointer transition-all select-none group">
                              <div className="w-8 h-8 rounded-full bg-purple-50 group-hover:bg-purple-100 flex items-center justify-center text-brand-purple transition-all">
                                <Upload className="w-4 h-4" />
                              </div>
                              <span className="text-[10px] font-bold text-gray-700 group-hover:text-brand-purple transition-colors">Selecionar arquivo de imagem</span>
                              <span className="text-[9px] text-gray-400">Clique para escolher do seu dispositivo</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;

                                  setReviewImageUploading(true);
                                  try {
                                    const reader = new FileReader();
                                    reader.onloadend = async () => {
                                      if (typeof reader.result === "string") {
                                        try {
                                          const compressed = await compressImageBase64(reader.result);
                                          try {
                                            const url = await uploadImageToStorage(compressed);
                                            if (url) {
                                              setNewReviewForm({ ...newReviewForm, storyImage: url });
                                            }
                                          } catch (cloudErr) {
                                            console.warn("[Cloudinary] Upload failed for review, using base64 fallback:", cloudErr);
                                            setNewReviewForm({ ...newReviewForm, storyImage: compressed });
                                          }
                                        } catch (error) {
                                          console.error("Erro no processamento do depoimento:", error);
                                          alert("Erro ao processar a imagem.");
                                        } finally {
                                          setReviewImageUploading(false);
                                        }
                                      } else {
                                        setReviewImageUploading(false);
                                      }
                                    };
                                    reader.readAsDataURL(file);
                                  } catch (err) {
                                    console.error(err);
                                    setReviewImageUploading(false);
                                  }
                                }}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1">
                        <p className="text-[10px] text-gray-400 font-medium">Faça o upload do print do story. A imagem será armazenada de forma segura na nuvem.</p>

                        <button
                          type="submit"
                          className="bg-brand-purple text-white px-5 py-2 rounded-xl font-extrabold text-xs cursor-pointer hover:bg-brand-purple-light transition-colors uppercase tracking-wider"
                        >
                          Enviar Story do Instagram
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Instagram Style Highlights Section */}
              {socialProofs.filter(item => item.storyImage).length > 0 && (
                <div className="flex items-center gap-4 overflow-x-auto py-2.5 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] border-b border-gray-100/70 mb-4 scroll-smooth">
                  {socialProofs.filter(item => item.storyImage).map((item, idx) => {
                    const initials = item.name ? item.name.charAt(0).toUpperCase() : "👤";
                    return (
                      <div 
                        key={`highlight-${item.id}`}
                        onClick={() => setStoryPlayerIndex(idx)}
                        className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0 group"
                      >
                        <div className="relative p-[2.5px] rounded-full bg-gradient-to-tr from-yellow-500 via-rose-500 to-purple-600 group-hover:scale-105 active:scale-95 transition-all duration-300 shadow-sm">
                          <div className="bg-white p-[1.5px] rounded-full">
                            <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${getAvatarGradient(item.name)} flex items-center justify-center font-extrabold text-base border border-purple-100 overflow-hidden relative shadow-inner`}>
                              {item.image ? (
                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <span>{initials}</span>
                              )}
                              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-white text-xs">👀</span>
                              </div>
                            </div>
                          </div>
                          {/* Live Ring Pulsar Badge */}
                          <div className="absolute -bottom-0.5 right-[16px] bg-rose-600 text-[8px] font-black tracking-tighter text-white px-1 rounded-full uppercase scale-75 border border-white">
                            Story
                          </div>
                        </div>
                        <span className="text-[10px] font-black text-gray-700 max-w-[72px] truncate leading-tight">
                          {item.name.split(" ")[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Reviews deck list */}
              {socialProofs.filter(item => item.storyImage).length === 0 ? (
                <div className="py-12 px-6 text-center border border-dashed border-purple-150/50 rounded-3xl bg-purple-50/10">
                  <span className="text-2xl block mb-2">🍇</span>
                  <p className="text-gray-900 text-xs font-bold font-sans">Sem avaliações no momento</p>
                  <p className="text-gray-400 text-[10px] max-w-[280px] leading-relaxed mx-auto mt-1">
                    Trabalhamos com depoimentos e prints de stories reais de nossos clientes. Envie seu story utilizando o formulário acima!
                  </p>
                </div>
              ) : (
                <>
                  {/* Celular / Smartphone Bezel mockup layout */}
                  <div className="flex overflow-x-auto gap-6 sm:gap-8 pb-6 pt-2 scrollbar-thin scrollbar-thumb-purple-200/60 scrollbar-track-transparent snap-x snap-mandatory scroll-smooth px-1">
                    {socialProofs.filter(item => item.storyImage).map((item, idx) => (
                      <div
                        key={item.id}
                        className="relative bg-neutral-950 rounded-[42px] p-2.5 shadow-2xl border-[6px] border-neutral-900 flex flex-col aspect-[9/16] overflow-hidden w-[200px] sm:w-[230px] shrink-0 snap-center group hover:shadow-purple-500/25 hover:border-brand-purple/50 transition-all duration-500 scale-95 hover:scale-[0.98]"
                      >
                        {/* Top Speaker camera Island notch */}
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-20 flex items-center justify-between px-3.5 border border-neutral-900/60">
                          <div className="w-1.5 h-1.5 bg-neutral-800 rounded-full"></div>
                          <div className="w-7 h-1 bg-neutral-900 rounded-full"></div>
                          <div className="w-1.5 h-1.5 bg-green-500/60 rounded-full animate-pulse"></div>
                        </div>

                        {/* Screen Container */}
                        <div className="relative w-full h-full rounded-[32px] overflow-hidden bg-zinc-950 flex flex-col justify-between p-3.5 pt-7 pb-3.5">
                          {/* The Instagram screenshot photo background */}
                          <img
                            src={item.storyImage}
                            alt={`Story de ${item.name}`}
                            className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-750 cursor-pointer"
                            onClick={() => setStoryPlayerIndex(idx)}
                            referrerPolicy="no-referrer"
                          />

                          {/* Top Stats of the simulated story */}
                          <div className="relative z-10 space-y-2">
                            {/* Thin Instagram bar segments */}
                            <div className="flex gap-1">
                              <div className="h-[2px] bg-white flex-1 rounded-full overflow-hidden">
                                <div className="h-full bg-white w-full"></div>
                              </div>
                              <div className="h-[2px] bg-white/30 flex-1 rounded-full"></div>
                              <div className="h-[2px] bg-white/30 flex-1 rounded-full"></div>
                            </div>

                            {/* Instastory user identity bar */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`w-7 h-7 bg-gradient-to-br ${getAvatarGradient(item.name)} rounded-full border border-pink-500/80 flex items-center justify-center font-black text-[10px] overflow-hidden shrink-0 shadow-sm`}>
                                  {item.image ? (
                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    <span>{item.name.charAt(0).toUpperCase()}</span>
                                  )}
                                </div>
                                <div className="text-left">
                                  <p className="text-white text-[10px] font-black leading-tight flex items-center gap-0.5 drop-shadow-md">
                                    {item.name}
                                    <span className="text-[7px] bg-blue-500 text-white rounded-full p-0.5 font-bold scale-90">✓</span>
                                  </p>
                                  <p className="text-white/80 text-[8px] leading-none drop-shadow-md">@{item.instagram || "acailover"}</p>
                                </div>
                              </div>
                              <div className="text-white/90 text-[8px] bg-black/45 px-2 py-0.5 rounded-full backdrop-blur-xs font-bold shadow-xs uppercase">
                                Agora
                                </div>
                            </div>
                          </div>

                          {/* FLOATING EMOJI CLUSTERS */}
                          <div className="absolute inset-x-0 bottom-16 h-[220px] pointer-events-none z-20 overflow-hidden">
                            {floatingEmojis
                              .filter((f) => f.storyId === item.id)
                              .map((f) => (
                                <motion.div
                                  key={f.id}
                                  initial={{ y: 220, x: f.x, scale: 0.4, opacity: 0 }}
                                  animate={{ 
                                    y: -120, 
                                    x: f.x + Math.sin(f.id) * 45,
                                    scale: [0.6, 1.4, 0.8],
                                    opacity: [0, 1, 1, 0] 
                                  }}
                                  transition={{ 
                                    duration: 1.8, 
                                    delay: f.delay,
                                    ease: "easeOut"
                                  }}
                                  className="absolute bottom-0 left-1/2 text-2xl select-none"
                                >
                                  {f.emoji}
                                </motion.div>
                              ))}
                          </div>

                          {/* Heart interaction & floating reply simulation */}
                          <div className="relative z-10 flex items-center gap-2 pt-40">
                            <div 
                              onClick={() => setStoryPlayerIndex(idx)}
                              className="flex-1 bg-black/40 hover:bg-black/60 border border-white/25 rounded-full px-3.5 py-1.5 flex items-center justify-between text-[10px] text-white font-medium backdrop-blur-xs cursor-pointer select-none"
                            >
                              <span>Enviar mensagem...</span>
                              <span className="opacity-75">💬</span>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => triggerStoryReaction(item.id)}
                              className="w-8 h-8 rounded-full bg-black/40 border border-white/20 backdrop-blur-xs flex items-center justify-center hover:bg-rose-600 hover:border-rose-500 hover:text-white text-rose-500 transition-all duration-300 cursor-pointer active:scale-95 shadow-md select-none"
                              title="Reagir ao Story"
                            >
                              <span className="text-[12px]">❤️</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>

          </div>
        )}

        {/* 2. ABA CATÁLOGO (TAB MENU / CARDÁPIO) */}
        {activeTab === "menu" && (
          <div className="space-y-6">
            {storeStatus.isOpen === false && (
              companyInfo.announcement?.active ? (
                <div className="bg-gradient-to-r from-purple-900 via-pink-900 to-purple-950 border-2 border-pink-300/50 text-pink-100 rounded-3xl p-5 shadow-xl">
                  <div className="flex items-start gap-3.5 text-left">
                    <span className="text-2xl shrink-0 p-2 bg-white/10 rounded-xl border border-white/20 animate-bounce">🍼</span>
                    <div className="space-y-1.5">
                      <span className="bg-pink-400/30 text-pink-200 font-bold text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-md border border-pink-300/30">
                        {companyInfo.announcement.badge || "COMUNICADO ESPECIAL"}
                      </span>
                      <h4 className="font-display font-black text-sm md:text-base text-white tracking-tight">
                        {companyInfo.announcement.title}
                      </h4>
                      <div className="text-xs text-pink-100/90 leading-relaxed font-sans space-y-1.5 pt-1 border-t border-pink-300/20">
                        {companyInfo.announcement.message.split("\n\n").map((paragraph, idx) => (
                          <p key={idx} className={idx === 0 ? "font-semibold text-white" : ""}>
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-3xl p-5 flex items-start gap-4 shadow-xs">
                  <span className="text-2xl shrink-0">⏳</span>
                  <div className="space-y-1 text-left">
                    <h4 className="font-bold text-xs md:text-sm">
                      {storeStatus.reason === "manual" ? "Estamos Fechados Temporariamente" : "Fora do Horário de Funcionamento"}
                    </h4>
                    <p className="text-xs text-amber-700/90 leading-relaxed font-sans">
                      {storeStatus.reason === "manual" ? (
                        "Olá! No momento estamos fechados para organizar tudo por aqui e garantir a melhor experiência para você. Aproveite este momento para conhecer nosso menu completo de produtos, planejar sua combinação perfeita de adicionais e cremes, e logo mais estaremos de volta para receber seu pedido! ❤️"
                      ) : (
                        `Olá! No momento estamos fechados pois estamos fora do nosso horário de funcionamento (${companyInfo.hours}). Aproveite este momento para conhecer todo o nosso cardápio e montar sua combinação dos deuses, mas o envio de pedidos está suspenso até o início do nosso expediente de hoje. Voltamos em breve! ❤️`
                      )}
                    </p>
                  </div>
                </div>
              )
            )}

            {/* NEW FULL LAYOUT GRID WRAPPER */}
            <div className="w-full space-y-6">
              <div className="w-full space-y-6">
                
                {/* THE ACTUAL FEED COMPONENT TO CAPTURE */}
                <div id="menu-catalog-feed" className="space-y-6 p-2.5 min-[375px]:p-3 sm:p-4 md:p-6 rounded-3xl bg-[#FDFBFF] border border-gray-150 text-left">
                  
                  {/* Elegant Branding Header (Special for downloaded cardapio / flyer) */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-gradient-to-br from-[#0c0819] to-purple-950 border border-purple-500/10 rounded-3xl text-left relative overflow-hidden shadow-inner">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="flex items-center gap-4 relative z-10">
                      <div className="w-16 h-16 bg-purple-900 rounded-full flex items-center justify-center overflow-hidden border-2 border-purple-100 shadow-sm shrink-0">
                        {companyInfo.logo ? (
                          <img
                            src={companyInfo.logo}
                            alt={companyInfo.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=150&h=150&q=80";
                            }}
                          />
                        ) : (
                          <div className="text-lime-400 font-black italic text-xl">AD</div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-display font-black text-xl text-white uppercase tracking-tight leading-none">
                          {companyInfo.name}
                        </h3>
                        <p className="text-xs text-purple-300 font-semibold mt-1.5 uppercase tracking-wide">
                          Cardápio Completo &amp; Peça pelo Nosso App!
                        </p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right text-xs text-purple-200 space-y-1 relative z-10 font-sans">
                      <p className="font-extrabold text-lime-400">📲 WhatsApp: {formatBrazilianPhone(companyInfo.whatsapp || "")}</p>
                      <p className="text-[10px] text-gray-300">📍 Endereço: {companyInfo.address}</p>
                      <p className="text-[10px] text-gray-300">⏰ Horário: {companyInfo.hours}</p>
                    </div>
                  </div>

                  {/* Visual Glassmorphic Banner */}
                  <div className="relative p-6 sm:p-8 bg-gradient-to-r from-purple-950 via-indigo-950 to-purple-900 text-white rounded-3xl overflow-hidden shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  {/* Background graphic flare */}
                  <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-lime-400/10 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="relative space-y-1 z-10 text-left">
                    <span className="text-[9px] font-black text-lime-400 tracking-widest font-mono uppercase bg-white/10 px-2.5 py-1 rounded-full inline-block">
                      Cardápio Digital Premium
                    </span>
                    <h2 className="font-display font-black text-2xl md:text-3xl drop-shadow-sm uppercase tracking-tight mt-1.5 animate-pulse">
                      {menuFilter === "todos" ? "Menu Completo" : menuFilter === "favoritos" ? "Seus Favoritos" : menuFilter.toUpperCase()}
                    </h2>
                    <p className="text-purple-100/90 text-xs mt-1 max-w-lg leading-relaxed">
                      {menuFilter === "todos" && "Explore todos os nossos copos lendários, recheados de cremosidade e com os melhores adicionais da região!"}
                      {menuFilter === "tradicionais" && "Copos clássicos preparados com carinho e puríssimo açaí, na textura e sabor originais que todos amam!"}
                      {menuFilter === "gourmets" && "Verdadeiras obras de arte! Combinações ricas de cremes premium, toppings luxuosos e chocolates finos."}
                      {menuFilter === "combos" && "Combos de tamanhos e adicionais prontos pensados pelos nossos especialistas para surpreender o seu paladar."}
                      {menuFilter === "favoritos" && "Os itens que você guardou no coração! Adicione ao carrinho em um piscar de olhos."}
                    </p>
                  </div>

                  {/* Active items counter showcase */}
                  <div className="relative z-10 shrink-0 bg-white/10 backdrop-blur-xs border border-white/10 p-4 rounded-2xl flex flex-row md:flex-col items-center justify-between gap-4 md:gap-1.5 w-full md:w-28 text-center shadow-inner">
                    <div className="text-left md:text-center">
                      <span className="text-[9px] font-bold text-purple-200 uppercase tracking-widest">Disponível</span>
                      <p className="font-mono text-3xl font-black text-lime-400 leading-none mt-1">
                        {filteredProducts.length}
                      </p>
                    </div>
                    <span className="bg-lime-400 text-purple-950 font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {filteredProducts.length === 1 ? "Produto" : "Produtos"}
                    </span>
                  </div>
                </div>

                {/* IFOOD STYLE SEARCH BAR & CATEGORIES TAB SLIDER */}
                <div className="space-y-4">
                  {/* Modern Search Input Row */}
                  <div className="bg-white rounded-2xl p-1 shadow-2xs border border-gray-100">
                    <div className="relative flex items-center">
                      <span className="absolute left-4 text-gray-400">
                        <Search className="w-4 h-4 text-purple-900" />
                      </span>
                      <input
                        type="text"
                        placeholder={`Buscar em ${companyInfo.name}...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full text-xs pl-11 pr-10 py-3.5 bg-gray-55/70 focus:bg-white border-0 outline-none rounded-xl font-bold text-gray-900 placeholder-gray-400 transition-all focus:ring-1 focus:ring-purple-900"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          className="absolute right-4 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Horizontal Scrolling Categories Slider */}
                  <div className="border-b border-gray-150 flex items-center overflow-x-auto scrollbar-none h-14 md:h-16 w-full shrink-0">
                    <div className="flex gap-5 sm:gap-7 min-w-max px-2 h-full items-center mx-auto justify-start md:justify-center">
                      {(() => {
                        const isFriday = new Date().getDay() === 5;
                        const visibleProducts = products.filter(p => p.active !== false && (!p.isFridayOnly || isFriday));

                        const menuItems = [
                          { id: "todos", label: "Ver Todos", count: visibleProducts.length },
                          { id: "tradicionais", label: "Tradicionais", count: visibleProducts.filter(p => p.category === "tradicionais").length },
                          { id: "gourmets", label: "Gourmets", count: visibleProducts.filter(p => p.category === "gourmets").length },
                          { id: "combos", label: "Combos", count: visibleProducts.filter(p => p.category === "combos").length },
                          { id: "favoritos", label: "Favoritos", count: visibleProducts.filter(p => clientUser?.favorites?.includes(p.id)).length },
                        ];

                        return menuItems.map((item) => {
                          const isSelected = menuFilter === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setMenuFilter(item.id as any);
                                if (window.innerWidth < 1024) {
                                  setMobileMenuFiltersOpen(false);
                                }
                              }}
                              className={`h-full pt-3 pb-4 text-xs sm:text-sm font-bold transition-all relative whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5 ${
                                isSelected
                                  ? "text-purple-950 font-extrabold"
                                  : "text-gray-500 hover:text-purple-900"
                              }`}
                            >
                              <span>{item.label}</span>
                              <span className={`text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded-full leading-none ${
                                isSelected ? "bg-purple-900 text-white" : "bg-gray-150 text-gray-500"
                              }`}>
                                {item.count}
                              </span>
                              {isSelected && (
                                <motion.div
                                  layoutId="activeCategoryIndicator"
                                  className="absolute bottom-0 left-0 right-0 h-[3.5px] bg-purple-900 rounded-full"
                                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                />
                              )}
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>



                {/* ACTIVE FILTERS ALERT BAR if active tags/searches are used */}
                {(searchQuery || selectedTags.length > 0) && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-purple-50 border border-purple-150 p-4 rounded-2xl text-left">
                    <div className="flex items-center gap-2 flex-wrap text-xs text-purple-950 font-extrabold">
                      <span>Resultados para:</span>
                      {searchQuery && (
                        <span className="bg-purple-900 text-white font-semibold py-0.5 px-2 rounded-lg text-[10px]">
                          Busca: "{searchQuery}"
                        </span>
                      )}
                      {selectedTags.map((tagId) => {
                        const tagObj = CATALOG_TAGS.find((tg) => tg.id === tagId);
                        return (
                          <span key={tagId} className="bg-purple-200 text-purple-950 font-semibold py-0.5 px-2 rounded-lg text-[10px] flex items-center gap-0.5">
                            <span>{tagObj?.emoji} {tagObj?.label}</span>
                            <button
                              type="button"
                              onClick={() => setSelectedTags(selectedTags.filter((t) => t !== tagId))}
                              className="hover:text-red-500 font-extrabold ml-1 font-mono"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedTags([]);
                      }}
                      className="text-[11px] font-black text-purple-900 hover:text-red-650 underline cursor-pointer"
                    >
                      Limpar Filtros ({filteredProducts.length} encontrados)
                    </button>
                  </div>
                )}

            {filteredProducts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 p-8 flex flex-col items-center justify-center space-y-3">
                <span className="text-4xl select-none">🔍</span>
                <p className="text-gray-950 font-bold text-sm">Nenhum açaí encontrado</p>
                <p className="text-gray-400 text-xs max-w-xs mx-auto leading-relaxed">
                  {searchQuery || selectedTags.length > 0
                    ? `Não encontramos resultados correspondentes aos seus termos de busca ou filtros selecionados. Tente buscar por outros termos ou limpar as configurações de filtro.`
                    : "Nenhum produto cadastrado nesta categoria no momento."
                  }
                </p>
                {(searchQuery || selectedTags.length > 0) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedTags([]);
                    }}
                    className="px-4 py-2 bg-purple-900 hover:bg-purple-950 text-white font-bold text-xs rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span>Limpar Filtros</span>
                  </button>
                )}
              </div>
            ) : (
              <div 
                className="grid gap-3 sm:gap-4 md:gap-6"
                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))' }}
              >
                {filteredProducts.map((product) => {
                  const isBestSeller = maxAdditionsCount > 0 && getProductAdditionsCount(product.id, product.name) === maxAdditionsCount;
                  const isFavorite = clientUser?.favorites?.includes(product.id) || false;

                  return (
                    <ProductCard
                      key={product.id}
                      product={product}
                      isFavorite={isFavorite}
                      isBestSeller={isBestSeller}
                      onToggleFavorite={handleToggleFavorite}
                      onAddToCart={handleAddToCart}
                      onSelectProductForReview={setSelectedProductForReview}
                      clientUser={clientUser}
                      setNewReviewForm={setNewReviewForm}
                      newReviewForm={newReviewForm}
                      setActiveTab={setActiveTab}
                      setShowAddReview={setShowAddReview}
                      promos={displayPromos}
                      currentDayId={currentDayId}
                      isHighlighted={highlightedProductId === product.id}
                      companyInfo={companyInfo}
                    />
                  );
                })}
              </div>
            )}
                </div> {/* Close #menu-catalog-feed */}
              </div> {/* Close lg:col-span-9 */}
            </div> {/* Close grid grid-cols-1 lg:grid-cols-12 */}
          </div>
        )}

        {/* 3. ABA ATUAL DA PROGRAMA DE FIDELIDADE & VANTAGENS (TAB FIDELIDADE) */}
        {activeTab === "fidelidade" && (
          <div className="space-y-8">
            
            {/* Header info display */}
            <div className="text-center max-w-xl mx-auto space-y-2">
              <span className="bg-brand-purple/10 text-brand-purple font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-widest font-mono">
                Programa Fidelidade & Combos
              </span>
              <h2 className="font-display font-black text-xl md:text-2xl text-brand-charcoal tracking-tight">
                Indique, Compre e Ganhe Açaí Grátis
              </h2>
              <p className="text-gray-500 text-xs">
                A cada compra realizada você acumula <b>10 pontos</b>. Ao atingir <b>{companyInfo.loyaltyPointsTarget || 100} pontos</b>, você ganha 1 Açaí Tradicional, Kids ou Tropical de 300ml inteiramente grátis!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

              {/* Section Search or Register Loyalty */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-5 md:p-6 space-y-5">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                  <Award className="w-6 h-6 text-brand-purple" />
                  <h3 className="font-display font-extrabold text-brand-purple text-base">Consulte Seus Pontos</h3>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      placeholder="WhatsApp (Ex: 11999999999)"
                      value={loyaltySearchPhone}
                      onChange={(e) => {
                        setLoyaltySearchPhone(e.target.value);
                        setLoyaltySearchResult(undefined);
                      }}
                      className="flex-1 text-xs capitalize bg-gray-50 border p-3 rounded-xl outline-none focus:border-brand-purple"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const target = loyaltySearchPhone.replace(/\D/g, "");
                        const match = loyaltyUsers.find((u) => u.phone.replace(/\D/g, "") === target);
                        setLoyaltySearchResult(match === undefined ? null : match);
                      }}
                      className="bg-brand-purple hover:bg-brand-purple-light text-white text-xs font-semibold px-4 rounded-xl cursor-pointer"
                    >
                      Procurar
                    </button>
                  </div>

                  {/* Search results conditional */}
                  {loyaltySearchResult !== undefined && (
                    <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100/70">
                      {loyaltySearchResult === null ? (
                        <div className="space-y-3">
                          <p className="text-xs text-gray-500">
                            😞 Não encontramos nenhum cliente registrado com esse número. Gostaria de se cadastrar agora e participar do nosso Programa de Fidelidade?
                          </p>
                          <div className="space-y-2.5 pt-1.5">
                            <input
                              type="text"
                              placeholder="Seu Nome Completo"
                              value={loyaltyRegisterName}
                              onChange={(e) => setLoyaltyRegisterName(e.target.value)}
                              className="w-full text-xs p-2.5 border bg-white rounded-lg outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!loyaltyRegisterName) {
                                  alert("Preencha seu nome para finalizar o cadastro!");
                                  return;
                                }
                                handleRegisterLoyaltyUser(loyaltyRegisterName, loyaltySearchPhone, 0);
                                setLoyaltyRegisterName("");
                              }}
                              className="w-full py-2 bg-brand-purple hover:bg-brand-purple-light text-white font-bold text-xs rounded-lg cursor-pointer"
                            >
                              ✓ Cadastrar no Programa de Fidelidade
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <h4 className="font-bold text-sm font-display text-brand-charcoal">
                              Olá, {loyaltySearchResult.name}!
                            </h4>
                            <span className="text-xs text-brand-purple font-extrabold uppercase font-mono bg-purple-10s0 px-2 py-0.5 rounded-full">
                              {loyaltySearchResult.points} Pontos
                            </span>
                          </div>

                          {/* Progress bar visual */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-gray-400 font-bold">
                              <span>Progresso da Recompensa</span>
                              <span>{loyaltySearchResult.points}/{companyInfo.loyaltyPointsTarget || 100} PTS</span>
                            </div>
                            <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${Math.min(100, (loyaltySearchResult.points / (companyInfo.loyaltyPointsTarget || 100)) * 100)}%` }}
                                className="bg-brand-pistachio h-full rounded-full transition-all duration-500"
                              />
                            </div>
                          </div>

                          {loyaltySearchResult.points >= (companyInfo.loyaltyPointsTarget || 100) ? (
                            <p className="text-xs text-brand-purple font-medium flex items-center gap-1 pt-1 animate-pulse">
                              🎉 Parabéns! Você possui 1 Açaí Tradicional, Kids ou Tropical de 300ml grátis para resgatar diretamente no carrinho!
                            </p>
                          ) : (
                            <p className="text-[11px] text-gray-500 italic mt-1 leading-snug">
                              Faltam apenas {(companyInfo.loyaltyPointsTarget || 100) - loyaltySearchResult.points} pontos para você liberar um Açaí Tradicional, Kids ou Tropical de 300ml grátis!
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Column 2: PROGRAMA DE INDICAÇÃO "INDIQUE E GANHE" */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-5 md:p-6 space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center font-bold text-sm text-purple-900">🎟️</div>
                  <h3 className="font-display font-extrabold text-brand-purple text-base">Indique e Ganhe</h3>
                </div>

                {!clientUser ? (
                  <div className="text-center py-6 space-y-3">
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Faça login ou cadastre-se para obter seu <b>código de indicação</b> e ganhar <b>10 pontos</b> Club para cada amigo que comprar!
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsAuthOpen(true)}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-purple-700 to-purple-900 hover:from-purple-800 hover:to-purple-950 text-white font-extrabold text-xs uppercase rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      <span>Acessar / Cadastrar</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100 text-center space-y-2">
                      <span className="text-[10px] uppercase font-black tracking-wider text-purple-600">Seu Código de Indicação</span>
                      <div className="flex items-center justify-center gap-2">
                        <span className="bg-white border border-purple-200 text-purple-900 font-mono font-black text-base px-3.5 py-1 rounded-lg select-all">
                          {clientUser.referralCode || `${clientUser.name.trim().split(" ")[0].toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const code = clientUser.referralCode || `${clientUser.name.trim().split(" ")[0].toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`;
                            navigator.clipboard.writeText(code);
                            showToast("📋 Código copiado com sucesso! Compartilhe com os amigos.");
                          }}
                          className="bg-purple-900 hover:bg-purple-950 text-white text-[10px] font-bold p-2 px-3 rounded-lg leading-none cursor-pointer transition-colors"
                        >
                          Copiar
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-xs font-bold text-gray-700">Como funciona?</p>
                      <ul className="text-[11px] text-gray-500 space-y-1 leading-relaxed list-decimal list-inside pr-1">
                        <li>Envie seu código para um amigo.</li>
                        <li>Seu amigo digita seu código ao se cadastrar.</li>
                        <li>Quando ele fizer a <b>1ª compra</b> no app, você ganha <b>+10 pontos Club</b>!</li>
                      </ul>
                    </div>

                    {/* Dynamic Registered Friends list from client storage metadata */}
                    <div className="space-y-2 pt-2 border-t border-gray-100">
                      <div className="flex justify-between items-center text-xs font-bold font-display">
                        <span className="text-gray-700">Seus indicados</span>
                        <span className="bg-purple-100 text-purple-950 px-2 py-0.5 rounded-full text-[9px]">
                          {getStoredClientUsers().filter(u => u.referredBy === clientUser.id).length}
                        </span>
                      </div>

                      <div className="max-h-[140px] overflow-y-auto scrollbar-none space-y-1.5">
                        {getStoredClientUsers().filter(u => u.referredBy === clientUser.id).length === 0 ? (
                          <p className="text-[11px] text-gray-400 italic text-center py-2">
                            Nenhum amigo utilizou seu código ainda. Compartilhe seu código para começar!
                          </p>
                        ) : (
                          getStoredClientUsers().filter(u => u.referredBy === clientUser.id).map((friend) => (
                            <div key={friend.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                              <div className="min-w-0 flex-1 mr-2">
                                <p className="text-xs font-bold truncate leading-none text-gray-800">{friend.name}</p>
                                <p className="text-[9px] text-gray-400 mt-1 font-mono">{friend.phone || friend.email}</p>
                              </div>
                              {friend.referralAwarded ? (
                                <span className="bg-lime-100 text-lime-800 font-extrabold text-[8px] uppercase px-1.5 py-0.5 rounded-md whitespace-nowrap">
                                  +10 PTS Ganhos! 🎉
                                </span>
                              ) : (
                                <span className="bg-amber-50 text-amber-700 font-extrabold text-[8px] uppercase px-1.5 py-0.5 rounded-md whitespace-nowrap">
                                  Aguardando Compra ⏳
                                </span>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Column Right: ABA VANTAGENS DO DIA */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-5 md:p-6 space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                  <Tag className="w-6 h-6 text-brand-purple" />
                  <h3 className="font-display font-extrabold text-brand-purple text-base">Vantagens Diárias</h3>
                </div>

                <div className="space-y-2.5 overflow-hidden">
                  {displayPromos.filter(p => p.active).map((promo) => {
                    const isToday = (promo.dayOfWeek || promo.id) === currentDayId;
                    return (
                      <div
                        key={promo.id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                          isToday
                            ? "bg-purple-100/40 border-brand-purple/30 text-brand-charcoal"
                            : "bg-gray-50/50 border-gray-100 text-gray-700"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-display font-bold text-xs">{promo.dayName}</span>
                            {isToday && (
                              <span className="bg-brand-pistachio text-brand-charcoal font-bold text-[9px] px-1.5 py-0.5 rounded-full uppercase scale-95">
                                Ativo Hoje
                              </span>
                            )}
                          </div>
                          <h4 className="font-extrabold text-xs text-brand-purple leading-tight mt-1 truncate">
                            {promo.title}
                          </h4>
                          <p className="text-[11px] text-gray-500 leading-snug mt-1">
                            {promo.description}
                            {promo.id === "seg" && !promo.description.toLowerCase().includes("combos") && (
                              <span className="block mt-1 font-black text-[9.5px] uppercase tracking-wide text-amber-600">
                                ⚠️ Obs: Não se aplica a Combos!
                              </span>
                            )}
                          </p>
                        </div>

                        <span className="bg-brand-purple text-white text-[10px] font-mono font-bold px-2 py-1 rounded shrink-0">
                          {promo.badge}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 4. ABA PEÇA NOVAMENTE (TAB HISTORICO) */}
        {activeTab === "historico" && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-purple-50 text-brand-purple rounded-full flex items-center justify-center mx-auto mb-2">
                <RotateCcw className="w-6 h-6 text-brand-purple" />
              </div>
              <h2 className="font-display font-black text-xl text-brand-charcoal">Histórico de Pedidos</h2>
              <p className="text-xs text-gray-400">Clique para refazer seus pedidos favoritos rapidamente</p>
            </div>

            {!clientUser ? (
              <div className="bg-white p-8 rounded-2xl border text-center space-y-4 max-w-md mx-auto shadow-xs">
                <div className="w-12 h-12 bg-amber-50 text-amber-650 rounded-full flex items-center justify-center mx-auto">
                  <User className="w-6 h-6 text-amber-600" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-gray-850">Histórico não disponível</h3>
                  <p className="text-gray-500 text-[11px] leading-relaxed">
                    Você ainda não se cadastrou ou fez login. Para ver suas compras passadas e acompanhar seus pedidos, identifique-se no aplicativo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAuthOpen(true)}
                  className="w-full bg-brand-purple text-white text-xs py-2.5 px-4 font-bold rounded-xl hover:bg-brand-purple-light transition-all active:scale-95 cursor-pointer shadow-[0_2px_8px_rgba(168,85,247,0.15)] flex items-center justify-center gap-1.5"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Cadastrar / Entrar Agora</span>
                </button>
              </div>
            ) : (
              (() => {
                const cleanClientPhone = clientUser.phone ? clientUser.phone.replace(/\D/g, "") : "";
              const clientOrders = orders.filter(order => {
                if (!order.customerPhone) return false;
                return order.customerPhone.replace(/\D/g, "") === cleanClientPhone;
              });

              return clientOrders.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border text-center space-y-2">
                  <p className="text-gray-400 text-xs">Você não finalizou nenhum pedido no aplicativo ainda.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("menu")}
                    className="bg-brand-purple text-white text-xs px-4 py-2 font-semibold rounded-lg hover:bg-brand-purple-light cursor-pointer"
                  >
                    Ir para o Cardápio
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {clientOrders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-white border rounded-2xl shadow-sm p-4 text-xs space-y-3 relative hover:border-brand-purple/20 transition-all"
                    >
                      <div className="flex justify-between items-center border-b border-gray-100 pb-2 flex-wrap gap-1">
                        <div>
                          <span className="font-bold text-brand-purple">{order.id}</span>
                          <span className="text-gray-400 mx-1.5">•</span>
                          <span className="text-gray-500">
                            {new Date(order.date).toLocaleDateString("pt-BR")} às{" "}
                            {new Date(order.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            order.status === "Cancelado" 
                              ? "bg-red-50 text-red-650 border-red-150" 
                              : order.status === "Entregue" 
                              ? "bg-emerald-50 text-emerald-650 border-emerald-150"
                              : order.status === "Em preparo"
                              ? "bg-amber-50 text-amber-650 border-amber-150"
                              : order.status === "Saiu para entrega"
                              ? "bg-sky-50 text-sky-650 border-sky-150"
                              : "bg-purple-50 text-purple-650 border-purple-150"
                          }`}>
                            {order.status === "Saiu para entrega" ? "A caminho" : order.status}
                          </span>
                          <span className="bg-green-50 text-green-700 border border-green-100 font-bold px-2 py-0.5 rounded-full text-[10px]">
                            ✓ WhatsApp Aberto
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        {order.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between text-gray-700">
                            <span>
                              <b>{it.quantity}x</b> {it.name} ({it.size})
                            </span>
                            <span className="text-gray-500 font-mono">
                              R$ {(it.price * it.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="bg-gray-50 p-2 rounded-lg text-[10px] text-gray-500 border leading-snug">
                        📍 <b>Entrega em:</b> {order.address}
                      </div>

                      {/* Footer price & Repeat trigger */}
                      <div className="flex justify-between items-center pt-2 border-t border-gray-100 flex-wrap gap-2">
                        <div className="flex flex-col">
                          <span className="text-[9px] uppercase font-bold text-gray-400">Total Pago</span>
                          <span className="font-display font-black text-sm text-brand-purple">
                            R$ {order.total.toFixed(2)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOrderAgain(order)}
                          className="bg-brand-pistachio hover:bg-brand-pistachio-dark text-brand-charcoal font-extrabold px-4 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>PEDIR NOVAMENTE</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
              })()
            )}
          </div>
        )}

        {/* 5. PAINEL DE CONTROLE ADMINISTRATIVO (TAB ADMIN) */}
        {activeTab === "admin" && (
          <div className="space-y-6">
            <AdminPanel
              products={products}
              onUpdateProducts={handleUpdateProducts}
              vitrine={vitrine}
              onUpdateVitrine={handleUpdateVitrine}
              socialProofs={socialProofs}
              onUpdateSocialProofs={handleUpdateSocialProofs}
              promos={promos}
              onUpdatePromos={handleUpdatePromos}
              companyInfo={companyInfo}
              onUpdateCompanyInfo={handleUpdateCompanyInfo}
              loyaltyUsers={loyaltyUsers}
              onUpdateLoyaltyPoints={handleUpdateLoyaltyPoints}
              onRegisterLoyaltyUser={handleRegisterLoyaltyUser}
              onDeleteLoyaltyUser={handleDeleteLoyaltyUser}
              orders={orders}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              onAddGlobalNotification={handleAddGlobalNotification}
              onConfirmWhatsAppPurchase={handleConfirmWhatsAppPurchase}
            />
          </div>
        )}

        </section>

      </main>

      {/* MOBILE BOTTOM NAVIGATION */}
      {/* MOBILE-STYLE BOTTOM NAVIGATION (ALWAYS VISIBLE INSIDE EMULATOR) */}
      <footer className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100/80 z-40 block pointer-events-auto shadow-[0_-8px_30px_rgb(0,0,0,0.06)] pb-2.5 pt-2.5 px-2">
        <div className="grid grid-cols-5 text-center items-center max-w-lg mx-auto gap-1">
          {[
            { id: "home", label: "Início", icon: Heart },
            { id: "menu", label: "Cardápio", icon: ShoppingCart },
            { id: "fidelidade", label: "Ganhar", icon: Award },
            { id: "historico", label: "Histórico", icon: RotateCcw },
            { id: "admin", label: "Painel", icon: Shield },
          ].map((item) => {
            const IconComponent = item.icon;
            const isSel = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`py-1 flex flex-col items-center justify-center gap-1 rounded-xl transition-all duration-200 cursor-pointer ${
                  isSel ? "text-purple-900 bg-purple-50/65 font-black scale-102" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <div className="relative">
                  <IconComponent className={`w-3.5 h-3.5 transition-transform duration-200 ${isSel ? "stroke-purple-900 stroke-[2.5px] scale-105" : "stroke-gray-400"}`} />
                  {item.id === "menu" && cartItems.length > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[7px] font-black w-3 h-3 rounded-full flex items-center justify-center border border-white">
                      {cartItems.reduce((sum, i) => sum + i.quantity, 0)}
                    </span>
                  )}
                </div>
                <span translate="no" className={`notranslate text-[8px] font-extrabold tracking-tight ${isSel ? "text-purple-900" : "text-gray-400 font-bold"}`}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </footer>

      {/* FLOATING CART ACTION BAR */}
      <AnimatePresence>
        {cartItems.length > 0 && !isCartOpen && (
          <motion.button
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            onClick={() => setIsCartOpen(true)}
            className="absolute bottom-16 right-4 z-40 bg-lime-400 hover:bg-lime-500 text-purple-950 font-black px-4.5 py-3 rounded-full flex items-center gap-1.5 shadow-[0_8px_30px_rgba(168,85,247,0.35)] border border-lime-300 transition-all active:scale-95 cursor-pointer"
            id="mobile-floating-cart-btn"
          >
            {lastAddedItem ? (
              <img
                src={lastAddedItem.product.image}
                alt=""
                className="w-4 h-4 rounded-full object-cover border border-white bg-white shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <ShoppingCart className="w-3.5 h-3.5 stroke-[2.5]" />
            )}
            <span className="text-[10px] uppercase tracking-wider font-extrabold">Ver Sacola</span>
            <span className="bg-purple-900 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full leading-none">
              {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* FLOATING CART INJECTION DRAWER */}
      <ErrorBoundary componentName="Carrinho" onReset={handleClearCart}>
        <Cart
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          cartItems={cartItems}
          onUpdateQuantity={handleUpdateCartQuantity}
          onRemoveItem={handleRemoveCartItem}
          onClearCart={handleClearCart}
          companyInfo={companyInfo}
          loyaltyUsers={loyaltyUsers}
          onUpdateLoyaltyPoints={handleUpdateLoyaltyPoints}
          onAddOrderToHistory={handleAddOrderToHistory}
          currentUser={clientUser}
          promos={displayPromos}
          products={products}
          onOpenAuth={() => setIsAuthOpen(true)}
          onUpdateCustomizations={handleUpdateCustomizations}
        />
      </ErrorBoundary>

      {/* CLIENT AUTHENTICATION MODAL */}
      <ClientAuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSetUser={(usr) => {
          setClientUser(usr);
          localStorage.setItem("acai_client_user", JSON.stringify(usr));
          if (usr?.phone) {
            localStorage.setItem("acai_device_phone", usr.phone.replace(/\D/g, ""));
          }
        }}
      />

      {/* ANNOUNCEMENT POPUP MODAL */}
      <AnnouncementModal
        announcement={companyInfo.announcement}
        isOpen={isAnnouncementOpen}
        onClose={() => setIsAnnouncementOpen(false)}
      />

      {/* STORY SCREENSHOT LIGHTBOX MODAL */}
      <AnimatePresence>
        {selectedStoryImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedStoryImage(null)}
            className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-full max-h-[85dvh] md:max-h-[90dvh] aspect-[9/16] rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black"
            >
              <img
                src={selectedStoryImage}
                alt="Story print grande"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
              <button
                onClick={() => setSelectedStoryImage(null)}
                className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/80 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm border border-white/10 active:scale-90 transition-all cursor-pointer"
              >
                ✕
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* INSTAGRAM STYLE STORY PLAYER SYSTEM (STORY WRAPPER CAROUSEL) */}
      <AnimatePresence>
        {storyPlayerIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[115] bg-neutral-950/95 backdrop-blur-md flex items-center justify-center p-0 md:p-4 select-none"
          >
            {/* Background decoration blur bubbles */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-900/30 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-900/20 rounded-full blur-[120px] pointer-events-none"></div>

            {/* Main Phone Player Container */}
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-[430px] h-[100dvh] max-h-[100dvh] md:h-[92vh] md:max-h-[850px] md:rounded-[40px] md:border-8 md:border-neutral-800 bg-black flex flex-col justify-between overflow-hidden shadow-2xl"
            >
              {/* Tap control areas for next/prev (Invisible absolute buttons) */}
              <div className="absolute inset-x-0 top-16 bottom-24 z-20 flex">
                <div 
                  onClick={() => {
                    const activeProofs = socialProofs.filter(item => item.storyImage);
                    if (storyPlayerIndex > 0) {
                      setStoryPlayerIndex(storyPlayerIndex - 1);
                    } else {
                      setStoryPlayerIndex(activeProofs.length - 1); // wrap-around previous
                    }
                  }} 
                  className="w-1/3 h-full cursor-left"
                  title="Anterior"
                ></div>
                <div 
                  onClick={() => {
                    const activeProofs = socialProofs.filter(item => item.storyImage);
                    if (storyPlayerIndex < activeProofs.length - 1) {
                      setStoryPlayerIndex(storyPlayerIndex + 1);
                    } else {
                      setStoryPlayerIndex(null); // finish / close
                    }
                  }} 
                  className="w-2/3 h-full cursor-right"
                  title="Próximo"
                ></div>
              </div>

              {/* Story Header (Progress lines + profile name) */}
              {(() => {
                const activeProofs = socialProofs.filter(item => item.storyImage);
                const currentStory = activeProofs[storyPlayerIndex];
                if (!currentStory) return null;

                return (
                  <div className="relative z-30 p-4 pt-6 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
                    {/* Multi-story segmented progress bar indicator */}
                    <div className="flex gap-1.5 mb-3.5">
                      {activeProofs.map((_, sIdx) => (
                        <div key={sIdx} className="h-[2px] bg-white/35 flex-1 rounded-full overflow-hidden">
                          <div 
                            className={`h-full bg-white transition-all duration-300 ${
                              sIdx < storyPlayerIndex 
                                ? "w-full" 
                                : sIdx === storyPlayerIndex 
                                ? "w-full scale-x-100 origin-left duration-[5000ms] ease-linear" // full fill animation
                                : "w-0"
                            }`}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Instagram Profile Identicon */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-yellow-500 via-rose-500 to-purple-600 p-[1.5px] shadow-sm">
                          <div className="w-full h-full bg-black rounded-full p-[1.5px]">
                            <div className={`w-full h-full bg-gradient-to-br ${getAvatarGradient(currentStory.name)} rounded-full flex items-center justify-center font-extrabold text-xs uppercase overflow-hidden`}>
                              {currentStory.image ? (
                                <img src={currentStory.image} alt={currentStory.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <span>{currentStory.name.charAt(0)}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-left">
                          <h4 className="text-white font-black text-xs leading-none drop-shadow-sm flex items-center gap-1">
                            {currentStory.name}
                            <span className="text-[8px] bg-blue-500 text-white rounded-full px-0.5 font-bold scale-90">✓</span>
                          </h4>
                          <p className="text-white/80 text-[10px] drop-shadow-xs">@{currentStory.instagram || "acailover"}</p>
                        </div>
                      </div>

                      {/* Right-side Close & info */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setStoryPlayerIndex(null)}
                          className="bg-black/30 hover:bg-black/60 p-2 rounded-full text-white backdrop-blur-xs transition-transform active:scale-90 cursor-pointer flex items-center justify-center z-30"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Story main snapshot image display */}
              {(() => {
                const activeProofs = socialProofs.filter(item => item.storyImage);
                const currentStory = activeProofs[storyPlayerIndex];
                if (!currentStory) return null;

                return (
                  <div className="absolute inset-0 w-full h-full bg-black flex items-center justify-center z-10">
                    <img
                      src={currentStory.storyImage}
                      alt={`Açaí story de ${currentStory.name}`}
                      className="w-full h-full object-cover md:object-stretch"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                );
              })()}

              {/* Floating emojis trigger overlay inside Player */}
              {(() => {
                const activeProofs = socialProofs.filter(item => item.storyImage);
                const currentStory = activeProofs[storyPlayerIndex];
                if (!currentStory) return null;

                return (
                  <div className="absolute inset-x-0 bottom-24 h-64 pointer-events-none z-30 overflow-hidden">
                    {floatingEmojis
                      .filter((f) => f.storyId === currentStory.id)
                      .map((f) => (
                        <motion.div
                          key={`player-emoji-${f.id}`}
                          initial={{ y: 220, x: f.x, scale: 0.5, opacity: 0 }}
                          animate={{ 
                            y: -200, 
                            x: f.x + Math.sin(f.id) * 35,
                            scale: [0.7, 1.5, 0.9],
                            opacity: [0, 1, 1, 0] 
                          }}
                          transition={{ 
                            duration: 1.8, 
                            delay: f.delay,
                            ease: "easeOut"
                          }}
                          className="absolute bottom-0 left-1/2 text-3xl select-none"
                        >
                          {f.emoji}
                        </motion.div>
                      ))}
                  </div>
                );
              })()}

              {/* Story interactive reply footer (Always interactive!) */}
              {(() => {
                const activeProofs = socialProofs.filter(item => item.storyImage);
                const currentStory = activeProofs[storyPlayerIndex];
                if (!currentStory) return null;

                return (
                  <div className="relative z-30 p-4 pb-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-center gap-2.5">
                    <div className="flex-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20 px-4 py-2 text-white/95 text-xs text-left">
                      <span>Respondendo a @{currentStory.instagram || "acailover"}...</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => triggerStoryReaction(currentStory.id)}
                      className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center hover:bg-rose-700 active:scale-90 transition-all shadow-md select-none cursor-pointer z-40 relative"
                      title="Reagir com amor!"
                    >
                      <span className="text-lg">❤️</span>
                    </button>
                  </div>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications Panel Centered Layer */}
      <AnimatePresence>
        {isNotificationsOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-[3px] z-[120] flex items-center justify-center p-4 sm:p-6" 
            onClick={() => setIsNotificationsOpen(false)} 
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white border border-gray-150 rounded-2xl shadow-2xl z-[125] overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="p-4 bg-purple-900 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-purple-200" />
                  <span className="font-display font-black text-xs uppercase tracking-wider">Notificações</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="bg-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-md text-purple-200 font-mono">
                    {userNotifications.filter(n => !n.read).length} Novas
                  </span>
                  <button
                    onClick={() => setIsNotificationsOpen(false)}
                    className="bg-purple-800/60 hover:bg-purple-750 p-1.5 rounded-full text-purple-100 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                    title="Fechar"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Quick actions bar */}
              {userNotifications.length > 0 && (
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex justify-between items-center text-[11px] shrink-0 font-semibold text-gray-600">
                  <button
                    onClick={handleMarkAllNotificationsAsRead}
                    className="text-purple-900 hover:text-purple-750 font-bold cursor-pointer transition-colors flex items-center gap-1"
                  >
                    ✓ Marcar todas como lidas
                  </button>
                  <button
                    onClick={handleClearNotifications}
                    className="text-gray-400 hover:text-red-650 font-bold cursor-pointer transition-colors flex items-center gap-1"
                  >
                    🗑️ Limpar tudo
                  </button>
                </div>
              )}

              {/* Notifications list */}
              <div className="overflow-y-auto divide-y divide-gray-50 scrollbar-thin text-left flex-1">
                {userNotifications.length === 0 ? (
                  <div className="py-12 px-6 text-center space-y-2 flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
                      <Bell className="w-5 h-5 text-purple-300" />
                    </div>
                    <p className="text-gray-900 text-xs font-bold font-sans">Nenhuma notificação por aqui</p>
                    <p className="text-gray-400 text-[11px] max-w-[240px] leading-relaxed mx-auto">
                      {clientUser 
                        ? `Olá, ${clientUser.name.split(" ")[0]}! Suas notificações de compras e pontos acumulados aparecerão aqui.`
                        : "As notificações de status de compras e pontos acumulados aparecerão aqui conforme você usar o app."}
                    </p>
                  </div>
                ) : (
                  userNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        // mark current as read
                        const updated = notifications.map(n => n.id === notif.id ? { ...n, read: true } : n);
                        setNotifications(updated);
                        saveNotifications(updated);
                        if (notif.type === "points" || notif.message.includes("pontos") || notif.message.includes("Fidelidade")) {
                          setActiveTab("fidelidade");
                          setIsNotificationsOpen(false);
                        } else if (notif.orderId === "promo") {
                          setActiveTab("menu");
                          setIsNotificationsOpen(false);
                        } else {
                          setActiveTab("historico");
                          setIsNotificationsOpen(false);
                        }
                      }}
                      className={`p-3.5 transition-colors cursor-pointer text-left relative ${
                        notif.read ? "bg-white hover:bg-gray-50" : "bg-purple-50/20 hover:bg-purple-50/40"
                      }`}
                    >
                      {!notif.read && (
                        <span className="absolute top-4.5 left-3 w-1.5 h-1.5 rounded-full bg-purple-900" />
                      )}
                      <div className={`${notif.read ? "" : "pl-3.5"} space-y-1`}>
                        <div className="flex justify-between items-start gap-2">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border uppercase inline-block ${
                            notif.type === "points" || notif.message.includes("pontos")
                              ? "bg-amber-50 text-amber-700 border-amber-200 font-black"
                              : notif.status === "Cancelado" 
                              ? "bg-red-50 text-red-650 border-red-150" 
                              : notif.status === "Entregue" 
                              ? "bg-emerald-50 text-emerald-650 border-emerald-150"
                              : notif.status === "Em preparo"
                              ? "bg-amber-50 text-amber-650 border-amber-150"
                              : notif.status === "Saiu para entrega"
                              ? "bg-sky-50 text-sky-650 border-sky-150"
                              : notif.status === "Promoção"
                              ? "bg-purple-100 text-purple-900 border-purple-250 font-black animate-pulse"
                              : "bg-purple-50 text-purple-650 border-purple-150"
                          }`}>
                            {notif.type === "points" || notif.message.includes("pontos")
                              ? "⭐ Fidelidade"
                              : notif.status === "Saiu para entrega" 
                              ? "A caminho" 
                              : notif.status}
                          </span>
                          <span className="text-[9px] text-gray-400 shrink-0">
                            {new Date(notif.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        
                        <p className="text-[11px] text-gray-700 leading-snug font-sans break-words font-medium">
                          {notif.message}
                        </p>
                        
                        {notif.type === "points" || notif.message.includes("pontos") ? (
                          <span className="text-[9px] text-amber-700 font-extrabold block uppercase tracking-wider mt-1">
                            Ver meus pontos no Clube Fidelidade →
                          </span>
                        ) : notif.orderId === "promo" ? (
                          <span className="text-[9px] text-purple-900 font-extrabold block uppercase tracking-wider animate-bounce mt-1">
                            Ver Oferta no Cardápio →
                          </span>
                        ) : (
                          <span className="text-[9px] text-purple-900/70 font-semibold block uppercase tracking-wider mt-1">
                            Rastrear pedido no histórico →
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer list */}
              <div className="p-3 bg-gray-50 border-t border-gray-100 text-center shrink-0">
                <button
                  onClick={() => {
                    setActiveTab("historico");
                    setIsNotificationsOpen(false);
                  }}
                  className="text-[11px] text-purple-900 hover:text-purple-750 font-black tracking-wide uppercase transition-colors pointer-events-auto cursor-pointer"
                >
                  Ver Detalhes do Pedido
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <PWAInstallPrompt />

      </div>
    </div>
  );
}
