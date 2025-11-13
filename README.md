# TheRiver

A production-ready multi-variant poker game platform built with Next.js 14, TypeScript, and Socket.IO.

🌐 **Live Demo**: [https://the-river-tez5.vercel.app/](https://the-river-tez5.vercel.app/)

## Features

- **Multiple Game Variants**: Texas Hold'em, Omaha, and Short Deck (coming soon)
- **Real-time Multiplayer**: Socket.IO-powered live game updates
- **Modern UI**: Built with Tailwind CSS and shadcn/ui components
- **Dark Theme**: Optimized dark theme with accent colors
- **Responsive Design**: Works on mobile and desktop
- **Hand History**: Track past hands and actions
- **Mock Server**: Development server for local testing

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand
- **Real-time**: Socket.IO
- **Animations**: Framer Motion
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:5050
```

### Running the Application

1. **Start the mock Socket.IO server** (required for local development):

```bash
npm run mock:server
```

This will start the mock server on `http://localhost:5050`.

2. **Start the Next.js development server** (in a separate terminal):

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Other Commands

- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

## Project Structure

```
the-river/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── layout.tsx    # Root layout
│   │   ├── page.tsx      # Home page
│   │   ├── lobby/        # Lobby page
│   │   └── table/[roomCode]/  # Table page
│   ├── components/       # React components
│   │   ├── TableCanvas/  # Poker table components
│   │   ├── ui/          # shadcn/ui components
│   │   └── icons/       # Icon components
│   ├── store/           # Zustand stores
│   ├── lib/             # Utility functions
│   ├── types/           # TypeScript types
│   └── styles/          # Global styles
├── scripts/
│   └── mock-socket-server.ts  # Mock Socket.IO server
└── package.json
```

## Usage

### Home Page (`/`)

- Select a game variant (Texas Hold'em, Omaha, or Short Deck)
- Click "Quick Play" to auto-join a public table
- Click "Create Table" to configure and create a custom table
- Click "Join by Code" to enter a 6-character room code
- View recent tables from localStorage

### Lobby Page (`/lobby`)

Configure your poker table:
- Game type (Texas Hold'em or Omaha)
- Max players (2-9)
- Big blind amount
- Buy-in amount
- Private/public toggle

### Table Page (`/table/[roomCode]`)

The main game interface featuring:
- **Top Bar**: Room code, connection status, bankroll, sound toggle
- **Community Cards**: Center display of community cards
- **Player Seats**: Circular arrangement of players with avatars, stacks, and dealer button
- **Action Bar**: Fold, Check/Call, Bet/Raise buttons with bet slider
- **Hand History**: Side sheet with past hands
- **Your Cards**: Hole cards display at the bottom

## Mock Server

The mock Socket.IO server (`scripts/mock-socket-server.ts`) simulates a poker game server:

- Manages rooms in memory
- Handles player joins/leaves
- Deals cards and progresses streets
- Processes player actions
- Simulates bot actions (random legal moves)
- Assigns random winners at showdown

To customize the server behavior, edit `scripts/mock-socket-server.ts`.

## Development Notes

- The app uses absolute imports via `@/*` pointing to `src/*`
- Global styles are in `src/styles/globals.css`
- Type definitions are in `src/types/poker.ts`
- State management uses Zustand in `src/store/useTableStore.ts`
- Socket.IO client wrapper is in `src/lib/socket.ts`

## Deployment

TheRiver is currently deployed and live at [https://the-river-tez5.vercel.app/](https://the-river-tez5.vercel.app/)

### Frontend (Vercel)
- **URL**: https://the-river-tez5.vercel.app/
- Automatically deploys from the `main` branch
- Environment variable `NEXT_PUBLIC_SOCKET_URL` points to the Railway backend

### Backend (Railway)
- Socket.IO server running on Railway
- Handles real-time game state and player actions

## Building for Production

```bash
npm run build
npm run start
```

For local development, make sure to set up a Socket.IO server and update `NEXT_PUBLIC_SOCKET_URL` accordingly.

## License

MIT
