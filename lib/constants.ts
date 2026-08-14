// /lib/constants.ts
// Single source of truth for fixed lists used across the app
// (Mongoose schema enums, dropdowns, filters) — update here only.

export const CITIES = ["Jaipur", "Udaipur", "Ahmedabad", "Pune"] as const;
export type City = (typeof CITIES)[number];

// Add more shared lists here as you need them, e.g.:
// export const CATEGORIES = ["Pottery", "Painting", "Dance"] as const;