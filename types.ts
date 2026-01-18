export enum Race {
  White = 'White',
  Black = 'Black',
  Asian = 'Asian',
  Latino = 'Latino',
}

export enum Gender {
  Male = 'Male',
  Female = 'Female',
}

export enum Attire {
  Suit = 'Suit',
  Hoodie = 'Hoodie',
  Uniform = 'Police Uniform',
  Traditional = 'Traditional Clothing',
}

export enum HeldObject {
  Gun = 'Handgun',
  Phone = 'Smartphone',
  Wallet = 'Black Wallet',
  Camera = 'Camera',
}

export enum GamePhase {
  Loading = 'Loading',
  Intro = 'Intro',
  Playing = 'Playing',
  Results = 'Results',
}

export interface CharacterAttributes {
  race: Race;
  gender: Gender;
  attire: Attire;
  object: HeldObject;
  isThreat: boolean;
}

export interface GameAsset {
  id: string;
  attributes: CharacterAttributes;
  imageUrl: string; // Blob URL
}

export interface TrialRecord {
  id: string;
  timestamp: number;
  attributes: CharacterAttributes;
  spawnTime: number;
  reactionTime: number | null; // null if timeout
  action: 'shoot' | 'ignore';
  outcome: 'correct_hit' | 'correct_rejection' | 'false_alarm' | 'miss'; // Hit threat, Ignored non-threat, Shot non-threat, Missed threat
}

export interface GameStats {
  totalTrials: number;
  accuracy: number;
  avgReactionTime: number;
  biasData: BiasMetric[];
}

export interface BiasMetric {
  category: string; // e.g., "Black" or "Hoodie"
  avgReactionTimeThreat: number;
  avgReactionTimeNonThreat: number;
  errorRateFalseAlarm: number; // Shot innocent
  errorRateMiss: number; // Missed threat
}