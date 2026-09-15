import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import {
    // @ts-expect-error - exists at runtime, missing from firebase's type declarations
    getReactNativePersistence,
    initializeAuth
}   from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

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

export const functions = getFunctions(app, "us-central1");