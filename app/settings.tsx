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
  CALORIES_PER_GRAM,
  DEFAULT_PROFILE,
  loadProfile,
  saveProfile,
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

  const percentSum =
    num(macros.protein.pct) + num(macros.carbs.pct) + num(macros.fat.pct);
  const balanced = Math.abs(percentSum - 100) < 0.5;

  async function save() {
    setSaving(true);
    await saveProfile({
      calorieGoal: num(calories),
      proteinPercent: num(macros.protein.pct),
      carbsPercent: num(macros.carbs.pct),
      fatPercent: num(macros.fat.pct),
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