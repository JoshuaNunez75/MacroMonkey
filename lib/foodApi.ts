const TOKEN_URL = "https://oauth.fatsecret.com/connect/token";
const SEARCH_URL = "https://platform.fatsecret.com/rest/foods/search/v1";

export type Food = {
  id: string;
  name: string;
  brand?: string;
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getAccessToken(): Promise<string> {
  if (cachedToken !== null && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const id = process.env.EXPO_PUBLIC_FATSECRET_CLIENT_ID;
  const secret = process.env.EXPO_PUBLIC_FATSECRET_CLIENT_SECRET;

  if (!id || !secret) {
    throw new Error("Missing FatSecret credentials - check your .env file.");
  }

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${id}:${secret}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=basic",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Token request failed (${response.status}): ${detail}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return data.access_token;
}

function toFood(raw: any): Food {
  const description: string = raw.food_description ?? "";

  const valueFor = (label: string) => {
    const match = description.match(new RegExp(label + ": ([0-9.]+)"));
    return match ? Number(match[1]) : 0;
  };

  const servingMatch = description.match(/^Per (.+?) - /);

  return {
    id: raw.food_id,
    name: raw.food_name,
    brand: raw.brand_name,
    serving: servingMatch ? servingMatch[1] : "1 serving",
    calories: valueFor("Calories"),
    protein: valueFor("Protein"),
    carbs: valueFor("Carbs"),
    fat: valueFor("Fat"),
  };
}

export async function searchFoods(query: string): Promise<Food[]> {
  const trimmed = query.trim();
  if (trimmed === "") {
    return [];
  }

  const token = await getAccessToken();

  const url =
    SEARCH_URL +
    "?search_expression=" + encodeURIComponent(trimmed) +
    "&format=json&max_results=20";

  const response = await fetch(url, {
    headers: { Authorization: "Bearer " + token },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Search failed (${response.status}): ${detail}`);
  }

  const data = await response.json();
  
  if (data?.error) {
    throw new Error(
      `FatSecret error ${data.error.code}: ${data.error.message}`
    );
  }

  const raw = data?.foods?.food;

  if (!raw) {
    return [];
  }

  const list = Array.isArray(raw) ? raw : [raw];
  return list.map(toFood);
}