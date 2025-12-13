import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useState, useEffect, useRef } from 'react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { Button } from '~/components/ui/button'
import { Switch } from '~/components/ui/switch'
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
import { Copy, Edit, Trash2, Pencil, Check, ArrowLeft } from 'lucide-react'
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
      // Reset after animation completes (2s)
      const timer = setTimeout(() => {
        console.log('Flash animation complete')
        setShouldFlash(false)
        // Reset CSS variable to default
        document.documentElement.style.setProperty('--notification-flash', '0 0% 50%')
      }, 2000)

      // Show OS notification
      if (team) {
        showNotification(`${team.name} needs you`)
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

    // Find the member name for the toast
    const targetMember = members.find((m) => m._id === toMemberId)
    const memberName = targetMember?.name || 'member'

    try {
      await sendNotification({
        teamId: teamId as Id<'teams'>,
        fromMemberId: currentMemberId,
        toMemberId,
        message: undefined,
      })
      // Show success toast
      setToastMessage(`Sent alert to ${memberName}`)
      // Hide toast after 3 seconds
      setTimeout(() => {
        setToastMessage(null)
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
    setTimeout(() => {
      setIsLinkCopied(false)
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
    <main className={`h-screen flex flex-col p-8 max-w-6xl mx-auto ${shouldFlash ? 'notification-flash' : ''}`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[10000] transition-opacity duration-300">
          <div 
            className="rounded-lg border border-border bg-background shadow-lg"
            style={{ backgroundColor: 'hsl(var(--background))' }}
          >
            <div className="pt-4 pb-4 px-4">
              <p className="text-sm font-medium text-foreground">{toastMessage}</p>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between flex-shrink-0 mb-6 gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-shrink">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold break-words">{team.name}</h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
          <Button variant="outline" size="sm" onClick={copyTeamLink}>
            {isLinkCopied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy Invite Link
              </>
            )}
          </Button>
          <Switch
            checked={isEditMode}
            onCheckedChange={setIsEditMode}
            aria-label="Toggle edit mode"
          >
            <Edit className="h-4 w-4" />
          </Switch>
        </div>
      </div>

      <Card className="border-0 shadow-none flex-1 min-h-0 flex flex-col">
        <CardContent className="flex-1 min-h-0 p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 h-full auto-rows-fr">
            {members.map((member) => {
              const memberColor = getMemberColor(member)
              const hasCustomColor = !!member.color
              
              return (
                <Card
                  key={member._id}
                  className={`transition-all overflow-hidden h-full flex flex-col border-0 ${
                    isEditMode ? '' : 'cursor-pointer'
                  } ${
                    hasCustomColor
                      ? 'shadow-lg hover:shadow-xl'
                      : 'hover:shadow-md'
                  }`}
                  style={{
                    boxShadow: hasCustomColor
                      ? `0 0 30px ${memberColor}60, 0 10px 20px -5px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)`
                      : undefined,
                  }}
                  onClick={() => !isEditMode && handleQuickNotify(member._id)}
                >
                  <CardContent 
                    className="pt-6 pb-6 px-6 flex-1 flex flex-col justify-center relative"
                    style={{
                      background: `
                        radial-gradient(ellipse at top left, rgba(255, 255, 255, 0.15) 0%, transparent 50%),
                        radial-gradient(ellipse at bottom right, rgba(0, 0, 0, 0.2) 0%, transparent 50%),
                        linear-gradient(135deg, ${memberColor} 0%, ${memberColor}DD 50%, ${memberColor}BB 100%)
                      `,
                    }}
                  >
                    {/* Subtle diagonal pattern overlay */}
                    <div 
                      className="absolute inset-0 opacity-[0.08]"
                      style={{
                        backgroundImage: `repeating-linear-gradient(
                          45deg,
                          transparent,
                          transparent 2px,
                          rgba(0, 0, 0, 0.3) 2px,
                          rgba(0, 0, 0, 0.3) 4px
                        )`,
                      }}
                    />
                    {/* Inner shadow for depth */}
                    <div 
                      className="absolute inset-0 pointer-events-none rounded-lg"
                      style={{
                        boxShadow: `
                          inset 0 2px 10px rgba(0, 0, 0, 0.25),
                          inset 0 -2px 10px rgba(255, 255, 255, 0.15),
                          inset 0 0 20px rgba(0, 0, 0, 0.1)
                        `,
                      }}
                    />
                    <div className="flex flex-col items-center justify-center space-y-2 relative h-full z-10">
                      {isEditMode && (
                        <div className="flex gap-2 w-full justify-end absolute top-0 right-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation()
                              openRenameDialog(member._id)
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteMember(member._id)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      <div className="flex flex-col items-center">
                        <p className="font-semibold text-lg text-center">{member.name}</p>
                        {member._id === currentMemberId && (
                          <Badge variant="secondary" className="mt-1">
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
