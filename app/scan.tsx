import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../lib/colors";

export default function Scan() {
    const router = useRouter();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState<string | null>(null);
    const lockedRef = useRef(false);

    function scanAgain() {
        lockedRef.current = false;
        setScanned(null);
    }

    function onBarcodeScanned(result: { data: string; type: string }) {
        if (lockedRef.current) {
            return;
        }
        lockedRef.current = true;
        setScanned(result.data);
        console.log(
            "BARCODE:",
            result.type,
            result.data,
            "length",
            result.data.length
        );
    }

    function renderBody() {
        if (!permission) {
            return <Text style={styles.message}>Checking camera permission…</Text>;
        }

        if (!permission.granted) {
            return (
                <View style={styles.center}>
                    <Text style={styles.message}>
                        MacroMonkey needs camera access to scan barcodes.
                    </Text>
                    <Pressable style={styles.button} onPress={requestPermission}>
                        <Text style={styles.buttonText}>Allow camera</Text>
                    </Pressable>
                </View>
            );
        }

        return (
            <View style={styles.cameraWrap}>
                <CameraView
                    style={styles.camera}
                    facing="back"
                    barcodeScannerSettings={{
                        barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"],
                    }}
                    onBarcodeScanned={scanned ? undefined : onBarcodeScanned}
                />
                <View style={styles.frame} pointerEvents="none" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.screen}>
            <StatusBar style="light" />

            <View style={styles.header}>
                <Pressable onPress={() => router.back()} hitSlop={12}>
                    <Text style={styles.back}>Cancel</Text>
                </Pressable>
                <Text style={styles.title}>Scan barcode</Text>
                <View style={styles.headerSpacer} />
            </View>

            {renderBody()}

            {scanned ? (
                <View style={styles.result}>
                    <Text style={styles.resultLabel}>Scanned</Text>
                    <Text style={styles.resultCode}>{scanned}</Text>
                    <Pressable style={styles.button} onPress={scanAgain}>
                        <Text style={styles.buttonText}>Scan again</Text>
                    </Pressable>
                </View>
            ) : null}
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
        marginBottom: 16,
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
    cameraWrap: {
        height: 320,
        borderRadius: 20,
        overflow: "hidden",
        backgroundColor: colors.card,
    },
    camera: {
        flex: 1,
    },
    frame: {
        position: "absolute",
        top: 80,
        bottom: 80,
        left: 32,
        right: 32,
        borderWidth: 2,
        borderColor: colors.calories,
        borderRadius: 14,
    },
    center: {
        alignItems: "center",
        marginTop: 60,
    },
    message: {
        fontSize: 15,
        color: colors.muted,
        textAlign: "center",
        lineHeight: 21,
    },
    button: {
        backgroundColor: colors.calories,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 24,
        alignItems: "center",
        marginTop: 20,
    },
    buttonText: {
        color: colors.bg,
        fontSize: 15,
        fontWeight: "700",
    },
    result: {
        backgroundColor: colors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 20,
        marginTop: 20,
        alignItems: "center",
    },
    resultLabel: {
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 1.2,
        color: colors.muted,
    },
    resultCode: {
        fontSize: 22,
        fontWeight: "700",
        color: colors.text,
        marginTop: 6,
    },
});