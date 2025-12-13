// Service Worker for background notifications and caching
const CACHE_NAME = 'ping-pwa-v1'
const STATIC_ASSETS = [
  '/',
  '/icon.png',
  '/favicon.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.log('Cache addAll failed:', err)
        // Continue even if some assets fail to cache
      })
    })
  )
  // Force the waiting service worker to become the active service worker
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  // Take control of all pages immediately
  event.waitUntil(self.clients.claim())
})

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip caching for Convex API calls (always use network)
  if (url.hostname.includes('convex.cloud') || url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        // If network fails, return a basic offline response
        return new Response(
          JSON.stringify({ error: 'Offline - please check your connection' }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        )
      })
    )
    return
  }

  // Cache-first strategy for static assets
  if (
    request.destination === 'image' ||
    request.destination === 'font' ||
    url.pathname.startsWith('/icon') ||
    url.pathname.startsWith('/favicon') ||
    url.pathname.startsWith('/android-chrome')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        return (
          cachedResponse ||
          fetch(request).then((response) => {
            // Cache successful responses
            if (response.status === 200) {
              const responseToCache = response.clone()
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache)
              })
            }
            return response
          })
        )
      })
    )
    return
  }

  // Network-first strategy for HTML/JS/CSS (app shell)
  if (
    request.destination === 'document' ||
    request.destination === 'script' ||
    request.destination === 'style'
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.status === 200) {
            const responseToCache = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache)
            })
          }
          return response
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse
            }
            // Fallback to index.html for navigation requests
            if (request.destination === 'document') {
              return caches.match('/')
            }
            return new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable',
            })
          })
        })
    )
    return
  }

  // Default: try network, fallback to cache
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request)
    })
  )
})

// Handle notification display requests from the main thread
self.addEventListener('message', async (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data
    try {
      await self.registration.showNotification(title, {
        icon: '/favicon.png',
        badge: '/favicon.png',
        requireInteraction: true, // Keep notification visible until user interacts
        ...options,
      })
    } catch (error) {
      console.error('Service Worker: Error showing notification:', error)
    }
  }
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  // Focus or open the app
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url === self.location.origin && 'focus' in client) {
          return client.focus()
        }
      }
      // Otherwise, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow('/')
      }
    })
  )
})
