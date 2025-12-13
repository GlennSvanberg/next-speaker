&#x20;a user

### 🎯 Project Overview

Project Name: Next Speaker

Goal: A no-authentication real-time notification app for team turn-taking. Users create teams with shareable links, join by entering their name, and send notifications to specific team members to signal it's their turn to speak. Think of it as a digital "tap on the shoulder" - simple, quick, and effective.

### 🎨 Design Philosophy & Decisions

**Core Principles:**

1. **Zero Friction**: No authentication, no accounts, no setup complexity
2. **Instant Setup**: Create a team in seconds, share a link, start using
3. **Visual & Intuitive**: Card-based UI where actions are obvious and immediate
4. **Real-Time First**: All changes sync instantly across all devices
5. **Minimal UI**: Focus on the core action (notifying) without clutter

**Key Design Decisions:**

1. **No Authentication System**
   - **Why**: Eliminates setup friction and account management overhead
   - **How**: Link-based access control using cryptographically random team IDs
   - **Trade-off**: Less security, but acceptable for the use case (turn-taking signals)
2. **Card-Based Member Grid**
   - **Why**: Visual, intuitive, and allows quick actions
   - **How**: Members displayed in responsive grid (1/2/3 columns based on screen size)
   - **Interaction**: Click card = quick notify, Click button = custom message
3. **Click-to-Notify Pattern**
   - **Why**: Fastest possible action for the primary use case
   - **How**: Entire card is clickable for instant notification (no message)
   - **Progressive Enhancement**: "Send message" button for optional custom messages
4. **Self-Notification Allowed**
   - **Why**: Useful for testing, self-reminders, or demo purposes
   - **How**: No filtering of current user from notification targets
5. **Minimal Notification History**
   - **Why**: History is secondary to the primary action (sending notifications)
   - **How**: Smaller, muted card that only appears when notifications exist
   - **Display**: Limited to 10 most recent, compact layout, scrollable
6. **Add Member from Team Page**
   - **Why**: Convenience - don't need to share link, can add directly
   - **How**: Dialog form accessible from team page header

### 💻 Technology Stack

- **Backend**: Convex (real-time database and API)
- **Frontend**: TanStack Router + TanStack Start (React framework)
- **UI Components**: ShadCN UI (built on Radix UI)
- **Styling**: Tailwind CSS v4
- **State Management**: TanStack Query (with Convex adapter)
- **Language**: TypeScript

### 🔐 Authentication & Security

**No authentication required** - The app uses link-based access control:

- Unique team IDs (Convex document IDs) serve as the security mechanism
- Anyone with a team link can join and send notifications
- Team IDs are cryptographically random and unguessable
- Member identification is handled via localStorage (session-based)
- **Security Model**: Link-based security is acceptable for this use case (turn-taking signals, not sensitive data)

### 📊 Database Schema (`convex/schema.ts`)

The database consists of three tables:

1. **teams**
   - `name`: string - Team name
   - `_id`: Id<"teams"> - Unique team identifier (used in URLs)
   - `_creationTime`: number - Timestamp
2. **members**
   - `teamId`: Id<"teams"> - Reference to team
   - `name`: string - Member's display name
   - `_id`: Id<"members"> - Unique member identifier
   - `_creationTime`: number - Join timestamp
   - Index: `by_teamId` on `teamId`
3. **notifications**
   - `teamId`: Id<"teams"> - Reference to team
   - `fromMemberId`: Id<"members"> - Who sent the notification
   - `toMemberId`: Id<"members"> - Who receives the notification
   - `message`: string (optional) - Optional message
   - `_id`: Id<"notifications"> - Unique notification identifier
   - `_creationTime`: number - Timestamp
   - Index: `by_teamId` on `teamId`

### 🧠 Convex API (`convex/teams.ts`)

**Mutations:**

- `createTeam(teamName: string, memberName: string)`
  - Creates a new team and adds the creator as the first member
  - Returns: `{ teamId: Id<"teams">, memberId: Id<"members"> }`
- `joinTeam(teamId: Id<"teams">, memberName: string)`
  - Adds a new member to an existing team
  - Validates team exists
  - Returns: `{ memberId: Id<"members"> }`
- `sendNotification(teamId: Id<"teams">, fromMemberId: Id<"members">, toMemberId: Id<"members">, message?: string)`
  - Creates a notification record
  - Validates team and member existence
  - Validates both members belong to the team
  - Returns: `{ success: boolean }`

**Queries:**

- `getTeam(teamId: Id<"teams">)`
  - Returns team document or null
- `getMembers(teamId: Id<"teams">)`
  - Returns array of all team members ordered by join time (ascending)
- `getNotifications(teamId: Id<"teams">)`
  - Returns up to 50 most recent notifications for the team
  - Ordered by creation time (descending)
  - Includes enriched data: `fromMemberName`, `toMemberName`

### 🎨 UI Components (ShadCN UI)

The project uses ShadCN UI components located in `src/components/ui/`:

- **Button**: Primary actions (create team, join team, send notification, add member)
- **Card**: Container components (team info, member cards, notifications)
- **Input**: Text inputs (team name, member name, message)
- **Dialog**: Modal dialogs (add member, send message)
- **Avatar**: Member avatars with initials fallback
- **Badge**: Visual indicators (e.g., "You" badge)

