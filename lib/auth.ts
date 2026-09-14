import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
} from "firebase/auth";
import { auth } from "./firebase";

export function messageForAuthError(error: unknown): string {
    const code =
        typeof error === "object" && error !== null && "code" in error
            ? String((error as { code: unknown }).code)
            : "";

    switch (code) {
        case "auth/invalid-email":
            return "That doesn't look like a valid email address.";
        case "auth/missing-password":
            return "Enter a password.";
        case "auth/weak-password":
            return "Password must be at least 6 characters.";
        case "auth/email-already-in-use":
            return "An account already exists for that email. Try signing in instead.";
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
            return "Email or password is incorrect.";
        case "auth/too-many-requests":
            return "Too many attempts. Wait a moment and try again.";
        case "auth/network-request-failed":
            return "Couldn't reach the server. Check your connection.";
        default:
            return "Something went wrong. Please try again.";
    }
}

export async function signUp(email: string, password: string) {
    await createUserWithEmailAndPassword(auth, email.trim(), password);
}

export async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function signOutUser() {
    await signOut(auth);
}