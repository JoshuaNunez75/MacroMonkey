import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";

const FATSECRET_CLIENT_ID = defineSecret("FATSECRET_CLIENT_ID");
const FATSECRET_CLIENT_SECRET = defineSecret("FATSECRET_CLIENT_SECRET");

const TOKEN_URL = "https://oauth.fatsecret.com/connect/token";
const SEARCH_URL = "https://platform.fatsecret.com/rest/foods/search/v5";
const AUTOCOMPLETE_URL =
    "https://platform.fatsecret.com/rest/food/autocomplete/v2";
const FOOD_URL = "https://platform.fatsecret.com/rest/food/v5";
const BARCODE_URL =
    "https://platform.fatsecret.com/rest/food/barcode/find-by-id/v2";

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getAccessToken(): Promise<string> {
    if (cachedToken !== null && Date.now() < tokenExpiresAt) {
        return cachedToken;
    }

    const id = FATSECRET_CLIENT_ID.value();
    const secret = FATSECRET_CLIENT_SECRET.value();
    const basic = Buffer.from(`${id}:${secret}`).toString("base64");

    const response = await fetch(TOKEN_URL, {
        method: "POST",
        headers: {
            Authorization: "Basic " + basic,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials&scope=premier%20barcode",
    });

    if (!response.ok) {
        logger.error("Token request failed", {
            status: response.status,
            detail: await response.text(),
        });
        throw new HttpsError("internal", "Could not reach the food database.");
    }

    const data = (await response.json()) as {
        access_token: string;
        expires_in: number;
    };

    cachedToken = data.access_token;
    tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
    return data.access_token;
}

async function apiGet(url: string): Promise<unknown> {
    const token = await getAccessToken();

    const response = await fetch(url, {
        headers: { Authorization: "Bearer " + token },
    });

    if (!response.ok) {
        logger.error("FatSecret request failed", { status: response.status });
        throw new HttpsError("internal", "The food database is unavailable.");
    }

    const data = (await response.json()) as {
        error?: { code: number; message: string };
    };

    if (data.error) {
        logger.error("FatSecret returned an error", { error: data.error });
        throw new HttpsError(
            "internal",
            `The food database returned an error (${data.error.code}).`
        );
    }

    return data;
}

type FatSecretRequest =
    | { action: "search"; query: string }
    | { action: "autocomplete"; query: string }
    | { action: "get"; id: string }
    | { action: "barcode"; barcode: string };

export const fatsecret = onCall(
    {
        region: "us-central1",
        memory: "256MiB",
        maxInstances: 10,
        secrets: [FATSECRET_CLIENT_ID, FATSECRET_CLIENT_SECRET],
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "Sign in to look up foods.");
        }

        const body = request.data as FatSecretRequest;

        switch (body?.action) {
            case "search": {
                const query = String(body.query ?? "").trim().slice(0, 100);
                if (query === "") {
                    throw new HttpsError("invalid-argument", "Empty search.");
                }
                return apiGet(
                    SEARCH_URL +
                    "?search_expression=" + encodeURIComponent(query) +
                    "&format=json&max_results=20&flag_default_serving=true"
                );
            }

            case "autocomplete": {
                const query = String(body.query ?? "").trim().slice(0, 100);
                if (query === "") {
                    throw new HttpsError("invalid-argument", "Empty search.");
                }
                return apiGet(
                    AUTOCOMPLETE_URL +
                    "?expression=" + encodeURIComponent(query) +
                    "&format=json&max_results=6"
                );
            }

            case "get": {
                const id = String(body.id ?? "").replace(/\D/g, "");
                if (id === "") {
                    throw new HttpsError("invalid-argument", "Bad food id.");
                }
                return apiGet(
                    FOOD_URL +
                    "?food_id=" + encodeURIComponent(id) +
                    "&format=json&flag_default_serving=true"
                );
            }

            case "barcode": {
                const barcode = String(body.barcode ?? "").replace(/\D/g, "");
                if (barcode === "" || barcode.length > 13) {
                    throw new HttpsError("invalid-argument", "Bad barcode.");
                }
                return apiGet(
                    BARCODE_URL +
                    "?barcode=" + encodeURIComponent(barcode.padStart(13, "0")) +
                    "&format=json"
                );
            }

            default:
                throw new HttpsError("invalid-argument", "Unknown action.");
        }
    }
);