**Component Usage:**

- Import from `~/components/ui/[component-name]`
- Use Tailwind classes for styling
- Components support dark mode via CSS variables
- All components are accessible (built on Radix UI primitives)

**Styling:**

- CSS variables defined in `src/styles/app.css` for theming
- Supports light/dark mode
- Uses Tailwind CSS v4 with `@tailwindcss/vite` plugin

### 🧠 Convex Interaction and Data Flow

Convex is the "Agent" handling all server-side responsibilities. It follows a **Code-First, Reactive** paradigm:

1. **Schema Definition:**
   - The database structure (tables: `teams`, `members`, `notifications`) is defined in `convex/schema.ts` using TypeScript. **No manual DB migrations are needed.**
2. **API Definition:**
   - The API endpoints are defined as TypeScript functions (`query`, `mutation`) inside `convex/teams.ts`.
3. **Real-Time Data (Reads):**
   - Frontend components use the TanStack Query adapter (`useSuspenseQuery` wrapping a `convexQuery`) to fetch data.
   - This establishes an **instant, push-based subscription** to the data. The data is **never stale**.
   - Example: `useSuspenseQuery(convexQuery(api.teams.getMembers, { teamId }))`
4. **Data Writes (Mutations):**
   - Frontend calls `useMutation` (e.g., `useMutation(api.teams.sendNotification)`).
   - Upon successful write, Convex automatically pushes the update to **all listening clients**, instantly updating the UI.

### 🛣️ Routes

- `/` - Home page with create team and join team forms
- `/team/$teamId` - Team page showing members in grid, notification sending, and history

### 🎨 UI Patterns & Interactions

**Team Page Layout:**

1. **Header Section**
   - Team name and current user identification
   - "Copy Link" button for sharing
2. **Team Members Grid**
   - Responsive grid: 1 column (mobile), 2 columns (tablet), 3 columns (desktop)
   - Each member displayed as a card with:
     - Avatar with initials
     - Member name
     - "You" badge if current user
     - "Send message" button
   - **Click anywhere on card**: Sends quick notification (no message)
   - **Click "Send message" button**: Opens dialog for custom message
3. **Add Member Dialog**
   - Accessible from "Add Member" button in header
   - Simple form: member name input
   - Adds member immediately to team
4. **Message Dialog**
   - Opens when clicking "Send message" on a member card
   - Optional message input
   - Sends notification with custom message
5. **Notification History** (Less Prominent)
   - Only visible when notifications exist
   - Smaller, muted card styling
   - Shows up to 10 most recent notifications
   - Compact layout with scrollable content
   - Minimal visual weight

### 📚 Integrating Context and Docs (`useContext7`)

For new developers to understand the API available from the Convex backend, the generated TypeScript API (`convex/_generated/api.ts`) is used.

**Crucial Step for AI/Context Tools (like Cursor's useContext7):**

To ensure your code editor or AI assistant (`useContext7`) can properly understand and reference the backend API, you must explicitly include the **entire convex/ directory** in your configuration or context tool:

1. **Directory to Context:** Ensure the **entire convex/ folder** is included in the project's context. This grants the tool access to:
   - `convex/schema.ts` (Database structure).
   - `convex/teams.ts` (The business logic/API functions).
   - `convex/_generated/api.ts` (The generated types and function wrappers).
2. **Benefits:** When generating code (e.g., a new component), the context tool will know exactly:
   - The types of data in the `teams`, `members`, and `notifications` tables.
   - The required arguments for functions like `api.teams.createTeam`, `api.teams.sendNotification`, etc.
   - The structure of the server-side code, resulting in accurate suggestions and boilerplate.

### 🔄 User Flow

1. **Create Team**: User enters team name and their name → Creates team → Redirects to `/team/:teamId` → Stores memberId in localStorage
2. **Join Team**: User enters team ID and their name → Joins team → Redirects to `/team/:teamId` → Stores memberId in localStorage
3. **Add Member**: User clicks "Add Member" → Enters name → Member added → Appears in grid immediately
4. **Quick Notify**: User clicks on member card → Notification sent instantly (no message)
5. **Notify with Message**: User clicks "Send message" → Enters optional message → Notification sent with message
6. **View Team**: Page loads → Queries team, members, notifications → Displays data → Subscribes to real-time updates via Convex

### 🎯 Key Features

- **No authentication required** - just shareable links
- **Real-time updates** - all members see changes instantly
- **Card-based UI** - visual grid of team members
- **Click-to-notify** - fastest possible action
- **Self-notification** - can notify yourself
- **Custom messages** - optional messages via dialog
- **Add members directly** - no need to share link
- **Minimal history** - notification history is present but not prominent
- **Clean UI** with ShadCN components
- **Dark mode support**
- **Mobile-responsive design**

### 🚫 What We Don't Have (By Design)

- **No authentication system** - deliberate choice for simplicity
- **No user accounts** - session-based identification only
- **No notification queue** - just simple notifications
- **No read/unread status** - notifications are just signals
- **No persistent user profiles** - names are per-team
- **No complex permissions** - all team members have equal access
