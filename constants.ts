import { Attire, Gender, HeldObject, Race } from "./types";

export const GAME_DURATION_MS = 60000; // 60 seconds
export const SPAWN_INTERVAL_MS = 1200; // Base spawn rate
export const VISIBILITY_DURATION_MS = 900; // How long a target stays up

export const THREAT_OBJECTS = [HeldObject.Gun];
export const NON_THREAT_OBJECTS = [HeldObject.Phone, HeldObject.Wallet, HeldObject.Camera];

export const RACES = [Race.White, Race.Black, Race.Asian, Race.Latino];
export const GENDERS = [Gender.Male, Gender.Female];
export const ATTIRES = [Attire.Suit, Attire.Hoodie, Attire.Uniform, Attire.Traditional];

// Visual Mappings for the MVP (Simulating GenAI assets)
// Updated for Monochrome/Paper Aesthetic
export const RACE_COLORS: Record<Race, string> = {
  [Race.White]: '#e5e5e5',
  [Race.Black]: '#262626',
  [Race.Asian]: '#a3a3a3',
  [Race.Latino]: '#737373',
};

export const ATTIRE_STYLES: Record<Attire, string> = {
  [Attire.Suit]: 'bg-neutral-800 border-b-4 border-black',
  [Attire.Hoodie]: 'bg-neutral-500 rounded-t-3xl',
  [Attire.Uniform]: 'bg-neutral-700 border-2 border-neutral-400',
  [Attire.Traditional]: 'bg-neutral-600 pattern-dots',
};

export const OBJECT_ICONS: Record<HeldObject, string> = {
  [HeldObject.Gun]: '🔫',
  [HeldObject.Phone]: '📱',
  [HeldObject.Wallet]: '👝',
  [HeldObject.Camera]: '📷',
};