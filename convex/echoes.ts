import { internalQuery } from "./_generated/server";

export const getAvailableEcho = internalQuery({
  args: {},
  handler: async ctx => {
    return await ctx.db
      .query("echoes")
      .withIndex("by_echoed_createdAt", q => q.eq("hasBeenEchoed", false))
      .order("asc")
      .first();
  }
});
