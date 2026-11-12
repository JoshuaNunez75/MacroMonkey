import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FatSecretAttribution } from "../components/FatSecretAttribution";
import { colors } from "../lib/colors";
import {
    addEntries,
    defaultLoggedAtFor,
    MealKey,
    MEALS,
    mealForDate,
    todayKey,
} from "../lib/diary";
import { Food, getFood, Serving } from "../lib/foodApi";
import { formatGrams } from "../lib/format";

type ReviewItem = {
    key: string;
    food: Food;
    servingId: string;
    amount: number;
};

function servingOf(item: ReviewItem): Serving {
    return (
        item.food.servings.find((option) => option.id === item.servingId) ??
        item.food.servings[0]
    );
}

function plural(count: number) {
    return count === 1 ? "food" : "foods";
}

export default function Review() {
    const router = useRouter();
    const { ids, date, meal: mealParam } = useLocalSearchParams<{
        ids?: string;
        date?: string;
        meal?: string;
    }>();

    const dateKey = date ?? todayKey();

    const [items, setItems] = useState<ReviewItem[] | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [missing, setMissing] = useState(0);
    const [meal, setMeal] = useState<MealKey>(() => {
        const match = MEALS.find((option) => option.key === mealParam);
        return match ? match.key : mealForDate(new Date());
    });
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const idList = (ids ?? "").split(",").filter((value) => value !== "");

        if (idList.length === 0) {
            setItems([]);
            return;
        }

        Promise.allSettled(idList.map((id) => getFood(id))).then((results) => {
            if (cancelled) {
                return;
            }

            const loaded: ReviewItem[] = [];
            let failed = 0;

            results.forEach((result, index) => {
                if (
                    result.status === "fulfilled" &&
                    result.value.servings.length > 0
                ) {
                    loaded.push({
                        key: result.value.id + "-" + index,
                        food: result.value,
                        servingId: result.value.servings[0].id,
                        amount: 1,
                    });
                } else {
                    failed += 1;
                }
            });

            if (loaded.length === 0 && failed > 0) {
                setLoadError("Could not load those foods. Check your connection.");
            }

            setItems(loaded);
            setMissing(failed);
        });

        return () => {
            cancelled = true;
        };
    }, [ids]);

    function changeAmount(key: string, delta: number) {
        setItems((current) =>
            current === null
                ? current
                : current.map((item) =>
                      item.key === key
                          ? { ...item, amount: Math.max(1, item.amount + delta) }
                          : item
                  )
        );
    }

    function removeItem(key: string) {
        setItems((current) =>
            current === null
                ? current
                : current.filter((item) => item.key !== key)
        );
    }

    const list = items ?? [];

    const totals = list.reduce(
        (sum, item) => {
            const serving = servingOf(item);
            return {
                calories: sum.calories + serving.calories * item.amount,
                protein: sum.protein + serving.protein * item.amount,
                carbs: sum.carbs + serving.carbs * item.amount,
                fat: sum.fat + serving.fat * item.amount,
            };
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    async function logAll() {
        if (list.length === 0 || saving) {
            return;
        }

        setSaving(true);
        setSaveError(null);

        try {
            await addEntries(
                list.map((item) => ({
                    date: dateKey,
                    loggedAt: defaultLoggedAtFor(dateKey),
                    meal,
                    foodId: item.food.id,
                    name: item.food.name,
                    brand: item.food.brand,
                    serving: servingOf(item),
                    amount: item.amount,
                }))
            );

            router.dismissAll();
        } catch {
            setSaving(false);
            setSaveError("Could not log those foods. Check your connection.");
        }
    }

    function renderBody() {
        if (items === null) {
            return (
                <ActivityIndicator color={colors.calories} style={styles.spinner} />
            );
        }

        if (loadError) {
            return <Text style={styles.error}>{loadError}</Text>;
        }

        if (list.length === 0) {
            return <Text style={styles.hint}>Nothing left to log.</Text>;
        }

        return (
            <ScrollView contentContainerStyle={styles.listContent}>
                <Text style={styles.label}>Meal</Text>
                <View style={styles.chipRow}>
                    {MEALS.map((option) => {
                        const selected = option.key === meal;
                        return (
                            <Pressable
                                key={option.key}
                                onPress={() => setMeal(option.key)}
                                style={[styles.chip, selected && styles.chipSelected]}
                            >
                                <Text
                                    style={[
                                        styles.chipText,
                                        selected && styles.chipTextSelected,
                                    ]}
                                >
                                    {option.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>

                <Text style={styles.label}>
                    {list.length} {plural(list.length)}
                </Text>

                {missing > 0 ? (
                    <Text style={styles.warning}>
                        {missing} {plural(missing)} could not be loaded and were left
                        out.
                    </Text>
                ) : null}

                {list.map((item) => {
                    const serving = servingOf(item);
                    return (
                        <View key={item.key} style={styles.row}>
                            <View style={styles.rowTop}>
                                <Text style={styles.rowName} numberOfLines={2}>
                                    {item.food.name}
                                </Text>
                                <Pressable
                                    onPress={() => removeItem(item.key)}
                                    hitSlop={12}
                                >
                                    <Text style={styles.remove}>✕</Text>
                                </Pressable>
                            </View>

                            {item.food.brand ? (
                                <Text style={styles.rowBrand}>{item.food.brand}</Text>
                            ) : null}

                            <Text style={styles.rowServing}>{serving.description}</Text>

                            <View style={styles.rowBottom}>
                                <View style={styles.stepper}>
                                    <Pressable
                                        onPress={() => changeAmount(item.key, -1)}
                                        hitSlop={8}
                                        style={styles.stepButton}
                                    >
                                        <Text style={styles.stepText}>−</Text>
                                    </Pressable>

                                    <Text style={styles.stepValue}>{item.amount}</Text>

                                    <Pressable
                                        onPress={() => changeAmount(item.key, 1)}
                                        hitSlop={8}
                                        style={styles.stepButton}
                                    >
                                        <Text style={styles.stepText}>+</Text>
                                    </Pressable>
                                </View>

                                <Text style={styles.rowCalories}>
                                    {Math.round(serving.calories * item.amount)} cal
                                </Text>
                            </View>
                        </View>
                    );
                })}

                <View style={styles.card}>
                    <Text style={styles.calories}>{Math.round(totals.calories)}</Text>
                    <Text style={styles.caloriesLabel}>Calories</Text>

                    <View style={styles.macroRow}>
                        <View style={styles.macro}>
                            <Text
                                style={[styles.macroValue, { color: colors.protein }]}
                            >
                                {formatGrams(totals.protein)}g
                            </Text>
                            <Text style={styles.macroLabel}>Protein</Text>
                        </View>
                        <View style={styles.macro}>
                            <Text style={[styles.macroValue, { color: colors.carbs }]}>
                                {formatGrams(totals.carbs)}g
                            </Text>
                            <Text style={styles.macroLabel}>Carbs</Text>
                        </View>
                        <View style={styles.macro}>
                            <Text style={[styles.macroValue, { color: colors.fat }]}>
                                {formatGrams(totals.fat)}g
                            </Text>
                            <Text style={styles.macroLabel}>Fat</Text>
                        </View>
                    </View>
                </View>

                {saveError ? <Text style={styles.error}>{saveError}</Text> : null}

                <Pressable
                    style={[styles.logButton, saving && styles.logButtonDisabled]}
                    onPress={logAll}
                    disabled={saving}
                >
                    <Text style={styles.logButtonText}>
                        {saving
                            ? "Logging…"
                            : "Log " + list.length + " " + plural(list.length)}
                    </Text>
                </Pressable>
            </ScrollView>
        );
    }

    return (
        <SafeAreaView style={styles.screen}>
            <StatusBar style="light" />

            <View style={styles.header}>
                <Pressable onPress={() => router.back()} hitSlop={12}>
                    <Text style={styles.back}>Back</Text>
                </Pressable>
                <Text style={styles.title}>Review</Text>
                <View style={styles.headerSpacer} />
            </View>

            <View style={styles.body}>{renderBody()}</View>
            <FatSecretAttribution />
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
        justifyContent: "space-between",
        marginTop: 8,
        marginBottom: 4,
    },
    back: {
        fontSize: 16,
        color: colors.calories,
        width: 60,
    },
    title: {
        fontSize: 17,
        fontWeight: "600",
        color: colors.text,
    },
    headerSpacer: {
        width: 60,
    },
    body: {
        flex: 1,
    },
    listContent: {
        paddingBottom: 24,
    },
    label: {
        fontSize: 13,
        fontWeight: "600",
        color: colors.muted,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginTop: 20,
        marginBottom: 10,
    },
    chipRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    chip: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 9,
        maxWidth: "100%",
    },
    chipSelected: {
        backgroundColor: colors.calories,
        borderColor: colors.calories,
    },
    chipText: {
        color: colors.muted,
        fontSize: 13,
    },
    chipTextSelected: {
        color: colors.bg,
        fontWeight: "600",
    },
    warning: {
        color: colors.overText,
        fontSize: 13,
        marginBottom: 10,
        lineHeight: 18,
    },
    row: {
        backgroundColor: colors.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        marginBottom: 10,
    },
    rowTop: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
    },
    rowName: {
        flex: 1,
        color: colors.text,
        fontSize: 16,
        fontWeight: "600",
        lineHeight: 20,
    },
    remove: {
        color: colors.muted,
        fontSize: 16,
    },
    rowBrand: {
        color: colors.muted,
        fontSize: 13,
        marginTop: 2,
    },
    rowServing: {
        color: colors.muted,
        fontSize: 13,
        marginTop: 6,
    },
    rowBottom: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 14,
    },
    stepper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.pill,
        borderRadius: 999,
    },
    stepButton: {
        paddingHorizontal: 16,
        paddingVertical: 7,
    },
    stepText: {
        color: colors.text,
        fontSize: 18,
        fontWeight: "700",
    },
    stepValue: {
        color: colors.text,
        fontSize: 16,
        fontWeight: "700",
        minWidth: 24,
        textAlign: "center",
    },
    rowCalories: {
        color: colors.calories,
        fontSize: 15,
        fontWeight: "700",
    },
    card: {
        backgroundColor: colors.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 20,
        marginTop: 10,
        alignItems: "center",
    },
    calories: {
        fontSize: 40,
        fontWeight: "700",
        color: colors.calories,
    },
    caloriesLabel: {
        fontSize: 13,
        color: colors.muted,
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    macroRow: {
        flexDirection: "row",
        width: "100%",
        marginTop: 16,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 14,
    },
    macro: {
        flex: 1,
        alignItems: "center",
    },
    macroValue: {
        fontSize: 18,
        fontWeight: "600",
    },
    macroLabel: {
        fontSize: 12,
        color: colors.text,
        marginTop: 3,
    },
    logButton: {
        backgroundColor: colors.calories,
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: "center",
        marginTop: 20,
    },
    logButtonDisabled: {
        opacity: 0.5,
    },
    logButtonText: {
        color: colors.bg,
        fontSize: 16,
        fontWeight: "700",
    },
    spinner: {
        marginTop: 40,
    },
    hint: {
        color: colors.muted,
        fontSize: 14,
        marginTop: 24,
        textAlign: "center",
    },
    error: {
        color: colors.protein,
        fontSize: 14,
        marginTop: 24,
        textAlign: "center",
    },
});
