import { useRef, useCallback, useEffect } from 'react'

/**
 * Hook to manage OS-level notifications using the Web Notifications API
 * Uses Service Worker when available for better background notification support
 * @returns Object with requestPermission and showNotification functions
 */
export function useNotifications() {
  const permissionRequestedRef = useRef(false)
  const serviceWorkerRegistrationRef = useRef<ServiceWorkerRegistration | null>(null)

  /**
   * Register service worker for background notifications
   */
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          serviceWorkerRegistrationRef.current = registration
          console.log('Service Worker registered for notifications')
        })
        .catch((error) => {
          console.warn('Service Worker registration failed:', error)
        })
    }
  }, [])

  /**
   * Check if browser supports notifications
   */
  const isSupported = typeof window !== 'undefined' && 'Notification' in window

  /**
   * Get current notification permission status
   */
  const getPermission = useCallback((): NotificationPermission => {
    if (!isSupported) {
      return 'denied'
    }
    return Notification.permission
  }, [isSupported])

  /**
   * Request notification permission from the user
   * Can only be called in response to user interaction (browser security requirement)
   */
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      console.warn('Notifications are not supported in this browser')
      return 'denied'
    }

    const currentPermission = Notification.permission

    // If already granted or denied, return current status
    if (currentPermission === 'granted' || currentPermission === 'denied') {
      return currentPermission
    }

    // Request permission (only works in response to user interaction)
    try {
      const permission = await Notification.requestPermission()
      permissionRequestedRef.current = true
      return permission
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      return 'denied'
    }
  }, [isSupported])

  /**
   * Show an OS notification
   * Prefers Service Worker API for better background support, falls back to Notification API
   * @param title - The notification title
   * @param options - Optional notification options (body, icon, etc.)
   */
  const showNotification = useCallback(
    async (title: string, options?: NotificationOptions) => {
      if (!isSupported) {
        console.warn('Notifications are not supported in this browser')
        return
      }

      const permission = Notification.permission

      if (permission !== 'granted') {
        console.warn('Notification permission not granted. Current status:', permission)
        return
      }

      try {
        // Try to use Service Worker first (works better when screen is locked/backgrounded)
        let registration = serviceWorkerRegistrationRef.current
        
        // If no registration cached, try to get it
        if (!registration && 'serviceWorker' in navigator) {
          try {
            registration = await navigator.serviceWorker.ready
          } catch {
            // Service worker not ready, will fall back to Notification API
          }
        }

        if (registration && 'showNotification' in registration) {
          // Use Service Worker API - works even when page is backgrounded
          await registration.showNotification(title, {
            icon: '/favicon.png',
            badge: '/favicon.png',
            tag: options?.tag || 'next-speaker-notification',
            requireInteraction: true, // Keep notification visible until user interacts
            vibrate: [200, 100, 200], // Vibrate pattern for mobile devices
            ...options,
          } as NotificationOptions & { vibrate?: number[] })
          return // Successfully shown via service worker
        } else {
          // Fallback to Notification API (only works when page is active)
          const notification = new Notification(title, {
            icon: '/favicon.png',
            badge: '/favicon.png',
            tag: options?.tag || 'next-speaker-notification',
            requireInteraction: true, // Keep notification visible until user interacts
            vibrate: [200, 100, 200], // Vibrate pattern for mobile devices
            ...options,
          } as NotificationOptions & { vibrate?: number[] })

          // Handle notification click - navigate to team page if teamId is provided
          notification.onclick = () => {
            const teamId = (options as any)?.data?.teamId
            if (teamId) {
              window.location.href = `/team/${teamId}`
            } else {
              window.focus()
            }
            notification.close()
          }
        }
      } catch (error) {
        console.error('Error showing notification:', error)
        // Fallback: try basic Notification API
        try {
          const notification = new Notification(title, {
            icon: '/favicon.png',
            badge: '/favicon.png',
            tag: options?.tag || 'next-speaker-notification',
            requireInteraction: true,
            ...options,
          })
          // Handle notification click - navigate to team page if teamId is provided
          notification.onclick = () => {
            const teamId = (options as any)?.data?.teamId
            if (teamId) {
              window.location.href = `/team/${teamId}`
            } else {
              window.focus()
            }
            notification.close()
          }
        } catch (fallbackError) {
          console.error('Fallback notification also failed:', fallbackError)
        }
      }
    },
    [isSupported]
  )

  return {
    isSupported,
    getPermission,
    requestPermission,
    showNotification,
  }
}
