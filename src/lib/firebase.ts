/// <reference types="vite/client" />
import { initializeApp } from "firebase/app";
import { 
  initializeFirestore, 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc,
  writeBatch,
  setLogLevel
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { 
  getStorage, 
  ref, 
  uploadString, 
  getDownloadURL 
} from "firebase/storage";

// Embedded configuration to prevent build errors when config files aren't committed.
// This allows the app to run seamlessly in both development and production (Vercel/Netlify).
const DEFAULT_CONFIG = {
  projectId: "pacific-song-xrr5c",
  appId: "1:1057442314054:web:b6ee757d32e1458ca2d747",
  apiKey: "AIzaSyC6D6dmkNs79QODfZwje3QeJjivhx6A-7o",
  authDomain: "pacific-song-xrr5c.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-aadelivery-9b6b1982-1ddd-457c-b0f1-3377244a33e9",
  storageBucket: "pacific-song-xrr5c.firebasestorage.app",
  messagingSenderId: "1057442314054",
  measurementId: ""
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || DEFAULT_CONFIG.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || DEFAULT_CONFIG.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || DEFAULT_CONFIG.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || DEFAULT_CONFIG.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || DEFAULT_CONFIG.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || DEFAULT_CONFIG.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || DEFAULT_CONFIG.measurementId,
};

const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID || DEFAULT_CONFIG.firestoreDatabaseId;

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Silence Firestore internal logs
try {
  setLogLevel("silent");
} catch (e) {
  // Ignore fallback issues
}

// Initialize Services (using custom databaseId if provided)
export const db = databaseId && databaseId !== "default" 
  ? initializeFirestore(app, { experimentalForceLongPolling: true }, databaseId) 
  : initializeFirestore(app, { experimentalForceLongPolling: true });

export const auth = getAuth(app);
export const storage = getStorage(app);

/**
 * Compress an image represented as a base64 string.
 */
export function compressImageBase64(
  base64Str: string,
  maxWidth = 1200,
  maxHeight = 800,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve) => {
    if (!base64Str || !base64Str.startsWith("data:image/")) {
      resolve(base64Str);
      return;
    }
    
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }
      
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        try {
          const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
          resolve(compressedBase64);
        } catch (e) {
          resolve(base64Str);
        }
      } else {
        resolve(base64Str);
      }
    };
    
    img.onerror = () => {
      resolve(base64Str);
    };
    
    img.src = base64Str;
  });
}

/**
 * Upload an image (base64 string or file) to Cloudinary and return its permanent secure URL.
 * Falls back to Firebase Storage if Cloudinary fails, ensuring permanent public cloud storage.
 */
export async function uploadImageToStorage(base64Str: string, _path?: string): Promise<string> {
  if (!base64Str) return "";
  
  // If it's already an HTTP URL (not blob: or data:), return as is
  if (base64Str.startsWith("http") && !base64Str.startsWith("blob:") && !base64Str.startsWith("data:")) {
    return base64Str;
  }

  let cloudinaryError: any = null;

  // 1. Try Cloudinary direct upload first
  try {
    const formData = new FormData();
    formData.append("file", base64Str);
    formData.append("upload_preset", "acai_delivery");

    console.log("[Cloudinary] Uploading image...");
    const response = await fetch("https://api.cloudinary.com/v1_1/f2xid9nb/image/upload", {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      if (data.secure_url) {
        console.log(`[Cloudinary] Upload successful: ${data.secure_url}`);
        return data.secure_url;
      }
    } else {
      const errText = await response.text();
      cloudinaryError = new Error(`Cloudinary responded with ${response.status}: ${errText}`);
    }
  } catch (error: any) {
    cloudinaryError = error;
    console.error("[Cloudinary] Upload failed:", error);
  }

  // 2. If Cloudinary fails, automatically fall back to Firebase Storage
  console.warn("[Upload] Cloudinary upload failed. Trying Firebase Storage as a permanent cloud fallback...");
  try {
    const uniqueId = Date.now() + "_" + Math.random().toString(36).substring(2, 9);
    const path = `uploads/img_${uniqueId}.jpg`;
    const storageRef = ref(storage, path);
    
    const snapshot = await uploadString(storageRef, base64Str, "data_url");
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log(`[Firebase Storage] Fallback upload successful: ${downloadURL}`);
    return downloadURL;
  } catch (firebaseError: any) {
    console.error("[Firebase Storage] Fallback upload failed:", firebaseError);
    
    // Create a combined diagnostic error message
    const diagnosticMessage = `Image upload failed in all cloud storage providers.
- Cloudinary Error: ${cloudinaryError?.message || "Unknown error"}
- Firebase Storage Error: ${firebaseError?.message || "Unknown error"}`;
    
    throw new Error(diagnosticMessage);
  }
}

/**
 * Fetch a full collection from Firestore.
 * If the collection is empty and initialData is provided, it will seed Firestore with initialData first.
 */
export async function getCollectionWithSeeding<T extends { id: string }>(
  collectionName: string,
  initialData: T[]
): Promise<T[]> {
  try {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    
    if (snapshot.empty) {
      if (initialData && initialData.length > 0) {
        console.log(`[Firebase] Seeding empty collection "${collectionName}"...`);
        await saveCollection(collectionName, initialData);
        return initialData;
      }
      return [];
    }
    
    const items: T[] = [];
    snapshot.forEach((docSnap) => {
      items.push({ id: docSnap.id, ...docSnap.data() } as T);
    });
    return items;
  } catch (error) {
    console.warn(`[Firebase] Error fetching collection "${collectionName}":`, error);
    return initialData; // Resilient fallback
  }
}

/**
 * Recursively removes all `undefined` values from an object or array so it can be safely written to Firestore.
 */
export function cleanUndefined<T>(obj: T): T {
  if (obj === undefined) {
    return null as any;
  }
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item)) as any;
  }
  const result: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const val = obj[key];
      if (val !== undefined) {
        result[key] = cleanUndefined(val);
      }
    }
  }
  return result;
}

