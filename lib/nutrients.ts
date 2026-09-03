import { Serving } from "./foodApi";

export type NutrientField = {
    label: string;
    unit: string;
    get: (s: Serving) => number | undefined;
};

export const MICRO_FIELDS: NutrientField[] = [
    { label: "Saturated fat", unit: "g", get: (s) => s.saturatedFat },
    { label: "Polyunsaturated fat", unit: "g", get: (s) => s.polyunsaturatedFat },
    { label: "Monounsaturated fat", unit: "g", get: (s) => s.monounsaturatedFat },
    { label: "Trans fat", unit: "g", get: (s) => s.transFat },
    { label: "Fiber", unit: "g", get: (s) => s.fiber },
    { label: "Sugar", unit: "g", get: (s) => s.sugar },
    { label: "Added sugars", unit: "g", get: (s) => s.addedSugars },
    { label: "Cholesterol", unit: "mg", get: (s) => s.cholesterol },
    { label: "Sodium", unit: "mg", get: (s) => s.sodium },
    { label: "Potassium", unit: "mg", get: (s) => s.potassium },
    { label: "Calcium", unit: "mg", get: (s) => s.calcium },
    { label: "Iron", unit: "mg", get: (s) => s.iron },
    { label: "Vitamin A", unit: "mcg", get: (s) => s.vitaminA },
    { label: "Vitamin C", unit: "mg", get: (s) => s.vitaminC },
    { label: "Vitamin D", unit: "mcg", get: (s) => s.vitaminD },
];