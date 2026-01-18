import { GoogleGenAI } from "@google/genai";
import { Attire, CharacterAttributes, GameAsset, Gender, HeldObject, Race } from "../types";
import { RACES, GENDERS, ATTIRES, THREAT_OBJECTS, NON_THREAT_OBJECTS } from "../constants";

// --- IndexedDB Helpers for Persistent Storage ---

const DB_NAME = 'BiasLabAssetsDB';
const DB_VERSION = 1;
const STORE_NAME = 'assets';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveAssetsToDB = async (assets: GameAssetBase64[]) => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  assets.forEach(asset => store.put(asset));
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const loadAssetsFromDB = async (): Promise<GameAssetBase64[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

// Interface for storage (saving base64 strings, not Blob URLs)
interface GameAssetBase64 {
  id: string;
  attributes: CharacterAttributes;
  base64: string;
  mimeType: string;
}

// Helper to convert base64 to blob URL
const base64ToBlobUrl = (base64: string, mimeType: string = 'image/png'): string => {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  return URL.createObjectURL(blob);
};

export const generateGameAssets = async (
  onProgress: (current: number, total: number, message: string) => void
): Promise<GameAsset[]> => {
  
  // 1. Try to load from Cache first
  try {
    const cachedData = await loadAssetsFromDB();
    if (cachedData.length > 0) {
      onProgress(cachedData.length, cachedData.length, "Loading assets from cache...");
      // Convert stored Base64 to Blob URLs for the game
      return cachedData.map(item => ({
        id: item.id,
        attributes: item.attributes,
        imageUrl: base64ToBlobUrl(item.base64, item.mimeType)
      }));
    }
  } catch (e) {
    console.warn("Could not load from cache, generating new assets.", e);
  }

  // 2. If no cache, Generate new ones
  if (!process.env.API_KEY) {
    console.error("API Key missing");
    throw new Error("API Key missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const newAssetsBase64: GameAssetBase64[] = [];
  
  // Generation Plan: 4 Races * 2 Conditions * 2 Variations = 16 Images
  const generationPlan: CharacterAttributes[] = [];

  RACES.forEach(race => {
    // 1. Threat Variation (Gun)
    generationPlan.push({
      race,
      gender: GENDERS[Math.floor(Math.random() * GENDERS.length)],
      attire: ATTIRES[Math.floor(Math.random() * ATTIRES.length)],
      object: HeldObject.Gun,
      isThreat: true
    });
    // 2. Threat Variation (Gun) - Variation 2
    generationPlan.push({
      race,
      gender: GENDERS[Math.floor(Math.random() * GENDERS.length)],
      attire: ATTIRES[Math.floor(Math.random() * ATTIRES.length)],
      object: HeldObject.Gun,
      isThreat: true
    });

    // 3. Non-Threat Variation (Phone)
    generationPlan.push({
      race,
      gender: GENDERS[Math.floor(Math.random() * GENDERS.length)],
      attire: ATTIRES[Math.floor(Math.random() * ATTIRES.length)],
      object: HeldObject.Phone,
      isThreat: false
    });
    // 4. Non-Threat Variation (Wallet)
    generationPlan.push({
      race,
      gender: GENDERS[Math.floor(Math.random() * GENDERS.length)],
      attire: ATTIRES[Math.floor(Math.random() * ATTIRES.length)],
      object: HeldObject.Wallet,
      isThreat: false
    });
  });

  const TOTAL_ASSETS = generationPlan.length;

  for (let i = 0; i < TOTAL_ASSETS; i++) {
    const attr = generationPlan[i];
    onProgress(i, TOTAL_ASSETS, `Generating ${attr.race} character (${attr.object})...`);

    try {
      const prompt = `
        A realistic medium-shot photo of a single ${attr.race} ${attr.gender} person standing in a sunny outdoor park.
        Background: A blurred green grass field with soft sunlight. Natural outdoor lighting.
        The person is wearing ${attr.attire}.
        They are holding a ${attr.object} clearly in their hand, raised slightly near chest level.
        The person is facing forward looking at the camera.
        High quality, photorealistic, cinematic.
        Ensure the ${attr.object} is clearly visible and distinguishable.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }]
        },
      });
      
      const parts = response.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
           if (part.inlineData) {
               // Store the Raw Base64
               newAssetsBase64.push({
                   id: `gen_${i}_${Date.now()}`,
                   attributes: attr,
                   base64: part.inlineData.data,
                   mimeType: part.inlineData.mimeType || 'image/png'
               });
               break;
           }
        }
      }
      
    } catch (err) {
      console.error("Asset generation error:", err);
    }
  }

  // 3. Save to Cache
  if (newAssetsBase64.length > 0) {
      onProgress(TOTAL_ASSETS, TOTAL_ASSETS, "Saving assets to local storage...");
      await saveAssetsToDB(newAssetsBase64);
  }

  // 4. Return formatted assets
  return newAssetsBase64.map(item => ({
    id: item.id,
    attributes: item.attributes,
    imageUrl: base64ToBlobUrl(item.base64, item.mimeType)
  }));
};