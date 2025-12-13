import { useRef, useCallback } from 'react'

/**
 * Hook to manage OS-level notifications using the Web Notifications API
 * @returns Object with requestPermission and showNotification functions
 */
export function useNotifications() {
  const permissionRequestedRef = useRef(false)

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
   * @param title - The notification title
   * @param options - Optional notification options (body, icon, etc.)
   */
  const showNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
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
        const notification = new Notification(title, {
          icon: '/favicon.png',
          badge: '/favicon.png',
          tag: 'next-speaker-notification', // Tag prevents duplicate notifications
          requireInteraction: false,
          ...options,
        })

        // Auto-close after 5 seconds
        setTimeout(() => {
          notification.close()
        }, 5000)

        // Handle notification click - focus the window
        notification.onclick = () => {
          window.focus()
          notification.close()
        }
      } catch (error) {
        console.error('Error showing notification:', error)
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
