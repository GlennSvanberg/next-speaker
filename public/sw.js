// Service Worker for background notifications
self.addEventListener('install', (event) => {
  // Force the waiting service worker to become the active service worker
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  // Take control of all pages immediately
  event.waitUntil(self.clients.claim())
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
