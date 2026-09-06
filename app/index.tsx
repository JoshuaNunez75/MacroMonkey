import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ring } from "../components/Ring";
import { colors } from "../lib/colors";
import {
  deleteEntry,
  getEntries,
  LoggedEntry,
  microTotalsFor,
  todayKey,
  totalsFor,
} from "../lib/diary";
import { formatGrams } from "../lib/format";
import {
  DEFAULT_PROFILE,
  loadProfile,
  macroGrams,
  Profile,
} from "../lib/profile";

function MacroRing({
  label,
  value,
  goal,
  color,
}: {
  label: string;
  value: number;
  goal: number;
  color: string;
}) {
  const progress = goal > 0 ? value / goal : 0;

  return (
    <View style={styles.macro}>
      <Ring
        size={66}
        strokeWidth={7}
        progress={progress}
        color={progress > 1 ? colors.text : color}
        trackColor={colors.border}
      >
        <Text style={[styles.macroPercent, { color }]}>
          {Math.round(progress * 100)}%
        </Text>
      </Ring>
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={styles.macroValue}>
        {formatGrams(value)} / {Math.round(goal)}g
      </Text>
    </View>
  );
}

export default function Index() {
  const router = useRouter();
  const [entries, setEntries] = useState<LoggedEntry[]>([]);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [showMicros, setShowMicros] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function load() {
        const [list, savedProfile] = await Promise.all([
          getEntries(todayKey()),
          loadProfile(),
        ]);
        if (!cancelled) {
          setEntries(list);
          setProfile(savedProfile);
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
  const microTotals = microTotalsFor(entries);
  const targets = macroGrams(profile);
  const remaining = Math.max(0, profile.calorieGoal - totals.calories);
  const calorieProgress =
    profile.calorieGoal > 0 ? totals.calories / profile.calorieGoal : 0;
  const calorieColor =
    calorieProgress > 1 ? colors.protein : colors.calories;

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
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Today</Text>
            <Text style={styles.date}>{dateLabel}</Text>
          </View>
          <Pressable onPress={() => router.push("/settings")} hitSlop={10}>
            <Text style={styles.settingsLink}>Goals</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Ring
            size={188}
            strokeWidth={15}
            progress={calorieProgress}
            color={calorieColor}
            trackColor={colors.border}
          >
            <Text style={[styles.calorieNumber, { color: calorieColor }]}>
              {Math.round(totals.calories).toLocaleString()}
            </Text>
            <Text style={styles.calorieGoal}>
              of {profile.calorieGoal.toLocaleString()}
            </Text>
          </Ring>

          <Text style={styles.calorieRemaining}>
            {calorieProgress > 1 ? `${Math.round(totals.calories - profile.calorieGoal).toLocaleString()} over goal`
              : `${Math.round(remaining).toLocaleString()} remaining`}
          </Text>

          <View style={styles.macroRow}>
            <MacroRing
              label="Protein"
              value={totals.protein}
              goal={targets.protein}
              color={colors.protein}
            />
            <MacroRing
              label="Carbs"
              value={totals.carbs}
              goal={targets.carbs}
              color={colors.carbs}
            />
            <MacroRing
              label="Fat"
              value={totals.fat}
              goal={targets.fat}
              color={colors.fat}
            />
          </View>
        </View>

        {entries.length > 0 ? (
          <>
            <Pressable
              style={styles.microsHeader}
              onPress={() => setShowMicros(!showMicros)}
            >
              <Text style={styles.microsTitle}>Nutrition details</Text>
              <Text style={styles.microsToggle}>
                {showMicros ? "Hide" : "Show"}
              </Text>
            </Pressable>

            {showMicros ? (
              microTotals.length === 0 ? (
                <Text style={styles.microsEmpty}>
                  No detail data for today&apos;s foods
                </Text>
              ) : (
                <View style={styles.microsBody}>
                  {microTotals.map((row) => (
                    <View key={row.label} style={styles.microRow}>
                      <View style={styles.microLabelBlock}>
                        <Text style={styles.microLabel}>{row.label}</Text>
                        {row.reportedBy < entries.length ? (
                          <Text style={styles.microPartial}>
                            from {row.reportedBy} of {entries.length} items
                          </Text>
                        ) : null}
                      </View>
                      <Text style={styles.microValue}>
                        {formatGrams(row.value)} {row.unit}
                      </Text>
                    </View>
                  ))}
                </View>
              )
            ) : null}
          </>
        ) : null}

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
              <Pressable
                key={entry.id}
                style={styles.entry}
                onPress={() =>
                  router.push(`/food/${entry.foodId}?entryId=${entry.id}`)
                }
              >
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
              </Pressable>
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
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  settingsLink: {
    fontSize: 15,
    color: colors.calories,
    fontWeight: "600",
    marginTop: 20,
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
    fontSize: 40,
    fontWeight: "700",
  },
  calorieGoal: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  calorieRemaining: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 18,
  },
  macroPercent: {
    fontSize: 13,
    fontWeight: "700",
  },
  macroRow: {
    flexDirection: "row",
    marginTop: 24,
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 22,
  },
  macro: {
    flex: 1,
    alignItems: "center",
  },
  macroValue: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
  },
  macroLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    marginTop: 8,
  },
  microsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 24,
    paddingVertical: 6,
  },
  microsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  microsToggle: {
    fontSize: 14,
    color: colors.calories,
    fontWeight: "600",
  },
  microsBody: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginTop: 8,
  },
  microRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  microLabelBlock: {
    flex: 1,
  },
  microLabel: {
    fontSize: 14,
    color: colors.muted,
  },
  microPartial: {
    fontSize: 11,
    color: colors.carbs,
    marginTop: 2,
  },
  microValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "600",
  },
  microsEmpty: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 8,
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