/**
 * Fetch a single document from Firestore.
 * If not found and initialData is provided, it will seed it first.
 */
export async function getDocumentWithSeeding<T>(
  collectionName: string,
  docId: string,
  initialData: T
): Promise<T> {
  try {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      if (initialData) {
        console.log(`[Firebase] Seeding empty document "${collectionName}/${docId}"...`);
        const cleaned = cleanUndefined(initialData);
        await setDoc(docRef, cleaned as any);
        return initialData;
      }
      return null as any;
    }
    
    return docSnap.data() as T;
  } catch (error) {
    console.warn(`[Firebase] Error fetching document "${collectionName}/${docId}":`, error);
    return initialData; // Resilient fallback
  }
}

/**
 * Save a single document to Firestore
 */
export async function saveDocument(collectionName: string, docId: string, data: any): Promise<void> {
  try {
    const docRef = doc(db, collectionName, docId);
    const cleaned = cleanUndefined(data);
    await setDoc(docRef, cleaned, { merge: true });
  } catch (error) {
    console.error(`[Firebase] Error saving document "${collectionName}/${docId}":`, error);
    throw error;
  }
}

/**
 * Save a single order to Firestore with automatic retries and exponential backoff
 */
export async function saveSingleOrderToCloud(order: any, maxRetries = 5): Promise<void> {
  let attempt = 0;
  let delay = 500; // ms

  while (attempt < maxRetries) {
    try {
      console.log(`[Firestore Order Sync] Attempt ${attempt + 1} to save order ${order.id}...`);
      await saveDocument("orders", order.id, order);
      console.log(`[Firestore Order Sync] Order ${order.id} saved successfully!`);
      return;
    } catch (error) {
      attempt++;
      console.error(`[Firestore Order Sync] Attempt ${attempt} failed for order ${order.id}:`, error);
      if (attempt >= maxRetries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}

/**
 * Delete a single document from Firestore
 */
export async function deleteDocument(collectionName: string, docId: string): Promise<void> {
  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`[Firebase] Error deleting document "${collectionName}/${docId}":`, error);
    throw error;
  }
}

/**
 * Save an entire collection of items in batches (creates or overwrites)
 */
export async function saveCollection<T extends { id: string }>(
  collectionName: string,
  items: T[]
): Promise<void> {
  try {
    const batch = writeBatch(db);
    items.forEach((item) => {
      const { id, ...data } = item;
      const docRef = doc(db, collectionName, id);
      const cleaned = cleanUndefined(data);
      batch.set(docRef, cleaned, { merge: true });
    });
    await batch.commit();
  } catch (error) {
    console.error(`[Firebase] Error saving collection "${collectionName}":`, error);
    throw error;
  }
}
