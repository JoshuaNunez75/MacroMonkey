import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../lib/colors";
import { Food, searchFoods, suggestFoods } from "../lib/foodApi";
import { formatGrams } from "../lib/format";

const DEBOUNCE_MS = 400;

function FoodRow({ food, onPress }: { food: Food; onPress: () => void }) {
    const serving = food.servings[0];

    return (
        <Pressable style={styles.row} onPress={onPress}>
            <Text style={styles.rowName} numberOfLines={1}>
                {food.name}
            </Text>
            {food.brand ? <Text style={styles.rowBrand}>{food.brand}</Text> : null}
            <Text style={styles.rowServing}>{serving.description}</Text>

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

export default function Search() {
    const router = useRouter();
    const { date } = useLocalSearchParams<{ date?: string }>();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Food[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);

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

    function renderBody() {
        if (error) {
            return <Text style={styles.error}>{error}</Text>;
        }
        if (results === null) {
            return loading ? (
                <ActivityIndicator color={colors.calories} style={styles.spinner} />
            ) : (
                <Text style={styles.hint}>Search for a food to get started</Text>
            );
        }
        if (results.length === 0) {
            return <Text style={styles.hint}>No results found</Text>;
        }
        return (
            <FlatList
                data={results}
                keyExtractor={(food) => food.id}
                renderItem={({ item }) => (
                    <FoodRow food={item} onPress={() =>
                            router.push(`/food/${item.id}${date ? `?date=${date}` : ""}`)
                        }
                    />
                )}
                keyboardShouldPersistTaps="handled"
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

            {visibleSuggestions.length > 0 ? (
                <View style={styles.suggestions}>
                    {visibleSuggestions.map((suggestion) => (
                        <Pressable
                            key={suggestion}
                            style={styles.chip}
                            onPress={() => setQuery(suggestion)}
                        >
                            <Text style={styles.chipText}>{suggestion}</Text>
                        </Pressable>
                    ))}
                </View>
            ) : null}

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
        marginTop: 12,
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
        paddingBottom: 40,
    },
    row: {
        backgroundColor: colors.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        marginBottom: 10,
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