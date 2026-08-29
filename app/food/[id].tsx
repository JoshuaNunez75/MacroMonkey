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
import { colors } from "../../lib/colors";
import { Food, getFood } from "../../lib/foodApi";

export default function FoodDetail() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const [food, setFood] = useState<Food | null>(null);
    const [error, setError] = useState<string | null>(null);

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
        return (
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.name}>{food.name}</Text>
                {food.brand ? <Text style={styles.brand}>{food.brand}</Text> : null}

                <Text style={styles.debug}>
                    {food.servings.length} servings loaded
                </Text>
                <Text style={styles.debug}>
                    Default: {food.servings[0].description}
                </Text>
                <Text style={styles.debug}>
                    Sodium: {food.servings[0].sodium ?? "not provided"}
                </Text>
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
        marginTop: 8,
    },
    brand: {
        fontSize: 15,
        color: colors.muted,
        marginTop: 4,
    },
    debug: {
        fontSize: 14,
        color: colors.muted,
        marginTop: 12,
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