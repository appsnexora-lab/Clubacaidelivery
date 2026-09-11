/**
 * Cleans the input phone string and formats it to Brazilian international format
 * @param phone Raw phone string
 * @returns Cleaned Brazilian international phone number (e.g. "5581999999999" or "558199999999")
 */
export function formatBrazilianPhone(phone: string): string {
  if (!phone) return "";

  // 1. Remover caracteres inválidos do número: espaços, parênteses, traços, sinal + (apenas dígitos)
  let digits = phone.replace(/\D/g, "");

  // Remove leading zeros if any (e.g. "081999999999" -> "81999999999")
  while (digits.startsWith("0")) {
    digits = digits.substring(1);
  }

  // 2. Converter automaticamente para o formato internacional brasileiro (adiciona 55 se não tiver e o tamanho for de celular/fixo Br com DDD)
  if (digits && !digits.startsWith("55") && (digits.length === 10 || digits.length === 11)) {
    digits = "55" + digits;
  }

  return digits;
}

/**
 * Validates a cleaned/formatted Brazilian WhatsApp number
 * @param formattedPhone Cleaned phone number (digits only, e.g. "5581999999999")
 * @returns Object indicating if the number is valid and a descriptive message if invalid
 */
export function validateBrazilianPhone(formattedPhone: string): { isValid: boolean; error?: string } {
  if (!formattedPhone) {
    return { isValid: false, error: "WhatsApp da loja não configurado." };
  }

  // A valid Brazilian international phone format with country code 55 must have:
  // - 55 (2 digits)
  // - DDD (2 digits)
  // - number (8 or 9 digits)
  // Total length: 12 or 13 digits.
  const isValidLength = formattedPhone.length === 12 || formattedPhone.length === 13;
  
  if (!formattedPhone.startsWith("55")) {
    return { isValid: false, error: "Número deve iniciar com o código internacional do Brasil (55) ou conter o DDD correto." };
  }

  if (!isValidLength) {
    return { isValid: false, error: "O número de WhatsApp configurado possui tamanho inválido para o padrão brasileiro (deve conter DDD + número, possuindo entre 10 e 11 dígitos originais)." };
  }

  return { isValid: true };
}

/**
 * Generates a standard, safe and direct WhatsApp click-to-chat URL
 * @param phone Raw phone string
 * @param text Optional text message to pre-fill
 * @param forceScheme Optional override ('web' | 'app') to force web URL vs custom scheme protocol
 * @returns WhatsApp URL
 */
export function generateWhatsAppLink(phone: string, text: string = "", forceScheme?: "web" | "app"): string {
  const formatted = formatBrazilianPhone(phone);
  const validation = validateBrazilianPhone(formatted);

  const encodedText = text ? encodeURIComponent(text) : "";
  
  // Exibição detalhada para logs de depuração requisitados pelo usuário:
  console.log("================= WHATSAPP LINK GENERATOR AUDIT =================");
  console.log("[WhatsApp Audit] Número original carregado do painel:", phone);
  console.log("[WhatsApp Audit] Número limpo e formatado internamente:", formatted);
  console.log("[WhatsApp Audit] Status de validação:", validation.isValid ? "VÁLIDO" : "INVÁLIDO", validation.error || "");

  if (!validation.isValid) {
    console.log("[WhatsApp Audit] URL final gerada: Falhou na validação.");
    console.log("=================================================================");
    return "";
  }

  // Detect if on mobile device to prefer custom URI scheme
  const useAppScheme = forceScheme 
    ? forceScheme === "app"
    : (typeof window !== "undefined" && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(window.navigator.userAgent));

  let url = "";
  if (useAppScheme) {
    // Custom scheme (whatsapp://) forces opening the native app chooser or active WhatsApp Messenger directly,
    // bypassing Android's verified domain defaults which often redirect https://api.whatsapp.com 
    // wrongly to WhatsApp Business when BOTH are installed but only one can active.
    url = encodedText 
      ? `whatsapp://send?phone=${formatted}&text=${encodedText}` 
      : `whatsapp://send?phone=${formatted}`;
    console.log("[WhatsApp Audit] Usando formato App Scheme (whatsapp://) - Recomendado para celular");
  } else {
    // Universal HTTPS Web Link
    url = encodedText 
      ? `https://api.whatsapp.com/send?phone=${formatted}&text=${encodedText}` 
      : `https://api.whatsapp.com/send?phone=${formatted}`;
    console.log("[WhatsApp Audit] Usando formato HTTPS Web Link - Recomendado para Desktop");
  }
    
  console.log("[WhatsApp Audit] URL final gerada para o WhatsApp:", url);
  console.log("=================================================================");
  return url;
}

