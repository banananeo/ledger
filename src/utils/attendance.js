export const REQUIRED_PERCENTAGE = 75;

// safe   -> at/above 75%, margin.value classes can still be missed
// tight  -> at/above 75% but margin.value is 0 (next miss drops you below)
// risk   -> below 75%, margin.value classes must be attended in a row
// unknown -> Academia didn't give us conducted/absent counts, only a %
export function getAttendanceMargin(conducted, absent) {
  const required = REQUIRED_PERCENTAGE / 100;
  if (!conducted || conducted <= 0) {
    return { status: "unknown", value: 0 };
  }
  const attended = conducted - absent;
  if (attended / conducted >= required) {
    const canSkip = Math.floor((attended - required * conducted) / required);
    const value = Math.max(canSkip, 0);
    return { status: value > 0 ? "safe" : "tight", value };
  }
  const mustAttend = Math.ceil((required * conducted - attended) / (1 - required));
  return { status: "risk", value: Math.max(mustAttend, 1) };
}

export function getStatusTone(percentage) {
  if (percentage >= REQUIRED_PERCENTAGE) return "good";
  if (percentage >= 65) return "warning";
  return "danger";
}

export function marginMessage(margin) {
  switch (margin.status) {
    case "safe":
      return `Can skip ${margin.value} more class${margin.value === 1 ? "" : "es"}`;
    case "tight":
      return "No room left — attend the next one";
    case "risk":
      return `Attend the next ${margin.value} class${margin.value === 1 ? "" : "es"} in a row`;
    default:
      return "Not enough data yet";
  }
}

export function marginTone(margin) {
  if (margin.status === "risk") return "danger";
  if (margin.status === "tight") return "warning";
  if (margin.status === "safe") return "good";
  return "warning"; // "unknown" — no conducted/absent data
}
