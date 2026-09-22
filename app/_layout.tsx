import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { onAuthStateChanged, User } from "firebase/auth";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AnimatedSplash } from "../components/AnimatedSplash";
import { SignInScreen } from "../components/SignInScreen";
import { colors } from "../lib/colors";
import { auth } from "../lib/firebase";

SplashScreen.preventAutoHideAsync().catch(() => { });

export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setChecking(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => { });
  }, []);

  function renderApp() {
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

  return (
    <View style={styles.root}>
      {renderApp()}
      {introDone ? null : (
        <AnimatedSplash onFinish={() => setIntroDone(true)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  splash: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
});