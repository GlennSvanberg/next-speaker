import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Badge } from '~/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/dialog'
import { Info, Users, Bell, Link2, Zap, Trash2, X, Sparkles, CheckCircle2, ArrowRight, Shield, Clock, Rocket } from 'lucide-react'
import { PWAInstallPrompt } from '~/components/PWAInstallPrompt'

export const Route = createFileRoute('/')({
  component: Home,
})

// Generate a deterministic color for members without one (based on member ID)
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

function generateColorForMember(memberId: string) {
  const hash = memberId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const index = hash % MEMBER_COLORS.length
  return MEMBER_COLORS[index]
}

// Component to display a single team card
function TeamCard({ 
  teamId, 
  onNavigate, 
  adminMode = false,
  onDeleteTeam,
  onDeleteMember 
}: { 
  teamId: string
  onNavigate: (teamId: string) => void
  adminMode?: boolean
  onDeleteTeam?: (teamId: string, teamName: string) => void
  onDeleteMember?: (memberId: string, memberName: string) => void
}) {
  const { data: team, isLoading: teamLoading } = useQuery(
    convexQuery(api.teams.getTeam, { teamId: teamId as Id<'teams'> })
  )
  const { data: members, isLoading: membersLoading } = useQuery(
    convexQuery(api.teams.getMembers, { teamId: teamId as Id<'teams'> })
  )

  if (teamLoading || membersLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  if (!team) {
    return null
  }

  const getMemberColor = (member: { _id: string; color?: string | null }) => {
    return member.color || generateColorForMember(member._id)
  }

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking delete button
    if ((e.target as HTMLElement).closest('.delete-button')) {
      return
    }
    onNavigate(teamId)
  }

  const handleDeleteTeam = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDeleteTeam) {
      onDeleteTeam(teamId, team.name)
    }
  }

  const handleDeleteMember = (e: React.MouseEvent, memberId: string, memberName: string) => {
    e.stopPropagation()
    if (onDeleteMember) {
      onDeleteMember(memberId, memberName)
    }
  }

  return (
    <Card
      className="transition-all hover:border-primary/30 hover:shadow-lg cursor-pointer min-h-[90px] bg-card/50 backdrop-blur-sm border-border/50 group active:scale-[0.98] relative"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onNavigate(teamId)
        }
      }}
      aria-label={`Open team ${team?.name || teamId}`}
      trackaton-on-click="hero-view-team"
    >
      {adminMode && onDeleteTeam && (
        <button
          className="delete-button absolute top-3 right-3 p-1.5 rounded-md hover:bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
          onClick={handleDeleteTeam}
          aria-label={`Delete team ${team.name}`}
          title="Delete team"
          trackaton-on-click="admin-delete-team"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
      <CardContent className="pt-6">
        <h3 className="font-bold text-lg mb-3 group-hover:text-primary transition-colors pr-8">{team.name}</h3>
        {members && members.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {members.map((member) => {
              const memberColor = getMemberColor(member)
              return (
                <Badge
                  key={member._id}
                  className="text-xs font-semibold shadow-sm hover:shadow-md transition-shadow relative group/badge"
                  style={{
                    backgroundColor: memberColor,
                    color: '#ffffff',
                    borderColor: memberColor,
                  }}
                >
                  <span className="pr-1">{member.name}</span>
                  {adminMode && onDeleteMember && (
                    <button
                      className="delete-button absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-white/20 text-white opacity-0 group-hover/badge:opacity-100 transition-opacity z-10 flex items-center justify-center cursor-pointer"
                      onClick={(e) => handleDeleteMember(e, member._id, member.name)}
                      aria-label={`Delete member ${member.name}`}
                      title="Delete member"
                      trackaton-on-click="admin-delete-member"
                      style={{ 
                        pointerEvents: 'auto'
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Home() {
  const navigate = useNavigate()
  const createTeam = useMutation(api.teams.createTeam)
  const deleteTeamMutation = useMutation(api.teams.deleteTeam)
  const deleteMemberMutation = useMutation(api.teams.deleteMember)

  const [createTeamName, setCreateTeamName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userTeamIds, setUserTeamIds] = useState<string[]>([])
  const [showHowItWorksDialog, setShowHowItWorksDialog] = useState(false)
  const [adminMode, setAdminMode] = useState(false)
  const [, setClickCount] = useState(0)
  const [lastClickTime, setLastClickTime] = useState(0)
  const [showAdminNotification, setShowAdminNotification] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    type: 'team' | 'member' | null
    title: string
    message: string
    onConfirm: () => void
  }>({
    open: false,
    type: null,
    title: '',
    message: '',
    onConfirm: () => {},
  })

  // Load user teams and admin mode from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('userTeams')
    if (stored) {
      try {
        const teams = JSON.parse(stored)
        // Ensure we only set if it's a valid non-empty array with valid team IDs
        if (Array.isArray(teams) && teams.length > 0) {
          // Filter out any invalid entries (null, undefined, empty strings)
          const validTeams = teams.filter((id) => id && typeof id === 'string' && id.trim().length > 0)
          if (validTeams.length > 0) {
            setUserTeamIds(validTeams)
          } else {
            setUserTeamIds([])
            // Clear invalid data from localStorage
            localStorage.removeItem('userTeams')
          }
        } else {
          setUserTeamIds([])
          // Clear invalid data from localStorage
          if (stored !== '[]') {
            localStorage.removeItem('userTeams')
          }
        }
      } catch (err) {
        console.error('Failed to parse userTeams from localStorage:', err)
        setUserTeamIds([])
        // Clear corrupted data from localStorage
        localStorage.removeItem('userTeams')
      }
    } else {
      // Explicitly set to empty array if nothing in localStorage
      setUserTeamIds([])
    }

    const adminModeStored = localStorage.getItem('adminMode')
    if (adminModeStored === 'true') {
      setAdminMode(true)
    }
  }, [])

  // Handle click counter for admin mode
  const handlePageClick = () => {
    const now = Date.now()
    // Reset counter if more than 2 seconds have passed since last click
    if (now - lastClickTime > 2000) {
      setClickCount(1)
    } else {
      setClickCount((prev) => {
        const newCount = prev + 1
        if (newCount >= 7) {
          setAdminMode(true)
          localStorage.setItem('adminMode', 'true')
          setShowAdminNotification(true)
          setTimeout(() => setShowAdminNotification(false), 4000)
          setClickCount(0)
          return 0
        }
        return newCount
      })
    }
    setLastClickTime(now)
  }

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createTeamName.trim()) {
      setError('Please enter a team name')
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      const { teamId } = await createTeam({
        teamName: createTeamName.trim(),
      })
      
      await navigate({ to: '/team/$teamId', params: { teamId } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create team')
      setIsCreating(false)
    }
  }


  // Fetch all teams when admin mode is enabled
  const { data: allTeams, refetch: refetchAllTeams } = useQuery({
    ...convexQuery(api.teams.getAllTeams, {}),
    enabled: adminMode,
  })

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    setConfirmDialog({
      open: true,
      type: 'team',
      title: 'Delete Team',
      message: `Are you sure you want to delete team "${teamName}"? This will delete all members and notifications.`,
      onConfirm: async () => {
        try {
          await deleteTeamMutation({ teamId: teamId as Id<'teams'> })
          // Refetch all teams to update the list
          refetchAllTeams()
          setConfirmDialog(prev => ({ ...prev, open: false }))
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to delete team')
          setTimeout(() => setError(null), 3000)
          setConfirmDialog(prev => ({ ...prev, open: false }))
        }
      },
    })
  }

  const handleDeleteMember = async (memberId: string, memberName: string) => {
    setConfirmDialog({
      open: true,
      type: 'member',
      title: 'Delete Member',
      message: `Are you sure you want to delete member "${memberName}"?`,
      onConfirm: async () => {
        try {
          await deleteMemberMutation({ memberId: memberId as Id<'members'> })
          // Refetch all teams to update the list
          refetchAllTeams()
          setConfirmDialog(prev => ({ ...prev, open: false }))
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to delete member')
          setTimeout(() => setError(null), 3000)
          setConfirmDialog(prev => ({ ...prev, open: false }))
        }
      },
    })
  }

  return (
    <main 
      className="min-h-screen relative overflow-hidden"
      onClick={handlePageClick}
    >
      {/* Background gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-muted/20 pointer-events-none -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)] pointer-events-none -z-10" />
      
      {/* Top Logo/Brand */}
      <div className="fixed top-6 left-6 z-50 pointer-events-none">
        <div className="flex items-center gap-3">
          <img 
            src="/icon.png" 
            alt="Ping" 
            className="h-8 w-8 object-contain"
            style={{ 
              filter: 'brightness(0) invert(1)',
              opacity: 0.9
            }}
          />
          <span className="text-lg font-bold text-foreground/80">Ping</span>
        </div>
      </div>
      
      {/* Admin Mode Activation Notification */}
      {showAdminNotification && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none">
          <div className="relative animate-admin-notification">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 rounded-3xl blur-2xl opacity-75 animate-pulse" />
            <div className="relative bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-2xl p-8 shadow-2xl border-4 border-white/50">
              <div className="flex flex-col items-center gap-4">
                <Sparkles className="h-16 w-16 text-white animate-spin" style={{ animationDuration: '2s' }} />
                <h2 className="text-4xl font-bold text-white text-center animate-bounce">
                  ULTIMATE SUPERPOWERS ENABLED!
                </h2>
                <p className="text-xl text-white/90 text-center font-semibold">
                  Admin mode activated 🚀
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Admin Mode Button */}
      {adminMode && (
        <div className="fixed top-4 right-4 z-[9999] animate-in fade-in slide-in-from-top-2 duration-300">
          <Button
            variant="destructive"
            onClick={() => {
              setAdminMode(false)
              localStorage.removeItem('adminMode')
            }}
            className="shadow-lg hover:shadow-xl transition-all"
            trackaton-on-click="admin-deactivate-superpowers"
          >
            <X className="h-4 w-4 mr-2" />
            Deactivate Superpowers
          </Button>
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <DialogContent className="sm:max-w-md border-2" style={{ backgroundColor: 'hsl(var(--background))' }}>
          <DialogHeader>
            <DialogTitle className="text-xl">{confirmDialog.title}</DialogTitle>
            <DialogDescription className="pt-2 text-base">
              {confirmDialog.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 sm:gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}
              className="min-h-[40px]"
            >
              No
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                confirmDialog.onConfirm()
              }}
              className="min-h-[40px]"
            >
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <div className="relative group">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl group-hover:bg-primary/30 transition-colors" />
                <img 
                  src="/icon.png" 
                  alt="Ping Logo" 
                  className="relative h-32 w-32 sm:h-40 sm:w-40 md:h-48 md:w-48 lg:h-56 lg:w-56 object-contain transition-all group-hover:scale-110 drop-shadow-lg"
                  style={{ 
                    filter: 'brightness(0) invert(1)',
                    opacity: 0.9
                  }}
                />
              </div>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
              <Rocket className="h-4 w-4" />
              <span>100% Free • No Login Required</span>
            </div>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Never Miss a Ping Again
            </h1>
            <p className="text-xl sm:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto font-medium">
              Simple, instant notifications for team turn-taking. Perfect for meetings, presentations, and group activities.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <Button 
                size="lg"
                onClick={() => {
                  document.getElementById('create-team-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  setTimeout(() => {
                    document.getElementById('teamName')?.focus()
                  }, 500)
                }}
                className="text-lg px-8 py-6 h-auto shadow-xl hover:shadow-2xl transition-all"
                trackaton-on-click="hero-scroll-to-create"
              >
                Create Your Team Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Dialog open={showHowItWorksDialog} onOpenChange={setShowHowItWorksDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="lg"
                    className="text-lg px-8 py-6 h-auto"
                    trackaton-on-click="hero-how-it-works"
                  >
                    <Info className="mr-2 h-5 w-5" />
                    How It Works
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg border-2" style={{ backgroundColor: 'hsl(var(--background))' }}>
                  <DialogHeader>
                    <DialogTitle className="text-xl flex items-center gap-2">
                      <Info className="h-5 w-5 text-primary" />
                      How it works
                    </DialogTitle>
                    <DialogDescription className="pt-2">
                      Learn how to use Ping for team notifications
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="flex gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-shrink-0">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                          <Users className="h-5 w-5 text-blue-500" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground mb-1">Create or join a team</p>
                        <p className="text-sm text-muted-foreground">Create a new team or join an existing one using a team link. No account needed!</p>
                      </div>
                    </div>
                    <div className="flex gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-shrink-0">
                        <div className="p-2 rounded-lg bg-purple-500/10">
                          <Link2 className="h-5 w-5 text-purple-500" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground mb-1">Share the link</p>
                        <p className="text-sm text-muted-foreground">Copy and share your team link with others. They can join instantly.</p>
                      </div>
                    </div>
                    <div className="flex gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-shrink-0">
                        <div className="p-2 rounded-lg bg-green-500/10">
                          <Bell className="h-5 w-5 text-green-500" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground mb-1">Send notifications</p>
                        <p className="text-sm text-muted-foreground">Click on any team member's card to instantly notify them. They'll see a visual flash and get a browser notification.</p>
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
                </DialogContent>
              </Dialog>
            </div>
            <p className="text-sm text-muted-foreground">
              <Shield className="inline h-4 w-4 mr-1" />
              No sign-up required • Instant setup • Privacy-focused
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 sm:px-8 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Why Choose Ping?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              When you just need to notify your team member in the simplest way possible. Just a ping, nothing more.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg bg-card/80 backdrop-blur-sm cursor-pointer" trackaton-on-click="feature-card-lightning-fast">
              <CardHeader>
                <div className="p-3 rounded-lg bg-blue-500/10 w-fit mb-4">
                  <Zap className="h-6 w-6 text-blue-500" />
                </div>
                <CardTitle className="text-xl mb-2">Lightning Fast</CardTitle>
                <CardDescription className="text-base">
                  Send notifications instantly with a single click. No delays, no waiting.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg bg-card/80 backdrop-blur-sm cursor-pointer" trackaton-on-click="feature-card-zero-setup">
              <CardHeader>
                <div className="p-3 rounded-lg bg-green-500/10 w-fit mb-4">
                  <Users className="h-6 w-6 text-green-500" />
                </div>
                <CardTitle className="text-xl mb-2">Zero Setup</CardTitle>
                <CardDescription className="text-base">
                  No accounts, no passwords, no email verification. Just create and share.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg bg-card/80 backdrop-blur-sm cursor-pointer" trackaton-on-click="feature-card-real-time-sync">
              <CardHeader>
                <div className="p-3 rounded-lg bg-purple-500/10 w-fit mb-4">
                  <Bell className="h-6 w-6 text-purple-500" />
                </div>
                <CardTitle className="text-xl mb-2">Real-Time Sync</CardTitle>
                <CardDescription className="text-base">
                  All changes sync instantly across all devices. Everyone stays in the loop.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get started in seconds with our simple three-step process.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="text-center">
              <div className="relative inline-flex items-center justify-center mb-6">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl" />
                <div className="relative p-6 rounded-full bg-primary/10 border-2 border-primary/20">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                  1
                </div>
              </div>
              <h3 className="text-xl font-bold mb-3">Create Your Team</h3>
              <p className="text-muted-foreground">
                Enter a team name and get an instant shareable link. No registration needed.
              </p>
            </div>
            <div className="text-center">
              <div className="relative inline-flex items-center justify-center mb-6">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl" />
                <div className="relative p-6 rounded-full bg-primary/10 border-2 border-primary/20">
                  <Link2 className="h-8 w-8 text-primary" />
                </div>
                <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                  2
                </div>
              </div>
              <h3 className="text-xl font-bold mb-3">Share & Invite</h3>
              <p className="text-muted-foreground">
                Share your team link with members. They join instantly by entering their name.
              </p>
            </div>
            <div className="text-center">
              <div className="relative inline-flex items-center justify-center mb-6">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl" />
                <div className="relative p-6 rounded-full bg-primary/10 border-2 border-primary/20">
                  <Bell className="h-8 w-8 text-primary" />
                </div>
                <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                  3
                </div>
              </div>
              <h3 className="text-xl font-bold mb-3">Start Notifying</h3>
              <p className="text-muted-foreground">
                Click on any team member to instantly notify them. They'll see a visual flash and get a browser notification.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="create-team-form" className="py-16 px-4 sm:px-8 bg-gradient-to-br from-primary/5 via-background to-primary/5">
        <div className="max-w-2xl mx-auto">
          <Card className="border-2 border-primary/30 shadow-2xl bg-card/90 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-3xl sm:text-4xl font-bold mb-3">
                Ready to Get Started?
              </CardTitle>
              <CardDescription className="text-lg">
                Create your team in seconds. It's completely free and requires no login.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateTeam} className="space-y-4">
                <div className="space-y-3">
                  <label htmlFor="teamName" className="text-sm font-semibold text-foreground">
                    Team Name
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                      id="teamName"
                      placeholder="My Awesome Team"
                      value={createTeamName}
                      onChange={(e) => setCreateTeamName(e.target.value)}
                      disabled={isCreating}
                      required
                      autoFocus
                      className="flex-1 min-h-[52px] text-base border-2 focus:border-primary transition-colors"
                      aria-label="Team name"
                    />
                    <Button 
                      type="submit" 
                      disabled={isCreating} 
                      size="lg"
                      className="min-h-[52px] text-base font-semibold shadow-lg hover:shadow-xl transition-all px-8"
                      trackaton-on-click="create-team-submit"
                    >
                      {isCreating ? 'Creating...' : 'Create Team Now'}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>100% free forever</span>
                  <span className="mx-2">•</span>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>No credit card required</span>
                  <span className="mx-2">•</span>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>No login needed</span>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* PWA Install Prompt */}
      {(userTeamIds?.length > 0 || isCreating) && (
        <section className="py-8 px-4 sm:px-8">
          <div className="max-w-2xl mx-auto">
            <PWAInstallPrompt delay={3000} />
          </div>
        </section>
      )}

      {/* Error Display */}
      {error && (
        <div className="max-w-2xl mx-auto px-4 sm:px-8 mb-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card className="border-destructive/50 bg-destructive/5 shadow-lg">
            <CardContent className="pt-6">
              <p className="text-destructive text-sm font-medium">{error}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Your Teams Section */}
      {userTeamIds?.length > 0 ? (
        <section className="py-16 px-4 sm:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h2 className="text-3xl sm:text-4xl font-bold mb-2">Your Teams</h2>
              <p className="text-lg text-muted-foreground">
                Quick access to teams you've previously joined
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userTeamIds.map((teamId) => (
                <TeamCard
                  key={teamId}
                  teamId={teamId}
                  onNavigate={(id) => navigate({ to: '/team/$teamId', params: { teamId: id } })}
                  adminMode={adminMode}
                  onDeleteTeam={adminMode ? handleDeleteTeam : undefined}
                  onDeleteMember={adminMode ? handleDeleteMember : undefined}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Admin Mode - All Teams Section */}
      {adminMode && allTeams && (
        <section className="py-16 px-4 sm:px-8 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h2 className="text-3xl sm:text-4xl font-bold mb-2">All Teams</h2>
              <CardDescription className="text-lg">
                All teams in the system (Admin View)
              </CardDescription>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allTeams.map((team) => (
                <TeamCard
                  key={team._id}
                  teamId={team._id}
                  onNavigate={(id) => navigate({ to: '/team/$teamId', params: { teamId: id } })}
                  adminMode={adminMode}
                  onDeleteTeam={handleDeleteTeam}
                  onDeleteMember={handleDeleteMember}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-8 border-t border-border/50">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-muted-foreground mb-4">
            Made with ❤️ for teams who value simplicity
          </p>
          <p className="text-sm text-muted-foreground">
            <Clock className="inline h-3 w-3 mr-1" />
            Real-time • <Shield className="inline h-3 w-3 mr-1" />
            Privacy-focused • <Zap className="inline h-3 w-3 mr-1" />
            Lightning fast
          </p>
        </div>
      </footer>
    </main>
  )
}
