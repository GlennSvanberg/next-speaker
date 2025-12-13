import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Badge } from '~/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { Trash2, Pencil, Check, ArrowLeft, HelpCircle, Users, Share2, Bell, Zap, Palette } from 'lucide-react'
import { useNotifications } from '~/lib/useNotifications'
import { PWAInstallPrompt } from '~/components/PWAInstallPrompt'

export const Route = createFileRoute('/team/$teamId')({
  component: TeamPage,
})

// Helper function to manage userTeams array in localStorage
function addTeamToUserTeams(teamId: string) {
  const stored = localStorage.getItem('userTeams')
  const teams = stored ? JSON.parse(stored) : []
  if (!teams.includes(teamId)) {
    teams.push(teamId)
    localStorage.setItem('userTeams', JSON.stringify(teams))
  }
}

// Darken a hex color by reducing lightness
function darkenColor(hex: string, amount: number = 0.3): string {
  hex = hex.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  
  return `#${Math.round(r * (1 - amount)).toString(16).padStart(2, '0')}${Math.round(g * (1 - amount)).toString(16).padStart(2, '0')}${Math.round(b * (1 - amount)).toString(16).padStart(2, '0')}`
}

// Convert hex color to HSL format for CSS variables
// Returns format: "h s% l%" (e.g., "0 84% 60%")
function hexToHsl(hex: string): string {
  // Remove # if present
  hex = hex.replace('#', '')
  
  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16) / 255
  const g = parseInt(hex.substring(2, 4), 16) / 255
  const b = parseInt(hex.substring(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  // Convert to percentages and round
  h = Math.round(h * 360)
  s = Math.round(s * 100)
  const lPercent = Math.round(l * 100)

  return `${h} ${s}% ${lPercent}%`
}

function TeamPage() {
  const { teamId } = Route.useParams()
  const navigate = useNavigate()
  const sendNotification = useMutation(api.teams.sendNotification)
  const joinTeam = useMutation(api.teams.joinTeam)
  const deleteMember = useMutation(api.teams.deleteMember)
  const renameMember = useMutation(api.teams.renameMember)
  const updateMemberColor = useMutation(api.teams.updateMemberColor)

  const {
    data: team,
  } = useSuspenseQuery(convexQuery(api.teams.getTeam, { teamId: teamId as Id<'teams'> }))

  const {
    data: members,
  } = useSuspenseQuery(convexQuery(api.teams.getMembers, { teamId: teamId as Id<'teams'> }))

  const {
    data: notifications,
  } = useSuspenseQuery(
    convexQuery(api.teams.getNotifications, { teamId: teamId as Id<'teams'> })
  )

  const [currentMemberId, setCurrentMemberId] = useState<Id<'members'> | null>(null)
  const [shouldFlash, setShouldFlash] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false)
  const [editingMemberId, setEditingMemberId] = useState<Id<'members'> | null>(null)
  const [editingMemberName, setEditingMemberName] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)
  const [editingMemberColor, setEditingMemberColor] = useState<string | null>(null)
  const [isUpdatingColor, setIsUpdatingColor] = useState(false)
  const [joinMemberName, setJoinMemberName] = useState('')
  const [joinMemberColor, setJoinMemberColor] = useState<string | null>(null)
  const [isJoining, setIsJoining] = useState(false)
  const [copiedPingUrlMemberId, setCopiedPingUrlMemberId] = useState<Id<'members'> | null>(null)
  const [showHelpDialog, setShowHelpDialog] = useState(false)
  const [notifiedMembers, setNotifiedMembers] = useState<Set<Id<'members'>>>(new Set())
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    memberId: Id<'members'> | null
    memberName: string
  }>({
    open: false,
    memberId: null,
    memberName: '',
  })
  const previousNotificationIds = useRef<Set<string>>(new Set())
  const flashTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isFlashingRef = useRef(false)
  const flashStartTimeRef = useRef<number | null>(null)
  const mainElementRef = useRef<HTMLElement | null>(null)
  const { requestPermission, showNotification } = useNotifications()

  // Predefined color palette (same as backend) - modern, contemporary colors
  const MEMBER_COLORS = [
    '#EF4444', // Modern Red
    '#10B981', // Modern Green
    '#3B82F6', // Modern Blue
    '#8B5CF6', // Modern Purple
    '#F59E0B', // Modern Amber
    '#06B6D4', // Modern Cyan
    '#EC4899', // Modern Pink
    '#14B8A6', // Modern Teal
    '#6366F1', // Modern Indigo
    '#84CC16', // Modern Lime
    '#F97316', // Modern Orange
    '#A855F7', // Modern Violet
    '#22C55E', // Modern Emerald
    '#0EA5E9', // Modern Sky
    '#D946EF', // Modern Fuchsia
    '#64748B', // Modern Slate
  ]

  // Generate a deterministic color for members without one (based on member ID)
  const generateColorForMember = (memberId: string) => {
    // Use member ID to deterministically pick a color
    const hash = memberId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const index = hash % MEMBER_COLORS.length
    return MEMBER_COLORS[index]
  }

  // Get current member ID from localStorage and verify membership
  useEffect(() => {
    const stored = localStorage.getItem(`memberId_${teamId}`)
    if (stored) {
      // Verify the member still exists in the team
      const memberExists = members.some((m) => m._id === stored)
      if (memberExists) {
        setCurrentMemberId(stored as Id<'members'>)
      } else {
        // Member doesn't exist, clear it
        setCurrentMemberId(null)
        localStorage.removeItem(`memberId_${teamId}`)
      }
    }
  }, [members, teamId])

  // Check if current user is a member
  const isMember = currentMemberId && members.some((m) => m._id === currentMemberId)

  // Request notification permission when user becomes a member
  useEffect(() => {
    if (currentMemberId && isMember) {
      // Request permission after user interaction (joining team)
      // This will only prompt if permission hasn't been requested yet
      requestPermission().catch((error) => {
        console.error('Failed to request notification permission:', error)
      })
    }
  }, [currentMemberId, isMember, requestPermission])

  // Helper function to reset flash state and CSS variable
  // Using useCallback to ensure it's stable for use in effects
  const resetFlash = useCallback(() => {
    console.log('Resetting flash state')
    setShouldFlash(false)
    isFlashingRef.current = false
    flashStartTimeRef.current = null
    document.documentElement.style.setProperty('--notification-flash', '0 0% 50%')
  }, [])

  // Detect new notifications for current user and trigger flash
  useEffect(() => {
    if (!currentMemberId) {
      // Initialize previous notification IDs on first load
      if (notifications.length > 0) {
        previousNotificationIds.current = new Set(
          notifications.map((n) => n._id)
        )
      }
      return
    }

    // Initialize on first load - only set IDs, don't trigger flash
    const currentNotificationIds = new Set(notifications.map((n) => n._id))
    if (previousNotificationIds.current.size === 0) {
      previousNotificationIds.current = currentNotificationIds
      return
    }

    // Find new notifications that are for the current user
    const newNotifications = notifications.filter(
      (notification) =>
        notification.toMemberId === currentMemberId &&
        !previousNotificationIds.current.has(notification._id)
    )

    if (newNotifications.length > 0) {
      // Mark these notifications as processed
      const newNotificationIds = new Set(newNotifications.map((n) => n._id))
      previousNotificationIds.current = new Set([
        ...previousNotificationIds.current,
        ...newNotificationIds
      ])

      // Prevent multiple simultaneous flashes - skip if one is already active
      // But check if it's been stuck (active for more than 4 seconds) and force reset
      if (isFlashingRef.current) {
        const flashDuration = flashStartTimeRef.current 
          ? Date.now() - flashStartTimeRef.current 
          : Infinity
        
        if (flashDuration > 4000) {
          // Flash has been stuck for more than 4 seconds, force reset
          console.warn('Flash stuck for', flashDuration, 'ms, forcing reset')
          if (flashTimerRef.current) {
            clearTimeout(flashTimerRef.current)
            flashTimerRef.current = null
          }
          resetFlash()
          // Continue to trigger new flash below
        } else {
          console.log('Flash already active, skipping new flash to prevent blinking')
          return
        }
      }

      // Clear any existing timer before starting a new flash
      if (flashTimerRef.current) {
        clearTimeout(flashTimerRef.current)
        flashTimerRef.current = null
      }

      console.log('New notification detected for current user:', newNotifications)
      console.log('Triggering flash animation')
      
      // Get current user's color for the flash animation
      const currentMember = members.find((m) => m._id === currentMemberId)
      const userColor = currentMember?.color || generateColorForMember(currentMemberId)
      const userColorHsl = hexToHsl(userColor)
      
      // Set CSS variable with user's color
      document.documentElement.style.setProperty('--notification-flash', userColorHsl)
      
      // Mark flash as active and record start time
      isFlashingRef.current = true
      flashStartTimeRef.current = Date.now()
      
      // Trigger flash animation
      setShouldFlash(true)
      
      // Reset after animation completes (3.5s) with safety margin
      flashTimerRef.current = setTimeout(() => {
        console.log('Flash animation complete via timer')
        resetFlash()
        flashTimerRef.current = null
      }, 4000) // Use 4s instead of 3.5s to ensure animation completes

      // Show OS notification with more prominent message
      if (team) {
        console.log('Showing notification for team:', teamId)
        showNotification(`🎯 YOU GOT PINGED!`, {
          body: `${team.name} needs you right now!`,
          requireInteraction: true, // Keep notification visible until user interacts
          tag: `turn-notification-${currentMemberId}`, // Unique tag for this user
          data: { teamId: teamId }, // Include teamId for navigation
        })
      }
    } else {
      // Update previous notification IDs even if no new notifications
      previousNotificationIds.current = currentNotificationIds
    }

    // No cleanup function - let the timer complete naturally
    // Clearing the timer here would prevent resetFlash from being called
    // The safety check will catch any stuck flashes
  }, [notifications, currentMemberId, team, showNotification, members])

  // Safety mechanism: periodically check if flash is stuck and force reset
  useEffect(() => {
    const safetyCheckInterval = setInterval(() => {
      if (isFlashingRef.current && flashStartTimeRef.current) {
        const flashDuration = Date.now() - flashStartTimeRef.current
        // If flash has been active for more than 5 seconds, force reset
        if (flashDuration > 5000) {
          console.warn('Flash stuck detected by safety check, forcing reset after', flashDuration, 'ms')
          if (flashTimerRef.current) {
            clearTimeout(flashTimerRef.current)
            flashTimerRef.current = null
          }
          resetFlash()
        }
      }
    }, 1000) // Check every second

    return () => {
      clearInterval(safetyCheckInterval)
    }
  }, [resetFlash])

  // Cleanup on unmount: ensure timer is cleared and CSS variable is reset
  useEffect(() => {
    return () => {
      if (flashTimerRef.current) {
        clearTimeout(flashTimerRef.current)
        flashTimerRef.current = null
      }
      resetFlash()
    }
  }, [])

  const handleQuickNotify = async (toMemberId: Id<'members'>) => {
    if (!currentMemberId) {
      console.warn('Cannot send notification: currentMemberId is not set')
      return
    }

    try {
      await sendNotification({
        teamId: teamId as Id<'teams'>,
        fromMemberId: currentMemberId,
        toMemberId,
        message: undefined,
      })
      
      // Show notification indicator on the recipient's card
      setNotifiedMembers((prev) => new Set(prev).add(toMemberId))
      
      // Remove the indicator after animation completes (3 seconds)
      setTimeout(() => {
        setNotifiedMembers((prev) => {
          const newSet = new Set(prev)
          newSet.delete(toMemberId)
          return newSet
        })
      }, 3000)
    } catch (err) {
      console.error('Failed to send notification:', err)
      // Show error toast
      setToastMessage('Failed to send notification')
      setTimeout(() => {
        setToastMessage(null)
      }, 3000)
    }
  }



  const copyPingUrl = (toMemberId: Id<'members'>) => {
    if (!currentMemberId) {
      setToastMessage('You must be a member to generate ping URLs')
      setTimeout(() => {
        setToastMessage(null)
      }, 3000)
      return
    }

    // Use the app's base URL instead of Convex URL
    const pingUrl = `${window.location.origin}/api/ping?teamId=${encodeURIComponent(teamId)}&toMemberId=${encodeURIComponent(toMemberId)}&fromMemberId=${encodeURIComponent(currentMemberId)}`
    
    navigator.clipboard.writeText(pingUrl).then(() => {
      setCopiedPingUrlMemberId(toMemberId)
      setToastMessage('Ping URL copied to clipboard!')
      setTimeout(() => {
        setCopiedPingUrlMemberId(null)
        setToastMessage(null)
      }, 2000)
    }).catch((err) => {
      console.error('Failed to copy ping URL:', err)
      setToastMessage('Failed to copy ping URL')
      setTimeout(() => {
        setToastMessage(null)
      }, 3000)
    })
  }

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinMemberName.trim() || !joinMemberColor) {
      return
    }

    setIsJoining(true)
    try {
      const { memberId } = await joinTeam({
        teamId: teamId as Id<'teams'>,
        memberName: joinMemberName.trim(),
        color: joinMemberColor,
      })
      // Store memberId in localStorage
      localStorage.setItem(`memberId_${teamId}`, memberId)
      // Add team to userTeams array
      addTeamToUserTeams(teamId)
      setCurrentMemberId(memberId)
      setJoinMemberName('')
      setJoinMemberColor(null)
      setToastMessage('Joined team successfully')
      setTimeout(() => {
        setToastMessage(null)
      }, 3000)
      // Request notification permission after joining (user interaction context)
      requestPermission().catch((error) => {
        console.error('Failed to request notification permission:', error)
      })
    } catch (err) {
      console.error('Failed to join team:', err)
      setToastMessage(err instanceof Error ? err.message : 'Failed to join team')
      setTimeout(() => {
        setToastMessage(null)
      }, 3000)
    } finally {
      setIsJoining(false)
    }
  }


  const handleDeleteMember = async (memberId: Id<'members'>) => {
    const member = members.find((m) => m._id === memberId)
    const memberName = member?.name || 'member'

    setConfirmDialog({
      open: true,
      memberId,
      memberName,
    })
  }

  const confirmDeleteMember = async () => {
    if (!confirmDialog.memberId) return

    const memberId = confirmDialog.memberId
    const memberName = confirmDialog.memberName

    try {
      await deleteMember({ memberId })
      
      // If deleting current member, clear from localStorage
      if (memberId === currentMemberId) {
        localStorage.removeItem(`memberId_${teamId}`)
        setCurrentMemberId(null)
      }

      setToastMessage(`${memberName} deleted successfully`)
      setTimeout(() => {
        setToastMessage(null)
      }, 3000)
      setConfirmDialog({ open: false, memberId: null, memberName: '' })
    } catch (err) {
      console.error('Failed to delete member:', err)
      setToastMessage(err instanceof Error ? err.message : 'Failed to delete member')
      setTimeout(() => {
        setToastMessage(null)
      }, 3000)
      setConfirmDialog({ open: false, memberId: null, memberName: '' })
    }
  }

  const handleRenameMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMemberId || !editingMemberName.trim() || !editingMemberColor) {
      return
    }

    setIsRenaming(true)
    setIsUpdatingColor(true)
    try {
      // Update both name and color
      await Promise.all([
        renameMember({
          memberId: editingMemberId,
          newName: editingMemberName.trim(),
        }),
        updateMemberColor({
          memberId: editingMemberId,
          color: editingMemberColor,
        }),
      ])
      setEditingMemberId(null)
      setEditingMemberName('')
      setEditingMemberColor(null)
      setIsRenameDialogOpen(false)
      setToastMessage('Member updated successfully')
      setTimeout(() => {
        setToastMessage(null)
      }, 3000)
    } catch (err) {
      console.error('Failed to update member:', err)
      setToastMessage(err instanceof Error ? err.message : 'Failed to update member')
      setTimeout(() => {
        setToastMessage(null)
      }, 3000)
    } finally {
      setIsRenaming(false)
      setIsUpdatingColor(false)
    }
  }

  const openRenameDialog = (memberId: Id<'members'>) => {
    const member = members.find((m) => m._id === memberId)
    if (member) {
      setEditingMemberId(memberId)
      setEditingMemberName(member.name)
      setEditingMemberColor(member.color || generateColorForMember(memberId))
      setIsRenameDialogOpen(true)
    }
  }

  // Get member color, with fallback for members without colors
  const getMemberColor = (member: typeof members[0]) => {
    return member.color || generateColorForMember(member._id)
  }

  if (!team) {
    return (
      <main className="min-h-screen p-8 flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <p>Team not found</p>
            <Button onClick={() => navigate({ to: '/' })} className="mt-4">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  // If user is not a member, show join dialog
  if (!isMember) {
    return (
      <main className="min-h-screen p-8 flex items-center justify-center">
        <Dialog open={true} modal={true}>
          <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
            <form onSubmit={handleJoinTeam}>
              <DialogHeader>
                <DialogTitle>Join Team: {team.name}</DialogTitle>
                <DialogDescription>
                  Enter your name and choose a color to join this team.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="joinMemberName" className="text-sm font-medium">
                    Your Name
                  </label>
                  <Input
                    id="joinMemberName"
                    placeholder="Enter your name"
                    value={joinMemberName}
                    onChange={(e) => setJoinMemberName(e.target.value)}
                    disabled={isJoining}
                    required
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Your Color</label>
                  <div className="grid grid-cols-4 gap-3">
                    {MEMBER_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-full h-12 rounded-md border-2 transition-all hover:scale-110 ${
                          joinMemberColor === color
                            ? 'border-foreground/50 ring-2 ring-foreground/30 ring-offset-2'
                            : 'border-border hover:border-foreground/30'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setJoinMemberColor(color)}
                        disabled={isJoining}
                        aria-label={`Select color ${color}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isJoining || !joinMemberName.trim() || !joinMemberColor} className="w-full">
                  {isJoining ? 'Joining...' : 'Join Team'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    )
  }

  return (
    <main 
      ref={mainElementRef}
      className={`h-screen flex flex-col p-4 sm:p-6 lg:p-8 relative overflow-hidden ${shouldFlash ? 'notification-flash' : ''}`}
    >
      {/* Background gradient overlay - matching landing page style */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-background/95 pointer-events-none -z-10" />
      
      {/* Toast Notification - matching landing page style */}
      {toastMessage && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[10000] transition-all duration-300 max-w-[calc(100vw-2rem)] animate-in fade-in slide-in-from-bottom-2">
          <div 
            className="rounded-xl border border-border/50 bg-card/95 backdrop-blur-md shadow-2xl"
            style={{ backgroundColor: 'hsl(var(--card) / 0.95)' }}
          >
            <div className="pt-4 pb-4 px-5">
              <p className="text-sm font-semibold text-foreground">{toastMessage}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* PWA Install Prompt Banner */}
      <div className="flex-shrink-0 mb-4">
        <PWAInstallPrompt delay={2000} />
      </div>
      
      {/* Header */}
      <div className="flex-shrink-0 mb-4 sm:mb-6">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => window.history.back()}
              className="min-h-[44px] min-w-[44px] hover:bg-muted/50 rounded-lg transition-all flex-shrink-0"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold break-words text-foreground">
                {team.name}
              </h1>
            </div>
          </div>
          
          {/* Help button */}
          <div className="relative flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHelpDialog(true)}
              className="min-h-[44px] min-w-[44px] hover:bg-muted/50 transition-all rounded-full border-0 p-0"
              aria-label="Help"
            >
              <HelpCircle className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <Card className="border-0 shadow-none flex-1 min-h-0 flex flex-col bg-transparent">
        <CardContent className="flex-1 min-h-0 p-4 sm:p-5 lg:p-6">
          <div 
            className="grid gap-4 sm:gap-5 lg:gap-6 h-full auto-rows-fr w-full"
            style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))'
            }}
          >
            {members.map((member) => {
              const memberColor = getMemberColor(member)
              const hasCustomColor = !!member.color
              
              return (
                <Card
                  key={member._id}
                  className={`transition-all duration-300 overflow-hidden h-full flex flex-col border-0 min-h-[140px] sm:min-h-[180px] lg:min-h-[200px] rounded-xl cursor-pointer active:scale-[0.97] hover:scale-[1.02] ${
                    hasCustomColor
                      ? 'shadow-2xl hover:shadow-[0_0_40px_rgba(0,0,0,0.4)] active:shadow-xl'
                      : 'shadow-lg hover:shadow-xl active:shadow-lg'
                  }`}
                  style={{
                    boxShadow: hasCustomColor
                      ? `0 0 40px ${memberColor}80, 0 15px 30px -10px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)`
                      : `0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)`,
                  }}
                  onClick={() => handleQuickNotify(member._id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleQuickNotify(member._id)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Notify ${member.name}`}
                  title={`Click to notify ${member.name}`}
                >
                  <CardContent 
                    className="pt-6 pb-6 px-6 flex-1 flex flex-col justify-center relative group/card"
                    style={{
                      background: `
                        radial-gradient(ellipse at top left, rgba(255, 255, 255, 0.2) 0%, transparent 60%),
                        radial-gradient(ellipse at bottom right, rgba(0, 0, 0, 0.25) 0%, transparent 60%),
                        linear-gradient(135deg, ${memberColor} 0%, ${memberColor}E6 40%, ${memberColor}CC 100%)
                      `,
                    }}
                  >
                    {/* Enhanced diagonal pattern overlay */}
                    <div 
                      className="absolute inset-0 opacity-[0.06] group-hover/card:opacity-[0.1] transition-opacity"
                      style={{
                        backgroundImage: `repeating-linear-gradient(
                          45deg,
                          transparent,
                          transparent 3px,
                          rgba(0, 0, 0, 0.4) 3px,
                          rgba(0, 0, 0, 0.4) 6px
                        )`,
                      }}
                    />
                    {/* Enhanced inner shadow for depth */}
                    <div 
                      className="absolute inset-0 pointer-events-none rounded-xl"
                      style={{
                        boxShadow: `
                          inset 0 3px 15px rgba(0, 0, 0, 0.3),
                          inset 0 -3px 15px rgba(255, 255, 255, 0.2),
                          inset 0 0 30px rgba(0, 0, 0, 0.15)
                        `,
                      }}
                    />
                    {/* Glow effect on hover */}
                    <div 
                      className="absolute inset-0 pointer-events-none rounded-xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-300"
                      style={{
                        boxShadow: `inset 0 0 60px ${memberColor}40`,
                      }}
                    />
                    {/* Notification indicator */}
                    {notifiedMembers.has(member._id) && (
                      <div className="absolute inset-0 pointer-events-none rounded-xl z-20">
                        {/* Full card highlight overlay */}
                        <div 
                          className="absolute inset-0 rounded-xl animate-notification-pulse-ring"
                          style={{
                            backgroundColor: `${memberColor}40`,
                            boxShadow: `0 0 0 6px ${memberColor}, 0 0 0 12px ${memberColor}CC, 0 0 40px ${memberColor}AA, 0 0 80px ${memberColor}80, inset 0 0 120px ${memberColor}50`,
                          }}
                        />
                        {/* Large checkmark */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          {(() => {
                            const darkColor = darkenColor(memberColor, 0.4)
                            return (
                              <div 
                                className="rounded-full p-6 backdrop-blur-md border-4 animate-bounce-in"
                                style={{
                                  backgroundColor: `${darkColor}50`,
                                  borderColor: memberColor,
                                  boxShadow: `0 0 0 4px ${darkColor}, 0 0 30px ${memberColor}80, 0 0 60px ${memberColor}60`,
                                }}
                              >
                                <Check 
                                  className="h-16 w-16 sm:h-20 sm:w-20" 
                                  style={{ color: memberColor }}
                                  strokeWidth={4}
                                />
                              </div>
                            )
                          })()}
                        </div>
                      </div>
                    )}
                    <div className="flex flex-col items-center justify-center space-y-3 relative h-full z-10">
                      {/* Edit buttons - always visible */}
                      <div className="flex gap-2 w-full justify-end absolute top-2 right-2 z-20">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 min-h-[44px] min-w-[44px] bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border border-white/30 shadow-lg"
                          onClick={(e) => {
                            e.stopPropagation()
                            copyPingUrl(member._id)
                          }}
                          aria-label={`Copy ping URL for ${member.name}`}
                          title={`Copy ping URL for ${member.name}`}
                        >
                          {copiedPingUrlMemberId === member._id ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Share2 className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 min-h-[44px] min-w-[44px] bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border border-white/30 shadow-lg"
                          onClick={(e) => {
                            e.stopPropagation()
                            openRenameDialog(member._id)
                          }}
                          aria-label={`Edit ${member.name}`}
                          title={`Edit ${member.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 min-h-[44px] min-w-[44px] bg-red-500/20 backdrop-blur-sm hover:bg-red-500/30 text-white border border-red-300/30 shadow-lg"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteMember(member._id)
                          }}
                          aria-label={`Delete ${member.name}`}
                          title={`Delete ${member.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-col items-center">
                        <p className="font-bold text-xl sm:text-2xl lg:text-3xl text-center break-words px-2 text-white drop-shadow-lg">
                          {member.name}
                        </p>
                        {member._id === currentMemberId && (
                          <Badge 
                            variant="secondary" 
                            className="mt-3 text-xs font-bold px-3 py-1 bg-white/20 backdrop-blur-sm border-white/30 text-white shadow-lg"
                          >
                            You
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <DialogContent className="sm:max-w-md border-2" style={{ backgroundColor: 'hsl(var(--background))' }}>
          <DialogHeader>
            <DialogTitle className="text-xl">Delete Member</DialogTitle>
            <DialogDescription className="pt-2 text-base">
              Are you sure you want to delete member "{confirmDialog.memberName}"?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 sm:gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ open: false, memberId: null, memberName: '' })}
              className="min-h-[40px]"
            >
              No
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteMember}
              className="min-h-[40px]"
            >
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Help Dialog */}
      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="sm:max-w-lg border-2" style={{ backgroundColor: 'hsl(var(--background))' }}>
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              How to use Ping
            </DialogTitle>
            <DialogDescription className="pt-2">
              Quick guide to using the team page
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex-shrink-0">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Bell className="h-5 w-5 text-green-500" />
                </div>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground mb-1">Send notifications</p>
                <p className="text-sm text-muted-foreground">Click on any team member's card to instantly send them a notification. They'll see a visual flash and receive a browser notification.</p>
              </div>
            </div>
            <div className="flex gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex-shrink-0">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground mb-1">Your card</p>
                <p className="text-sm text-muted-foreground">Your card is marked with a "You" badge. You can still notify yourself if needed.</p>
              </div>
            </div>
            <div className="flex gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex-shrink-0">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Share2 className="h-5 w-5 text-purple-500" />
                </div>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground mb-1">Share ping URLs</p>
                <p className="text-sm text-muted-foreground">Use the share button on each member's card to copy their ping URL. Share this URL to notify them directly via a link.</p>
              </div>
            </div>
            <div className="flex gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex-shrink-0">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Palette className="h-5 w-5 text-orange-500" />
                </div>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground mb-1">Edit members</p>
                <p className="text-sm text-muted-foreground">Use the edit button on each card to rename members or change their colors. The share and edit buttons are always visible on every card.</p>
              </div>
            </div>
            <div className="flex gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex-shrink-0">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <Trash2 className="h-5 w-5 text-red-500" />
                </div>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground mb-1">Delete members</p>
                <p className="text-sm text-muted-foreground">Click the delete button on any member's card to remove them from the team. You'll be asked to confirm before deletion.</p>
              </div>
            </div>
            <div className="flex gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex-shrink-0">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Zap className="h-5 w-5 text-yellow-500" />
                </div>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground mb-1">Real-time updates</p>
                <p className="text-sm text-muted-foreground">All changes sync instantly across all devices. Perfect for coordinating turns in meetings or group activities.</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowHelpDialog(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <form onSubmit={handleRenameMember}>
            <DialogHeader>
              <DialogTitle>Edit Member</DialogTitle>
              <DialogDescription>
                Update the member's name and color.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label htmlFor="renameMemberName" className="text-sm font-medium">
                  Member Name
                </label>
                <Input
                  id="renameMemberName"
                  placeholder="Enter member name"
                  value={editingMemberName}
                  onChange={(e) => setEditingMemberName(e.target.value)}
                  disabled={isRenaming || isUpdatingColor}
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Member Color</label>
                <div className="grid grid-cols-4 gap-3">
                  {MEMBER_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-full h-12 rounded-md border-2 transition-all hover:scale-110 ${
                        editingMemberColor === color
                          ? 'border-foreground/50 ring-2 ring-foreground/30 ring-offset-2'
                          : 'border-border hover:border-foreground/30'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setEditingMemberColor(color)}
                      disabled={isRenaming || isUpdatingColor}
                      aria-label={`Select color ${color}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsRenameDialogOpen(false)
                  setEditingMemberId(null)
                  setEditingMemberName('')
                  setEditingMemberColor(null)
                }}
                disabled={isRenaming || isUpdatingColor}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isRenaming || isUpdatingColor || !editingMemberName.trim() || !editingMemberColor}>
                {(isRenaming || isUpdatingColor) ? 'Updating...' : 'Update'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  )
}
