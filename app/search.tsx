import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
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
import { Food, searchFoods } from "../lib/foodApi";
import { formatGrams } from "../lib/format";

function FoodRow({ food }: { food: Food }) {
    const serving = food.servings[0];

    return (
        <View style={styles.row}>
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
        </View>
    );
}

export default function Search() {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Food[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function runSearch() {
        const trimmed = query.trim();
        if (trimmed === "") {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const found = await searchFoods(trimmed);
            setResults(found);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong");
            setResults([]);
        } finally {
            setLoading(false);
        }
    }

    function clearSearch() {
        setQuery("");
        setResults(null);
        setError(null);
    }

    function renderBody() {
        if (loading) {
            return <ActivityIndicator color={colors.calories} style={styles.spinner} />;
        }
        if (error) {
            return <Text style={styles.error}>{error}</Text>;
        }
        if (results === null) {
            return <Text style={styles.hint}>Search for a food to get started</Text>;
        }
        if (results.length === 0) {
            return <Text style={styles.hint}>No results found</Text>;
        }
        return (
            <FlatList
                data={results}
                keyExtractor={(food) => food.id}
                renderItem={({ item }) => <FoodRow food={item} />}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.listContent}
            />
        );
    }

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
                    onSubmitEditing={runSearch}
                    placeholder="Search for a food"
                    placeholderTextColor={colors.muted}
                    autoFocus
                    autoCorrect={false}
                    returnKeyType="search"
                />
                {query.length > 0 ? (
                    <Pressable onPress={clearSearch} hitSlop={10} style={styles.clear}>
                        <Text style={styles.clearText}>✕</Text>
                    </Pressable>
                ) : null}
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