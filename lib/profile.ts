import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "profile";

export const CALORIES_PER_GRAM = {
    protein: 4,
    carbs: 4,
    fat: 9,
};

export type Sex = "male" | "female";

export type ActivityKey =
    | "sedentary"
    | "light"
    | "moderate"
    | "active"
    | "veryActive";

export const ACTIVITY_LEVELS: {
    key: ActivityKey;
    label: string;
    multiplier: number;
}[] = [
        { key: "sedentary", label: "Sedentary", multiplier: 1.2 },
        { key: "light", label: "Light", multiplier: 1.375 },
        { key: "moderate", label: "Moderate", multiplier: 1.55 },
        { key: "active", label: "Active", multiplier: 1.725 },
        { key: "veryActive", label: "Very active", multiplier: 1.9 },
    ];

export type Profile = {
    calorieGoal: number;
    proteinPercent: number;
    carbsPercent: number;
    fatPercent: number;

    sex: Sex;
    age: number;
    heightIn: number;
    weightLb: number;
    activity: ActivityKey;
    weeklyChangeLb: number;
};

export const DEFAULT_PROFILE: Profile = {
    calorieGoal: 2000,
    proteinPercent: 30,
    carbsPercent: 40,
    fatPercent: 30,

    sex: "male",
    age: 21,
    heightIn: 70,
    weightLb: 170,
    activity: "moderate",
    weeklyChangeLb: 0,
};

export async function loadProfile(): Promise<Profile> {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) {
        return DEFAULT_PROFILE;
    }
    try {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_PROFILE, ...parsed };
    } catch {
        return DEFAULT_PROFILE;
    }
}

export async function saveProfile(profile: Profile): Promise<void> {
    await AsyncStorage.setItem(KEY, JSON.stringify(profile));
}

export function macroGrams(profile: Profile) {
    return {
        protein:
            (profile.calorieGoal * profile.proteinPercent) /
            100 /
            CALORIES_PER_GRAM.protein,
        carbs:
            (profile.calorieGoal * profile.carbsPercent) /
            100 /
            CALORIES_PER_GRAM.carbs,
        fat: (profile.calorieGoal * profile.fatPercent) / 100 / CALORIES_PER_GRAM.fat,
    };
}

const LB_TO_KG = 0.45359237;
const IN_TO_CM = 2.54;
const CALORIES_PER_LB = 3500;
const MINIMUM_CALORIES = 1200;

export function bmrFor(profile: Profile): number {
    const kg = profile.weightLb * LB_TO_KG;
    const cm = profile.heightIn * IN_TO_CM;
    const base = 10 * kg + 6.25 * cm - 5 * profile.age;
    return profile.sex === "male" ? base + 5 : base - 161;
}

export function maintenanceFor(profile: Profile): number {
    const level = ACTIVITY_LEVELS.find((l) => l.key === profile.activity);
    return bmrFor(profile) * (level ? level.multiplier : 1.2);
}

export function suggestedCalories(profile: Profile): number {
    const dailyAdjustment = (profile.weeklyChangeLb * CALORIES_PER_LB) / 7;
    return Math.max(
        MINIMUM_CALORIES,
        Math.round(maintenanceFor(profile) - dailyAdjustment)
    );
}