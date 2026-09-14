import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
// @ts-expect-error - getReactNativePersistence exists at runtime but is missing
// from Firebase 12.x type definitions. Delete this comment once they fix it;
// @ts-expect-error will start erroring when the export is properly declared.
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyB3OfHp0QMuHSSbD5TXXvQ5GZpS8g-ASO0",
    authDomain: "macromonkey-8b13d.firebaseapp.com",
    projectId: "macromonkey-8b13d",
    storageBucket: "macromonkey-8b13d.firebasestorage.app",
    messagingSenderId: "816123622487",
    appId: "1:816123622487:web:3fa456358bc189bc079f12"
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
});

export const db = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
});