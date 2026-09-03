import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "profile";

export const CALORIES_PER_GRAM = {
  protein: 4,
  carbs: 4,
  fat: 9,
};

export type Profile = {
  calorieGoal: number;
  proteinPercent: number;
  carbsPercent: number;
  fatPercent: number;
};

export const DEFAULT_PROFILE: Profile = {
  calorieGoal: 2000,
  proteinPercent: 30,
  carbsPercent: 40,
  fatPercent: 30,
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