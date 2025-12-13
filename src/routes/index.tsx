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
import { Info, ChevronDown, ChevronUp, Users, Bell, Link2, Zap } from 'lucide-react'

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
function TeamCard({ teamId, onNavigate }: { teamId: string; onNavigate: (teamId: string) => void }) {
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

  return (
    <Card
      className="transition-all hover:border-primary/30 hover:shadow-lg cursor-pointer min-h-[90px] bg-card/50 backdrop-blur-sm border-border/50 group active:scale-[0.98]"
      onClick={() => onNavigate(teamId)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onNavigate(teamId)
        }
      }}
      aria-label={`Open team ${team?.name || teamId}`}
    >
      <CardContent className="pt-6">
        <h3 className="font-bold text-lg mb-3 group-hover:text-primary transition-colors">{team.name}</h3>
        {members && members.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {members.map((member) => {
              const memberColor = getMemberColor(member)
              return (
                <Badge
                  key={member._id}
                  className="text-xs font-semibold shadow-sm hover:shadow-md transition-shadow"
                  style={{
                    backgroundColor: memberColor,
                    color: '#ffffff',
                    borderColor: memberColor,
                  }}
                >
                  {member.name}
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

  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [createTeamName, setCreateTeamName] = useState('')
  const [joinTeamId, setJoinTeamId] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userTeamIds, setUserTeamIds] = useState<string[]>([])
  const [showHowItWorks, setShowHowItWorks] = useState(false)

  // Load user teams from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('userTeams')
    if (stored) {
      try {
        const teams = JSON.parse(stored)
        setUserTeamIds(teams)
      } catch (err) {
        console.error('Failed to parse userTeams from localStorage:', err)
      }
    }
  }, [])

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

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinTeamId.trim()) {
      setError('Please enter a team ID')
      return
    }

    setIsJoining(true)
    setError(null)

    try {
      // Validate teamId format (basic check)
      if (!joinTeamId.match(/^[a-zA-Z0-9_-]+$/)) {
        throw new Error('Invalid team ID format')
      }

      await navigate({ to: '/team/$teamId', params: { teamId: joinTeamId.trim() } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join team')
      setIsJoining(false)
    }
  }

  return (
    <main className="min-h-screen p-4 sm:p-8 flex flex-col items-center justify-center gap-6 sm:gap-8 relative overflow-hidden">
      {/* Background gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-muted/20 pointer-events-none -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)] pointer-events-none -z-10" />
      
      <div className="text-center mb-2 sm:mb-4 w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-3">
          Your turn
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground px-4 font-medium">
          Simple notifications for team turn-taking. No login required.
        </p>
      </div>

      {/* How it works section */}
      <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-3">
            <button
              type="button"
              onClick={() => setShowHowItWorks(!showHowItWorks)}
              className="flex items-center justify-between w-full text-left group hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors"
              aria-expanded={showHowItWorks}
              aria-label="How it works"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Info className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg font-semibold">How it works</CardTitle>
              </div>
              {showHowItWorks ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              )}
            </button>
          </CardHeader>
          {showHowItWorks && (
            <CardContent className="pt-0 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="space-y-4 text-sm">
                <div className="flex gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-shrink-0">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Users className="h-5 w-5 text-blue-500" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground mb-1">Create or join a team</p>
                    <p className="text-muted-foreground">Create a new team or join an existing one using a team link. No account needed!</p>
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
                    <p className="text-muted-foreground">Copy and share your team link with others. They can join instantly.</p>
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
                    <p className="text-muted-foreground">Click on any team member's card to instantly notify them. They'll see a visual flash and get a browser notification.</p>
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
                    <p className="text-muted-foreground">All changes sync instantly across all devices. Perfect for coordinating turns in meetings or group activities.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
        <Card className="transition-all hover:border-primary/30 hover:shadow-2xl bg-card/80 backdrop-blur-sm border-border/50 shadow-xl">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl sm:text-2xl font-bold mb-2">
                  {mode === 'create' ? 'Create a Team' : 'Join a Team'}
                </CardTitle>
                <CardDescription className="text-base">
                  {mode === 'create'
                    ? 'Start a new team and get a shareable link'
                    : 'Enter a team ID to join an existing team'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              <div className="flex gap-3 p-1 bg-muted/50 rounded-lg">
                <Button
                  type="button"
                  variant={mode === 'create' ? 'default' : 'ghost'}
                  className={`flex-1 min-h-[48px] text-base sm:text-sm font-semibold transition-all ${
                    mode === 'create' 
                      ? 'shadow-md hover:shadow-lg' 
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => {
                    setMode('create')
                    setError(null)
                    setJoinTeamId('')
                  }}
                  aria-label="Create a new team"
                >
                  Create
                </Button>
                <Button
                  type="button"
                  variant={mode === 'join' ? 'default' : 'ghost'}
                  className={`flex-1 min-h-[48px] text-base sm:text-sm font-semibold transition-all ${
                    mode === 'join' 
                      ? 'shadow-md hover:shadow-lg' 
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => {
                    setMode('join')
                    setError(null)
                    setCreateTeamName('')
                  }}
                  aria-label="Join an existing team"
                >
                  Join
                </Button>
              </div>

              {mode === 'create' ? (
                <form onSubmit={handleCreateTeam} className="space-y-4">
                  <div className="space-y-3">
                    <label htmlFor="teamName" className="text-sm font-semibold text-foreground">
                      Team Name
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Input
                        id="teamName"
                        placeholder="My Team"
                        value={createTeamName}
                        onChange={(e) => setCreateTeamName(e.target.value)}
                        disabled={isCreating}
                        required
                        autoFocus
                        className="flex-1 min-h-[48px] text-base border-2 focus:border-primary transition-colors"
                        aria-label="Team name"
                      />
                      <Button 
                        type="submit" 
                        disabled={isCreating} 
                        className="min-h-[48px] text-base sm:text-sm font-semibold shadow-md hover:shadow-lg transition-all px-6"
                      >
                        {isCreating ? 'Creating...' : 'Create Team'}
                      </Button>
                    </div>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleJoinTeam} className="space-y-4">
                  <div className="space-y-3">
                    <label htmlFor="teamId" className="text-sm font-semibold text-foreground">
                      Team ID
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Input
                        id="teamId"
                        placeholder="Enter team ID"
                        value={joinTeamId}
                        onChange={(e) => setJoinTeamId(e.target.value)}
                        disabled={isJoining}
                        required
                        autoFocus
                        className="flex-1 min-h-[48px] text-base border-2 focus:border-primary transition-colors"
                        aria-label="Team ID"
                      />
                      <Button 
                        type="submit" 
                        disabled={isJoining} 
                        className="min-h-[48px] text-base sm:text-sm font-semibold shadow-md hover:shadow-lg transition-all px-6"
                      >
                        {isJoining ? 'Joining...' : 'Join Team'}
                      </Button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card className="border-destructive/50 bg-destructive/5 shadow-lg">
            <CardContent className="pt-6">
              <p className="text-destructive text-sm font-medium">{error}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {userTeamIds.length > 0 && (
        <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <Card className="bg-card/80 backdrop-blur-sm border-border/50 shadow-xl hover:shadow-2xl transition-all">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Your Teams</CardTitle>
              <CardDescription className="text-base">
                Teams you've previously joined
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {userTeamIds.map((teamId) => (
                  <TeamCard
                    key={teamId}
                    teamId={teamId}
                    onNavigate={(id) => navigate({ to: '/team/$teamId', params: { teamId: id } })}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  )
}
