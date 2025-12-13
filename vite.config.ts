import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { defineConfig, loadEnv } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import type { Plugin } from 'vite'

export default defineConfig(({ mode }) => {
  // Load env vars
  const env = loadEnv(mode, process.cwd(), '')
  const convexUrl = env.VITE_CONVEX_URL

  // Custom plugin to handle /api/ping in dev mode
  const apiProxyPlugin = (): Plugin => {
    return {
      name: 'api-proxy',
      enforce: 'pre', // Run before other plugins
      configureServer(server) {
        if (convexUrl) {
          console.log('[API Proxy] Setting up /api/ping proxy to:', convexUrl)
          // Use a more specific path matcher - must be first middleware
          // Use unshift to add at the beginning of middleware stack
          const pingMiddleware = async (req: any, res: any, next: any) => {
            if (req.url?.startsWith('/api/ping')) {
              try {
                const url = new URL(req.url, `http://${req.headers.host}`)
                // Parse query params
                const urlParams = new URLSearchParams(url.search)
                const teamId = urlParams.get('teamId')
                const toMemberId = urlParams.get('toMemberId')
                const fromMemberId = urlParams.get('fromMemberId')
                
                if (!teamId || !toMemberId || !fromMemberId) {
                  res.writeHead(400, { 'Content-Type': 'application/json' })
                  res.end(JSON.stringify({ error: 'Missing required parameters' }))
                  return
                }
                
                // Call Convex mutation directly via HTTP API
                const convexMutationUrl = `${convexUrl}/api/mutation`
                
                console.log('[API Proxy] Calling Convex mutation:', convexMutationUrl)
                
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

                const responseText = await response.text()
                
                console.log('[API Proxy] Got response:', response.status, 'Body length:', responseText.length)
                
                // Parse Convex HTTP API response
                let convexResponse: any
                try {
                  convexResponse = JSON.parse(responseText)
                  console.log('[API Proxy] Convex response status:', convexResponse.status)
                } catch (parseError) {
                  console.error('[API Proxy] Failed to parse response:', parseError)
                  res.writeHead(500, { 'Content-Type': 'application/json' })
                  res.end(JSON.stringify({ error: 'Invalid response from Convex' }))
                  return
                }
                
                // Handle Convex HTTP API response format
                let httpStatus = 200
                let responseBody: any
                
                if (convexResponse.status === 'success') {
                  httpStatus = 200
                  responseBody = {
                    success: true,
                    message: 'Notification sent successfully',
                  }
                } else if (convexResponse.status === 'error') {
                  httpStatus = convexResponse.errorMessage?.includes('not found') ? 404 : 400
                  responseBody = {
                    error: convexResponse.errorMessage || 'Unknown error',
                    details: convexResponse.errorData,
                  }
                } else {
                  httpStatus = 500
                  responseBody = {
                    error: 'Unexpected response format from Convex',
                  }
                }
                
                // Check if response was already sent
                if (res.headersSent) {
                  console.warn('[API Proxy] Response already sent!')
                  return
                }
                
                // Send response - don't call next()
                res.writeHead(httpStatus, { 
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*',
                })
                res.end(JSON.stringify(responseBody))
                console.log('[API Proxy] Response sent, status:', httpStatus)
                return // Important: don't call next()
              } catch (error: any) {
                console.error('[API Proxy] Error:', error)
                res.writeHead(500, { 
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*',
                })
                res.end(JSON.stringify({ error: 'Failed to proxy request', details: error.message }))
                return // Important: don't call next()
              }
            }
            next() // Only call next if not handling /api/ping
          }
          
          // Insert at the beginning of middleware stack
          server.middlewares.stack.unshift({ route: '', handle: pingMiddleware })
        } else {
          console.warn('[API Proxy] VITE_CONVEX_URL not set, proxy disabled')
        }
      },
    }
  }

  return {
    server: {
      port: 3000,
    },
    plugins: [
      tailwindcss(),
      tsConfigPaths({
        projects: ['./tsconfig.json'],
      }),
      apiProxyPlugin(), // Add our custom plugin before tanstackStart
      tanstackStart(),
      nitro({
        preset: 'vercel',
      }),
      viteReact(),
    ],
  }
})
