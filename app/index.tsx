import { StatusBar } from "expo-status-bar";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { searchFoods } from "../lib/foodApi";

const colors = {
  bg: "#0F1115",
  card: "#181B22",
  border: "#252A34",
  text: "#F2F4F7",
  muted: "#8A91A0",
  calories: "#34D399",
  protein: "#F87171",
  carbs: "#FBBF24",
  fat: "#60A5FA",
};

// PLACEHOLDER - settings will replace this.
const goals = {
  calories: 2200,
  protein: 165,
  carbs: 220,
  fat: 73,
};

export default function Index() {
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Today</Text>
        <Text style={styles.date}>Monday, August 24</Text>

        <View style={styles.card}>
          <Text style={styles.calorieNumber}>0</Text>
          <Text style={styles.calorieGoal}>of {goals.calories.toLocaleString()} cal</Text>

          <View style={styles.macroRow}>
            <View style={styles.macro}>
              <Text style={[styles.macroValue, { color: colors.protein }]}>0g</Text>
              <Text style={styles.macroLabel}>Protein</Text>
              <Text style={styles.macroGoal}>of {goals.protein}g</Text>
            </View>
            <View style={styles.macro}>
              <Text style={[styles.macroValue, { color: colors.carbs }]}>0g</Text>
              <Text style={styles.macroLabel}>Carbs</Text>
              <Text style={styles.macroGoal}>of {goals.carbs}g</Text>
            </View>
            <View style={styles.macro}>
              <Text style={[styles.macroValue, { color: colors.fat }]}>0g</Text>
              <Text style={styles.macroLabel}>Fat</Text>
              <Text style={styles.macroGoal}>of {goals.fat}g</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Meals</Text>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Nothing logged yet</Text>
          <Text style={styles.emptySub}>Food you add today will show up here</Text>
        </View>
        <Pressable
          style={styles.testButton}
          onPress={async () => {
            try {
              const results = await searchFoods("banana");
              console.log("RESULTS:", results.length);
              console.log(JSON.stringify(results.slice(0, 3), null, 2));
            } 
            catch (error) {
              console.log("SEARCH FAILED:", error);
            }
          }}
        >
          <Text style={styles.testButtonText}>Test search: banana</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 48,
  },
  title: {
    fontSize: 34,
    fontWeight: "700",
    color: colors.text,
    marginTop: 12,
  },
  date: {
    fontSize: 15,
    color: colors.muted,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    marginTop: 24,
    alignItems: "center",
  },
  calorieNumber: {
    fontSize: 56,
    fontWeight: "700",
    color: colors.calories,
  },
  calorieGoal: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 2,
  },
  macroRow: {
    flexDirection: "row",
    marginTop: 24,
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 20,
  },
  macro: {
    flex: 1,
    alignItems: "center",
  },
  macroValue: {
    fontSize: 20,
    fontWeight: "600",
  },
  macroLabel: {
    fontSize: 13,
    color: colors.text,
    marginTop: 4,
  },
  macroGoal: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
    marginTop: 32,
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.text,
  },
  emptySub: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 4,
    textAlign: "center",
  },
  testButton: {
    backgroundColor: colors.calories,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
  },
  testButtonText: {
    color: colors.bg,
    fontSize: 15,
    fontWeight: "600",
  },
});