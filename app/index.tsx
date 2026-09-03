import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../lib/colors";
import {
  deleteEntry,
  getEntries,
  LoggedEntry,
  todayKey,
  totalsFor,
} from "../lib/diary";
import { formatGrams } from "../lib/format";
import { goals } from "../lib/goals";

export default function Index() {
  const router = useRouter();
  const [entries, setEntries] = useState<LoggedEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function load() {
        const list = await getEntries(todayKey());
        if (!cancelled) {
          setEntries(list);
        }
      }

      load();

      return () => {
        cancelled = true;
      };
    }, [])
  );

  async function remove(id: string) {
    await deleteEntry(todayKey(), id);
    setEntries(await getEntries(todayKey()));
  }

  const totals = totalsFor(entries);
  const remaining = Math.max(0, goals.calories - totals.calories);

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Today</Text>
        <Text style={styles.date}>{dateLabel}</Text>

        <View style={styles.card}>
          <Text style={styles.calorieNumber}>{Math.round(totals.calories)}</Text>
          <Text style={styles.calorieGoal}>
            of {goals.calories.toLocaleString()} cal
          </Text>
          <Text style={styles.calorieRemaining}>
            {Math.round(remaining).toLocaleString()} remaining
          </Text>

          <View style={styles.macroRow}>
            <View style={styles.macro}>
              <Text style={[styles.macroValue, { color: colors.protein }]}>
                {formatGrams(totals.protein)}g
              </Text>
              <Text style={styles.macroLabel}>Protein</Text>
              <Text style={styles.macroGoal}>of {goals.protein}g</Text>
            </View>
            <View style={styles.macro}>
              <Text style={[styles.macroValue, { color: colors.carbs }]}>
                {formatGrams(totals.carbs)}g
              </Text>
              <Text style={styles.macroLabel}>Carbs</Text>
              <Text style={styles.macroGoal}>of {goals.carbs}g</Text>
            </View>
            <View style={styles.macro}>
              <Text style={[styles.macroValue, { color: colors.fat }]}>
                {formatGrams(totals.fat)}g
              </Text>
              <Text style={styles.macroLabel}>Fat</Text>
              <Text style={styles.macroGoal}>of {goals.fat}g</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Meals</Text>

        {entries.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Nothing logged yet</Text>
            <Text style={styles.emptySub}>
              Food you add today will show up here
            </Text>
          </View>
        ) : (
          <View style={styles.entryList}>
            {entries.map((entry) => (
              <View key={entry.id} style={styles.entry}>
                <View style={styles.entryMain}>
                  <Text style={styles.entryName} numberOfLines={1}>
                    {entry.name}
                  </Text>
                  <Text style={styles.entryServing} numberOfLines={1}>
                    {formatGrams(entry.amount)} × {entry.serving.description}
                  </Text>
                </View>
                <Text style={styles.entryCalories}>
                  {Math.round(entry.serving.calories * entry.amount)}
                </Text>
                <Pressable
                  onPress={() => remove(entry.id)}
                  hitSlop={10}
                  style={styles.entryDelete}
                >
                  <Text style={styles.entryDeleteText}>✕</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <Pressable style={styles.addButton} onPress={() => router.push("/search")}>
          <Text style={styles.addButtonText}>+ Add food</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 48,
  },
  title: {
    fontSize: 34,
    fontWeight: "700",
    color: colors.text,
    marginTop: 12,
  },
  date: {
    fontSize: 15,
    color: colors.muted,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    marginTop: 24,
    alignItems: "center",
  },
  calorieNumber: {
    fontSize: 56,
    fontWeight: "700",
    color: colors.calories,
  },
  calorieGoal: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 2,
  },
  calorieRemaining: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 8,
  },
  macroRow: {
    flexDirection: "row",
    marginTop: 24,
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 20,
  },
  macro: {
    flex: 1,
    alignItems: "center",
  },
  macroValue: {
    fontSize: 20,
    fontWeight: "600",
  },
  macroLabel: {
    fontSize: 13,
    color: colors.text,
    marginTop: 4,
  },
  macroGoal: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
    marginTop: 32,
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.text,
  },
  emptySub: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 4,
    textAlign: "center",
  },
  entryList: {
    gap: 10,
  },
  entry: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  entryMain: {
    flex: 1,
  },
  entryName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  entryServing: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  entryCalories: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.calories,
  },
  entryDelete: {
    paddingLeft: 4,
  },
  entryDeleteText: {
    fontSize: 15,
    color: colors.muted,
  },
  addButton: {
    backgroundColor: colors.calories,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
  },
  addButtonText: {
    color: colors.bg,
    fontSize: 15,
    fontWeight: "600",
  },
});