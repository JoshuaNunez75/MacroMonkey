import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    updateDoc,
    where,
    writeBatch,
} from "firebase/firestore";
import { auth, db } from "./firebase";
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

function requireUid(): string {
    const uid = auth.currentUser?.uid;
    if (!uid) {
        throw new Error("Not signed in");
    }
    return uid;
}

function entriesCollection() {
    return collection(db, "users", requireUid(), "entries");
}

function entryDoc(id: string) {
    return doc(db, "users", requireUid(), "entries", id);
}

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

export function isRelativeDate(key: string): boolean {
    const today = todayKey();
    return key === today || key === shiftDateKey(today, -1);
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
];

export function dateLabelFor(key: string): string {
    const today = todayKey();
    if (key === today) {
        return "Today";
    }
    if (key === shiftDateKey(today, -1)) {
        return "Yesterday";
    }

    const date = dateFromKey(key);
    return `${WEEKDAYS[date.getDay()]}. ${MONTHS[date.getMonth()]}. ${date.getDate()}`;
}

export async function getEntries(date: string): Promise<LoggedEntry[]> {
    const snapshot = await getDocs(
        query(entriesCollection(), where("date", "==", date))
    );

    const entries = snapshot.docs.map(
        (item) => ({ id: item.id, ...item.data() }) as LoggedEntry
    );

    return entries.sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
}

export async function addEntry(
    entry: Omit<LoggedEntry, "id" | "loggedAt">
): Promise<LoggedEntry> {
    const loggedAt = new Date().toISOString();
    const reference = await addDoc(entriesCollection(), { ...entry, loggedAt });

    return { ...entry, id: reference.id, loggedAt };
}

export async function deleteEntry(date: string, id: string): Promise<void> {
    await deleteDoc(entryDoc(id));
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
    const snapshot = await getDoc(entryDoc(id));

    if (!snapshot.exists()) {
        return null;
    }

    return { id: snapshot.id, ...snapshot.data() } as LoggedEntry;
}

export async function updateEntry(
    date: string,
    id: string,
    changes: { serving: Serving; amount: number }
): Promise<void> {
    await updateDoc(entryDoc(id), changes);
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

export function weekStartFor(key: string): string {
    return shiftDateKey(key, -dateFromKey(key).getDay());
}

export function weekDaysFor(key: string): string[] {
    const start = weekStartFor(key);
    return [0, 1, 2, 3, 4, 5, 6].map((offset) => shiftDateKey(start, offset));
}

export function weekdayLetterFor(key: string): string {
    return WEEKDAYS[dateFromKey(key).getDay()][0];
}

export function dayOfMonthFor(key: string): number {
    return dateFromKey(key).getDate();
}

export async function daysWithEntries(keys: string[]): Promise<string[]> {
    if (keys.length === 0) {
        return [];
    }

    const sorted = [...keys].sort();
    const snapshot = await getDocs(
        query(
            entriesCollection(),
            where("date", ">=", sorted[0]),
            where("date", "<=", sorted[sorted.length - 1])
        )
    );

    const found = new Set<string>();
    snapshot.forEach((item) => found.add(item.data().date as string));

    return keys.filter((key) => found.has(key));
}

export async function deleteAllEntries(): Promise<void> {
    const snapshot = await getDocs(entriesCollection());
    const items = snapshot.docs;

    for (let i = 0; i < items.length; i += 400) {
        const batch = writeBatch(db);
        items.slice(i, i + 400).forEach((item) => batch.delete(item.ref));
        await batch.commit();
    }
}