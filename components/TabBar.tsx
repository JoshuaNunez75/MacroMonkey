import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../lib/colors";

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();
    const [width, setWidth] = useState(0);

    const tabWidth = width / state.routes.length;
    const slide = useSharedValue(0);

    useEffect(() => {
        slide.value = withTiming(state.index * tabWidth, {
            duration: 260,
            easing: Easing.out(Easing.cubic),
        });
    }, [state.index, tabWidth]);

    const pillStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: slide.value }],
    }));

    return (
        <View
            style={[styles.bar, { paddingBottom: insets.bottom }]}
            onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        >
            {width > 0 ? (
                <Animated.View
                    style={[styles.pillWrap, { width: tabWidth }, pillStyle]}
                    pointerEvents="none"
                >
                    <View style={styles.pill} />
                </Animated.View>
            ) : null}

            {state.routes.map((route, index) => {
                const focused = state.index === index;
                const { options } = descriptors[route.key];
                const tint = focused ? colors.calories : colors.muted;

                return (
                    <Pressable
                        key={route.key}
                        style={styles.tab}
                        onPress={() => {
                            const event = navigation.emit({
                                type: "tabPress",
                                target: route.key,
                                canPreventDefault: true,
                            });

                            if (!focused && !event.defaultPrevented) {
                                navigation.navigate(route.name as never);
                            }
                        }}
                    >
                        {options.tabBarIcon
                            ? options.tabBarIcon({ focused, color: tint, size: 22 })
                            : null}

                        <Text style={[styles.label, { color: tint }]}>
                            {options.title ?? route.name}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    bar: {
        flexDirection: "row",
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 8,
    },
    pillWrap: {
        position: "absolute",
        left: 0,
        top: 9,
        height: 52,
        alignItems: "center",
        justifyContent: "center",
    },
    pill: {
        width: 68,
        height: 50,
        borderRadius: 999,
        backgroundColor: colors.pill,
    },
    tab: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        paddingVertical: 6,
    },
    label: {
        fontSize: 11,
        fontWeight: "600",
    },
});