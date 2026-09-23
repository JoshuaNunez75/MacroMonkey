import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../lib/colors";
import {
    fullDateFor,
    getEntries,
    LoggedEntry,
    mealBreakdownFor,
    microTotalsFor,
    todayKey,
    totalsFor,
} from "../lib/diary";
import { formatGrams } from "../lib/format";
import {
    CALORIES_PER_GRAM,
    DEFAULT_PROFILE,
    loadProfile,
    macroGrams,
    Profile,
} from "../lib/profile";

type Part = { key: string; label: string; value: number; color: string };

function SplitBar({ title, parts }: { title: string; parts: Part[] }) {
    const total = parts.reduce((sum, part) => sum + part.value, 0);

    return (
        <View style={styles.splitBlock}>
            <Text style={styles.barLabel}>{title}</Text>

            {total <= 0 ? (
                <View style={styles.barEmpty} />
            ) : (
                <View style={styles.bar}>
                    {parts
                        .filter((part) => part.value > 0)
                        .map((part) => (
                            <View
                                key={part.key}
                                style={{ flex: part.value, backgroundColor: part.color }}
                            />
                        ))}
                </View>
            )}

            <View style={styles.legend}>
                {parts.map((part) => (
                    <View key={part.key} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: part.color }]} />
                        <Text style={styles.legendText}>
                            {part.label}{" "}
                            {total > 0 ? Math.round((part.value / total) * 100) : 0}%
                        </Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

function goalPercent(value: number, goal: number) {
    if (goal <= 0) {
        return 0;
    }
    return Math.round((value / goal) * 100);
}

function MealBar({ fraction, color }: { fraction: number; color: string }) {
    const filled = Math.min(1, Math.max(0, fraction));

    return (
        <View style={styles.mealTrack}>
            <View style={{ flex: filled, backgroundColor: color }} />
            <View style={{ flex: 1 - filled }} />
        </View>
    );
}

function TargetBar({
    actual,
    target,
    color,
}: {
    actual: number;
    target: number;
    color: string;
}) {
    const fill = Math.min(1, Math.max(0, actual / 100));
    const mark = Math.min(1, Math.max(0, target / 100));

    return (
        <View style={styles.barWrap}>
            <View style={styles.barTrack}>
                <View style={{ flex: fill, backgroundColor: color, borderRadius: 999 }} />
                <View style={{ flex: 1 - fill }} />
            </View>

            <View style={styles.markLayer} pointerEvents="none">
                <View style={{ flex: mark }} />
                <View style={styles.markHalo}>
                    <View style={styles.markTick} />
                </View>
                <View style={{ flex: 1 - mark }} />
            </View>
        </View>
    );
}

export default function DayDetail() {
    const router = useRouter();
    const { date } = useLocalSearchParams<{ date?: string }>();
    const dateKey = date ?? todayKey();
    const [entries, setEntries] = useState<LoggedEntry[]>([]);
    const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);

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

    const totals = totalsFor(entries);
    const targets = macroGrams(profile);
    const microTotals = microTotalsFor(entries);
    const mealRows = mealBreakdownFor(entries);

    const actualParts: Part[] = [
        {
            key: "protein",
            label: "Protein",
            value: totals.protein * CALORIES_PER_GRAM.protein,
            color: colors.protein,
        },
        {
            key: "carbs",
            label: "Carbs",
            value: totals.carbs * CALORIES_PER_GRAM.carbs,
            color: colors.carbs,
        },
        {
            key: "fat",
            label: "Fat",
            value: totals.fat * CALORIES_PER_GRAM.fat,
            color: colors.fat,
        },
    ];

    const targetParts: Part[] = [
        {
            key: "protein",
            label: "Protein",
            value: profile.proteinPercent,
            color: colors.protein,
        },
        {
            key: "carbs",
            label: "Carbs",
            value: profile.carbsPercent,
            color: colors.carbs,
        },
        {
            key: "fat",
            label: "Fat",
            value: profile.fatPercent,
            color: colors.fat,
        },
    ];

    const consumedCalories = totals.calories;

    const macroCalories =
        totals.protein * CALORIES_PER_GRAM.protein +
        totals.carbs * CALORIES_PER_GRAM.carbs +
        totals.fat * CALORIES_PER_GRAM.fat;

    function splitShare(value: number) {
        if (macroCalories <= 0) {
            return 0;
        }
        return Math.round((value / macroCalories) * 100);
    }

    const splitRows = [
        {
            key: "protein",
            label: "Protein",
            color: colors.protein,
            actual: splitShare(totals.protein * CALORIES_PER_GRAM.protein),
            target: Math.round(profile.proteinPercent),
        },
        {
            key: "carbs",
            label: "Carbs",
            color: colors.carbs,
            actual: splitShare(totals.carbs * CALORIES_PER_GRAM.carbs),
            target: Math.round(profile.carbsPercent),
        },
        {
            key: "fat",
            label: "Fat",
            color: colors.fat,
            actual: splitShare(totals.fat * CALORIES_PER_GRAM.fat),
            target: Math.round(profile.fatPercent),
        },
    ];

    const macroRows = [
        {
            label: "Protein",
            color: colors.protein,
            grams: totals.protein,
            goal: targets.protein,
            calories: totals.protein * CALORIES_PER_GRAM.protein,
            targetPercent: profile.proteinPercent,
        },
        {
            label: "Carbs",
            color: colors.carbs,
            grams: totals.carbs,
            goal: targets.carbs,
            calories: totals.carbs * CALORIES_PER_GRAM.carbs,
            targetPercent: profile.carbsPercent,
        },
        {
            label: "Fat",
            color: colors.fat,
            grams: totals.fat,
            goal: targets.fat,
            calories: totals.fat * CALORIES_PER_GRAM.fat,
            targetPercent: profile.fatPercent,
        },
    ];

    const contributors = entries
        .map((entry) => ({
            id: entry.id,
            name: entry.name,
            calories: entry.serving.calories * entry.amount,
        }))
        .sort((a, b) => b.calories - a.calories)
        .slice(0, 3);

    function sharePercent(value: number) {
        if (consumedCalories <= 0) {
            return 0;
        }
        return Math.round((value / consumedCalories) * 100);
    }

    return (
        <SafeAreaView style={styles.screen}>
            <StatusBar style="light" />

            <View style={styles.header}>
                <Pressable onPress={() => router.back()} hitSlop={12}>
                    <Text style={styles.back}>Back</Text>
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Full Breakdown</Text>
                <Text style={styles.subtitle}>{fullDateFor(dateKey)}</Text>

                <Text style={styles.sectionTitle}>Calories</Text>
                <View style={styles.summary}>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryValue}>
                            {Math.round(consumedCalories).toLocaleString()}
                        </Text>
                        <Text style={styles.summaryLabel}>EATEN</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryValue}>
                            {profile.calorieGoal.toLocaleString()}
                        </Text>
                        <Text style={styles.summaryLabel}>GOAL</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryValue}>
                            {Math.round(
                                profile.calorieGoal - consumedCalories
                            ).toLocaleString()}
                        </Text>
                        <Text style={styles.summaryLabel}>LEFT</Text>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Macro Split</Text>
                <Text style={styles.sectionNote}>
                    The bar is the share of calories you ate. The line is your target.
                </Text>

                <View style={styles.splitCard}>
                    {splitRows.map((row) => (
                        <View key={row.key} style={styles.splitRow}>
                            <View style={styles.splitTop}>
                                <View
                                    style={[styles.legendDot, { backgroundColor: row.color }]}
                                />
                                <Text style={styles.splitName}>{row.label}</Text>
                                <Text style={styles.splitNums}>
                                    {row.actual}% · target {row.target}%
                                </Text>
                            </View>

                            <TargetBar
                                actual={row.actual}
                                target={row.target}
                                color={row.color}
                            />
                        </View>
                    ))}

                    <View style={styles.splitKey}>
                        <View style={styles.keyTick} />
                        <Text style={styles.splitKeyText}>your target split</Text>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Macros</Text>
                <Text style={styles.sectionNote}>Progress toward today&apos;s targets</Text>
                <View style={styles.table}>
                    {macroRows.map((row) => (
                        <View key={row.label} style={styles.tableRow}>
                            <View style={[styles.legendDot, { backgroundColor: row.color }]} />
                            <Text style={styles.tableLabel}>{row.label}</Text>
                            <Text style={styles.tableValue}>
                                {formatGrams(row.grams)} / {Math.round(row.goal)}g
                            </Text>
                            <Text style={styles.tablePercent}>
                                {row.goal > 0 ? Math.round((row.grams / row.goal) * 100) : 0}%
                            </Text>
                        </View>
                    ))}
                </View>

                {mealRows.length > 0 ? (
                    <>
                        <Text style={styles.sectionTitle}>By Meal</Text>
                        <Text style={styles.sectionNote}>
                            How much of each goal every meal used
                        </Text>

                        <View style={styles.mealList}>
                            {mealRows.map((meal) => (
                                <View key={meal.key} style={styles.mealCard}>
                                    <View style={styles.mealHead}>
                                        <Text style={styles.mealName}>{meal.label}</Text>
                                        <Text style={styles.mealCalories}>
                                            {Math.round(meal.totals.calories).toLocaleString()} cal
                                        </Text>
                                        <Text style={styles.mealPercent}>
                                            {goalPercent(meal.totals.calories, profile.calorieGoal)}%
                                        </Text>
                                    </View>

                                    <MealBar
                                        fraction={
                                            profile.calorieGoal > 0
                                                ? meal.totals.calories / profile.calorieGoal
                                                : 0
                                        }
                                        color={colors.calories}
                                    />

                                    <View style={styles.mealMacros}>
                                        {[
                                            {
                                                label: "P",
                                                grams: meal.totals.protein,
                                                goal: targets.protein,
                                                color: colors.protein,
                                            },
                                            {
                                                label: "C",
                                                grams: meal.totals.carbs,
                                                goal: targets.carbs,
                                                color: colors.carbs,
                                            },
                                            {
                                                label: "F",
                                                grams: meal.totals.fat,
                                                goal: targets.fat,
                                                color: colors.fat,
                                            },
                                        ].map((macro) => (
                                            <Text
                                                key={macro.label}
                                                style={[styles.mealMacro, { color: macro.color }]}
                                            >
                                                {macro.label} {formatGrams(macro.grams)}g
                                                <Text style={styles.mealMacroPercent}>
                                                    {"  "}
                                                    {goalPercent(macro.grams, macro.goal)}%
                                                </Text>
                                            </Text>
                                        ))}
                                    </View>
                                </View>
                            ))}
                        </View>
                    </>
                ) : null}

                {contributors.length > 0 ? (
                    <>
                        <Text style={styles.sectionTitle}>Biggest Contributors</Text>
                        <View style={styles.table}>
                            {contributors.map((item) => (
                                <View key={item.id} style={styles.tableRow}>
                                    <Text style={styles.tableLabel} numberOfLines={1}>
                                        {item.name}
                                    </Text>
                                    <Text style={styles.tableValue}>
                                        {Math.round(item.calories)} cal
                                    </Text>
                                    <Text style={styles.tablePercent}>
                                        {sharePercent(item.calories)}%
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </>
                ) : null}

                <Text style={styles.sectionTitle}>Nutrition Details</Text>
                {microTotals.length === 0 ? (
                    <Text style={styles.empty}>
                        No detail data for today&apos;s foods
                    </Text>
                ) : (
                    <>
                        <View style={styles.table}>
                            {microTotals.map((row) => (
                                <View key={row.label} style={styles.tableRow}>
                                    <Text style={styles.tableLabel}>{row.label}</Text>
                                    <Text style={styles.tableValue}>
                                        {formatGrams(row.value)} {row.unit}
                                        {row.reportedBy < entries.length ? " *" : ""}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        {microTotals.some((row) => row.reportedBy < entries.length) ? (
                            <Text style={styles.footnote}>
                                * Some of today&apos;s foods don&apos;t report this nutrient, so
                                the starred totals only count the ones that do.
                            </Text>
                        ) : null}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.bg,
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 8,
        marginBottom: 8,
    },
    back: {
        fontSize: 16,
        color: colors.calories,
    },
    content: {
        paddingBottom: 48,
    },
    title: {
        fontSize: 28,
        fontWeight: "700",
        color: colors.text,
        marginTop: 4,
    },
    subtitle: {
        fontSize: 15,
        color: colors.muted,
        marginTop: 2,
    },
    summary: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: 18,
        marginTop: 12,
    },
    summaryItem: {
        flex: 1,
        alignItems: "center",
    },
    summaryDivider: {
        width: 1,
        height: 32,
        backgroundColor: colors.border,
    },
    summaryValue: {
        fontSize: 20,
        fontWeight: "700",
        color: colors.text,
    },
    summaryLabel: {
        fontSize: 10,
        fontWeight: "700",
        letterSpacing: 1.2,
        color: colors.muted,
        marginTop: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: colors.text,
        marginTop: 32,
    },
    sectionNote: {
        fontSize: 13,
        color: colors.muted,
        marginTop: 2,
    },
    splitBlock: {
        marginTop: 18,
    },
    barLabel: {
        fontSize: 12,
        fontWeight: "600",
        letterSpacing: 0.5,
        color: colors.muted,
        marginBottom: 8,
    },
    bar: {
        flexDirection: "row",
        height: 14,
        borderRadius: 999,
        overflow: "hidden",
        gap: 2,
        backgroundColor: colors.bg,
    },
    barEmpty: {
        height: 14,
        borderRadius: 999,
        backgroundColor: colors.border,
    },
    legend: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 16,
        marginTop: 10,
    },
    legendItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    legendDot: {
        width: 9,
        height: 9,
        borderRadius: 999,
    },
    legendText: {
        fontSize: 13,
        color: colors.muted,
    },
    mealList: {
        gap: 10,
        marginTop: 12,
    },
    mealCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
    },
    mealHead: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    mealName: {
        flex: 1,
        fontSize: 13,
        fontWeight: "700",
        color: colors.text,
        textTransform: "uppercase",
        letterSpacing: 0.6,
    },
    mealCalories: {
        fontSize: 14,
        fontWeight: "700",
        color: colors.calories,
    },
    mealPercent: {
        fontSize: 13,
        color: colors.muted,
        width: 44,
        textAlign: "right",
    },
    mealTrack: {
        flexDirection: "row",
        height: 8,
        borderRadius: 999,
        overflow: "hidden",
        backgroundColor: colors.border,
        marginTop: 12,
    },
    mealMacros: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 12,
    },
    mealMacro: {
        fontSize: 13,
        fontWeight: "700",
    },
    mealMacroPercent: {
        fontSize: 12,
        fontWeight: "600",
        color: colors.muted,
    },
    splitHead: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    splitDotSpacer: {
        width: 9,
    },
    splitHeadLabel: {
        flex: 1,
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 0.6,
        textTransform: "uppercase",
        color: colors.muted,
    },
    splitHeadCell: {
        width: 52,
        textAlign: "right",
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 0.6,
        textTransform: "uppercase",
        color: colors.muted,
    },
    splitLabel: {
        flex: 1,
        fontSize: 14,
        color: colors.text,
    },
    splitCell: {
        width: 52,
        textAlign: "right",
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
        fontVariant: ["tabular-nums"],
    },
    splitDiff: {
        width: 52,
        textAlign: "right",
        fontSize: 14,
        fontWeight: "600",
        color: colors.muted,
        fontVariant: ["tabular-nums"],
    },
    splitCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        marginTop: 12,
    },
    splitRow: {
        marginBottom: 18,
    },
    splitTop: {
        flexDirection: "row",
        alignItems: "center",
        gap: 9,
    },
    splitName: {
        flex: 1,
        fontSize: 14,
        color: colors.text,
    },
    splitNums: {
        fontSize: 13,
        color: colors.muted,
        fontVariant: ["tabular-nums"],
    },
    barWrap: {
        height: 28,
        justifyContent: "center",
        marginTop: 4,
    },
    barTrack: {
        flexDirection: "row",
        height: 12,
        borderRadius: 999,
        backgroundColor: colors.border,
        overflow: "hidden",
    },
    markLayer: {
        ...StyleSheet.absoluteFillObject,
        flexDirection: "row",
        alignItems: "center",
    },
    markHalo: {
        width: 7,
        height: 26,
        borderRadius: 3,
        backgroundColor: colors.card,
        alignItems: "center",
        justifyContent: "center",
    },
    markTick: {
        width: 3,
        height: 22,
        borderRadius: 2,
        backgroundColor: colors.text,
    },
    keyTick: {
        width: 3,
        height: 16,
        borderRadius: 2,
        backgroundColor: colors.text,
    },
    splitKey: {
        flexDirection: "row",
        alignItems: "center",
        gap: 9,
        marginTop: 4,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    splitKeyText: {
        fontSize: 12,
        color: colors.muted,
    },
    table: {
        backgroundColor: colors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 16,
        paddingVertical: 4,
        marginTop: 12,
    },
    tableRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    tableLabel: {
        flex: 1,
        fontSize: 14,
        color: colors.text,
    },
    tableValue: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
    },
    tablePercent: {
        fontSize: 13,
        color: colors.muted,
        width: 44,
        textAlign: "right",
    },
    footnote: {
        fontSize: 12,
        color: colors.muted,
        lineHeight: 17,
        marginTop: 10,
    },
    empty: {
        fontSize: 14,
        color: colors.muted,
        marginTop: 12,
    },
});