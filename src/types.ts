export interface Product {
  id: string;
  image: string;
  name: string;
  description: string;
  sizes: {
    size: string; // e.g. "330ml", "500ml"
    price: number;
    originalPrice?: number;
  }[];
  category: string; // Can match dynamically created categories
  images?: string[]; // Optional gallery of images
  active?: boolean; // Can be enabled/disabled in catalog
  isFridayOnly?: boolean; // Only visible on Fridays for the customer menu
}

export interface Category {
  id: string;
  name: string;
  description: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: "percent" | "fixed";
  value: number;
  usageLimit: number;
  usageCount: number;
  expirationDate: string;
  active: boolean;
}

export interface VitrineItem {
  id: string;
  image: string;
  title: string;
  description: string;
}

export interface SocialProof {
  id: string;
  image?: string;
  name: string;
  instagram: string;
  rating: number; // 1-5
  comment: string;
  storyImage?: string;
}

export interface PromoWeekDay {
  id: string;
  dayOfWeek?: "seg" | "ter" | "qua" | "qui" | "sex" | "sab" | "dom";
  dayName: string; // e.g. "Segunda-feira", "Terça-feira"
  title: string;
  description: string;
  badge: string;
  active: boolean;
  mondayDiscountPercent?: number;
  tuesdayToppings?: string[];
  wednesdayLimitTime?: string;
  thursdayBuySize?: string;
  thursdayGetSize?: string;
  fridaySelectedProductId?: string;
  fridaySpecialPrice?: number;
}

export interface ClientUser {
  id: string;
  name: string;
  email?: string;
  phone: string;
  password?: string; // Client account auth
  points: number;
  createdAt: string;
  favorites: string[]; // List of product IDs
  blocked: boolean;
  referredBy?: string;       // ID of the ClientUser who referred this client
  referralCode?: string;     // This client's unique invitation code
  referralAwarded?: boolean;  // True if this user's first purchase already gave points to the referrer
  birthday?: string;          // Birthday in format YYYY-MM-DD or DD/MM
  address?: {
    street: string;
    number: string;
    neighborhood: string;
    complement?: string;
    city?: string;
    zipCode?: string;
  };
}

export interface LoyaltyUser {
  id: string;
  name: string;
  phone: string;
  points: number;
  createdAt: string;
  birthday?: string;          // Birthday in format YYYY-MM-DD or DD/MM
}

export interface CartItem {
  id: string; // Unique for cart (productId + selectedSize + custom modifiers string)
  product: Product;
  selectedSize: string;
  price: number;
  quantity: number;
  customizations?: {
    size: string;
    complements: string[];
    fruits: string[];
    sauces: string[];
    additionals: string[];
  };
}

export interface OrderHistory {
  id: string;
  date: string;
  items: {
    name: string;
    size: string;
    quantity: number;
    price: number;
    customizations?: {
      size: string;
      complements: string[];
      fruits: string[];
      sauces: string[];
      additionals: string[];
    };
  }[];
  total: number;
  address: string;
  whatsappSent: boolean;
  status: "Recebido" | "Em preparo" | "Saiu para entrega" | "Entregue" | "Cancelado" | "Pendente de confirmação no WhatsApp" | "Finalizado";
  paymentMethod?: string;
  changeFor?: string;
  customerName?: string;
  customerPhone?: string;
  discountApplied?: number;
  couponCode?: string;
  rawAddress?: {
    street: string;
    number: string;
    neighborhood: string;
    complement?: string;
    city?: string;
    zipCode?: string;
  };
  pointsEarned?: number;
  pointsRedeemed?: number;
  pointsProcessed?: boolean;
  confirmedAt?: string;
}

export interface DailyHour {
  isOpen: boolean;
  start: string;
  end: string;
}

export interface WeeklyHours {
  seg: DailyHour;
  ter: DailyHour;
  qua: DailyHour;
  qui: DailyHour;
  sex: DailyHour;
  sab: DailyHour;
  dom: DailyHour;
}

export interface AnnouncementInfo {
  active: boolean;
  title: string;
  message: string;
  badge?: string;
  isClosedNotice?: boolean;
}

export interface CompanyInfo {
  name: string;
  logo: string;
  address: string;
  hours: string;
  whatsapp: string;
  instagram: string;
  mapsLink: string;
  bannerImage: string;
  isOpen?: boolean;
  loyaltyPointsTarget?: number;
  pixKey?: string;
  weeklyHours?: WeeklyHours;
  announcement?: AnnouncementInfo;
}

export interface AppletNotification {
  id: string;
  orderId: string;
  customerPhone?: string;
  customerName?: string;
  type?: "order" | "points" | "promo" | "general";
  message: string;
  status: "Recebido" | "Em preparo" | "Saiu para entrega" | "Entregue" | "Cancelado" | "Promoção" | "Geral" | "Pendente de confirmação no WhatsApp" | "Finalizado";
  date: string;
  read: boolean;
}

export const DEFAULT_AVATAR_URL = "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20100%20100%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%25%22%20y1%3D%220%25%22%20x2%3D%22100%25%22%20y2%3D%22100%25%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23a855f7%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%236b21a8%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%22100%22%20height%3D%22100%22%20fill%3D%22url(%23g)%22%2F%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2240%22%20r%3D%2218%22%20fill%3D%22%23ffffff%22%2F%3E%3Cpath%20d%3D%22M50%2062c-20%200-30%2010-30%2020%200%205%204%208%208%208h44c4%200%208-3%208-8%200-10-10-20-30-20z%22%20fill%3D%22%23ffffff%22%2F%3E%3C%2Fsvg%3E";



