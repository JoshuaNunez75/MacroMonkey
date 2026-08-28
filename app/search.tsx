import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../lib/colors";

export default function Search() {
    const router = useRouter();
    const [query, setQuery] = useState("");

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

            <Text style={styles.debug}>
                {query.length === 0 ? "Type something…" : `You typed: ${query}`}
            </Text>
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
    input: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: colors.text,
    },
    debug: {
        color: colors.muted,
        fontSize: 14,
        marginTop: 20,
    },
});