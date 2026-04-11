import { type NextRequest } from "next/server";
import { getAdminAuth, getAdminDb } from "./firebase-admin";
import type { UserProfile } from "@/types";

/**
 * Verify the Firebase ID token from the Authorization header or session cookie.
 * Returns the decoded token uid on success, or null if invalid/missing.
 */
export async function verifyToken(req: NextRequest): Promise<string | null> {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : req.cookies.get("session")?.value;

    if (!token) return null;

    const decoded = await getAdminAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

/**
 * Load the authorised user profile from Firestore.
 * Returns null if the uid is not in the users collection (unauthorised).
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const db = getAdminDb();
  const doc = await db.collection("users").doc(uid).get();
  if (!doc.exists) return null;
  return { uid, ...doc.data() } as UserProfile;
}

/**
 * Combined helper: verify token + load profile.
 * Returns null if unauthorised.
 */
export async function requireAuth(req: NextRequest): Promise<UserProfile | null> {
  const uid = await verifyToken(req);
  if (!uid) return null;
  return getUserProfile(uid);
}
