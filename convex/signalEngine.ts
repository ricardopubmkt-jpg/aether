import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

const WEIGHTS: Record<string, number> = {
  urgência: 1.4,
  raiva: 1.35,
  medo: 1.25,
  solidão: 1.1,
  cansaço: .95,
  saudade: .9,
  esperança: .8,
  amor: .75,
  alegria: .7,
  silêncio: .55,
  vazio: .7,
  futuro: .65,
  presença: .5
};

export const aggregate = internalQuery({
  args: { limit: v.number() },
  handler: async ctx => {
    const rows = await ctx.db
      .query("contributions")
      .withIndex("by_status_createdAt", q => q.eq("status", "ready"))
      .order("asc")
      .take(Math.min(args.limit, 50));

    const counts = new Map<string, number>();
    let intensitySum = 0;
    let noveltySum = 0;

    for (const row of rows) {
      intensitySum += row.intensity ?? 4;
      noveltySum += row.novelty ?? .5;

      for (const intent of row.intents ?? []) {
        counts.set(intent, (counts.get(intent) ?? 0) + 1);
      }
    }

    const dominantSignals = [...counts.entries()]
      .sort((a, b) => {
        const wa = a[1] * (WEIGHTS[a[0]] ?? .5);
        const wb = b[1] * (WEIGHTS[b[0]] ?? .5);
        return wb - wa;
      })
      .slice(0, 8)
      .map(([name]) => name);

    const count = Math.max(rows.length, 1);

    return {
      contributionCount: rows.length,
      dominantSignals,
      intensity: Math.max(0, Math.min(10, intensitySum / count)),
      novelty: Math.max(0, Math.min(1, noveltySum / count))
    };
  }
});