// ---------------------------------------------------------------------------
// SYNCHRONIZED STORE HOURS & PROMO EXPIRATION HELPERS (Recife Timezone)
// ---------------------------------------------------------------------------

import { CompanyInfo, PromoWeekDay } from "./types";

export interface RecifeTimeData {
  hour: number;
  minute: number;
  second: number;
  totalSeconds: number;
  dateStr: string;
  dayOfWeek: "dom" | "seg" | "ter" | "qua" | "qui" | "sex" | "sab";
}

/**
 * Returns accurate Recife, Brazil (UTC-3) time components down to the second.
 */
export function getRecifeNow(): RecifeTimeData {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Recife",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date());
    const getPart = (type: string) => {
      const p = parts.find((x) => x.type === type);
      return p ? parseInt(p.value, 10) : 0;
    };
    const hour = getPart("hour");
    const minute = getPart("minute");
    const second = getPart("second");
    const weekdayPart = parts.find((x) => x.type === "weekday")?.value || "Sun";
    const dayMap: Record<string, "dom" | "seg" | "ter" | "qua" | "qui" | "sex" | "sab"> = {
      Sun: "dom",
      Mon: "seg",
      Tue: "ter",
      Wed: "qua",
      Thu: "qui",
      Fri: "sex",
      Sat: "sab",
    };
    const dayOfWeek = dayMap[weekdayPart] || "dom";
    return {
      hour,
      minute,
      second,
      totalSeconds: hour * 3600 + minute * 60 + second,
      dateStr: `${getPart("year")}-${String(getPart("month")).padStart(2, "0")}-${String(getPart("day")).padStart(2, "0")}`,
      dayOfWeek,
    };
  } catch (e) {
    const d = new Date();
    const hour = d.getHours();
    const minute = d.getMinutes();
    const second = d.getSeconds();
    const weekdays = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"] as const;
    return {
      hour,
      minute,
      second,
      totalSeconds: hour * 3600 + minute * 60 + second,
      dateStr: d.toISOString().split("T")[0],
      dayOfWeek: weekdays[d.getDay()],
    };
  }
}

/**
 * Parses time string like "21:00", "21h", "00:00" into normalized hour/minute numbers.
 */
export function parseTimeToMinutes(timeStr: string): { hour: number; minute: number; totalMinutes: number; formatted: string } {
  if (!timeStr) return { hour: 21, minute: 0, totalMinutes: 21 * 60, formatted: "21:00" };
  const clean = timeStr.replace(/[hH]/, ":").trim();
  const parts = clean.split(":");
  let hour = parseInt(parts[0], 10) || 0;
  const minute = parseInt(parts[1], 10) || 0;
  // If 00:00 is used as closing time, treat as midnight (24:00)
  if (hour === 0 && minute === 0 && clean.startsWith("00")) {
    hour = 24;
  }
  const formatted = `${String(hour === 24 ? 0 : hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  return {
    hour,
    minute,
    totalMinutes: hour * 60 + minute,
    formatted,
  };
}

/**
 * Extracts today's opening and closing hours for the store based on weekly schedule or hours string.
 */
export function getStoreClosingForDay(companyInfo?: CompanyInfo, dayCode?: "dom" | "seg" | "ter" | "qua" | "qui" | "sex" | "sab"): {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  startFormatted: string;
  endFormatted: string;
  isOpenDay: boolean;
} {
  const currentDay = dayCode || getRecifeNow().dayOfWeek;
  let startHour = 16;
  let startMinute = 0;
  let endHour = 21;
  let endMinute = 0;
  let isOpenDay = true;
  let startFormatted = "16:00";
  let endFormatted = "21:00";

  if (companyInfo?.weeklyHours && companyInfo.weeklyHours[currentDay]) {
    const sched = companyInfo.weeklyHours[currentDay];
    isOpenDay = sched.isOpen !== false;
    if (sched.start) {
      const s = parseTimeToMinutes(sched.start);
      startHour = s.hour;
      startMinute = s.minute;
      startFormatted = s.formatted;
    }
    if (sched.end) {
      const e = parseTimeToMinutes(sched.end);
      endHour = e.hour;
      endMinute = e.minute;
      endFormatted = e.formatted;
    }
  } else if (companyInfo?.hours) {
    const cleanStr = companyInfo.hours.toLowerCase().trim();
    const match = cleanStr.match(/(\d{1,2})(?::(\d{2}))?\s*(?:h|hs|hrs|as|às|a|-|\s+)\s*(\d{1,2})(?::(\d{2}))?/i);
    if (match) {
      startHour = parseInt(match[1], 10);
      startMinute = match[2] ? parseInt(match[2], 10) : 0;
      endHour = parseInt(match[3], 10);
      endMinute = match[4] ? parseInt(match[4], 10) : 0;
      if (endHour === 0) endHour = 24;
      startFormatted = `${String(startHour).padStart(2, "0")}:${String(startMinute).padStart(2, "0")}`;
      endFormatted = `${String(endHour === 24 ? 0 : endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;
    }
  }

  return {
    startHour,
    startMinute,
    endHour,
    endMinute,
    startFormatted,
    endFormatted,
    isOpenDay,
  };
}

