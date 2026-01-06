import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useNavigate,
} from '@tanstack/react-router'
import * as React from 'react'
import type { QueryClient } from '@tanstack/react-query'
import appCss from '~/styles/app.css?url'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
      },
      {
        title: 'Ping',
      },
      {
        name: 'description',
        content: 'Simple, instant notifications for team turn-taking. Perfect for meetings, presentations, and group activities.',
      },
      {
        name: 'theme-color',
        content: '#0a0e1a',
      },
      {
        name: 'mobile-web-app-capable',
        content: 'yes',
      },
      // iOS-specific meta tags
      {
        name: 'apple-mobile-web-app-capable',
        content: 'yes',
      },
      {
        name: 'apple-mobile-web-app-status-bar-style',
        content: 'black-translucent',
      },
      {
        name: 'apple-mobile-web-app-title',
        content: 'Ping',
      },
      {
        name: 'format-detection',
        content: 'telephone=no',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: '/apple-touch-icon.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/favicon-32x32.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        href: '/favicon-16x16.png',
      },
      { rel: 'manifest', href: '/site.webmanifest' },
      { rel: 'icon', href: '/favicon.ico' },
    ],
    scripts: [
      {
        src: 'https://www.trackaton.com/track.js',
        'data-website-id': 'jd71gr8v39k352m9s3rcbax3xx7ypbj9',
        'data-endpoint': 'https://resolute-orca-949.convex.site/api/e',
        async: true,
      },
    ],
  }),
  notFoundComponent: () => <div>Route not found</div>,
  component: RootComponent,
})

function RootComponent() {
  const navigate = useNavigate()

  // Listen for navigation messages from service worker
  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const handleMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'NAVIGATE') {
          const url = event.data.url
          if (url) {
            // Extract teamId from URL if it's a team page
            const teamMatch = url.match(/\/team\/([^/]+)/)
            if (teamMatch) {
              navigate({ to: '/team/$teamId', params: { teamId: teamMatch[1] } })
            } else {
              navigate({ to: '/' })
            }
          }
        }
      }

      navigator.serviceWorker.addEventListener('message', handleMessage)

      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage)
      }
    }
  }, [navigate])

  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
