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
                    Where each bar&apos;s calories came from — not progress toward goals
                </Text>

                <SplitBar title="Today" parts={actualParts} />
                <SplitBar title="Target" parts={targetParts} />

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