import {
  internalAction,
  internalMutation,
  internalQuery
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const MIN_BATCH = 15;
const BREATH_MS = 5 * 60_000;
const LOCK_MS = 120_000;

export const tryStart = internalMutation({
  args: { trigger: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();

    let lock = await ctx.db
      .query("pulseState")
      .withIndex("by_singleton", q => q.eq("singleton", "aether"))
      .unique();

    if (!lock) {
      const id = await ctx.db.insert("pulseState", {
        singleton: "aether",
        running: false
      });
      lock = await ctx.db.get(id);
    }

    if (!lock) return null;

    if (lock.running && (lock.lockedUntil ?? 0) > now) {
      return null;
    }

    await ctx.db.patch(lock._id, {
      running: true,
      lockedUntil: now + LOCK_MS
    });

    const world = await ctx.db
      .query("worldState")
      .withIndex("by_singleton", q => q.eq("singleton", "aether"))
      .unique();

    if (!world) {
      await ctx.db.patch(lock._id, {
        running: false,
        lockedUntil: undefined
      });
      return null;
    }

    const ready = await ctx.db
      .query("contributions")
      .withIndex("by_status_createdAt", q => q.eq("status", "ready"))
      .order("asc")
      .take(30);

    if (!ready.length) {
      await ctx.db.patch(lock._id, {
        running: false,
        lockedUntil: undefined
      });
      return null;
    }

    const oldestAge = now - ready[0].createdAt;
    const batchThresholdReached = ready.length >= MIN_BATCH;
    const breathingWindowReached = oldestAge >= BREATH_MS;

    if (!batchThresholdReached && !breathingWindowReached) {
      await ctx.db.patch(lock._id, {
        running: false,
        lockedUntil: undefined
      });
      return null;
    }

    const pulseId = await ctx.db.insert("pulses", {
      status: "running",
      trigger: args.trigger,
      startedAt: now,
      contributionCount: ready.length,
      signalSummary: ready.flatMap(x => x.intents ?? []).slice(0, 30),
      previousWorldVersion: world.version
    });

    const echo = await ctx.db
      .query("echoes")
      .withIndex("by_echoed_createdAt", q => q.eq("hasBeenEchoed", false))
      .order("asc")
      .first();

    return {
      pulseId,
      world,
      ready,
      echo,
      trigger: args.trigger
    };
  }
});

export const runIfNeeded = internalAction({
  args: { trigger: v.string() },
  handler: async (ctx, args) => {
    const batch = await ctx.runMutation(internal.pulse.tryStart, {
      trigger: args.trigger
    });

    if (!batch) return;

    const signals = await ctx.runQuery(internal.signalEngine.aggregate, {
      limit: batch.ready.length
    });

    await ctx.runAction(internal.ai.weave, {
      pulseId: batch.pulseId,
      expectedVersion: batch.world.version,
      eraName: batch.world.eraName,
      narrative: batch.world.currentNarrative,
      climate: batch.world.emotionalClimate,
      signals: signals.dominantSignals,
      aggregate: signals,
      echoSnippet: batch.echo?.snippet,
      echoId: batch.echo?._id,
      contributionIds: batch.ready.map(x => x._id),
      trigger: args.trigger
    });
  }
});

export const maybePulse = internalQuery({
  args: {},
  handler: async ctx => {
    const rows = await ctx.db
      .query("contributions")
      .withIndex("by_status_createdAt", q => q.eq("status", "ready"))
      .take(MIN_BATCH);
    return rows.length >= MIN_BATCH;
  }
});
