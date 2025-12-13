import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useState, useEffect, useRef } from 'react'
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
import { Copy, Edit, Trash2, Pencil, Check, ArrowLeft, HelpCircle, Hand, Users, Menu } from 'lucide-react'
import { useNotifications } from '~/lib/useNotifications'

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
  const [isEditMode, setIsEditMode] = useState(false)
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false)
  const [editingMemberId, setEditingMemberId] = useState<Id<'members'> | null>(null)
  const [editingMemberName, setEditingMemberName] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)
  const [editingMemberColor, setEditingMemberColor] = useState<string | null>(null)
  const [isUpdatingColor, setIsUpdatingColor] = useState(false)
  const [joinMemberName, setJoinMemberName] = useState('')
  const [joinMemberColor, setJoinMemberColor] = useState<string | null>(null)
  const [isJoining, setIsJoining] = useState(false)
  const [isLinkCopied, setIsLinkCopied] = useState(false)
  const [showHelpDialog, setShowHelpDialog] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [notifiedMembers, setNotifiedMembers] = useState<Set<Id<'members'>>>(new Set())
  const previousNotificationIds = useRef<Set<string>>(new Set())
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
      console.log('New notification detected for current user:', newNotifications)
      console.log('Triggering flash animation')
      
      // Mark these notifications as processed immediately so rapid successive notifications
      // can each trigger their own flash
      const newNotificationIds = new Set(newNotifications.map((n) => n._id))
      previousNotificationIds.current = new Set([
        ...previousNotificationIds.current,
        ...newNotificationIds
      ])
      
      // Get current user's color for the flash animation
      const currentMember = members.find((m) => m._id === currentMemberId)
      const userColor = currentMember?.color || generateColorForMember(currentMemberId)
      const userColorHsl = hexToHsl(userColor)
      
      // Set CSS variable with user's color
      document.documentElement.style.setProperty('--notification-flash', userColorHsl)
      
      // Trigger flash animation
      setShouldFlash(true)
      // Reset after animation completes (3.5s)
      const timer = setTimeout(() => {
        console.log('Flash animation complete')
        setShouldFlash(false)
        // Reset CSS variable to default
        document.documentElement.style.setProperty('--notification-flash', '0 0% 50%')
      }, 3500)

      // Show OS notification with more prominent message
      if (team) {
        showNotification(`🎯 IT'S YOUR TURN!`, {
          body: `${team.name} needs you right now!`,
          requireInteraction: true, // Keep notification visible until user interacts
          tag: `turn-notification-${currentMemberId}`, // Unique tag for this user
        })
      }

      return () => clearTimeout(timer)
    } else {
      // Update previous notification IDs even if no new notifications
      previousNotificationIds.current = currentNotificationIds
    }
  }, [notifications, currentMemberId, team, showNotification])

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


  const copyTeamLink = () => {
    const url = `${window.location.origin}/team/${teamId}`
    navigator.clipboard.writeText(url)
    setIsLinkCopied(true)
    setToastMessage('Link copied to clipboard!')
    setTimeout(() => {
      setIsLinkCopied(false)
      setToastMessage(null)
    }, 2000)
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
    } catch (err) {
      console.error('Failed to delete member:', err)
      setToastMessage(err instanceof Error ? err.message : 'Failed to delete member')
      setTimeout(() => {
        setToastMessage(null)
      }, 3000)
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
    <main className={`h-screen flex flex-col p-4 sm:p-6 lg:p-8 relative overflow-hidden ${shouldFlash ? 'notification-flash' : ''}`}>
      {/* Background gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-muted/10 pointer-events-none -z-10" />
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[10000] transition-opacity duration-300 max-w-[calc(100vw-2rem)]">
          <div 
            className="rounded-xl border border-border/50 bg-background/95 backdrop-blur-sm shadow-2xl"
            style={{ backgroundColor: 'hsl(var(--background) / 0.95)' }}
          >
            <div className="pt-4 pb-4 px-5">
              <p className="text-sm font-semibold text-foreground">{toastMessage}</p>
            </div>
          </div>
        </div>
      )}
      
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
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold break-words">
              {team.name}
            </h1>
          </div>
          
          {/* Hamburger menu - always visible */}
          <div className="relative flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="min-h-[44px] min-w-[44px] hover:bg-muted/50 transition-all rounded-lg"
              aria-label="Open menu"
              aria-expanded={showMobileMenu}
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            {/* Menu dropdown */}
            {showMobileMenu && (
              <>
                {/* Backdrop */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowMobileMenu(false)}
                  aria-hidden="true"
                />
                {/* Menu */}
                <div 
                  className="absolute right-0 top-full mt-2 w-56 z-50 rounded-lg border border-border/50 bg-card shadow-2xl"
                  style={{ 
                    backgroundColor: 'hsl(var(--card))',
                  }}
                >
                  <div className="p-2 space-y-1">
                    <button
                      onClick={() => {
                        copyTeamLink()
                        // Keep menu open briefly to show feedback, then close after delay
                        setTimeout(() => {
                          setShowMobileMenu(false)
                        }, 1500)
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md hover:bg-muted/50 transition-colors text-left"
                    >
                      {isLinkCopied ? (
                        <>
                          <Check className="h-4 w-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy Link
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowHelpDialog(true)
                        setShowMobileMenu(false)
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md hover:bg-muted/50 transition-colors text-left"
                    >
                      <HelpCircle className="h-4 w-4" />
                      Help
                    </button>
                    <button
                      onClick={() => {
                        setIsEditMode(!isEditMode)
                        setShowMobileMenu(false)
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md hover:bg-muted/50 transition-colors text-left ${
                        isEditMode ? 'bg-primary/10' : ''
                      }`}
                    >
                      <Edit className="h-4 w-4" />
                      {isEditMode ? 'Exit Edit Mode' : 'Edit Mode'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <Card className="border-0 shadow-none flex-1 min-h-0 flex flex-col bg-transparent">
        <CardContent className="flex-1 min-h-0 p-3 sm:p-4 lg:p-6">
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
                  className={`transition-all duration-300 overflow-hidden h-full flex flex-col border-0 min-h-[140px] sm:min-h-[180px] lg:min-h-[200px] rounded-xl ${
                    isEditMode ? '' : 'cursor-pointer active:scale-[0.97] hover:scale-[1.02]'
                  } ${
                    hasCustomColor
                      ? 'shadow-2xl hover:shadow-[0_0_40px_rgba(0,0,0,0.4)] active:shadow-xl'
                      : 'shadow-lg hover:shadow-xl active:shadow-lg'
                  }`}
                  style={{
                    boxShadow: hasCustomColor
                      ? `0 0 40px ${memberColor}80, 0 15px 30px -10px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)`
                      : `0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)`,
                  }}
                  onClick={() => !isEditMode && handleQuickNotify(member._id)}
                  onKeyDown={(e) => {
                    if (!isEditMode && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault()
                      handleQuickNotify(member._id)
                    }
                  }}
                  role={isEditMode ? undefined : 'button'}
                  tabIndex={isEditMode ? undefined : 0}
                  aria-label={isEditMode ? undefined : `Notify ${member.name}`}
                  title={isEditMode ? undefined : `Click to notify ${member.name}`}
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
                    {!isEditMode && (
                      <div 
                        className="absolute inset-0 pointer-events-none rounded-xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-300"
                        style={{
                          boxShadow: `inset 0 0 60px ${memberColor}40`,
                        }}
                      />
                    )}
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
                      {isEditMode && (
                        <div className="flex gap-2 w-full justify-end absolute top-2 right-2 z-20">
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
                      )}
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

      {/* Help Dialog */}
      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>How to use Your turn</DialogTitle>
            <DialogDescription>
              Quick guide to using the app
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Hand className="h-4 w-4" />
                Sending notifications
              </h4>
              <p className="text-sm text-muted-foreground">
                Click on any team member's card to instantly send them a notification. They'll see a visual flash and receive a browser notification.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                Your card
              </h4>
              <p className="text-sm text-muted-foreground">
                Your card is marked with a "You" badge. You can still notify yourself if needed.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Copy className="h-4 w-4" />
                Sharing the team
              </h4>
              <p className="text-sm text-muted-foreground">
                Use the "Copy Invite Link" button to share the team link with others. They can join instantly without creating an account.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Edit className="h-4 w-4" />
                Edit mode
              </h4>
              <p className="text-sm text-muted-foreground">
                Toggle edit mode to rename members or change their colors. In edit mode, clicking cards won't send notifications.
              </p>
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
