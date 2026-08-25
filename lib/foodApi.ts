const TOKEN_URL = "https://oauth.fatsecret.com/connect/token";

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

export async function getAccessToken(): Promise<string> {
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