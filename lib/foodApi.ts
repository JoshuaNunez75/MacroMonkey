const TOKEN_URL = "https://oauth.fatsecret.com/connect/token";
const SEARCH_URL = "https://platform.fatsecret.com/rest/foods/search/v5";

export type Serving = {
    id: string;
    description: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
};

export type Food = {
    id: string;
    name: string;
    brand?: string;
    servings: Serving[];
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
        body: "grant_type=client_credentials&scope=premier",
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

function toServing(raw: any): Serving {
    return {
        id: raw.serving_id,
        description: raw.serving_description,
        calories: Number(raw.calories ?? 0),
        protein: Number(raw.protein ?? 0),
        carbs: Number(raw.carbohydrate ?? 0),
        fat: Number(raw.fat ?? 0),
    };
}

function toFood(raw: any): Food {
    const rawServings = raw?.servings?.serving;
    const list = Array.isArray(rawServings) ? rawServings : rawServings ? [rawServings] : [];

    const defaultFirst = [
        ...list.filter((s: any) => s.is_default === "1"),
        ...list.filter((s: any) => s.is_default !== "1"),
    ];

    return {
        id: raw.food_id,
        name: raw.food_name,
        brand: raw.brand_name,
        servings: defaultFirst.map(toServing),
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
        "&format=json&max_results=20&flag_default_serving=true";

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

    const raw = data?.foods_search?.results?.food;

    if (!raw) {
        return [];
    }

    const list = Array.isArray(raw) ? raw : [raw];
    return list.map(toFood).filter((food) => food.servings.length > 0);
}