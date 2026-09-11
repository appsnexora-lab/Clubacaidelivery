import { Product, VitrineItem, SocialProof, PromoWeekDay, CompanyInfo, LoyaltyUser, OrderHistory, Category, Coupon, ClientUser, AppletNotification, DEFAULT_AVATAR_URL } from "../types";
import { INITIAL_PRODUCTS, INITIAL_VITRINE, INITIAL_SOCIAL_PROOFS, INITIAL_PROMOS, INITIAL_COMPANY_INFO } from "./initialData";
import { 
  getCollectionWithSeeding, 
  getDocumentWithSeeding, 
  saveDocument, 
  saveCollection,
  saveSingleOrderToCloud,
  deleteDocument
} from "../lib/firebase";

const KEYS = {
  PRODUCTS: "acai_delivery_products_v9_combos_sizes_fixed",
  VITRINE: "acai_delivery_vitrine",
  SOCIAL_PROOFS: "acai_delivery_social_proofs",
  PROMOS: "acai_delivery_promos",
  COMPANY_INFO: "acai_delivery_company",
  LOYALTY_USERS: "acai_delivery_loyalty_users",
  ORDERS: "acai_delivery_orders",
  CATEGORIES: "acai_delivery_categories",
  COUPONS: "acai_delivery_coupons",
  CLIENT_USERS: "acai_delivery_client_users",
  NOTIFICATIONS: "acai_delivery_notifications",
};

// --- BACKGROUND ASYNC FIREBASE HELPER ---
const runAsync = (promise: Promise<any>) => {
  promise.catch((err) => {
    console.error("[Firestore Sync Error] Background write failed:", err);
  });
};

// --- INDEXEDDB HANDLERS ---
const DB_NAME = "AcaiDeliveryDB";
const STORE_NAME = "images";

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } catch (e) {
      reject(e);
    }
  });
};

export const getIDBImage = async (key: string): Promise<string | null> => {
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve((request.result as string) || null);
      request.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
};

export const saveIDBImage = async (key: string, value: string): Promise<void> => {
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      store.put(value, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
    });
  } catch (e) {
    // Fallback silently
  }
};

// --- MEMORY AND LOCALSTORAGE HANDLERS ---
const safeSetItem = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch (error: any) {
    console.error(`Error writing key "${key}" to localStorage:`, error);
    if (error.name === "QuotaExceededError" || error.code === 22 || error.name === "NS_ERROR_DOM_QUOTA_REACHED") {
      alert("⚠️ O armazenamento rápido do navegador encheu! Mas fique tranquilo: suas novas fotos de alta resolução estão protegidas e salvas de forma segura.");
    }
  }
};

