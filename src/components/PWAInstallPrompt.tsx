import { useState, useEffect } from 'react'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { usePWAInstall } from '~/lib/usePWAInstall'
import { Download, X, Share2 } from 'lucide-react'

interface PWAInstallPromptProps {
  /**
   * Whether to show the prompt automatically when installable
   * @default true
   */
  autoShow?: boolean
  /**
   * Delay in milliseconds before showing the prompt
   * @default 2000
   */
  delay?: number
  /**
   * Custom className for the container
   */
  className?: string
}

/**
 * PWA Install Prompt Component
 * Shows a dismissible banner prompting users to install the app
 */
export function PWAInstallPrompt({
  autoShow = true,
  delay = 2000,
  className = '',
}: PWAInstallPromptProps) {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    promptInstall,
    dismissPrompt,
  } = usePWAInstall()

  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)

  useEffect(() => {
    if (isInstalled) {
      setShowPrompt(false)
      return
    }

    if (!autoShow || !isInstallable) {
      return
    }

    // Check if prompt was dismissed
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed === 'true') {
      return
    }

    // Show prompt after delay
    const timer = setTimeout(() => {
      setShowPrompt(true)
    }, delay)

    return () => clearTimeout(timer)
  }, [isInstallable, isInstalled, autoShow, delay])

  const handleInstall = async () => {
    setIsInstalling(true)
    try {
      const installed = await promptInstall()
      if (installed) {
        setShowPrompt(false)
      }
    } catch (error) {
      console.error('Install failed:', error)
    } finally {
      setIsInstalling(false)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    dismissPrompt()
  }

  // Don't show if already installed or not installable
  if (isInstalled || !showPrompt) {
    return null
  }

  // iOS-specific instructions (Safari doesn't support beforeinstallprompt)
  if (isIOS) {
    return (
      <Card
        className={`border-primary/30 bg-card/95 backdrop-blur-sm shadow-lg ${className}`}
      >
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="p-2 rounded-lg bg-primary/10">
                <Share2 className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm mb-1">Install Ping</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Tap the Share button{' '}
                <Share2 className="inline h-3 w-3 mx-1" /> and select "Add to Home Screen"
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDismiss}
                  className="text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Dismiss
                </Button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 rounded-md hover:bg-muted transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Standard install prompt (Chrome/Edge)
  return (
    <Card
      className={`border-primary/30 bg-card/95 backdrop-blur-sm shadow-lg animate-in fade-in slide-in-from-bottom-2 ${className}`}
    >
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="p-2 rounded-lg bg-primary/10">
              <Download className="h-5 w-5 text-primary" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-1">Install Ping App</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Get native notifications and faster access. Install Ping to your device for the best experience.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleInstall}
                disabled={isInstalling}
                className="text-xs"
              >
                {isInstalling ? (
                  <>
                    <span className="animate-spin mr-1">⏳</span>
                    Installing...
                  </>
                ) : (
                  <>
                    <Download className="h-3 w-3 mr-1" />
                    Install Now
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDismiss}
                className="text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Dismiss
              </Button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 rounded-md hover:bg-muted transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Compact inline install prompt for headers
 */
export function PWAInstallPromptCompact({ className = '' }: { className?: string }) {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall()
  const [isInstalling, setIsInstalling] = useState(false)

  if (isInstalled || !isInstallable) {
    return null
  }

  const handleInstall = async () => {
    setIsInstalling(true)
    try {
      await promptInstall()
    } catch (error) {
      console.error('Install failed:', error)
    } finally {
      setIsInstalling(false)
    }
  }

  if (isIOS) {
    return (
      <Button
        variant="outline"
        size="sm"
        className={`text-xs ${className}`}
        title="Tap Share button and select 'Add to Home Screen'"
      >
        <Share2 className="h-3 w-3 mr-1" />
        Install
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleInstall}
      disabled={isInstalling}
      className={`text-xs ${className}`}
    >
      {isInstalling ? (
        <>
          <span className="animate-spin mr-1">⏳</span>
          Installing...
        </>
      ) : (
        <>
          <Download className="h-3 w-3 mr-1" />
          Install App
        </>
      )}
    </Button>
  )
}
