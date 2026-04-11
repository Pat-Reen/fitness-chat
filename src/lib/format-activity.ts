import type { Activity } from "@/types";

export function formatActivity(a: Activity): string {
  const parts = [a.type];
  if (a.duration) parts.push(a.duration);
  if (a.distance) parts.push(a.distance);
  if (a.pace) parts.push(`@ ${a.pace}`);
  if (a.heartRate) parts.push(a.heartRate);
  if (a.calories) parts.push(`${a.calories} kcal`);
  if (a.trainingEffect) parts.push(a.trainingEffect);
  if (a.elevationGain) parts.push(a.elevationGain);
  return parts.join(" · ");
}
