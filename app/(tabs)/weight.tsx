import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
    DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import {
    Keyboard,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../lib/colors";
import { dateFromKey, dateKeyFor, dateLabelFor, todayKey } from "../../lib/diary";
import {
    deleteWeight,
    getWeights,
    movingAverage,
    saveWeight,
    summaryFor,
    WeightEntry,
} from "../../lib/weight";
import Svg, { Circle, Polyline, Text as SvgText } from "react-native-svg";

const CHART_H = 170;
const PAD_TOP = 14;
const PAD_BOTTOM = 24;
const PAD_LEFT = 38;

function WeightChart({ entries }: { entries: WeightEntry[] }) {
    const [width, setWidth] = useState(0);

    const values = entries.map((entry) => entry.weightLb);
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const span = hi - lo < 2 ? 2 : hi - lo;
    const min = lo - span * 0.15;
    const max = hi + span * 0.15;

    const averages = movingAverage(entries);

    function x(index: number) {
        return PAD_LEFT + (index / (entries.length - 1)) * (width - PAD_LEFT);
    }

    function y(value: number) {
        const t = (value - min) / (max - min);
        return PAD_TOP + (1 - t) * (CHART_H - PAD_TOP - PAD_BOTTOM);
    }

    const line = averages
        .map((value, index) => (value === null ? null : `${x(index)},${y(value)}`))
        .filter((point): point is string => point !== null)
        .join(" ");

    return (
        <View
            style={styles.chartInner}
            onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        >
            {width > 0 ? (
                <Svg width={width} height={CHART_H}>
                    <SvgText x={0} y={PAD_TOP + 4} fill={colors.muted} fontSize={10}>
                        {hi.toFixed(1)}
                    </SvgText>
                    <SvgText
                        x={0}
                        y={CHART_H - PAD_BOTTOM}
                        fill={colors.muted}
                        fontSize={10}
                    >
                        {lo.toFixed(1)}
                    </SvgText>

                    <SvgText
                        x={PAD_LEFT}
                        y={CHART_H - 6}
                        fill={colors.muted}
                        fontSize={10}
                    >
                        {entries[0].date.slice(5).replace("-", "/")}
                    </SvgText>
                    <SvgText
                        x={width}
                        y={CHART_H - 6}
                        fill={colors.muted}
                        fontSize={10}
                        textAnchor="end"
                    >
                        {entries[entries.length - 1].date.slice(5).replace("-", "/")}
                    </SvgText>

                    {entries.map((entry, index) => (
                        <Circle
                            key={entry.date}
                            cx={x(index)}
                            cy={y(entry.weightLb)}
                            r={3}
                            fill={colors.muted}
                            opacity={0.5}
                        />
                    ))}

                    {line ? (
                        <Polyline
                            points={line}
                            fill="none"
                            stroke={colors.calories}
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    ) : null}
                </Svg>
            ) : null}
        </View>
    );
}

export default function Weight() {
    const [entries, setEntries] = useState<WeightEntry[]>([]);
    const [input, setInput] = useState("");
    const [busy, setBusy] = useState(false);
    const [dateKey, setDateKey] = useState(todayKey());
    const [pickerOpen, setPickerOpen] = useState(false);

    useFocusEffect(
        useCallback(() => {
            let cancelled = false;

            getWeights()
                .then((list) => {
                    if (!cancelled) {
                        setEntries(list);
                    }
                })
                .catch(() => {
                    if (!cancelled) {
                        setEntries([]);
                    }
                });

            return () => {
                cancelled = true;
            };
        }, [])
    );

    const summary = summaryFor(entries);
    const existing = entries.find((entry) => entry.date === dateKey);
    const parsed = Number(input);
    const valid = Number.isFinite(parsed) && parsed > 0 && parsed < 1000;

    async function save() {
        if (!valid || busy) {
            return;
        }

        setBusy(true);
        Keyboard.dismiss();

        try {
            await saveWeight(dateKey, parsed);
            setInput("");
            setEntries(await getWeights());
        } finally {
            setBusy(false);
        }
    }

    function onDateChange(event: DateTimePickerEvent, selected?: Date) {
        if (Platform.OS !== "ios") {
            setPickerOpen(false);
        }
        if (selected) {
            setDateKey(dateKeyFor(selected));
        }
    }

    async function remove(date: string) {
        await deleteWeight(date);
        setEntries(await getWeights());
    }

    return (
        <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
            <StatusBar style="light" />

            <ScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={styles.title}>Weight</Text>

                <View style={styles.summary}>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryValue}>
                            {summary ? summary.latest.toFixed(1) : "—"}
                        </Text>
                        <Text style={styles.summaryLabel}>LATEST</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryValue}>
                            {summary?.average != null
                                ? summary.average.toFixed(1)
                                : "—"}
                        </Text>
                        <Text style={styles.summaryLabel}>7-DAY AVG</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryValue}>
                            {summary?.change != null
                                ? `${summary.change > 0 ? "+" : "−"}${Math.abs(
                                    summary.change
                                ).toFixed(1)}`
                                : "—"}
                        </Text>
                        <Text style={styles.summaryLabel}>CHANGE</Text>
                    </View>
                </View>

                <View style={styles.entryHead}>
                    <Text style={styles.labelFlush}>Weight</Text>

                    {Platform.OS === "ios" ? (
                        <DateTimePicker
                            value={dateFromKey(dateKey)}
                            mode="date"
                            display="compact"
                            maximumDate={new Date()}
                            onChange={onDateChange}
                            themeVariant="dark"
                            accentColor={colors.calories}
                        />
                    ) : (
                        <>
                            <Pressable
                                style={styles.datePill}
                                onPress={() => setPickerOpen(true)}
                                hitSlop={8}
                            >
                                <Text style={styles.dateText}>{dateLabelFor(dateKey)}</Text>
                            </Pressable>
                            {pickerOpen ? (
                                <DateTimePicker
                                    value={dateFromKey(dateKey)}
                                    mode="date"
                                    display="default"
                                    maximumDate={new Date()}
                                    onChange={onDateChange}
                                />
                            ) : null}
                        </>
                    )}
                </View>

                {pickerOpen ? (
                    Platform.OS === "ios" ? (
                        <View style={styles.pickerCard}>
                            <DateTimePicker
                                value={dateFromKey(dateKey)}
                                mode="date"
                                display="inline"
                                maximumDate={new Date()}
                                onChange={onDateChange}
                                themeVariant="dark"
                                accentColor={colors.calories}
                            />
                            <Pressable
                                style={styles.pickerDone}
                                onPress={() => setPickerOpen(false)}
                            >
                                <Text style={styles.pickerDoneText}>Done</Text>
                            </Pressable>
                        </View>
                    ) : (
                        <DateTimePicker
                            value={dateFromKey(dateKey)}
                            mode="date"
                            display="default"
                            maximumDate={new Date()}
                            onChange={onDateChange}
                        />
                    )
                ) : null}

                <View style={styles.inputRow}>
                    <View style={styles.field}>
                        <TextInput
                            style={styles.input}
                            value={input}
                            onChangeText={setInput}
                            keyboardType="decimal-pad"
                            placeholder="0.0"
                            placeholderTextColor={colors.muted}
                            selectTextOnFocus
                            returnKeyType="done"
                            onSubmitEditing={save}
                        />
                        <Text style={styles.unit}>lb</Text>
                    </View>

                    <Pressable
                        style={[styles.saveButton, (!valid || busy) && styles.saveDisabled]}
                        onPress={save}
                        disabled={!valid || busy}
                    >
                        <Text style={styles.saveText}>
                            {busy ? "Saving…" : existing ? "Update" : "Save"}
                        </Text>
                    </Pressable>
                </View>

                {existing ? (
                    <Text style={styles.replaceHint}>
                        Currently {existing.weightLb.toFixed(1)} lb on this date
                    </Text>
                ) : null}

                {entries.length >= 2 ? (
                    <>
                        <Text style={styles.label}>Trend</Text>
                        <View style={styles.chartCard}>
                            <WeightChart entries={entries} />
                            <Text style={styles.chartNote}>
                                Dots are each weigh-in · line is the 7-day average
                            </Text>
                        </View>
                    </>
                ) : null}

                <Text style={styles.label}>History</Text>
                {entries.length === 0 ? (
                    <Text style={styles.empty}>
                        Log your weight to start tracking a trend
                    </Text>
                ) : (
                    <View style={styles.list}>
                        {[...entries].reverse().map((entry) => (
                            <View key={entry.date} style={styles.row}>
                                <Text style={styles.rowDate}>
                                    {dateLabelFor(entry.date)}
                                </Text>
                                <Text style={styles.rowValue}>
                                    {entry.weightLb.toFixed(1)} lb
                                </Text>
                                <Pressable
                                    onPress={() => remove(entry.date)}
                                    hitSlop={10}
                                    style={styles.rowDelete}
                                >
                                    <Text style={styles.rowDeleteText}>✕</Text>
                                </Pressable>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
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
        marginBottom: 8,
    },
    back: {
        fontSize: 16,
        color: colors.calories,
    },
    content: {
        paddingTop: 8,
        paddingBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: "700",
        color: colors.text,
        marginTop: 4,
    },
    summary: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: 18,
        marginTop: 16,
    },
    summaryItem: {
        flex: 1,
        alignItems: "center",
    },
    summaryDivider: {
        width: 1,
        height: 32,
        backgroundColor: colors.border,
    },
    summaryValue: {
        fontSize: 20,
        fontWeight: "700",
        color: colors.text,
    },
    summaryLabel: {
        fontSize: 10,
        fontWeight: "700",
        letterSpacing: 1.2,
        color: colors.muted,
        marginTop: 4,
    },
    label: {
        fontSize: 13,
        fontWeight: "600",
        color: colors.muted,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginTop: 28,
        marginBottom: 10,
    },
    entryHead: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 28,
        marginBottom: 10,
    },
    labelFlush: {
        fontSize: 13,
        fontWeight: "600",
        color: colors.muted,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    datePill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: colors.pill,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    dateText: {
        fontSize: 13,
        fontWeight: "600",
        color: colors.text,
    },
    pickerCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 8,
        marginBottom: 12,
    },
    pickerDone: {
        alignSelf: "flex-end",
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    pickerDoneText: {
        fontSize: 15,
        fontWeight: "600",
        color: colors.calories,
    },
    inputRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    field: {
        flex: 1,
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
        paddingVertical: 13,
        fontSize: 18,
        fontWeight: "600",
        color: colors.text,
    },
    unit: {
        fontSize: 14,
        color: colors.muted,
        marginLeft: 6,
    },
    saveButton: {
        backgroundColor: colors.calories,
        borderRadius: 12,
        paddingHorizontal: 22,
        paddingVertical: 14,
    },
    saveDisabled: {
        opacity: 0.4,
    },
    saveText: {
        color: colors.bg,
        fontSize: 15,
        fontWeight: "700",
    },
    list: {
        gap: 8,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: colors.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: 13,
        paddingHorizontal: 16,
    },
    rowDate: {
        flex: 1,
        fontSize: 14,
        color: colors.text,
    },
    rowValue: {
        fontSize: 15,
        fontWeight: "700",
        color: colors.calories,
        fontVariant: ["tabular-nums"],
    },
    rowDelete: {
        paddingLeft: 4,
    },
    rowDeleteText: {
        fontSize: 15,
        color: colors.muted,
    },
    empty: {
        fontSize: 14,
        color: colors.muted,
    },
    replaceHint: {
        fontSize: 12,
        color: colors.muted,
        marginTop: 8,
    },
    chartCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
    },
    chartInner: {
        width: "100%",
    },
    chartNote: {
        fontSize: 12,
        color: colors.muted,
        marginTop: 8,
    },
});