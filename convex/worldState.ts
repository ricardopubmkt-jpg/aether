import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { breathFromBorn, idleClimate, lerpClimate } from "./physiology";

const climateValidator = v.object({
  intensity: v.number(),
  dominantTone: v.union(
    v.literal("dark"),
    v.literal("ethereal"),
    v.literal("cybernetic"),
    v.literal("void"),
    v.literal("luminous"),
    v.literal("fragmented")
  ),
  density: v.number(),
  novelty: v.number(),
  flow: v.number()
});

export const getLatest = query({
  args: {},
  handler: async ctx => {
    const world = await ctx.db
      .query("worldState")
      .withIndex("by_singleton", q => q.eq("singleton", "aether"))
      .unique();

    if (!world) return null;

    const now = Date.now();
    const bornAt = world.physiology?.bornAt ?? world.updatedAt;
    const breathSequence = breathFromBorn(bornAt, now);

    return {
      ...world,
      physiology: {
        bornAt,
        breathSequence,
        lastBreathAt: now
      }
    };
  }
});

export const initializeWorld = mutation({
  args: {},
  handler: async ctx => {
    const existing = await ctx.db
      .query("worldState")
      .withIndex("by_singleton", q => q.eq("singleton", "aether"))
      .unique();

    if (existing) {
      if (!existing.physiology) {
        const now = Date.now();
        await ctx.db.patch(existing._id, {
          physiology: {
            bornAt: existing.updatedAt,
            breathSequence: breathFromBorn(existing.updatedAt, now),
            lastBreathAt: now
          }
        });
      }
      return existing._id;
    }

    const now = Date.now();
    const climate = idleClimate(1);

    const id = await ctx.db.insert("worldState", {
      singleton: "aether",
      eraName: "Era do Despertar",
      currentNarrative: "O campo está vazio o bastante para ser ocupado. Ainda não pede nada.",
      emotionalClimate: climate,
      physiology: {
        bornAt: now,
        breathSequence: 1,
        lastBreathAt: now
      },
      version: 1,
      updatedAt: now
    });

    await ctx.db.insert("worldStateHistory", {
      worldVersion: 1,
      eraName: "Era do Despertar",
      narrative: "O campo está vazio o bastante para ser ocupado. Ainda não pede nada.",
      emotionalClimate: climate,
      trigger: "initialization",
      createdAt: now
    });

    await ctx.db.insert("pulseState", {
      singleton: "aether",
      running: false
    });

    return id;
  }
});

export const metabolize = internalMutation({
  args: {},
  handler: async ctx => {
    const world = await ctx.db
      .query("worldState")
      .withIndex("by_singleton", q => q.eq("singleton", "aether"))
      .unique();

    if (!world) return;

    const now = Date.now();
    const bornAt = world.physiology?.bornAt ?? world.updatedAt;
    const breathSequence = breathFromBorn(bornAt, now);
    const idle = idleClimate(breathSequence);
    const stale = now - world.updatedAt > 45_000;
    const climate = stale
      ? lerpClimate(world.emotionalClimate, idle, 0.14)
      : world.emotionalClimate;

    await ctx.db.patch(world._id, {
      emotionalClimate: climate,
      physiology: {
        bornAt,
        breathSequence,
        lastBreathAt: now
      }
    });
  }
});

export const commitEvolution = internalMutation({
  args: {
    expectedVersion: v.number(),
    eraName: v.string(),
    narrative: v.string(),
    emotionalClimate: climateValidator,
    trigger: v.string(),
    pulseId: v.id("pulses"),
    contributionIds: v.array(v.id("contributions")),
    echoId: v.optional(v.id("echoes"))
  },
  handler: async (ctx, args) => {
    const world = await ctx.db
      .query("worldState")
      .withIndex("by_singleton", q => q.eq("singleton", "aether"))
      .unique();

    if (!world || world.version !== args.expectedVersion) {
      await ctx.db.patch(args.pulseId, {
        status: "discarded",
        finishedAt: Date.now(),
        error: "Stale World State version; another pulse won the race."
      });
      return { committed: false };
    }

    const now = Date.now();
    const nextVersion = world.version + 1;
    const bornAt = world.physiology?.bornAt ?? world.updatedAt;

    await ctx.db.patch(world._id, {
      eraName: args.eraName,
      currentNarrative: args.narrative,
      emotionalClimate: args.emotionalClimate,
      physiology: {
        bornAt,
        breathSequence: breathFromBorn(bornAt, now),
        lastBreathAt: now
      },
      version: nextVersion,
      updatedAt: now
    });

    await ctx.db.insert("worldStateHistory", {
      worldVersion: nextVersion,
      eraName: args.eraName,
      narrative: args.narrative,
      emotionalClimate: args.emotionalClimate,
      trigger: args.trigger,
      createdAt: now
    });

    for (const id of args.contributionIds) {
      await ctx.db.patch(id, {
        status: "processed",
        processedAt: now
      });
    }

    if (args.echoId) {
      await ctx.db.patch(args.echoId, {
        hasBeenEchoed: true,
        echoedAt: now
      });
    }

    await ctx.db.patch(args.pulseId, {
      status: "completed",
      finishedAt: now,
      resultingWorldVersion: nextVersion
    });

    const lock = await ctx.db
      .query("pulseState")
      .withIndex("by_singleton", q => q.eq("singleton", "aether"))
      .unique();

    if (lock) {
      await ctx.db.patch(lock._id, {
        running: false,
        lockedUntil: undefined
      });
    }

    return { committed: true, version: nextVersion };
  }
});

export const releasePulseLock = internalMutation({
  args: {
    pulseId: v.id("pulses"),
    error: v.string()
  },
  handler: async ctx => {
    const lock = await ctx.db
      .query("pulseState")
      .withIndex("by_singleton", q => q.eq("singleton", "aether"))
      .unique();

    if (lock) {
      await ctx.db.patch(lock._id, {
        running: false,
        lockedUntil: undefined
      });
    }
  }
});
