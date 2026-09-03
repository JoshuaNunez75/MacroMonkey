import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../lib/colors";
import {
  ACTIVITY_LEVELS,
  ActivityKey,
  CALORIES_PER_GRAM,
  DEFAULT_PROFILE,
  loadProfile,
  maintenanceFor,
  Profile,
  saveProfile,
  Sex,
  suggestedCalories,
} from "../lib/profile";

type MacroKey = "protein" | "carbs" | "fat";

const MACRO_LABELS: Record<MacroKey, string> = {
  protein: "Protein",
  carbs: "Carbs",
  fat: "Fat",
};

const MACRO_COLORS: Record<MacroKey, string> = {
  protein: colors.protein,
  carbs: colors.carbs,
  fat: colors.fat,
};

type BodyForm = {
  sex: Sex;
  age: string;
  heightFt: string;
  heightIn: string;
  weightLb: string;
  activity: ActivityKey;
  weeklyChangeLb: number;
};

const RATE_OPTIONS = [
  { value: -1, label: "Gain 1 lb/wk" },
  { value: -0.5, label: "Gain ½ lb/wk" },
  { value: 0, label: "Maintain" },
  { value: 0.5, label: "Lose ½ lb/wk" },
  { value: 1, label: "Lose 1 lb/wk" },
  { value: 1.5, label: "Lose 1½ lb/wk" },
  { value: 2, label: "Lose 2 lb/wk" },
];

