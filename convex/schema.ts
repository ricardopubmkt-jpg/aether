import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const tone = v.union(
  v.literal("dark"),
  v.literal("ethereal"),
  v.literal("cybernetic"),
  v.literal("void"),
  v.literal("luminous"),
  v.literal("fragmented")
);

const climate = v.object({
  intensity: v.number(),
  dominantTone: tone,
  density: v.number(),
  novelty: v.number(),
  flow: v.number()
});

const physiology = v.object({
  bornAt: v.number(),
  breathSequence: v.number(),
  lastBreathAt: v.number()
});

export default defineSchema({
  presence: defineTable({
    sessionId: v.string(),
    userId: v.optional(v.string()),
    heartbeat: v.number(),
    status: v.union(v.literal("contemplating"), v.literal("contributing")),
    createdAt: v.number()
  })
    .index("by_session", ["sessionId"])
    .index("by_heartbeat", ["heartbeat"]),

  contributions: defineTable({
    sessionId: v.string(),
    userId: v.optional(v.string()),
    rawText: v.string(),
    status: v.union(
      v.literal("queued"),
      v.literal("extracting"),
      v.literal("ready"),
      v.literal("processed"),
      v.literal("rejected")
    ),
    intents: v.optional(v.array(v.string())),
    intensity: v.optional(v.number()),
    novelty: v.optional(v.number()),
    createEcho: v.optional(v.boolean()),
    rejectionReason: v.optional(v.string()),
    createdAt: v.number(),
    processedAt: v.optional(v.number())
  })
    .index("by_status_createdAt", ["status", "createdAt"])
    .index("by_session_createdAt", ["sessionId", "createdAt"]),

  worldState: defineTable({
    singleton: v.literal("aether"),
    eraName: v.string(),
    currentNarrative: v.string(),
    emotionalClimate: climate,
    physiology: v.optional(physiology),
    version: v.number(),
    updatedAt: v.number()
  }).index("by_singleton", ["singleton"]),

  worldStateHistory: defineTable({
    worldVersion: v.number(),
    eraName: v.string(),
    narrative: v.string(),
    emotionalClimate: climate,
    trigger: v.string(),
    createdAt: v.number()
  }).index("by_version", ["worldVersion"]),

  echoes: defineTable({
    sourceContributionId: v.id("contributions"),
    theme: v.string(),
    snippet: v.string(),
    hasBeenEchoed: v.boolean(),
    createdAt: v.number(),
    echoedAt: v.optional(v.number())
  }).index("by_echoed_createdAt", ["hasBeenEchoed", "createdAt"]),

  pulses: defineTable({
    status: v.union(
      v.literal("running"),
      v.literal("completed"),
      v.literal("discarded"),
      v.literal("failed")
    ),
    trigger: v.string(),
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
    contributionCount: v.number(),
    signalSummary: v.array(v.string()),
    previousWorldVersion: v.number(),
    resultingWorldVersion: v.optional(v.number()),
    error: v.optional(v.string())
  }).index("by_startedAt", ["startedAt"]),

  pulseState: defineTable({
    singleton: v.literal("aether"),
    running: v.boolean(),
    lockedUntil: v.optional(v.number())
  }).index("by_singleton", ["singleton"])
});
