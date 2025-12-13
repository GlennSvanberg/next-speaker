import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  teams: defineTable({
    name: v.string(),
  }),

  members: defineTable({
    teamId: v.id("teams"),
    name: v.string(),
    color: v.optional(v.string()),
  })
    .index("by_teamId", ["teamId"]),

  notifications: defineTable({
    teamId: v.id("teams"),
    fromMemberId: v.id("members"),
    toMemberId: v.id("members"),
    message: v.optional(v.string()),
  })
    .index("by_teamId", ["teamId"]),
});