function num(text: string) {
  const parsed = Number(text);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function gramsFor(calories: number, percent: number, kcal: number) {
  return (calories * (percent / 100)) / kcal;
}

function percentFor(calories: number, grams: number, kcal: number) {
  if (calories <= 0) {
    return 0;
  }
  return ((grams * kcal) / calories) * 100;
}

export default function Settings() {
  const router = useRouter();

  const [calories, setCalories] = useState(String(DEFAULT_PROFILE.calorieGoal));
  const [macros, setMacros] = useState<
    Record<MacroKey, { pct: string; g: string }>
  >({
    protein: { pct: "30", g: "0" },
    carbs: { pct: "40", g: "0" },
    fat: { pct: "30", g: "0" },
  });
  const [saving, setSaving] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const [body, setBody] = useState<BodyForm>({
    sex: DEFAULT_PROFILE.sex,
    age: String(DEFAULT_PROFILE.age),
    heightFt: String(Math.floor(DEFAULT_PROFILE.heightIn / 12)),
    heightIn: String(DEFAULT_PROFILE.heightIn % 12),
    weightLb: String(DEFAULT_PROFILE.weightLb),
    activity: DEFAULT_PROFILE.activity,
    weeklyChangeLb: DEFAULT_PROFILE.weeklyChangeLb,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const profile = await loadProfile();
      if (cancelled) {
        return;
      }

      const cals = profile.calorieGoal;
      setCalories(String(cals));
      setMacros({
        protein: {
          pct: String(profile.proteinPercent),
          g: String(
            Math.round(
              gramsFor(cals, profile.proteinPercent, CALORIES_PER_GRAM.protein)
            )
          ),
        },
        carbs: {
          pct: String(profile.carbsPercent),
          g: String(
            Math.round(
              gramsFor(cals, profile.carbsPercent, CALORIES_PER_GRAM.carbs)
            )
          ),
        },
        fat: {
          pct: String(profile.fatPercent),
          g: String(
            Math.round(gramsFor(cals, profile.fatPercent, CALORIES_PER_GRAM.fat))
          ),
        },
      });

      setBody({
        sex: profile.sex,
        age: String(profile.age),
        heightFt: String(Math.floor(profile.heightIn / 12)),
        heightIn: String(profile.heightIn % 12),
        weightLb: String(profile.weightLb),
        activity: profile.activity,
        weeklyChangeLb: profile.weeklyChangeLb,
      });
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateCalories(text: string) {
    setCalories(text);
    const cals = num(text);

    setMacros((prev) => {
      const next = { ...prev };
      (Object.keys(prev) as MacroKey[]).forEach((key) => {
        next[key] = {
          pct: prev[key].pct,
          g: String(
            Math.round(gramsFor(cals, num(prev[key].pct), CALORIES_PER_GRAM[key]))
          ),
        };
      });
      return next;
    });
  }

  function updatePercent(key: MacroKey, text: string) {
    const cals = num(calories);
    setMacros((prev) => ({
      ...prev,
      [key]: {
        pct: text,
        g: String(Math.round(gramsFor(cals, num(text), CALORIES_PER_GRAM[key]))),
      },
    }));
  }

  function updateGrams(key: MacroKey, text: string) {
    const cals = num(calories);
    setMacros((prev) => ({
      ...prev,
      [key]: {
        pct: String(
          Math.round(percentFor(cals, num(text), CALORIES_PER_GRAM[key]))
        ),
        g: text,
      },
    }));
  }

  const calcProfile: Profile = {
    ...DEFAULT_PROFILE,
    sex: body.sex,
    age: num(body.age),
    heightIn: num(body.heightFt) * 12 + num(body.heightIn),
    weightLb: num(body.weightLb),
    activity: body.activity,
    weeklyChangeLb: body.weeklyChangeLb,
  };

  const maintenance = Math.round(maintenanceFor(calcProfile));
  const suggested = suggestedCalories(calcProfile);

  const percentSum = num(macros.protein.pct) + num(macros.carbs.pct) + num(macros.fat.pct);
  const balanced = Math.abs(percentSum - 100) < 0.5;

  async function save() {
    setSaving(true);
        await saveProfile({
        calorieGoal: num(calories),
        proteinPercent: num(macros.protein.pct),
        carbsPercent: num(macros.carbs.pct),
        fatPercent: num(macros.fat.pct),
        sex: body.sex,
        age: num(body.age),
        heightIn: num(body.heightFt) * 12 + num(body.heightIn),
        weightLb: num(body.weightLb),
        activity: body.activity,
        weeklyChangeLb: body.weeklyChangeLb,
    });
    setSaving(false);
    router.back();
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Goals</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Daily calories</Text>
        <TextInput
          style={styles.calorieInput}
          value={calories}
          onChangeText={updateCalories}
          keyboardType="number-pad"
          selectTextOnFocus
        />

        <Pressable
          style={styles.calcHeader}
          onPress={() => setShowCalc(!showCalc)}
        >
          <Text style={styles.calcTitle}>Not sure? Work it out</Text>
          <Text style={styles.calcToggle}>{showCalc ? "Hide" : "Show"}</Text>
        </Pressable>

        {showCalc ? (
          <View style={styles.calcBody}>
            <View style={styles.chipRow}>
              {(["male", "female"] as Sex[]).map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setBody({ ...body, sex: option })}
                  style={[styles.chip, body.sex === option && styles.chipOn]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      body.sex === option && styles.chipTextOn,
                    ]}
                  >
                    {option === "male" ? "Male" : "Female"}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Age</Text>
              <View style={styles.field}>
                <TextInput
                  style={styles.smallInput}
                  value={body.age}
                  onChangeText={(text) => setBody({ ...body, age: text })}
                  keyboardType="number-pad"
                  selectTextOnFocus
                />
              </View>
            </View>

            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Height</Text>
              <View style={styles.field}>
                <TextInput
                  style={styles.smallInput}
                  value={body.heightFt}
                  onChangeText={(text) => setBody({ ...body, heightFt: text })}
                  keyboardType="number-pad"
                  selectTextOnFocus
                />
                <Text style={styles.unit}>ft</Text>
              </View>
              <View style={styles.field}>
                <TextInput
                  style={styles.smallInput}
                  value={body.heightIn}
                  onChangeText={(text) => setBody({ ...body, heightIn: text })}
                  keyboardType="number-pad"
                  selectTextOnFocus
                />
                <Text style={styles.unit}>in</Text>
              </View>
            </View>

            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Weight</Text>
              <View style={styles.field}>
                <TextInput
                  style={styles.smallInput}
                  value={body.weightLb}
                  onChangeText={(text) => setBody({ ...body, weightLb: text })}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                />
                <Text style={styles.unit}>lb</Text>
              </View>
            </View>

            <Text style={styles.subLabel}>Activity</Text>
            <View style={styles.chipRow}>
              {ACTIVITY_LEVELS.map((level) => (
                <Pressable
                  key={level.key}
                  onPress={() => setBody({ ...body, activity: level.key })}
                  style={[
                    styles.chip,
                    body.activity === level.key && styles.chipOn,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      body.activity === level.key && styles.chipTextOn,
                    ]}
                  >
                    {level.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.subLabel}>Goal</Text>
            <View style={styles.chipRow}>
              {RATE_OPTIONS.map((option) => (
                <Pressable
                  key={option.label}
                  onPress={() =>
                    setBody({ ...body, weeklyChangeLb: option.value })
                  }
                  style={[
                    styles.chip,
                    body.weeklyChangeLb === option.value && styles.chipOn,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      body.weeklyChangeLb === option.value && styles.chipTextOn,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.calcResult}>
              Maintenance: {maintenance.toLocaleString()} cal/day
            </Text>
            <Text style={styles.calcTarget}>
              Target: {suggested.toLocaleString()} cal/day
            </Text>

            <Pressable
              style={styles.applyButton}
              onPress={() => updateCalories(String(suggested))}
            >
              <Text style={styles.applyButtonText}>Use this as my goal</Text>
            </Pressable>

            <Text style={styles.disclaimer}>
              An estimate from the Mifflin-St Jeor formula. Real needs vary —
              adjust based on what actually happens over a few weeks.
            </Text>
          </View>
        ) : null}

        <Text style={styles.label}>Macro split</Text>

        {(Object.keys(MACRO_LABELS) as MacroKey[]).map((key) => (
          <View key={key} style={styles.macroRow}>
            <Text style={[styles.macroName, { color: MACRO_COLORS[key] }]}>
              {MACRO_LABELS[key]}
            </Text>

            <View style={styles.field}>
              <TextInput
                style={styles.smallInput}
                value={macros[key].pct}
                onChangeText={(text) => updatePercent(key, text)}
                keyboardType="decimal-pad"
                selectTextOnFocus
              />
              <Text style={styles.unit}>%</Text>
            </View>

            <View style={styles.field}>
              <TextInput
                style={styles.smallInput}
                value={macros[key].g}
                onChangeText={(text) => updateGrams(key, text)}
                keyboardType="decimal-pad"
                selectTextOnFocus
              />
              <Text style={styles.unit}>g</Text>
            </View>
          </View>
        ))}

        <Text style={[styles.sum, !balanced && styles.sumWarning]}>
          {Math.round(percentSum)}% of calories assigned
          {balanced ? "" : " — should total 100%"}
        </Text>

        <Pressable
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={save}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? "Saving…" : "Save goals"}
          </Text>
        </Pressable>
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
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 12,
  },
  back: {
    fontSize: 16,
    color: colors.calories,
    width: 60,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.text,
  },
  headerSpacer: {
    width: 60,
  },
  content: {
    paddingBottom: 48,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 10,
  },
  calorieInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
  },
  macroRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  macroName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  smallInput: {
    width: 52,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
    textAlign: "right",
  },
  unit: {
    fontSize: 14,
    color: colors.muted,
    marginLeft: 4,
  },
  calcHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    paddingVertical: 6,
  },
  calcTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  calcToggle: {
    fontSize: 14,
    color: colors.calories,
    fontWeight: "600",
  },
  calcBody: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginTop: 8,
  },
  calcRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 10,
  },
  calcLabel: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    maxWidth: "100%",
  },
  chipOn: {
    backgroundColor: colors.calories,
    borderColor: colors.calories,
  },
  chipText: {
    color: colors.muted,
    fontSize: 13,
  },
  chipTextOn: {
    color: colors.bg,
    fontWeight: "600",
  },
  calcResult: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 22,
  },
  calcTarget: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.calories,
    marginTop: 4,
  },
  applyButton: {
    borderWidth: 1,
    borderColor: colors.calories,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 16,
  },
  applyButtonText: {
    color: colors.calories,
    fontSize: 15,
    fontWeight: "600",
  },
  disclaimer: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 14,
    lineHeight: 17,
  },
  sum: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 4,
  },
  sumWarning: {
    color: colors.carbs,
  },
  saveButton: {
    backgroundColor: colors.calories,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 32,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: "700",
  },
});