export interface PromoCountdownResult {
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  isBeforeOpening: boolean;
  isCustomLimit: boolean;
  targetFormatted: string;
  startFormatted: string;
  progressPercent: number;
}

/**
 * Accurately calculates remaining time for today's promotion.
 * Sychronizes with store closing time (e.g. 21:00) or custom limit time (e.g. Wednesday 18:00 free shipping).
 */
export function calculatePromoCountdown(promo?: PromoWeekDay | null, companyInfo?: CompanyInfo): PromoCountdownResult {
  const now = getRecifeNow();
  const schedule = getStoreClosingForDay(companyInfo, now.dayOfWeek);

  let targetHour = schedule.endHour;
  let targetMinute = schedule.endMinute;
  let targetFormatted = schedule.endFormatted;
  let isCustomLimit = false;

  // Custom limit handling (e.g. Wednesday free shipping "wednesdayLimitTime" like "18:00")
  if (promo?.id === "qua" && promo.wednesdayLimitTime) {
    const parsed = parseTimeToMinutes(promo.wednesdayLimitTime);
    targetHour = parsed.hour;
    targetMinute = parsed.minute;
    targetFormatted = parsed.formatted;
    isCustomLimit = true;
  }

  const targetTotalSeconds = targetHour * 3600 + targetMinute * 60;
  const startTotalSeconds = schedule.startHour * 3600 + schedule.startMinute * 60;
  const currentTotalSeconds = now.totalSeconds;

  // Check manual store closure
  if (companyInfo?.isOpen === false) {
    return {
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
      isBeforeOpening: false,
      isCustomLimit,
      targetFormatted,
      startFormatted: schedule.startFormatted,
      progressPercent: 0,
    };
  }

  // Check if day is marked closed
  if (!schedule.isOpenDay) {
    return {
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
      isBeforeOpening: false,
      isCustomLimit,
      targetFormatted,
      startFormatted: schedule.startFormatted,
      progressPercent: 0,
    };
  }

  const isBeforeOpening = currentTotalSeconds < startTotalSeconds;

  // Check if promo has ended
  if (currentTotalSeconds >= targetTotalSeconds) {
    return {
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
      isBeforeOpening: false,
      isCustomLimit,
      targetFormatted,
      startFormatted: schedule.startFormatted,
      progressPercent: 0,
    };
  }

  const diffSecs = targetTotalSeconds - currentTotalSeconds;
  const hours = Math.floor(diffSecs / 3600);
  const minutes = Math.floor((diffSecs % 3600) / 60);
  const seconds = diffSecs % 60;

  // Percentage remaining in active window
  const totalWindowSecs = Math.max(1, targetTotalSeconds - startTotalSeconds);
  const elapsedSecs = Math.max(0, currentTotalSeconds - startTotalSeconds);
  const progressPercent = Math.max(0, Math.min(100, (1 - elapsedSecs / totalWindowSecs) * 100));

  return {
    hours,
    minutes,
    seconds,
    isExpired: false,
    isBeforeOpening,
    isCustomLimit,
    targetFormatted,
    startFormatted: schedule.startFormatted,
    progressPercent,
  };
}
