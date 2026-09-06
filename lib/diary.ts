import AsyncStorage from "@react-native-async-storage/async-storage";
import { Serving } from "./foodApi";
import { MICRO_FIELDS } from "./nutrients";

export type LoggedEntry = {
    id: string;
    date: string; // "YYYY-MM-DD"
    loggedAt: string; // ISO timestamp
    foodId: string;
    name: string;
    brand?: string;
    serving: Serving;
    amount: number;
};

const KEY_PREFIX = "diary:";

export function dateKeyFor(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function todayKey(): string {
    return dateKeyFor(new Date());
}

export function dateFromKey(key: string): Date {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(year, month - 1, day);
}

export function shiftDateKey(key: string, days: number): string {
    const date = dateFromKey(key);
    date.setDate(date.getDate() + days);
    return dateKeyFor(date);
}

export function fullDateFor(key: string): string {
    return dateFromKey(key).toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
    });
}

export function dateLabelFor(key: string): string {
    const today = todayKey();
    if (key === today) {
        return "Today";
    }
    if (key === shiftDateKey(today, -1)) {
        return "Yesterday";
    }
    return fullDateFor(key);
}

export async function getEntries(date: string): Promise<LoggedEntry[]> {
    const raw = await AsyncStorage.getItem(KEY_PREFIX + date);
    if (!raw) {
        return [];
    }
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export async function addEntry(
    entry: Omit<LoggedEntry, "id" | "loggedAt">
): Promise<LoggedEntry> {
    const saved: LoggedEntry = {
        ...entry,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        loggedAt: new Date().toISOString(),
    };

    const existing = await getEntries(entry.date);
    await AsyncStorage.setItem(
        KEY_PREFIX + entry.date,
        JSON.stringify([...existing, saved])
    );

    return saved;
}

export async function deleteEntry(date: string, id: string): Promise<void> {
    const existing = await getEntries(date);
    await AsyncStorage.setItem(
        KEY_PREFIX + date,
        JSON.stringify(existing.filter((e) => e.id !== id))
    );
}

export function totalsFor(entries: LoggedEntry[]) {
    return entries.reduce(
        (sum, entry) => ({
            calories: sum.calories + entry.serving.calories * entry.amount,
            protein: sum.protein + entry.serving.protein * entry.amount,
            carbs: sum.carbs + entry.serving.carbs * entry.amount,
            fat: sum.fat + entry.serving.fat * entry.amount,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
}

export async function getEntry(
    date: string,
    id: string
): Promise<LoggedEntry | null> {
    const entries = await getEntries(date);
    return entries.find((entry) => entry.id === id) ?? null;
}

export async function updateEntry(
    date: string,
    id: string,
    changes: { serving: Serving; amount: number }
): Promise<void> {
    const entries = await getEntries(date);
    const updated = entries.map((entry) =>
        entry.id === id ? { ...entry, ...changes } : entry
    );
    await AsyncStorage.setItem(KEY_PREFIX + date, JSON.stringify(updated));
}

export type MicroTotal = {
    label: string;
    unit: string;
    value: number;
    reportedBy: number;
};

export function microTotalsFor(entries: LoggedEntry[]): MicroTotal[] {
    return MICRO_FIELDS.map((field) => {
        let value = 0;
        let reportedBy = 0;

        entries.forEach((entry) => {
            const perServing = field.get(entry.serving);
            if (perServing !== undefined) {
                value += perServing * entry.amount;
                reportedBy += 1;
            }
        });

        return { label: field.label, unit: field.unit, value, reportedBy };
    }).filter((row) => row.reportedBy > 0);
}