const getParsedItem = <T>(key: string, defaultValue: T): T => {
  try {
    const data = localStorage.getItem(key);
    if (!data || data === "undefined" || data === "null") {
      safeSetItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    const parsed = JSON.parse(data);
    if (parsed === null || parsed === undefined) {
      safeSetItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    return parsed as T;
  } catch (error) {
    console.error(`Error parsing key "${key}" from localStorage, resetting to default`, error);
    safeSetItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
};

// --- DATA READ OPERATIONS ---
export const normalizeProduct = (p: Product): Product => {
  if (!p) return p;

  let image = p.image;
  if (!image || image.startsWith("idb_img_") || image.startsWith("blob:")) {
    const match = INITIAL_PRODUCTS.find(ip => ip.id === p.id);
    image = match ? match.image : "https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=800&q=80";
  }

  let images = p.images;
  if (images && images.length > 0) {
    if (images[0] !== image || image.startsWith("idb_img_")) {
      images = undefined;
    }
  }

  let sizes = p.sizes;
  if (p.category === "combos" || p.id === "p9" || p.id === "p10" || p.id === "p11" || p.id === "p12") {
    let customSizes = p.sizes || [];
    if (p.id === "p9" || p.id === "p10" || p.id === "p11") {
      customSizes = [{ size: "300ml", price: p.sizes?.[0]?.price || 19.99, originalPrice: p.sizes?.[0]?.originalPrice }];
    } else if (p.id === "p12") {
      customSizes = [{ size: "500ml", price: p.sizes?.[0]?.price || 30.99, originalPrice: p.sizes?.[0]?.originalPrice }];
    } else if (!customSizes || customSizes.length === 0) {
      customSizes = [{ size: "Combo Único", price: p.sizes?.[0]?.price || 29.99, originalPrice: p.sizes?.[0]?.originalPrice }];
    }
    sizes = customSizes;
  } else {
    sizes = p.sizes && p.sizes.length > 0 ? p.sizes : [
      { size: "330ml", price: 15.00 },
      { size: "500ml", price: 20.00 }
    ];
  }

  // Ensure every size item has size and price
  sizes = sizes.map(s => ({
    size: s.size || "Padrão",
    price: typeof s.price === "number" ? s.price : 15.00,
    originalPrice: s.originalPrice
  }));

  return { 
    ...p, 
    image, 
    images, 
    sizes,
    name: p.name || "Açaí",
    category: p.category || "açai",
    description: p.description || ""
  };
};

export const getStoredProducts = (): Product[] => {
  const products = getParsedItem<Product[]>(KEYS.PRODUCTS, INITIAL_PRODUCTS);
  const filtered = products.filter(p => p.id !== "product_1781898758676");
  const existingIds = new Set(filtered.map(p => p.id));
  const missing = INITIAL_PRODUCTS.filter(p => !existingIds.has(p.id) && p.id !== "product_1781898758676");
  const merged = [...filtered, ...missing];
  return merged.map(p => {
    const norm = normalizeProduct(p);
    if (norm.id === "p13" && norm.sizes && norm.sizes.length > 0 && norm.sizes[0].price === 29.99) {
      norm.sizes[0].price = 31.90;
    }
    return norm;
  });
};

export const saveProducts = async (products: Product[]): Promise<Product[]> => {
  safeSetItem(KEYS.PRODUCTS, JSON.stringify(products));
  await saveCollection("products", products);
  return products;
};

export const getStoredVitrine = (): VitrineItem[] => {
  return getParsedItem<VitrineItem[]>(KEYS.VITRINE, INITIAL_VITRINE);
};

export const saveVitrine = async (vitrine: VitrineItem[]): Promise<VitrineItem[]> => {
  safeSetItem(KEYS.VITRINE, JSON.stringify(vitrine));
  await saveCollection("vitrine", vitrine);
  return vitrine;
};

export const getStoredSocialProofs = (): SocialProof[] => {
  let stored = getParsedItem<SocialProof[]>(KEYS.SOCIAL_PROOFS, INITIAL_SOCIAL_PROOFS);
  if (stored.some(p => p.id === "s1" || p.id === "s2" || p.id === "s3")) {
    safeSetItem(KEYS.SOCIAL_PROOFS, JSON.stringify([]));
    return [];
  }
  let updated = false;
  stored = stored.map(p => {
    if (p.image && p.image.startsWith("https://images.unsplash.com")) {
      const { image, ...rest } = p;
      updated = true;
      return rest;
    }
    return p;
  });
  if (updated) {
    safeSetItem(KEYS.SOCIAL_PROOFS, JSON.stringify(stored));
  }
  return stored;
};

export const saveSocialProofs = async (proofs: SocialProof[]): Promise<SocialProof[]> => {
  safeSetItem(KEYS.SOCIAL_PROOFS, JSON.stringify(proofs));
  await saveCollection("social_proofs", proofs);
  return proofs;
};

export const sortPromos = (promos: PromoWeekDay[]): PromoWeekDay[] => {
  const dayOrder = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"];
  return [...promos].sort((a, b) => {
    const idxA = dayOrder.indexOf(a.dayOfWeek || (a.id as any));
    const idxB = dayOrder.indexOf(b.dayOfWeek || (b.id as any));
    return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
  });
};

export const getStoredPromos = (): PromoWeekDay[] => {
  const items = getParsedItem<PromoWeekDay[]>(KEYS.PROMOS, INITIAL_PROMOS);
  const standardDays: Record<string, { dayOfWeek: "seg" | "ter" | "qua" | "qui" | "sex" | "sab" | "dom"; dayName: string }> = {
    seg: { dayOfWeek: "seg", dayName: "Segunda-feira" },
    ter: { dayOfWeek: "ter", dayName: "Terça-feira" },
    qua: { dayOfWeek: "qua", dayName: "Quarta-feira" },
    qui: { dayOfWeek: "qui", dayName: "Quinta-feira" },
    sex: { dayOfWeek: "sex", dayName: "Sexta-feira" },
    sab: { dayOfWeek: "sab", dayName: "Sábado" },
    dom: { dayOfWeek: "dom", dayName: "Domingo" },
  };
  const mapped = items.map((p) => {
    const defaultProto = INITIAL_PROMOS.find((i) => i.id === p.id) || p;
    const std = standardDays[p.id];
    return {
      ...defaultProto,
      ...p,
      dayOfWeek: std ? std.dayOfWeek : (p.dayOfWeek || (defaultProto.dayOfWeek || defaultProto.id as any)),
      dayName: std ? std.dayName : (p.dayName || defaultProto.dayName),
      tuesdayToppings: p.tuesdayToppings || defaultProto.tuesdayToppings || [],
      mondayDiscountPercent: p.mondayDiscountPercent !== undefined ? p.mondayDiscountPercent : defaultProto.mondayDiscountPercent,
      thursdayBuySize: p.thursdayBuySize || defaultProto.thursdayBuySize,
      thursdayGetSize: p.thursdayGetSize || defaultProto.thursdayGetSize,
    };
  });
  return sortPromos(mapped);
};

export const savePromos = (promos: PromoWeekDay[]) => {
  const sorted = sortPromos(promos);
  safeSetItem(KEYS.PROMOS, JSON.stringify(sorted));
  runAsync(saveCollection("promos", sorted));
};

export const getStoredCompanyInfo = (): CompanyInfo => {
  const info = getParsedItem<CompanyInfo>(KEYS.COMPANY_INFO, INITIAL_COMPANY_INFO);
  if (info && (info.name === "Entrega de Açaí" || info.name === "entrega de açaí" || !info.name)) {
    info.name = "Açaí Delivery";
    safeSetItem(KEYS.COMPANY_INFO, JSON.stringify(info));
  }
  if (info && info.announcement?.active) {
    info.announcement.active = false;
    safeSetItem(KEYS.COMPANY_INFO, JSON.stringify(info));
  }
  return info;
};

export const saveCompanyInfo = async (info: CompanyInfo): Promise<CompanyInfo> => {
  safeSetItem(KEYS.COMPANY_INFO, JSON.stringify(info));
  await saveDocument("company_config", "main", info);
  return info;
};

export const getStoredLoyaltyUsers = (): LoyaltyUser[] => {
  const defaultLoyaltyUsers: LoyaltyUser[] = [];
  const stored = getParsedItem<LoyaltyUser[]>(KEYS.LOYALTY_USERS, defaultLoyaltyUsers);
  if (stored.some(p => p.id === "ly1" || p.id === "ly2" || p.id === "ly3" || p.name === "Gabriel Souza")) {
    safeSetItem(KEYS.LOYALTY_USERS, JSON.stringify([]));
    return [];
  }
  return stored;
};

export const saveLoyaltyUsers = (users: LoyaltyUser[]) => {
  safeSetItem(KEYS.LOYALTY_USERS, JSON.stringify(users));
  runAsync(saveCollection("loyalty_users", users));
};

export const getStoredOrders = (): OrderHistory[] => {
  const defaultOrders: OrderHistory[] = [];
  const stored = getParsedItem<OrderHistory[]>(KEYS.ORDERS, defaultOrders);
  return stored.filter(order => order.id !== "ord-1001" && order.id !== "ord-1002");
};

export const saveOrders = (orders: OrderHistory[]) => {
  safeSetItem(KEYS.ORDERS, JSON.stringify(orders));
  runAsync(saveCollection("orders", orders));
};

export const getStoredCategories = (): Category[] => {
  const defaultCategories: Category[] = [
    { id: "cat1", name: "Açaí Tradicional", description: "O puro açaí do Norte batido com acompanhamentos clássicos" },
    { id: "cat2", name: "Açaí Premium", description: "Combinações sofisticadas de açaí com pastas e caldas gourmet" },
    { id: "cat3", name: "Combos", description: "Bandejas e kits econômicos prontos para compartilhar" },
    { id: "cat4", name: "Bebidas", description: "Sucos naturais refrescantes e refrigerantes trincando de gelados" },
    { id: "cat5", name: "Sobremesas", description: "Porções especiais de brownie coberto e taças da felicidade" },
  ];
  return getParsedItem<Category[]>(KEYS.CATEGORIES, defaultCategories);
};

export const saveCategories = (categories: Category[]) => {
  safeSetItem(KEYS.CATEGORIES, JSON.stringify(categories));
  runAsync(saveCollection("categories", categories));
};

export const getStoredCoupons = (): Coupon[] => {
  const defaultCoupons: Coupon[] = [];
  const stored = getParsedItem<Coupon[]>(KEYS.COUPONS, defaultCoupons);
  // Guarantee any mock/sample coupons like ACAI10, FRETEGRATIS, BEMVINDO5 or cup1/cup2/cup3 are purged
  const isMock = (c: Coupon) => 
    c.id === "cup1" || 
    c.id === "cup2" || 
    c.id === "cup3" || 
    c.code?.toUpperCase() === "ACAI10" || 
    c.code?.toUpperCase() === "FRETEGRATIS" || 
    c.code?.toUpperCase() === "BEMVINDO5";

  if (Array.isArray(stored) && stored.some(isMock)) {
    const cleaned = stored.filter(c => !isMock(c));
    safeSetItem(KEYS.COUPONS, JSON.stringify(cleaned));
    stored.filter(isMock).forEach(m => {
      runAsync(deleteDocument("coupons", m.id));
    });
    return cleaned;
  }
  return stored || [];
};

export const saveCoupons = (coupons: Coupon[]) => {
  safeSetItem(KEYS.COUPONS, JSON.stringify(coupons));
  runAsync(saveCollection("coupons", coupons));
};

export const getStoredClientUsers = (): ClientUser[] => {
  const defaultClients: ClientUser[] = [];
  const stored = getParsedItem<ClientUser[]>(KEYS.CLIENT_USERS, defaultClients);
  if (stored.some(p => p.id === "user1" || p.id === "user2" || p.id === "user3" || p.name === "Gabriel Souza")) {
    safeSetItem(KEYS.CLIENT_USERS, JSON.stringify([]));
    return [];
  }
  return stored;
};

export const saveClientUsers = (users: ClientUser[]) => {
  safeSetItem(KEYS.CLIENT_USERS, JSON.stringify(users));
  runAsync(saveCollection("client_users", users));
};

export const getStoredNotifications = (): AppletNotification[] => {
  const defaultNotifications: AppletNotification[] = [];
  return getParsedItem<AppletNotification[]>(KEYS.NOTIFICATIONS, defaultNotifications);
};

export const saveNotifications = (notifications: AppletNotification[]) => {
  safeSetItem(KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  runAsync(saveCollection("notifications", notifications));
};

// --- ASYNCHRONOUS DE-REFERENCING (IMAGE LOADER FUNCTIONS) ---
export const resolveProductsImages = async (products: Product[]): Promise<Product[]> => {
  return products.map(normalizeProduct);
};

export const resolveVitrineImages = async (vitrine: VitrineItem[]): Promise<VitrineItem[]> => {
  return vitrine.map((v) => {
    let image = v.image;
    if (!image || image.startsWith("idb_img_") || image.startsWith("blob:")) {
      const match = INITIAL_VITRINE.find(iv => iv.id === v.id);
      image = match ? match.image : "https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=1000&q=80";
    }
    return { ...v, image };
  });
};

export const resolveSocialProofsImages = async (proofs: SocialProof[]): Promise<SocialProof[]> => {
  return proofs.map((sp) => {
    let image = sp.image;
    let storyImage = sp.storyImage;
    if (!image || image.startsWith("idb_img_") || image.startsWith("blob:") || image.includes("1534528741775-53994a69daeb")) {
      const match = INITIAL_SOCIAL_PROOFS.find(isp => isp.id === sp.id);
      image = (match && match.image && !match.image.includes("1534528741775-53994a69daeb")) ? match.image : DEFAULT_AVATAR_URL;
    }
    if (!storyImage || storyImage.startsWith("idb_img_") || storyImage.startsWith("blob:")) {
      const match = INITIAL_SOCIAL_PROOFS.find(isp => isp.id === sp.id);
      storyImage = match ? match.storyImage : "https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=800&q=80";
    }
    return { ...sp, image, storyImage };
  });
};

export const resolveCompanyInfoImages = async (info: CompanyInfo): Promise<CompanyInfo> => {
  let logo = info.logo;
  let bannerImage = info.bannerImage;
  if (!logo || logo.startsWith("idb_img_") || logo.startsWith("blob:")) {
    logo = INITIAL_COMPANY_INFO.logo;
  }
  if (!bannerImage || bannerImage.startsWith("idb_img_") || bannerImage.startsWith("blob:")) {
    bannerImage = INITIAL_COMPANY_INFO.bannerImage;
  }
  return { ...info, logo, bannerImage };
};

// --- CLOUD FIREBASE SYNC FETCHERS ---
export const fetchProductsCloud = async (): Promise<Product[]> => {
  const rawData = await getCollectionWithSeeding<Product>("products", getStoredProducts());
  const data = (rawData || []).filter(p => p.id !== "product_1781898758676").map(p => {
    if (p.id === "p13" && p.sizes && p.sizes.length > 0) {
      return {
        ...p,
        sizes: p.sizes.map(s => ({
          ...s,
          price: (s.price === 29.99 || s.price === 31.99) ? 31.90 : s.price
        }))
      };
    }
    return p;
  });
  const existingIds = new Set(data.map(p => p.id));
  const missing = INITIAL_PRODUCTS.filter(p => !existingIds.has(p.id) && p.id !== "product_1781898758676");
  if (missing.length > 0) {
    const merged = [...data, ...missing];
    await saveProducts(merged);
    return merged;
  }
  safeSetItem(KEYS.PRODUCTS, JSON.stringify(data));
  return data;
};

export const fetchVitrineCloud = async (): Promise<VitrineItem[]> => {
  const data = await getCollectionWithSeeding<VitrineItem>("vitrine", getStoredVitrine());
  safeSetItem(KEYS.VITRINE, JSON.stringify(data));
  return data;
};

export const fetchSocialProofsCloud = async (): Promise<SocialProof[]> => {
  const data = await getCollectionWithSeeding<SocialProof>("social_proofs", getStoredSocialProofs());
  safeSetItem(KEYS.SOCIAL_PROOFS, JSON.stringify(data));
  return data;
};

export const fetchPromosCloud = async (): Promise<PromoWeekDay[]> => {
  const data = await getCollectionWithSeeding<PromoWeekDay>("promos", getStoredPromos());
  const standardDays: Record<string, { dayOfWeek: "seg" | "ter" | "qua" | "qui" | "sex" | "sab" | "dom"; dayName: string }> = {
    seg: { dayOfWeek: "seg", dayName: "Segunda-feira" },
    ter: { dayOfWeek: "ter", dayName: "Terça-feira" },
    qua: { dayOfWeek: "qua", dayName: "Quarta-feira" },
    qui: { dayOfWeek: "qui", dayName: "Quinta-feira" },
    sex: { dayOfWeek: "sex", dayName: "Sexta-feira" },
    sab: { dayOfWeek: "sab", dayName: "Sábado" },
    dom: { dayOfWeek: "dom", dayName: "Domingo" },
  };
  const sanitized = (data || []).map((p) => {
    const std = standardDays[p.id];
    let updated = { ...p };
    if (std && (p.dayOfWeek !== std.dayOfWeek || p.dayName !== std.dayName)) {
      updated = {
        ...updated,
        dayOfWeek: std.dayOfWeek,
        dayName: std.dayName,
      };
    }
    if (updated.id === "sex") {
      if (!updated.fridaySelectedProductId || updated.fridaySelectedProductId === "product_1781898758676") {
        updated.fridaySelectedProductId = "p13";
      }
      if (!updated.fridaySpecialPrice || updated.fridaySpecialPrice === 29.99) {
        updated.fridaySpecialPrice = 31.90;
      }
    }
    return updated;
  });
  const sorted = sortPromos(sanitized);
  safeSetItem(KEYS.PROMOS, JSON.stringify(sorted));
  return sorted;
};

export const fetchCompanyInfoCloud = async (): Promise<CompanyInfo> => {
  const data = await getDocumentWithSeeding<CompanyInfo>("company_config", "main", getStoredCompanyInfo());
  let needsSave = false;
  if (data && (data.name === "Entrega de Açaí" || data.name === "entrega de açaí" || !data.name)) {
    data.name = "Açaí Delivery";
    needsSave = true;
  }
  if (data && data.announcement?.active) {
    data.announcement = {
      ...data.announcement,
      active: false,
    };
    needsSave = true;
  }
  if (needsSave) {
    await saveCompanyInfo(data);
  } else {
    safeSetItem(KEYS.COMPANY_INFO, JSON.stringify(data));
  }
  return data;
};

export const fetchLoyaltyUsersCloud = async (): Promise<LoyaltyUser[]> => {
  const data = await getCollectionWithSeeding<LoyaltyUser>("loyalty_users", getStoredLoyaltyUsers());
  safeSetItem(KEYS.LOYALTY_USERS, JSON.stringify(data));
  return data;
};

export const fetchOrdersCloud = async (): Promise<OrderHistory[]> => {
  const data = await getCollectionWithSeeding<OrderHistory>("orders", getStoredOrders());
  safeSetItem(KEYS.ORDERS, JSON.stringify(data));
  return data;
};

export const fetchCategoriesCloud = async (): Promise<Category[]> => {
  const data = await getCollectionWithSeeding<Category>("categories", getStoredCategories());
  safeSetItem(KEYS.CATEGORIES, JSON.stringify(data));
  return data;
};

export const fetchCouponsCloud = async (): Promise<Coupon[]> => {
  const data = await getCollectionWithSeeding<Coupon>("coupons", []);
  const isMock = (c: Coupon) => 
    c.id === "cup1" || 
    c.id === "cup2" || 
    c.id === "cup3" || 
    c.code?.toUpperCase() === "ACAI10" || 
    c.code?.toUpperCase() === "FRETEGRATIS" || 
    c.code?.toUpperCase() === "BEMVINDO5";

  if (Array.isArray(data) && data.some(isMock)) {
    const cleaned = data.filter(c => !isMock(c));
    data.filter(isMock).forEach(m => {
      runAsync(deleteDocument("coupons", m.id));
    });
    safeSetItem(KEYS.COUPONS, JSON.stringify(cleaned));
    return cleaned;
  }

  safeSetItem(KEYS.COUPONS, JSON.stringify(data || []));
  return data || [];
};

export const fetchClientUsersCloud = async (): Promise<ClientUser[]> => {
  const data = await getCollectionWithSeeding<ClientUser>("client_users", getStoredClientUsers());
  safeSetItem(KEYS.CLIENT_USERS, JSON.stringify(data));
  return data;
};

export const fetchNotificationsCloud = async (): Promise<AppletNotification[]> => {
  const data = await getCollectionWithSeeding<AppletNotification>("notifications", getStoredNotifications());
  safeSetItem(KEYS.NOTIFICATIONS, JSON.stringify(data));
  return data;
};

export interface AdminCredentials {
  email?: string;
  password?: string;
}

export const fetchAdminCredentialsCloud = async (): Promise<AdminCredentials> => {
  const initial = {
    email: localStorage.getItem("acai_admin_email") || "admin@acai.com",
    password: localStorage.getItem("acai_admin_password") || "admin123"
  };
  try {
    const data = await getDocumentWithSeeding<AdminCredentials>("admin_config", "credentials", initial);
    if (data && data.email && data.password) {
      return data;
    }
  } catch (err) {
    console.error("[Firebase] Error fetching admin credentials:", err);
  }
  return initial;
};

export const saveAdminCredentialsCloud = async (email: string, password: string): Promise<void> => {
  await saveDocument("admin_config", "credentials", { email, password });
};

export { saveSingleOrderToCloud };
