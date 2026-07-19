// lib/wc2026/data.ts
//
// Thin read-only accessors over the WC2026 raw JSON dataset
// (data/wc2026/matches.json). No mutation, no registration side effects —
// that lives in lib/wc2026/register.ts.

import type { Wc2026Match } from "@/lib/wc2026/types";
import matchesJson from "@/data/wc2026/matches.json";

const ALL_MATCHES = matchesJson as Wc2026Match[];

export function wc2026Matches(): Wc2026Match[] {
  return ALL_MATCHES.filter((m) => !m.excluded);
}

export function wc2026MatchById(id: string): Wc2026Match | undefined {
  return ALL_MATCHES.find((m) => m.id === id);
}

export function wc2026TeamId(code: string): string {
  return "wc_" + code.toLowerCase();
}
