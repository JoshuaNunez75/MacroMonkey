import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../lib/colors";
import { Food, getFood, Serving } from "../../lib/foodApi";
import { formatGrams } from "../../lib/format";
import { goals } from "../../lib/goals";

function gramOptionFor(food: Food): Serving | null {
    const base = food.servings.find(
        (s) => s.metricUnit !== undefined && (s.metricAmount ?? 0) > 0
    );

    const metricAmount = base?.metricAmount;
    if (!base || metricAmount === undefined || metricAmount <= 0) {
        return null;
    }

    const per = (value: number) => value / metricAmount;

    return {
        id: "per-metric-unit",
        description: `1 ${base.metricUnit}`,
        calories: per(base.calories),
        protein: per(base.protein),
        carbs: per(base.carbs),
        fat: per(base.fat),
        metricAmount: 1,
        metricUnit: base.metricUnit,
    };
}

function percentOf(value: number, goal: number) {
    if (goal <= 0) {
        return 0;
    }
    return Math.round((value / goal) * 100);
}

function MacroStat({
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
    return (
        <View style={styles.macro}>
            <Text style={[styles.macroValue, { color }]}>{formatGrams(value)}g</Text>
            <Text style={styles.macroLabel}>{label}</Text>
            <Text style={styles.macroPercent}>{percentOf(value, goal)}%</Text>
        </View>
    );
}

export default function FoodDetail() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const [food, setFood] = useState<Food | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [servingIndex, setServingIndex] = useState(0);
    const [amount, setAmount] = useState("1");

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const result = await getFood(id);
                if (!cancelled) {
                    setFood(result);
                }
            } catch (e) {
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : "Something went wrong");
                }
            }
        }

        load();

        return () => {
            cancelled = true;
        };
    }, [id]);

    function renderBody() {
        if (error) {
            return <Text style={styles.error}>{error}</Text>;
        }
        if (food === null) {
            return <ActivityIndicator color={colors.calories} style={styles.spinner} />;
        }

        const gramOption = gramOptionFor(food);
        const options = gramOption ? [...food.servings, gramOption] : food.servings;
        const serving = options[servingIndex] ?? options[0];

        function selectServing(index: number) {
            setServingIndex(index);
            if (options[index].id === "per-metric-unit") {
                setAmount(String(Math.round(food.servings[0].metricAmount ?? 100)));
            } else {
                setAmount("1");
            }
        }
        const parsed = Number(amount);
        const multiplier = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;

        const totals = {
            calories: serving.calories * multiplier,
            protein: serving.protein * multiplier,
            carbs: serving.carbs * multiplier,
            fat: serving.fat * multiplier,
        };

        return (
            <ScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={styles.name}>{food.name}</Text>
                {food.brand ? <Text style={styles.brand}>{food.brand}</Text> : null}

                <Text style={styles.label}>Serving</Text>
                <View style={styles.chipRow}>
                    {options.map((option, index) => {
                        const selected = index === servingIndex;
                        return (
                            <Pressable
                                key={option.id}
                                onPress={() => selectServing(index)}
                                style={[styles.chip, selected && styles.chipSelected]}
                            >
                                <Text
                                    style={[styles.chipText, selected && styles.chipTextSelected]}
                                >
                                    {option.description}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>

                <Text style={styles.label}>Amount</Text>
                <View style={styles.amountRow}>
                    <TextInput
                        style={styles.amountInput}
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="decimal-pad"
                        selectTextOnFocus
                    />
                    <Text style={styles.amountUnit}>
                        × {serving.description}
                        {serving.metricAmount && serving.id !== "per-metric-unit"
                            ? `  (${formatGrams(serving.metricAmount * multiplier)} ${serving.metricUnit})` : ""}
                    </Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.calories}>{Math.round(totals.calories)}</Text>
                    <Text style={styles.caloriesLabel}>calories</Text>
                    <Text style={styles.percent}>
                        {percentOf(totals.calories, goals.calories)}% of daily goal
                    </Text>

                    <View style={styles.macroRow}>
                        <MacroStat
                            label="Protein"
                            value={totals.protein}
                            goal={goals.protein}
                            color={colors.protein}
                        />
                        <MacroStat
                            label="Carbs"
                            value={totals.carbs}
                            goal={goals.carbs}
                            color={colors.carbs}
                        />
                        <MacroStat
                            label="Fat"
                            value={totals.fat}
                            goal={goals.fat}
                            color={colors.fat}
                        />
                    </View>
                </View>
            </ScrollView >
        );
    }

    return (
        <SafeAreaView style={styles.screen}>
            <StatusBar style="light" />

            <View style={styles.header}>
                <Pressable onPress={() => router.back()} hitSlop={12}>
                    <Text style={styles.back}>Back</Text>
                </Pressable>
            </View>

            {renderBody()}
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
        marginBottom: 12,
    },
    back: {
        fontSize: 16,
        color: colors.calories,
    },
    content: {
        paddingBottom: 48,
    },
    name: {
        fontSize: 26,
        fontWeight: "700",
        color: colors.text,
        marginTop: 4,
    },
    brand: {
        fontSize: 15,
        color: colors.muted,
        marginTop: 4,
    },
    label: {
        fontSize: 13,
        fontWeight: "600",
        color: colors.muted,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginTop: 28,
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
    amountRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    amountInput: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 18,
        color: colors.text,
        width: 90,
        textAlign: "center",
    },
    amountUnit: {
        flex: 1,
        color: colors.muted,
        fontSize: 14,
    },
    card: {
        backgroundColor: colors.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 24,
        marginTop: 28,
        alignItems: "center",
    },
    calories: {
        fontSize: 48,
        fontWeight: "700",
        color: colors.calories,
    },
    caloriesLabel: {
        fontSize: 13,
        color: colors.muted,
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    percent: {
        fontSize: 13,
        color: colors.muted,
        marginTop: 6,
    },
    macroRow: {
        flexDirection: "row",
        width: "100%",
        marginTop: 22,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 18,
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
    macroPercent: {
        fontSize: 12,
        color: colors.muted,
        marginTop: 1,
    },
    spinner: {
        marginTop: 40,
    },
    error: {
        color: colors.protein,
        fontSize: 14,
        marginTop: 24,
        textAlign: "center",
    },
});