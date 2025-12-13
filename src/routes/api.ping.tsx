import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/ping')({
  component: () => null, // Server-only route
  server: {
    handlers: {
      GET: async ({ request }) => {
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

        // Get Convex URL from environment
        // In server context, access env vars from process.env
        const convexUrl = process.env.VITE_CONVEX_URL

        if (!convexUrl) {
          return new Response(
            JSON.stringify({ error: 'Convex URL not configured' }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        }

        try {
          // Call Convex mutation directly via HTTP API
          // Convex mutations are called via POST to /api/mutation
          const convexMutationUrl = `${convexUrl}/api/mutation`

          const response = await fetch(convexMutationUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              path: 'teams:sendNotification',
              args: {
                teamId,
                fromMemberId,
                toMemberId,
                message: undefined,
              },
              format: 'json',
            }),
          })

          // Get response text first
          const responseText = await response.text()

          // Parse JSON response from Convex HTTP API
          let convexResponse: any
          try {
            convexResponse = JSON.parse(responseText)
          } catch (parseError) {
            return new Response(
              JSON.stringify({
                error: 'Invalid response from Convex',
                details: responseText.substring(0, 200),
              }),
              {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
              }
            )
          }

          // Handle Convex HTTP API response format
          if (convexResponse.status === 'success') {
            return new Response(
              JSON.stringify({
                success: true,
                message: 'Notification sent successfully',
              }),
              {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              }
            )
          } else if (convexResponse.status === 'error') {
            // Map Convex errors to appropriate HTTP status codes
            const statusCode = convexResponse.errorMessage?.includes('not found') ? 404 : 400
            return new Response(
              JSON.stringify({
                error: convexResponse.errorMessage || 'Unknown error',
                details: convexResponse.errorData,
              }),
              {
                status: statusCode,
                headers: { 'Content-Type': 'application/json' },
              }
            )
          }

          // Fallback for unexpected response format
          return new Response(
            JSON.stringify({
              error: 'Unexpected response format from Convex',
              response: convexResponse,
            }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        } catch (error: any) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'

          return new Response(
            JSON.stringify({ error: `Failed to ping: ${errorMessage}` }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        }
      },
    },
  },
})
