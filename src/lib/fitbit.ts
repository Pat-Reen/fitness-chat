import { getDb } from "./gcp";
import type { FitbitTokens, Activity } from "@/types";

const FITBIT_TOKEN_URL = "https://api.fitbit.com/oauth2/token";
const FITBIT_ACTIVITIES_URL =
  "https://api.fitbit.com/1/user/-/activities/list.json";

export function getFitbitAuthUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.FITBIT_CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    scope: "activity heartrate",
    expires_in: "604800",
  });
  return `https://www.fitbit.com/oauth2/authorize?${params}`;
}

function basicAuth(): string {
  return Buffer.from(
    `${process.env.FITBIT_CLIENT_ID}:${process.env.FITBIT_CLIENT_SECRET}`
  ).toString("base64");
}

export async function exchangeCode(
  code: string,
  redirectUri: string
): Promise<FitbitTokens> {
  const res = await fetch(FITBIT_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) throw new Error(`Fitbit token exchange failed: ${res.status}`);
  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

async function refreshTokens(tokens: FitbitTokens): Promise<FitbitTokens> {
  const res = await fetch(FITBIT_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`Fitbit token refresh failed: ${res.status}`);
  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

/**
 * Load Fitbit tokens from Firestore (keyed by user email), refresh if expired.
 * Returns null if no tokens stored.
 */
export async function getValidFitbitToken(email: string): Promise<string | null> {
  const db = getDb();
  const doc = await db.collection("users").doc(email).get();
  const tokens = doc.data()?.fitbitTokens as FitbitTokens | undefined;
  if (!tokens) return null;

  // Refresh if expiring within 5 minutes
  if (tokens.expiresAt - Date.now() < 5 * 60 * 1000) {
    const fresh = await refreshTokens(tokens);
    await db.collection("users").doc(email).update({ fitbitTokens: fresh });
    return fresh.accessToken;
  }
  return tokens.accessToken;
}

export async function saveFitbitTokens(email: string, tokens: FitbitTokens): Promise<void> {
  const db = getDb();
  await db.collection("users").doc(email).update({ fitbitTokens: tokens });
}

export async function fetchFitbitActivities(accessToken: string): Promise<Activity[]> {
  const afterDate = new Date();
  afterDate.setDate(afterDate.getDate() - 7);
  const after = afterDate.toISOString().split("T")[0] + "T00:00:00";

  const url = `${FITBIT_ACTIVITIES_URL}?afterDate=${after}&sort=desc&offset=0&limit=20`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Fitbit activities fetch failed: ${res.status}`);
  const data = await res.json();

  return (data.activities ?? []).map((a: Record<string, unknown>) => ({
    date: String(a.startTime ?? "").split("T")[0],
    type: String(a.activityName ?? "Activity"),
    duration: a.duration ? `${Math.round(Number(a.duration) / 60000)} min` : undefined,
    distance:
      a.distance != null ? `${Number(Number(a.distance).toFixed(2))} km` : undefined,
    heartRate: a.averageHeartRate != null ? `${a.averageHeartRate} bpm avg` : undefined,
    calories: a.calories != null ? Number(a.calories) : undefined,
    trainingEffect: undefined,
  }));
}
