# Ping

A simple, no-authentication real-time notification app for team turn-taking. Think of it as a digital "tap on the shoulder" - quick, effective, and zero friction.

## 🎯 What is Ping?

Ping is designed for teams who need a simple way to signal whose turn it is to speak. No logins, no accounts, no complexity. Just create a team, share the link, and start notifying each other.

### Key Design Decisions

1. **No Authentication**: We deliberately skipped authentication to make setup instant. Anyone with a team link can join - the unique team ID is the security mechanism.
2. **Link-Based Access**: Teams are accessed via shareable links. The team creator gets a unique URL that they can share with team members.
3. **Visual Card-Based UI**: Team members are displayed as cards in a grid. Click anywhere on a card to send a quick notification, or use the "Send message" button for a custom message.
4. **Self-Notification Allowed**: You can notify yourself - useful for testing or self-reminders.
5. **Minimal Notification History**: History is intentionally less prominent - it's there for reference but doesn't dominate the interface.
6. **Real-Time Updates**: All changes sync instantly across all devices using Convex's real-time subscriptions.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- A Convex account (sign up at [convex.dev](https://convex.dev))

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd next-speaker
```

1. Install dependencies:

```bash
npm install
```

1. Set up Convex:

```bash
npx convex dev
```

1. Set your Convex URL in `.env`:

```javascript
VITE_CONVEX_URL=your-convex-url
```

1. Start the development server:

```bash
npm run dev
```

## 📖 How to Use

### Creating a Team

1. Go to the home page (`/`)
2. Enter a team name and your name
3. Click "Create Team"
4. You'll be redirected to your team page
5. Copy the shareable link and send it to your team members

### Joining a Team

1. Get the team link from a team member
2. Visit the link or enter the team ID on the home page
3. Enter your name
4. Click "Join Team"

### Sending Notifications

**Quick Notification** (no message):

- Click anywhere on a team member's card

**Notification with Message**:

- Click the "Send message" button on a member's card
- Enter your optional message
- Click "Send Notification"

### Adding Team Members

- Click the "Add Member" button in the Team Members section
- Enter the new member's name
- They'll be added immediately and can receive notifications

## 🛠️ Technology Stack

- **Backend**: [Convex](https://convex.dev) - Real-time database and API
- **Frontend**: [TanStack Router](https://tanstack.com/router) + [TanStack Start](https://tanstack.com/start)
- **UI Components**: [ShadCN UI](https://ui.shadcn.com) (built on Radix UI)
- **Styling**: [Tailwind CSS](https://tailwindcss.com) v4
- **State Management**: [TanStack Query](https://tanstack.com/query) (with Convex adapter)
- **Language**: TypeScript

## 📁 Project Structure

```javascript
next-speaker/
├── convex/           # Backend (Convex functions and schema)
│   ├── schema.ts     # Database schema
│   └── teams.ts      # API functions
├── src/
│   ├── components/   # React components
│   │   └── ui/       # ShadCN UI components
│   ├── routes/       # TanStack Router routes
│   │   ├── index.tsx           # Home page
│   │   └── team.$teamId.tsx    # Team page
│   └── styles/       # Global styles
└── public/           # Static assets
```

## 🎨 UI Design Philosophy

- **Card-Based Layout**: Members are displayed as cards in a responsive grid
- **Click-to-Act**: Primary action (quick notify) is a simple click
- **Progressive Disclosure**: Advanced features (custom messages) are available but not prominent
- **Minimal History**: Notification history is present but doesn't dominate
- **Visual Feedback**: Clear indication of current user and interactive elements

## 🔐 Security Model

- **No Authentication**: Deliberately omitted for simplicity
- **Link-Based Security**: Unique team IDs (Convex document IDs) are cryptographically random
- **Session-Based Identity**: Member identification via localStorage (per browser session)
- **Team Isolation**: All operations are scoped to team membership

## 📝 Development

### Running Locally

```bash
# Start Convex backend
npm run dev:convex

# Start frontend dev server (in another terminal)
npm run dev:web

# Or run both concurrently
npm run dev
```

### Building for Production

```bash
npm run build
```

### Code Style

```bash
# Format code
npm run format

# Lint code
npm run lint
```

## 🤝 Contributing

This is a simple, focused app. When contributing:

1. Keep it simple - avoid adding complexity
2. Maintain the no-auth philosophy
3. Preserve the card-based UI pattern
4. Ensure real-time updates work correctly

## 📄 License

\[Add your license here]

## 🙏 Acknowledgments

- Built with [Convex](https://convex.dev) for real-time backend
- UI components from [ShadCN UI](https://ui.shadcn.com)
- Icons from [Lucide](https://lucide.dev)
