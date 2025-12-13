import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Id } from './_generated/dataModel'

// Predefined color palette for members - modern, contemporary colors
const MEMBER_COLORS = [
  '#EF4444', // Modern Red
  '#10B981', // Modern Green
  '#3B82F6', // Modern Blue
  '#8B5CF6', // Modern Purple
  '#F59E0B', // Modern Amber
  '#06B6D4', // Modern Cyan
  '#EC4899', // Modern Pink
  '#14B8A6', // Modern Teal
  '#6366F1', // Modern Indigo
  '#84CC16', // Modern Lime
  '#F97316', // Modern Orange
  '#A855F7', // Modern Violet
  '#22C55E', // Modern Emerald
  '#0EA5E9', // Modern Sky
  '#D946EF', // Modern Fuchsia
  '#64748B', // Modern Slate
]

// Generate a random color from the palette
function generateRandomColor(): string {
  const randomIndex = Math.floor(Math.random() * MEMBER_COLORS.length)
  return MEMBER_COLORS[randomIndex]
}

// Create a new team
export const createTeam = mutation({
  args: {
    teamName: v.string(),
  },
  handler: async (ctx, args) => {
    // Create the team
    const teamId = await ctx.db.insert('teams', {
      name: args.teamName,
    })

    return { teamId }
  },
})

// Join an existing team
export const joinTeam = mutation({
  args: {
    teamId: v.id('teams'),
    memberName: v.string(),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify team exists
    const team = await ctx.db.get(args.teamId)
    if (!team) {
      throw new Error('Team not found')
    }

    // Add the new member
    const memberId = await ctx.db.insert('members', {
      teamId: args.teamId,
      name: args.memberName,
      color: args.color ?? generateRandomColor(),
    })

    return { memberId }
  },
})

// Send a notification to a team member
export const sendNotification = mutation({
  args: {
    teamId: v.id('teams'),
    fromMemberId: v.id('members'),
    toMemberId: v.id('members'),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify team exists
    const team = await ctx.db.get(args.teamId)
    if (!team) {
      throw new Error('Team not found')
    }

    // Verify both members exist and belong to the team
    const fromMember = await ctx.db.get(args.fromMemberId)
    const toMember = await ctx.db.get(args.toMemberId)

    if (!fromMember || fromMember.teamId !== args.teamId) {
      throw new Error('Invalid sender member')
    }

    if (!toMember || toMember.teamId !== args.teamId) {
      throw new Error('Invalid recipient member')
    }

    // Create the notification
    await ctx.db.insert('notifications', {
      teamId: args.teamId,
      fromMemberId: args.fromMemberId,
      toMemberId: args.toMemberId,
      message: args.message,
    })

    return { success: true }
  },
})

// Get team information
export const getTeam = query({
  args: {
    teamId: v.id('teams'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.teamId)
  },
})

// Get all members of a team
export const getMembers = query({
  args: {
    teamId: v.id('teams'),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('members')
      .withIndex('by_teamId', (q) => q.eq('teamId', args.teamId))
      .order('asc')
      .collect()
  },
})

// Get recent notifications for a team
export const getNotifications = query({
  args: {
    teamId: v.id('teams'),
  },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query('notifications')
      .withIndex('by_teamId', (q) => q.eq('teamId', args.teamId))
      .order('desc')
      .take(50)

    // Enrich notifications with member names
    return Promise.all(
      notifications.map(async (notification) => {
        const fromMember = await ctx.db.get(notification.fromMemberId)
        const toMember = await ctx.db.get(notification.toMemberId)
        return {
          ...notification,
          fromMemberName: fromMember?.name ?? 'Unknown',
          toMemberName: toMember?.name ?? 'Unknown',
        }
      })
    )
  },
})

// Delete a member from a team
export const deleteMember = mutation({
  args: {
    memberId: v.id('members'),
  },
  handler: async (ctx, args) => {
    // Verify member exists
    const member = await ctx.db.get(args.memberId)
    if (!member) {
      throw new Error('Member not found')
    }

    // Delete the member
    await ctx.db.delete(args.memberId)

    return { success: true }
  },
})

// Rename a member
export const renameMember = mutation({
  args: {
    memberId: v.id('members'),
    newName: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify member exists
    const member = await ctx.db.get(args.memberId)
    if (!member) {
      throw new Error('Member not found')
    }

    // Update the member's name
    await ctx.db.patch(args.memberId, {
      name: args.newName.trim(),
    })

    // Return updated member
    const updatedMember = await ctx.db.get(args.memberId)
    return updatedMember
  },
})

// Update a member's color
export const updateMemberColor = mutation({
  args: {
    memberId: v.id('members'),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify member exists
    const member = await ctx.db.get(args.memberId)
    if (!member) {
      throw new Error('Member not found')
    }

    // Update the member's color
    await ctx.db.patch(args.memberId, {
      color: args.color,
    })

    // Return updated member
    const updatedMember = await ctx.db.get(args.memberId)
    return updatedMember
  },
})
