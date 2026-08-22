import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

const ACTIVE_WINDOW_MS = 30_000;

export const heartbeat = mutation({
  args: {
    sessionId: v.string(),
    status: v.union(v.literal("contemplating"), v.literal("contributing"))
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_session", q => q.eq("sessionId", args.sessionId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { heartbeat: now, status: args.status });
      return;
    }

    await ctx.db.insert("presence", {
      sessionId: args.sessionId,
      heartbeat: now,
      status: args.status,
      createdAt: now
    });
  }
});

export const getActiveCount = query({
  args: {},
  handler: async ctx => {
    const cutoff = Date.now() - ACTIVE_WINDOW_MS;
    const rows = await ctx.db
      .query("presence")
      .withIndex("by_heartbeat", q => q.gt("heartbeat", cutoff))
      .collect();
    return rows.length;
  }
});

export const cleanupStale = internalMutation({
  args: {},
  handler: async ctx => {
    const cutoff = Date.now() - 120_000;
    const stale = await ctx.db
      .query("presence")
      .withIndex("by_heartbeat", q => q.lt("heartbeat", cutoff))
      .collect();

    for (const row of stale) await ctx.db.delete(row._id);
    return stale.length;
  }
});
