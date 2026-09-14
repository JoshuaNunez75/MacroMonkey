import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { messageForAuthError, signIn, signUp } from "../lib/auth";
import { colors } from "../lib/colors";
import { FatSecretAttribution } from "./FatSecretAttribution";

export function SignInScreen() {
    const [creating, setCreating] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function submit() {
        setBusy(true);
        setError(null);

        try {
            if (creating) {
                await signUp(email, password);
            } else {
                await signIn(email, password);
            }
        } catch (e) {
            setError(messageForAuthError(e));
            setBusy(false);
        }
    }

    return (
        <SafeAreaView style={styles.screen}>
            <StatusBar style="light" />
            <KeyboardAvoidingView
                style={styles.center}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <Text style={styles.title}>MacroMonkey</Text>
                <Text style={styles.subtitle}>
                    {creating ? "Create an account to sync your food log" : "Sign in to your food log"}
                </Text>

                <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Email"
                    placeholderTextColor={colors.muted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="emailAddress"
                />

                <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Password"
                    placeholderTextColor={colors.muted}
                    secureTextEntry
                    autoCapitalize="none"
                    textContentType={creating ? "newPassword" : "password"}
                />

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <Pressable
                    style={[styles.button, busy && styles.buttonDisabled]}
                    onPress={submit}
                    disabled={busy}
                >
                    <Text style={styles.buttonText}>
                        {busy ? "Please wait…" : creating ? "Create account" : "Sign in"}
                    </Text>
                </Pressable>

                <Pressable
                    onPress={() => {
                        setCreating(!creating);
                        setError(null);
                    }}
                    hitSlop={8}
                    style={styles.toggle}
                >
                    <Text style={styles.toggleText}>
                        {creating ? "Already have an account? Sign in" : "New here? Create an account"}
                    </Text>
                </Pressable>
            </KeyboardAvoidingView>
            <FatSecretAttribution />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.bg,
        paddingHorizontal: 28,
    },
    center: {
        flex: 1,
        justifyContent: "center",
    },
    title: {
        fontSize: 32,
        fontWeight: "700",
        color: colors.text,
        textAlign: "center",
    },
    subtitle: {
        fontSize: 15,
        color: colors.muted,
        textAlign: "center",
        marginTop: 8,
        marginBottom: 32,
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
        marginBottom: 12,
    },
    error: {
        fontSize: 14,
        color: colors.overText,
        marginBottom: 12,
        lineHeight: 19,
    },
    button: {
        backgroundColor: colors.calories,
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: "center",
        marginTop: 8,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: colors.bg,
        fontSize: 16,
        fontWeight: "700",
    },
    toggle: {
        alignSelf: "center",
        marginTop: 20,
        paddingVertical: 8,
    },
    toggleText: {
        fontSize: 14,
        color: colors.calories,
        fontWeight: "600",
    },
});