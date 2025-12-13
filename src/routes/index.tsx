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

export const Route = createFileRoute('/')({
  component: Home,
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
      className="transition-all hover:border-foreground/30 hover:shadow-md cursor-pointer"
      onClick={() => onNavigate(teamId)}
    >
      <CardContent className="pt-6">
        <h3 className="font-semibold text-lg mb-3">{team.name}</h3>
        {members && members.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {members.map((member) => {
              const memberColor = getMemberColor(member)
              return (
                <Badge
                  key={member._id}
                  className="text-xs"
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
    <main className="min-h-screen p-8 flex flex-col items-center justify-center gap-8">
      <div className="text-center mb-4">
        <h1 className="text-4xl font-bold mb-2">Next Speaker</h1>
        <p className="text-muted-foreground">
          Simple notifications for team turn-taking. No login required.
        </p>
      </div>

      <div className="w-full max-w-2xl">
        <Card className="transition-all hover:border-foreground/30 hover:shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{mode === 'create' ? 'Create a Team' : 'Join a Team'}</CardTitle>
                <CardDescription>
                  {mode === 'create'
                    ? 'Start a new team and get a shareable link'
                    : 'Enter a team ID to join an existing team'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={mode === 'create' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => {
                    setMode('create')
                    setError(null)
                    setJoinTeamId('')
                  }}
                >
                  Create
                </Button>
                <Button
                  type="button"
                  variant={mode === 'join' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => {
                    setMode('join')
                    setError(null)
                    setCreateTeamName('')
                  }}
                >
                  Join
                </Button>
              </div>

              {mode === 'create' ? (
                <form onSubmit={handleCreateTeam} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="teamName" className="text-sm font-medium">
                      Team Name
                    </label>
                    <div className="flex gap-2">
                      <Input
                        id="teamName"
                        placeholder="My Team"
                        value={createTeamName}
                        onChange={(e) => setCreateTeamName(e.target.value)}
                        disabled={isCreating}
                        required
                        autoFocus
                        className="flex-1"
                      />
                      <Button type="submit" disabled={isCreating}>
                        {isCreating ? 'Creating...' : 'Create Team'}
                      </Button>
                    </div>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleJoinTeam} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="teamId" className="text-sm font-medium">
                      Team ID
                    </label>
                    <div className="flex gap-2">
                      <Input
                        id="teamId"
                        placeholder="Enter team ID"
                        value={joinTeamId}
                        onChange={(e) => setJoinTeamId(e.target.value)}
                        disabled={isJoining}
                        required
                        autoFocus
                        className="flex-1"
                      />
                      <Button type="submit" disabled={isJoining}>
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
        <div className="w-full max-w-2xl">
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive text-sm">{error}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {userTeamIds.length > 0 && (
        <div className="w-full max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Your Teams</CardTitle>
              <CardDescription>
                Teams you've previously joined
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
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
