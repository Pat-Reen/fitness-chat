import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";
import { getDb } from "@/lib/gcp";
import type { UserProfile } from "@/types";

const config: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],

  callbacks: {
    /**
     * Only allow users whose email exists in the Firestore `users` collection.
     */
    async signIn({ profile }) {
      if (!profile?.email) return false;
      try {
        const db = getDb();
        const doc = await db.collection("users").doc(profile.email).get();
        return doc.exists;
      } catch {
        return false;
      }
    },

    /**
     * Persist the user's email (our Firestore key) in the JWT.
     */
    async jwt({ token, profile }) {
      if (profile?.email) {
        token.email = profile.email;
      }
      return token;
    },

    /**
     * Expose email on the session object so client components can read it.
     */
    async session({ session, token }) {
      if (token.email) {
        session.user.email = token.email as string;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);

/**
 * Load the full UserProfile from Firestore for the signed-in user.
 */
export async function getSessionUser(email: string): Promise<UserProfile | null> {
  const db = getDb();
  const doc = await db.collection("users").doc(email).get();
  if (!doc.exists) return null;
  return { email, ...doc.data() } as UserProfile;
}
