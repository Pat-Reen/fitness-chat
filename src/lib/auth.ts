import { auth, getSessionUser } from "@/auth";
import type { UserProfile } from "@/types";

/**
 * Get the signed-in UserProfile from Firestore for API route handlers.
 * Returns null if the user is not authenticated or not authorised.
 */
export async function requireAuth(): Promise<UserProfile | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  return getSessionUser(session.user.email);
}
