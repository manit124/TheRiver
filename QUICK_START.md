# Quick Start Guide

## Step 1: Create Environment File

Create a `.env.local` file in the root directory:

```bash
echo "NEXT_PUBLIC_SOCKET_URL=http://localhost:5050" > .env.local
```

Or manually create `.env.local` with:
```
NEXT_PUBLIC_SOCKET_URL=http://localhost:5050
```

## Step 2: Start the Mock Socket Server

Open a terminal and run:

```bash
npm run mock:server
```

You should see: `Mock Socket.IO server running on port 5050`

**Keep this terminal open!**

## Step 3: Start the Next.js Dev Server

Open a **NEW** terminal window and run:

```bash
npm run dev
```

You should see: `Ready on http://localhost:3000`

## Step 4: Open in Browser

Open your browser and go to:

**http://localhost:3000**

## What You'll See

1. **Home Page** (`/`) - Game selection tiles and action buttons
2. Click "Quick Play" or "Create Table" to start
3. Enter your name when joining a table
4. See the poker table UI with demo players

## Troubleshooting

- Make sure both servers are running (mock server on :5050, Next.js on :3000)
- Check that `.env.local` exists with the correct Socket URL
- If you see connection errors, verify the mock server is running first

