import { Stack } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SignInScreen } from "../components/SignInScreen";
import { colors } from "../lib/colors";
import { auth } from "../lib/firebase";

export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setChecking(false);
    });

    return unsubscribe;
  }, []);

  if (checking) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={colors.calories} />
      </View>
    );
  }

  if (!user) {
    return <SignInScreen />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        fullScreenGestureEnabled: false,
      }}
    />
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
});