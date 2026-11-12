import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Keyboard,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FatSecretAttribution } from "../components/FatSecretAttribution";
import { colors } from "../lib/colors";
import { RecentFood, recentFoods } from "../lib/diary";
import { Food, searchFoods, suggestFoods } from "../lib/foodApi";
import { formatGrams } from "../lib/format";

const DEBOUNCE_MS = 400;

function FoodRow({
    food,
    selected,
    onPress,
    onToggle,
}: {
    food: Food;
    selected: boolean;
    onPress: () => void;
    onToggle: () => void;
}) {
    const serving = food.servings[0];

    return (
        <Pressable
            style={[styles.row, selected ? styles.rowSelected : null]}
            onPress={onPress}
        >
            <View style={styles.rowTop}>
                <View style={styles.rowInfo}>
                    <Text style={styles.rowName} numberOfLines={2}>
                        {food.name}
                    </Text>
                    {food.brand ? <Text style={styles.rowBrand}>{food.brand}</Text> : null}
                    <Text style={styles.rowServing}>{serving.description}</Text>
                </View>

                <Pressable
                    onPress={onToggle}
                    hitSlop={14}
                    style={[styles.check, selected ? styles.checkOn : null]}
                >
                    {selected ? <Text style={styles.checkMark}>✓</Text> : null}
                </Pressable>
            </View>

            <View style={styles.rowMacros}>
                <Text style={[styles.macro, { color: colors.calories }]}>
                    {Math.round(serving.calories)} cal
                </Text>
                <Text style={[styles.macro, { color: colors.protein }]}>
                    P {formatGrams(serving.protein)}g
                </Text>
                <Text style={[styles.macro, { color: colors.carbs }]}>
                    C {formatGrams(serving.carbs)}g
                </Text>
                <Text style={[styles.macro, { color: colors.fat }]}>
                    F {formatGrams(serving.fat)}g
                </Text>
            </View>
        </Pressable>
    );
}

function RecentRow({ food, onPress }: { food: RecentFood; onPress: () => void }) {
    return (
        <Pressable style={styles.row} onPress={onPress}>
            <Text style={styles.rowName} numberOfLines={1}>
                {food.name}
            </Text>
            {food.brand ? <Text style={styles.rowBrand}>{food.brand}</Text> : null}
            <Text style={styles.rowServing}>
                {formatGrams(food.amount)} × {food.serving.description}
            </Text>

            <View style={styles.rowMacros}>
                <Text style={[styles.macro, { color: colors.calories }]}>
                    {Math.round(food.serving.calories * food.amount)} cal
                </Text>
                <Text style={[styles.macro, { color: colors.protein }]}>
                    P {formatGrams(food.serving.protein * food.amount)}g
                </Text>
                <Text style={[styles.macro, { color: colors.carbs }]}>
                    C {formatGrams(food.serving.carbs * food.amount)}g
                </Text>
                <Text style={[styles.macro, { color: colors.fat }]}>
                    F {formatGrams(food.serving.fat * food.amount)}g
                </Text>
            </View>
        </Pressable>
    );
}

