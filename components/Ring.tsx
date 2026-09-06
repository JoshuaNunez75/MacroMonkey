import { ReactNode, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
    Easing,
    useAnimatedProps,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type RingProps = {
    size: number;
    strokeWidth: number;
    progress: number;
    color: string;
    trackColor: string;
    children?: ReactNode;
};

export function Ring({
    size,
    strokeWidth,
    progress,
    color,
    trackColor,
    children,
}: RingProps) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const center = size / 2;
    const target = Math.max(0, Math.min(1, progress));

    const fill = useSharedValue(0);

    useEffect(() => {
        fill.value = withTiming(target, {
            duration: 700,
            easing: Easing.out(Easing.cubic),
        });
    }, [target, fill]);

    const animatedProps = useAnimatedProps(() => ({
        strokeDashoffset: circumference * (1 - fill.value),
    }));

    return (
        <View style={[styles.wrapper, { width: size, height: size }]}>
            <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
                <Circle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke={trackColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                <AnimatedCircle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${center} ${center})`}
                    animatedProps={animatedProps}
                />
            </Svg>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        alignItems: "center",
        justifyContent: "center",
    },
});