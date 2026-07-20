// lib/wc2026/source.ts
//
// Leaf module: raw WC2026 JSON loading/parsing only. No imports from
// lib/wc2026/data.ts or lib/wc2026/register.ts — both of those import
// from here instead of from each other, which is what keeps the module
// graph acyclic (data.ts used to import registerWc2026 from register.ts
// while register.ts imported wc2026Matches/wc2026TeamId from data.ts).

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
