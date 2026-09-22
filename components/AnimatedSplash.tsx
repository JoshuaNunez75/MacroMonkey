import { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, {
    Easing,
    SharedValue,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withTiming,
} from "react-native-reanimated";
import { colors } from "../lib/colors";

const BADGE = 220;
const NAME = "MacroMonkey";
const STAGGER = 0.05;
const WINDOW = 0.45;

function Letter({
    char,
    index,
    progress,
}: {
    char: string;
    index: number;
    progress: SharedValue<number>;
}) {
    const style = useAnimatedStyle(() => {
        const start = index * STAGGER;
        const raw = (progress.value - start) / WINDOW;
        const t = Math.min(1, Math.max(0, raw));
        const eased = 1 - Math.pow(1 - t, 3);

        return {
            opacity: eased,
            transform: [{ translateY: 26 * (1 - eased) }],
        };
    });

    const tint = index >= 5 ? colors.calories : colors.text;

    return (
        <Animated.Text style={[styles.name, { color: tint }, style]}>
            {char}
        </Animated.Text>
    );
}

export function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
    const fade = useSharedValue(1);
    const lift = useSharedValue(0);
    const scale = useSharedValue(1);
    const progress = useSharedValue(0);

    useEffect(() => {
        lift.value = withDelay(
            200,
            withTiming(-38, { duration: 520, easing: Easing.out(Easing.cubic) })
        );
        scale.value = withDelay(
            200,
            withTiming(1.1, { duration: 520, easing: Easing.out(Easing.cubic) })
        );
        progress.value = withDelay(
            500,
            withTiming(1, { duration: 800, easing: Easing.linear })
        );
        fade.value = withDelay(1450, withTiming(0, { duration: 340 }));

        const timer = setTimeout(onFinish, 1820);
        return () => clearTimeout(timer);
    }, []);

    const screenStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

    const badgeStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: lift.value }, { scale: scale.value }],
    }));

    return (
        <Animated.View style={[styles.screen, screenStyle]} pointerEvents="none">
            <Animated.View style={badgeStyle}>
                <Image
                    source={require("../assets/images/splash-icon.png")}
                    style={styles.badge}
                />
            </Animated.View>

            <View style={styles.nameWrap}>
                <View style={styles.nameRow}>
                    {NAME.split("").map((char, index) => (
                        <Letter
                            key={`${char}-${index}`}
                            char={char}
                            index={index}
                            progress={progress}
                        />
                    ))}
                </View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    screen: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.bg,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
    },
    badge: {
        width: BADGE,
        height: BADGE,
        resizeMode: "contain",
    },
    nameWrap: {
        ...StyleSheet.absoluteFillObject,
        alignItems: "center",
        justifyContent: "center",
    },
    nameRow: {
        flexDirection: "row",
        transform: [{ translateY: 150 }],
    },
    name: {
        fontSize: 34,
        fontWeight: "800",
        color: colors.text,
        letterSpacing: 0.5,
    },
});