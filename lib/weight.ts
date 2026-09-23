import {
    collection,
    deleteDoc,
    doc,
    getDocs,
    limit,
    orderBy,
    query,
    setDoc,
    writeBatch,
} from "firebase/firestore";
import { shiftDateKey } from "./diary";
import { auth, db } from "./firebase";

export type WeightEntry = {
    date: string; // "YYYY-MM-DD" - also the document id
    weightLb: number;
    loggedAt: string; // ISO timestamp
};

function requireUid(): string {
    const uid = auth.currentUser?.uid;
    if (!uid) {
        throw new Error("Not signed in");
    }
    return uid;
}

function weightsCollection() {
    return collection(db, "users", requireUid(), "weights");
}

function weightDoc(date: string) {
    return doc(db, "users", requireUid(), "weights", date);
}

export async function getWeights(max = 180): Promise<WeightEntry[]> {
    const snapshot = await getDocs(
        query(weightsCollection(), orderBy("date", "desc"), limit(max))
    );

    return snapshot.docs.map((item) => item.data() as WeightEntry).reverse();
}

export async function saveWeight(date: string, weightLb: number): Promise<void> {
    await setDoc(weightDoc(date), {
        date,
        weightLb,
        loggedAt: new Date().toISOString(),
    });
}

export async function deleteWeight(date: string): Promise<void> {
    await deleteDoc(weightDoc(date));
}

export async function deleteAllWeights(): Promise<void> {
    const snapshot = await getDocs(weightsCollection());
    const items = snapshot.docs;

    for (let i = 0; i < items.length; i += 400) {
        const batch = writeBatch(db);
        items.slice(i, i + 400).forEach((item) => batch.delete(item.ref));
        await batch.commit();
    }
}

export function movingAverage(
    entries: WeightEntry[],
    days = 7
): (number | null)[] {
    return entries.map((entry, index) => {
        const startKey = shiftDateKey(entry.date, -(days - 1));
        let sum = 0;
        let count = 0;

        for (let i = index; i >= 0; i -= 1) {
            if (entries[i].date < startKey) {
                break;
            }
            sum += entries[i].weightLb;
            count += 1;
        }

        return count > 0 ? sum / count : null;
    });
}

export function summaryFor(entries: WeightEntry[], days = 7) {
    if (entries.length === 0) {
        return null;
    }

    const averages = movingAverage(entries, days);
    const latest = entries[entries.length - 1];
    const latestAverage = averages[averages.length - 1];
    const firstAverage = averages.find((value) => value !== null) ?? null;

    return {
        latest: latest.weightLb,
        latestDate: latest.date,
        average: latestAverage,
        change: latestAverage !== null && firstAverage !== null ? latestAverage - firstAverage : null,
    };
}