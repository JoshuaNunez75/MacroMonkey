import { Linking, Pressable, StyleSheet, Text } from "react-native";
import { colors } from "../lib/colors";

export function FatSecretAttribution() {
  return (
    <Pressable
      onPress={() => Linking.openURL("https://platform.fatsecret.com")}
      hitSlop={8}
      style={styles.wrap}
    >
      <Text style={styles.text}>Powered by fatsecret Platform API</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: "center", paddingTop: 10, paddingBottom: 2 },
  text: { fontSize: 12, color: colors.muted },
});