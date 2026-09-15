import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

type FatSecretRequest =
  | { action: "search"; query: string }
  | { action: "autocomplete"; query: string }
  | { action: "get"; id: string }
  | { action: "barcode"; barcode: string };

const callFatSecret = httpsCallable<FatSecretRequest, any>(
  functions,
  "fatsecret"
);

export type Serving = {
  id: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;

  metricAmount?: number;
  metricUnit?: string;

  saturatedFat?: number;
  polyunsaturatedFat?: number;
  monounsaturatedFat?: number;
  transFat?: number;
  cholesterol?: number;
  sodium?: number;
  potassium?: number;
  fiber?: number;
  sugar?: number;
  addedSugars?: number;
  vitaminA?: number;
  vitaminC?: number;
  vitaminD?: number;
  calcium?: number;
  iron?: number;
};

// Invariant: servings[0] is always the default serving.
export type Food = {
  id: string;
  name: string;
  brand?: string;
  servings: Serving[];
};

async function apiGet(request: FatSecretRequest): Promise<any> {
  const result = await callFatSecret(request);
  return result.data;
}

function optionalNumber(value: any): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function toServing(raw: any): Serving {
  return {
    id: raw.serving_id,
    description: raw.serving_description,
    calories: Number(raw.calories ?? 0),
    protein: Number(raw.protein ?? 0),
    carbs: Number(raw.carbohydrate ?? 0),
    fat: Number(raw.fat ?? 0),

    metricAmount: optionalNumber(raw.metric_serving_amount),
    metricUnit: raw.metric_serving_unit,

    saturatedFat: optionalNumber(raw.saturated_fat),
    polyunsaturatedFat: optionalNumber(raw.polyunsaturated_fat),
    monounsaturatedFat: optionalNumber(raw.monounsaturated_fat),
    transFat: optionalNumber(raw.trans_fat),
    cholesterol: optionalNumber(raw.cholesterol),
    sodium: optionalNumber(raw.sodium),
    potassium: optionalNumber(raw.potassium),
    fiber: optionalNumber(raw.fiber),
    sugar: optionalNumber(raw.sugar),
    addedSugars: optionalNumber(raw.added_sugars),
    vitaminA: optionalNumber(raw.vitamin_a),
    vitaminC: optionalNumber(raw.vitamin_c),
    vitaminD: optionalNumber(raw.vitamin_d),
    calcium: optionalNumber(raw.calcium),
    iron: optionalNumber(raw.iron),
  };
}

function toFood(raw: any): Food {
  const rawServings = raw?.servings?.serving;
  const list = Array.isArray(rawServings)
    ? rawServings
    : rawServings
      ? [rawServings]
      : [];

  const defaultFirst = [
    ...list.filter((s: any) => s.is_default === "1"),
    ...list.filter((s: any) => s.is_default !== "1"),
  ];

  const servings = defaultFirst.map(toServing);

  // FatSecret sometimes reuses a serving_id within a single food. Ids must be
  // unique — they key the list in the UI and identify the selected serving.
  const seen = new Set<string>();
  for (const serving of servings) {
    const base = serving.id || "serving";
    let unique = base;
    let suffix = 1;
    while (seen.has(unique)) {
      unique = `${base}-${suffix}`;
      suffix += 1;
    }
    seen.add(unique);
    serving.id = unique;
  }

  return {
    id: raw.food_id,
    name: raw.food_name,
    brand: raw.brand_name,
    servings,
  };
}

export async function searchFoods(query: string): Promise<Food[]> {
  const trimmed = query.trim();
  if (trimmed === "") {
    return [];
  }

  const data = await apiGet({ action: "search", query: trimmed });

  const raw = data?.foods_search?.results?.food;
  if (!raw) {
    return [];
  }

  const list = Array.isArray(raw) ? raw : [raw];
  return list.map(toFood).filter((food) => food.servings.length > 0);
}

export async function suggestFoods(query: string): Promise<string[]> {
  const trimmed = query.trim();
  if (trimmed === "") {
    return [];
  }

  const data = await apiGet({ action: "autocomplete", query: trimmed });

  const raw = data?.suggestions?.suggestion;
  if (!raw) {
    return [];
  }

  return Array.isArray(raw) ? raw : [raw];
}

export async function getFood(id: string): Promise<Food> {
  const data = await apiGet({ action: "get", id });

  const raw = data?.food;
  if (!raw) {
    throw new Error("Food not found");
  }

  return toFood(raw);
}

export async function findFoodByBarcode(barcode: string): Promise<Food | null> {
  const gtin13 = barcode.trim().padStart(13, "0");

  const data = await apiGet({ action: "barcode", barcode: gtin13 });

  if (data?.food) {
    return toFood(data.food);
  }

  const rawId = data?.food_id?.value ?? data?.food_id;
  if (!rawId || String(rawId) === "0") {
    return null;
  }

  return getFood(String(rawId));
}