export default function Search() {
    const router = useRouter();
    const { date, meal } = useLocalSearchParams<{
        date?: string;
        meal?: string;
    }>();

    function foodHref(foodId: string) {
        const params: { id: string; date?: string; meal?: string } = {
            id: foodId,
        };
        if (date) {
            params.date = date;
        }
        if (meal) {
            params.meal = meal;
        }
        return { pathname: "/food/[id]" as const, params };
    }
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Food[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [recent, setRecent] = useState<RecentFood[]>([]);
    const [selected, setSelected] = useState<Food[]>([]);

    function isSelected(food: Food) {
        return selected.some((item) => item.id === food.id);
    }

    function toggleSelected(food: Food) {
        setSelected((current) =>
            current.some((item) => item.id === food.id)
                ? current.filter((item) => item.id !== food.id)
                : [...current, food]
        );
    }

    const selectedCalories = selected.reduce(
        (sum, food) => sum + food.servings[0].calories,
        0
    );

    function openReview() {
        const params: { ids: string; date?: string; meal?: string } = {
            ids: selected.map((food) => food.id).join(","),
        };
        if (date) {
            params.date = date;
        }
        if (meal) {
            params.meal = meal;
        }
        router.push({ pathname: "/review", params });
    }

    useEffect(() => {
        let cancelled = false;

        recentFoods()
            .then((list) => {
                if (!cancelled) {
                    setRecent(list);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setRecent([]);
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const trimmed = query.trim();

        if (trimmed === "") {
            setResults(null);
            setError(null);
            setSuggestions([]);
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setError(null);

        const timer = setTimeout(async () => {
            try {
                const [found, hints] = await Promise.all([
                    searchFoods(trimmed),
                    suggestFoods(trimmed).catch(() => [] as string[]),
                ]);
                if (!cancelled) {
                    setResults(found);
                    setSuggestions(hints);
                }
            } catch (e) {
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : "Something went wrong");
                    setResults([]);
                    setSuggestions([]);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }, DEBOUNCE_MS);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [query]);

    function clearSearch() {
        setQuery("");
    }

    function renderSuggestions() {
        if (visibleSuggestions.length === 0) {
            return null;
        }

        return (
            <View style={styles.suggestions}>
                {visibleSuggestions.map((suggestion) => (
                    <Pressable
                        key={suggestion}
                        style={styles.chip}
                        onPress={() => {
                            setQuery(suggestion);
                            Keyboard.dismiss();
                        }}
                    >
                        <Text style={styles.chipText}>{suggestion}</Text>
                    </Pressable>
                ))}
            </View>
        );
    }

    function renderBody() {
        if (error) {
            return <Text style={styles.error}>{error}</Text>;
        }
        if (results === null) {
            if (loading) {
                return (
                    <ActivityIndicator color={colors.calories} style={styles.spinner} />
                );
            }
            if (recent.length === 0) {
                return <Text style={styles.hint}>Search for a food to get started</Text>;
            }
            return (
                <FlatList
                    data={recent}
                    keyExtractor={(item) => item.foodId}
                    ListHeaderComponent={
                        <Text style={styles.sectionLabel}>Recent</Text>
                    }
                    renderItem={({ item }) => (
                        <RecentRow
                            food={item}
                            onPress={() => router.push(foodHref(item.foodId))}
                        />
                    )}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    contentContainerStyle={styles.listContent}
                />
            );
        }
        return (
            <FlatList
                data={results}
                keyExtractor={(food) => food.id}
                renderItem={({ item }) => (
                    <FoodRow
                        food={item}
                        selected={isSelected(item)}
                        onPress={() => router.push(foodHref(item.id))}
                        onToggle={() => toggleSelected(item)}
                    />
                )}
                ListHeaderComponent={renderSuggestions()}
                ListEmptyComponent={<Text style={styles.hint}>No results found</Text>}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                contentContainerStyle={styles.listContent}
            />
        );
    }

    const visibleSuggestions = suggestions.filter(
        (s) => s.toLowerCase() !== query.trim().toLowerCase()
    );

    return (
        <SafeAreaView style={styles.screen}>
            <StatusBar style="light" />

            <View style={styles.header}>
                <Pressable onPress={() => router.back()} hitSlop={12}>
                    <Text style={styles.back}>Cancel</Text>
                </Pressable>
                <Text style={styles.title}>Add food</Text>
                <View style={styles.headerSpacer} />
            </View>

            <View style={styles.searchBar}>
                <TextInput
                    style={styles.input}
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search for a food"
                    placeholderTextColor={colors.muted}
                    autoFocus
                    autoCorrect={false}
                    returnKeyType="search"
                />
                {loading ? (
                    <ActivityIndicator color={colors.muted} style={styles.clear} />
                ) : query.length > 0 ? (
                    <Pressable onPress={clearSearch} hitSlop={10} style={styles.clear}>
                        <Text style={styles.clearText}>✕</Text>
                    </Pressable>
                ) : null}
            </View>


            <View style={styles.body}>{renderBody()}</View>

            {selected.length > 0 ? (
                <View style={styles.selectionBar}>
                    <View>
                        <Text style={styles.selectionCount}>
                            {selected.length} selected
                        </Text>
                        <Text style={styles.selectionHint}>
                            about {Math.round(selectedCalories)} cal
                        </Text>
                    </View>

                    <View style={styles.selectionActions}>
                        <Pressable
                            style={styles.selectionButton}
                            onPress={() => setSelected([])}
                        >
                            <Text style={styles.selectionButtonText}>Clear</Text>
                        </Pressable>

                        <Pressable style={styles.reviewButton} onPress={openReview}>
                            <Text style={styles.reviewButtonText}>Review</Text>
                        </Pressable>
                    </View>
                </View>
            ) : null}

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
        marginBottom: 20,
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
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingHorizontal: 16,
    },
    input: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 16,
        color: colors.text,
    },
    clear: {
        paddingLeft: 12,
    },
    clearText: {
        color: colors.muted,
        fontSize: 16,
    },
    suggestions: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 12,
    },
    chip: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 7,
    },
    chipText: {
        color: colors.muted,
        fontSize: 13,
    },
    body: {
        flex: 1,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: colors.muted,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 10,
    },
    spinner: {
        marginTop: 32,
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
    listContent: {
        paddingTop: 16,
        paddingBottom: 16,
    },
    row: {
        backgroundColor: colors.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        marginBottom: 10,
    },
    rowSelected: {
        borderColor: colors.calories,
    },
    rowTop: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
    },
    rowInfo: {
        flex: 1,
    },
    check: {
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: 2,
        borderColor: colors.border,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 2,
    },
    checkOn: {
        backgroundColor: colors.calories,
        borderColor: colors.calories,
    },
    checkMark: {
        color: colors.bg,
        fontSize: 14,
        fontWeight: "800",
    },
    selectionBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 14,
        paddingVertical: 12,
        paddingLeft: 16,
        paddingRight: 12,
        marginBottom: 10,
    },
    selectionCount: {
        color: colors.text,
        fontSize: 15,
        fontWeight: "700",
    },
    selectionHint: {
        color: colors.muted,
        fontSize: 13,
        marginTop: 2,
    },
    selectionActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    selectionButton: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: colors.pill,
    },
    reviewButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: colors.calories,
    },
    reviewButtonText: {
        color: colors.bg,
        fontSize: 14,
        fontWeight: "700",
    },
    selectionButtonText: {
        color: colors.text,
        fontSize: 14,
        fontWeight: "600",
    },
    rowName: {
        color: colors.text,
        fontSize: 16,
        fontWeight: "600",
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
    rowMacros: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        marginTop: 10,
    },
    macro: {
        fontSize: 13,
        fontWeight: "600",
    },
});