import { useState, useEffect, useCallback } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

/**
 * Hook to manage PWA install prompt
 * Detects when the app is installable and provides install functionality
 */
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    setIsIOS(iOS)

    // Detect if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as any).standalone === true ||
                      document.referrer.includes('android-app://')
    setIsStandalone(standalone)
    setIsInstalled(standalone)

    // Listen for beforeinstallprompt event (Chrome/Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      setDeferredPrompt(promptEvent)
      setIsInstallable(true)
    }

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Check if prompt was previously dismissed
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed === 'true' && !standalone) {
      // Still show installable if browser supports it, but respect dismissal
      setIsInstallable(false)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  /**
   * Prompt the user to install the PWA
   * Returns a promise that resolves when the prompt is shown
   */
  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false
    }

    try {
      await deferredPrompt.prompt()
      const choiceResult = await deferredPrompt.userChoice
      
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true)
        setIsInstallable(false)
        setDeferredPrompt(null)
        return true
      } else {
        // User dismissed the prompt
        setDeferredPrompt(null)
        setIsInstallable(false)
        return false
      }
    } catch (error) {
      console.error('Error showing install prompt:', error)
      return false
    }
  }, [deferredPrompt])

  /**
   * Dismiss the install prompt and remember the dismissal
   */
  const dismissPrompt = useCallback(() => {
    setIsInstallable(false)
    localStorage.setItem('pwa-install-dismissed', 'true')
    // Clear dismissal after 7 days
    setTimeout(() => {
      localStorage.removeItem('pwa-install-dismissed')
    }, 7 * 24 * 60 * 60 * 1000)
  }, [])

  /**
   * Reset dismissal state (useful for testing or if user wants to see prompt again)
   */
  const resetDismissal = useCallback(() => {
    localStorage.removeItem('pwa-install-dismissed')
    setIsInstallable(true)
  }, [])

  return {
    isInstallable,
    isInstalled,
    isIOS,
    isStandalone,
    promptInstall,
    dismissPrompt,
    resetDismissal,
  }
}
