import {
    EmailAuthProvider,
    deleteUser,
    reauthenticateWithCredential,
} from "firebase/auth";
import { deleteAllEntries } from "./diary";
import { auth } from "./firebase";
import { deleteProfile } from "./profile";

export async function deleteAccount(password: string): Promise<void> {
    const user = auth.currentUser;
    if (!user || !user.email) {
        throw new Error("Not signed in");
    }

    // Prove identity first. If the password is wrong this throws before
    // anything is deleted.
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);

    // Data before identity: deleting the auth user first would revoke the
    // permission needed to delete the documents.
    await deleteAllEntries();
    await deleteProfile();

    await deleteUser(user);
}