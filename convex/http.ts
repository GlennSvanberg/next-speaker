import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { api } from './_generated/api'

const http = httpRouter()

// GET endpoint to ping a team member
http.route({
  path: '/ping',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url)
    const teamId = url.searchParams.get('teamId')
    const toMemberId = url.searchParams.get('toMemberId')
    const fromMemberId = url.searchParams.get('fromMemberId')

    // Validate required parameters
    if (!teamId || !toMemberId || !fromMemberId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: teamId, toMemberId, fromMemberId' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    try {
      // Call the sendNotification mutation
      await ctx.runMutation(api.teams.sendNotification, {
        teamId: teamId as any,
        fromMemberId: fromMemberId as any,
        toMemberId: toMemberId as any,
        message: undefined,
      })

      return new Response(
        JSON.stringify({ success: true, message: 'Notification sent successfully' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Check if it's a "not found" error
      if (errorMessage.includes('not found') || errorMessage.includes('Invalid')) {
        return new Response(
          JSON.stringify({ error: errorMessage }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      // Other errors return 400
      return new Response(
        JSON.stringify({ error: errorMessage }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  }),
})

export default http
