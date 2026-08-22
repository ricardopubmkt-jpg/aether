import {
  internalMutation,
  internalQuery,
  mutation
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const MAX_LENGTH = 280;
const MIN_INTERVAL_MS = 8_000;

export const submit = mutation({
  args: {
    sessionId: v.string(),
    text: v.string()
  },
  handler: async (ctx, args) => {
    const text = args.text.trim();

    if (text.length < 2) throw new Error("A contribuição é curta demais.");
    if (text.length > MAX_LENGTH) throw new Error(`Use no máximo ${MAX_LENGTH} caracteres.`);

    const last = await ctx.db
      .query("contributions")
      .withIndex("by_session_createdAt", q => q.eq("sessionId", args.sessionId))
      .order("desc")
      .first();

    if (last && Date.now() - last.createdAt < MIN_INTERVAL_MS) {
      throw new Error("O campo precisa de alguns segundos para respirar.");
    }

    const id = await ctx.db.insert("contributions", {
      sessionId: args.sessionId,
      rawText: text,
      status: "queued",
      createdAt: Date.now()
    });

    await ctx.scheduler.runAfter(0, internal.ai.extractContribution, {
      contributionId: id
    });

    await ctx.scheduler.runAfter(5_000, internal.pulse.runIfNeeded, {
      trigger: "contribution"
    });

    return id;
  }
});

export const markExtracting = internalMutation({
  args: { contributionId: v.id("contributions") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.contributionId);
    if (!row || row.status !== "queued") return null;
    await ctx.db.patch(args.contributionId, { status: "extracting" });
    return row;
  }
});

export const saveExtraction = internalMutation({
  args: {
    contributionId: v.id("contributions"),
    intents: v.array(v.string()),
    intensity: v.number(),
    novelty: v.number(),
    createEcho: v.boolean(),
    echoSnippet: v.optional(v.string()),
    echoTheme: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.contributionId);
    if (!row) return;

    await ctx.db.patch(args.contributionId, {
      status: "ready",
      intents: args.intents.slice(0, 3),
      intensity: Math.max(0, Math.min(10, args.intensity)),
      novelty: Math.max(0, Math.min(1, args.novelty)),
      createEcho: args.createEcho
    });

    if (args.createEcho && args.echoSnippet && args.echoTheme) {
      await ctx.db.insert("echoes", {
        sourceContributionId: args.contributionId,
        theme: args.echoTheme.slice(0, 60),
        snippet: args.echoSnippet.slice(0, 180),
        hasBeenEchoed: false,
        createdAt: Date.now()
      });
    }
  }
});

export const reject = internalMutation({
  args: {
    contributionId: v.id("contributions"),
    reason: v.string()
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.contributionId);
    if (!row) return;
    await ctx.db.patch(args.contributionId, {
      status: "rejected",
      rejectionReason: args.reason
    });
  }
});

export const getRecentReady = internalQuery({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("contributions")
      .withIndex("by_status_createdAt", q => q.eq("status", "ready"))
      .order("asc")
      .take(Math.min(args.limit, 50));
  }
});
