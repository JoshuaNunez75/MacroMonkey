import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Platform } from "react-native";
import { Ring } from "../components/Ring";
import { colors } from "../lib/colors";
import {
  dateFromKey,
  dateKeyFor,
  dateLabelFor,
  dayOfMonthFor,
  deleteEntry,
  getEntries,
  weekDaysFor,
  weekdayLetterFor,
  LoggedEntry,
  shiftDateKey,
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
  const over = progress > 1;

  return (
    <View style={styles.macro}>
      <Ring
        size={66}
        strokeWidth={7}
        progress={progress}
        color={color}
        trackColor={colors.border}
      >
        <Text style={[styles.macroPercent, { color }]}>
          {Math.round(progress * 100)}%
        </Text>
      </Ring>

      <Text style={styles.macroLabel}>{label}</Text>

      <View style={[styles.macroPill, over && styles.pillOver]}>
        <Text style={[styles.macroPillText, over && styles.pillOverText]}>
          {formatGrams(value)}/{Math.round(goal)}g
        </Text>
      </View>
    </View>
  );
}

export default function Index() {
  const router = useRouter();
  const [entries, setEntries] = useState<LoggedEntry[]>([]);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [showPercent, setShowPercent] = useState(false);
  const [dateKey, setDateKey] = useState(todayKey());
  const [pickerOpen, setPickerOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function load() {
        const [list, savedProfile] = await Promise.all([
          getEntries(dateKey),
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
    }, [dateKey])
  );

  async function remove(id: string) {
    await deleteEntry(dateKey, id);
    setEntries(await getEntries(dateKey));
  }

  function macroText(label: string, value: number, goal: number) {
    if (showPercent) {
      const percent = goal > 0 ? Math.round((value / goal) * 100) : 0;
      return `${label} ${percent}%`;
    }
    return `${label} ${formatGrams(value)}g`;
  }

  function calorieText(value: number) {
    if (showPercent) {
      const percent =
        profile.calorieGoal > 0
          ? Math.round((value / profile.calorieGoal) * 100)
          : 0;
      return `${percent}% cals`;
    }
    return `${Math.round(value)} cal`;
  }

  const totals = totalsFor(entries);
  const targets = macroGrams(profile);
  const remaining = Math.max(0, profile.calorieGoal - totals.calories);
  const calorieProgress = profile.calorieGoal > 0 ? totals.calories / profile.calorieGoal : 0;
  const calorieOver = calorieProgress > 1;

  const isToday = dateKey === todayKey();

  function onDateChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS !== "ios") {
      setPickerOpen(false);
    }
    if (selected) {
      setDateKey(dateKeyFor(selected));
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.appBar}>
          <Text style={styles.appName}>MacroMonkey</Text>
          <Pressable
            style={styles.iconButton}
            onPress={() => router.push("/settings")}
            hitSlop={8}
          >
            <Ionicons name="settings-outline" size={20} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.weekRow}>
          <Pressable
            style={styles.navButton}
            onPress={() => setDateKey(shiftDateKey(dateKey, -7))}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </Pressable>

          <View style={styles.weekDays}>
            {weekDaysFor(dateKey).map((key) => {
              const selected = key === dateKey;
              const marksToday = key === todayKey();

              return (
                <Pressable
                  key={key}
                  style={styles.day}
                  onPress={() => setDateKey(key)}
                  hitSlop={4}
                >
                  <Text
                    style={[styles.dayLetter, selected && styles.dayLetterOn]}
                  >
                    {weekdayLetterFor(key)}
                  </Text>
                  <View
                    style={[
                      styles.dayNumber,
                      marksToday && !selected && styles.dayNumberToday,
                      selected && styles.dayNumberOn,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayNumberText,
                        selected && styles.dayNumberTextOn,
                      ]}
                    >
                      {dayOfMonthFor(key)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            style={styles.navButton}
            onPress={() => setDateKey(shiftDateKey(dateKey, 7))}
            hitSlop={8}
          >
            <Ionicons name="chevron-forward" size={18} color={colors.text} />
          </Pressable>
        </View>

        <Pressable
          style={styles.dateLabelRow}
          onPress={() => setPickerOpen(!pickerOpen)}
          hitSlop={8}
        >
          <Text style={styles.title} numberOfLines={1}>
            {dateLabelFor(dateKey)}
          </Text>
          <Ionicons
            name={pickerOpen ? "chevron-up" : "chevron-down"}
            size={18}
            color={colors.muted}
          />
        </Pressable>

        {isToday ? null : (
          <Pressable
            style={styles.jumpToday}
            onPress={() => setDateKey(todayKey())}
            hitSlop={8}
          >
            <Text style={styles.dateNavToday}>Jump to today</Text>
          </Pressable>
        )}

        {pickerOpen ? (
          Platform.OS === "ios" ? (
            <View style={styles.pickerCard}>
              <DateTimePicker
                value={dateFromKey(dateKey)}
                mode="date"
                display="inline"
                onChange={onDateChange}
                themeVariant="dark"
                accentColor={colors.calories}
              />
              <Pressable
                style={styles.pickerDone}
                onPress={() => setPickerOpen(false)}
              >
                <Text style={styles.pickerDoneText}>Done</Text>
              </Pressable>
            </View>
          ) : (
            <DateTimePicker
              value={dateFromKey(dateKey)}
              mode="date"
              display="default"
              onChange={onDateChange}
            />
          )
        ) : null}

        <Pressable style={styles.card} onPress={() => router.push(`/day?date=${dateKey}`)}>
          <Ring
            size={188}
            strokeWidth={15}
            progress={calorieProgress}
            color={colors.calories}
            trackColor={colors.border}
          >
            <Text style={styles.calorieNumber}>
              {Math.round(totals.calories).toLocaleString()}
            </Text>
            <Text style={styles.calorieUnit}>CALORIES</Text>
          </Ring>

          <View style={[styles.caloriePill, calorieOver && styles.pillOver]}>
            <Text
              style={[
                styles.caloriePillText,
                calorieOver && styles.pillOverText,
              ]}
            >
              {calorieOver
                ? `${Math.round(
                  totals.calories - profile.calorieGoal
                ).toLocaleString()} over ${profile.calorieGoal.toLocaleString()}`
                : `${Math.round(
                  remaining
                ).toLocaleString()} left of ${profile.calorieGoal.toLocaleString()}`}
            </Text>
          </View>

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
          <Text style={styles.cardHint}>Tap for full breakdown</Text>
        </Pressable>

        <View style={styles.searchRow}>
          <Pressable
            style={styles.searchBar}
            onPress={() => router.push(`/search?date=${dateKey}`)}
          >
            <Ionicons name="search" size={18} color={colors.calories} />
            <Text style={styles.searchBarText}>Search for a food to log</Text>
          </Pressable>

          <Pressable
            style={styles.scanButton}
            onPress={() => router.push(`/scan?date=${dateKey}`)}
          >
            <Ionicons name="barcode-outline" size={22} color={colors.calories} />
          </Pressable>
        </View>

        <View style={styles.mealsHeader}>
          <Text style={styles.sectionTitle}>Meals</Text>
          {entries.length > 0 ? (
            <Pressable onPress={() => setShowPercent(!showPercent)} hitSlop={10}>
              <Text style={styles.mealsToggle}>
                {showPercent ? "Show grams" : "Show % of goal"}
              </Text>
            </Pressable>
          ) : null}
        </View>

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
                  router.push(
                    `/food/${entry.foodId}?entryId=${entry.id}&date=${dateKey}`
                  )
                }
              >
                <View style={styles.entryMain}>
                  <View style={styles.entryTop}>
                    <Text style={styles.entryName} numberOfLines={1}>
                      {entry.name}
                    </Text>
                    <Text style={styles.entryCalories}>
                      {calorieText(entry.serving.calories * entry.amount)}
                    </Text>
                  </View>

                  <Text style={styles.entryServing} numberOfLines={1}>
                    {formatGrams(entry.amount)} × {entry.serving.description}
                  </Text>

                  <View style={styles.entryMacros}>
                    <Text style={[styles.entryMacro, { color: colors.protein }]}>
                      {macroText(
                        "P",
                        entry.serving.protein * entry.amount,
                        targets.protein
                      )}
                    </Text>
                    <Text style={[styles.entryMacro, { color: colors.carbs }]}>
                      {macroText(
                        "C",
                        entry.serving.carbs * entry.amount,
                        targets.carbs
                      )}
                    </Text>
                    <Text style={[styles.entryMacro, { color: colors.fat }]}>
                      {macroText("F", entry.serving.fat * entry.amount, targets.fat)}
                    </Text>
                  </View>
                </View>
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
  appBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  appName: {
    fontSize: 30,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: 0.3,
  },
  jumpToday: {
    alignSelf: "center",
    marginTop: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: colors.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
    marginTop: 14,
  },
  pickerDone: {
    alignSelf: "flex-end",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pickerDoneText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.calories,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.text,
  },
  date: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  weekRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
  },
  weekDays: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  day: {
    alignItems: "center",
  },
  dayLetter: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.muted,
    marginBottom: 6,
  },
  dayLetterOn: {
    color: colors.calories,
  },
  dayNumber: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNumberToday: {
    borderWidth: 1,
    borderColor: colors.accentSoft,
  },
  dayNumberOn: {
    backgroundColor: colors.calories,
  },
  dayNumberText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  dayNumberTextOn: {
    color: colors.bg,
    fontWeight: "700",
  },
  dateLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 16,
  },
  navButton: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: colors.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  navCenter: {
    flex: 1,
    alignItems: "center",
  },
  dateNavToday: {
    fontSize: 13,
    color: colors.muted,
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
    fontSize: 38,
    fontWeight: "700",
    color: colors.text,
  },
  calorieUnit: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.muted,
    letterSpacing: 1.4,
    marginTop: 3,
  },
  caloriePill: {
    backgroundColor: colors.pill,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginTop: 18,
  },
  caloriePillText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  pillOver: {
    backgroundColor: colors.overBg,
  },
  pillOverText: {
    color: colors.overText,
  },
  cardHint: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 18,
  },
  macroPercent: {
    fontSize: 13,
    fontWeight: "700",
  },
  macroPill: {
    backgroundColor: colors.pill,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 6,
  },
  macroPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
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
  macroLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
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
  mealsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 32,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
  },
  mealsToggle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.calories,
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
  entryTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  entryName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  entryMacros: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  entryMacro: {
    fontSize: 12,
    fontWeight: "700",
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
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
  },
  scanButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.accentSoft,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  searchBarText: {
    fontSize: 15,
    color: colors.muted,
  },
});