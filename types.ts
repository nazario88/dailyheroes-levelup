export interface Stats {
  intelligence: number;
  sport: number;
  wellbeing: number;
  health: number;
  social: number;
}

export interface PlayerState {
  name: string;
  stats: Stats;
  energy: number;      // Current energy for the day (0-100)
  maxEnergy: number;   // Max energy (can increase with fitness)
  money: number;       // Abstract resource for some actions
  day: number;
  
  // Status Flags
  hasAddiction: boolean; 
  addictionRecoveryProgress: number; // 0 to 3. Needs 3 to be cured.
  injuredUntilDay: number | null; // If set, cannot do sport until this day
  motivation: 'low' | 'normal' | 'high'; 
  
  // Logic Trackers
  daysSinceLastSocial: number; // Increases every day, reset on social action

  // Daily Trackers (reset each day)
  actionsPerformedToday: number;
  sportActionsToday: number;
  ateHealthyToday: boolean;
  ateJunkToday: boolean;
  
  // Meta
  gameWon: boolean;
}

export interface GameLogEntry {
  id: string;
  day: number;
  text: string;
  type: 'info' | 'success' | 'warning' | 'danger';
}

export interface GameAction {
  id: string;
  label: string;
  category: 'work' | 'sport' | 'wellbeing' | 'social' | 'health';
  energyCost: number;
  description: string;
  // Conditions to see/use the button
  requires?: (state: PlayerState) => boolean;
  disabled?: (state: PlayerState) => string | boolean; // returns reason string if disabled
}

export const INITIAL_STATS: Stats = {
  intelligence: 20,
  sport: 10,
  wellbeing: 10,
  health: 10,
  social: 40,
};

export const OBJECTIVES = [
  { id: 1, text: "Atteindre 20% de Santé", check: (s: Stats) => s.health >= 20 },
  { id: 2, text: "Atteindre 50% de Sport", check: (s: Stats) => s.sport >= 50 },
  { id: 3, text: "Atteindre 50% d'Intelligence", check: (s: Stats) => s.intelligence >= 50 },
  { id: 4, text: "Devenir la meilleure version de soi-même (Tout à 100%)", check: (s: Stats) => Object.values(s).every(v => v >= 100) },
];