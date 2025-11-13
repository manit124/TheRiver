# Backend Deployment Guide

This guide will help you deploy the Socket.IO server backend to a hosting platform.

## Prerequisites

- Your code is pushed to GitHub
- You have a GitHub account
- Your frontend is deployed on Vercel (or you have the Vercel URL)

---

## Option 1: Railway (Recommended - Easiest)

Railway is the easiest option with a free tier and automatic deployments.

### Step 1: Sign up for Railway

1. Go to https://railway.app
2. Click "Start a New Project"
3. Sign up with your GitHub account

### Step 2: Create a New Project

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your `poly-poker` repository
4. Railway will auto-detect it's a Node.js project

### Step 3: Configure the Service

1. Railway will create a service automatically
2. Click on the service to open settings
3. Go to the **Settings** tab
4. Scroll down to **Deploy** section:
   - **Start Command**: `npm run mock:server`
   - Railway automatically sets the PORT environment variable

### Step 4: Add Environment Variables

1. In the service settings, go to **Variables** tab
2. Add the following environment variable:
   - **Name**: `CORS_ORIGIN`
   - **Value**: `https://your-vercel-app.vercel.app,https://*.vercel.app`
     - Replace `your-vercel-app` with your actual Vercel domain
     - The `*.vercel.app` allows all Vercel preview deployments

### Step 5: Deploy

1. Railway will automatically start deploying
2. Wait for the deployment to complete (usually 1-2 minutes)
3. Once deployed, Railway will provide a URL like: `https://your-app.railway.app`

### Step 6: Get Your Backend URL

1. In Railway, click on your service
2. Go to the **Settings** tab
3. Scroll to **Networking** section
4. You'll see a **Public Domain** - this is your backend URL
5. Copy this URL (e.g., `https://your-app.railway.app`)

### Step 7: Update Vercel Environment Variable

1. Go to your Vercel dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Update `NEXT_PUBLIC_SOCKET_URL` to your Railway URL:
   - Value: `https://your-app.railway.app`
5. Redeploy your Vercel app (or wait for next deployment)

---

## Option 2: Render (Free Tier Available)

### Step 1: Sign up for Render

1. Go to https://render.com
2. Sign up with your GitHub account

### Step 2: Create a Web Service

1. Click "New" → "Web Service"
2. Connect your GitHub repository
3. Select your `poly-poker` repository

### Step 3: Configure the Service

- **Name**: `poly-poker-socket` (or any name you prefer)
- **Environment**: `Node`
- **Region**: Choose closest to you
- **Branch**: `main` (or your default branch)
- **Root Directory**: Leave empty (or `./`)
- **Build Command**: `npm install`
- **Start Command**: `npm run mock:server`
- **Plan**: Free (or choose a paid plan)

### Step 4: Add Environment Variables

Click "Advanced" and add:
- **Key**: `CORS_ORIGIN`
- **Value**: `https://your-vercel-app.vercel.app,https://*.vercel.app`

### Step 5: Deploy

1. Click "Create Web Service"
2. Render will start building and deploying
3. Wait for deployment to complete
4. Your service will be available at: `https://your-service.onrender.com`

### Step 6: Update Vercel

Update `NEXT_PUBLIC_SOCKET_URL` in Vercel to your Render URL.

---

## Option 3: Fly.io (CLI-based)

### Step 1: Install Fly CLI

```bash
curl -L https://fly.io/install.sh | sh
```

### Step 2: Login

```bash
fly auth login
```

### Step 3: Initialize Your App

```bash
cd /path/to/poly-poker
fly launch
```

Follow the prompts:
- App name: `poly-poker-socket` (or choose your own)
- Region: Choose closest to you
- PostgreSQL: No
- Redis: No

### Step 4: Create fly.toml Configuration

Create or update `fly.toml`:

```toml
app = "poly-poker-socket"
primary_region = "iad"

[build]

[env]
  PORT = "5050"

[http_service]
  internal_port = 5050
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0
  processes = ["app"]

[[services]]
  protocol = "tcp"
  internal_port = 5050

  [[services.ports]]
    port = 80
    handlers = ["http"]
    force_https = true

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
```

### Step 5: Set Environment Variables

```bash
fly secrets set CORS_ORIGIN="https://your-vercel-app.vercel.app,https://*.vercel.app"
```

### Step 6: Deploy

```bash
fly deploy
```

### Step 7: Get Your URL

```bash
fly status
```

Your app will be at: `https://poly-poker-socket.fly.dev`

---

## Testing Your Deployment

### 1. Test the Backend Directly

Open your browser and visit:
```
https://your-backend-url.railway.app
```

You should see a connection (or an error page, which is normal for Socket.IO).

### 2. Test from Frontend

1. Make sure `NEXT_PUBLIC_SOCKET_URL` is set in Vercel
2. Visit your Vercel app
3. Open browser console (F12)
4. Try to create/join a table
5. Check console for connection messages:
   - ✅ `Socket.IO connected: [socket-id]` = Success!
   - ❌ Connection errors = Check CORS and URL

---

## Troubleshooting

### Backend won't start

**Check logs:**
- Railway: Service → Deployments → Click latest → View logs
- Render: Service → Logs tab
- Fly.io: `fly logs`

**Common issues:**
- Port not set: Make sure `PORT` env var is available (Railway/Render set this automatically)
- Dependencies missing: Check that `tsx` is in `package.json` (it should be in devDependencies)

### CORS errors

**Symptoms:** Frontend can't connect, console shows CORS errors

**Fix:**
1. Check `CORS_ORIGIN` env var includes your Vercel domain
2. Make sure there are no trailing slashes in URLs
3. Format: `https://domain1.com,https://domain2.com` (comma-separated, no spaces)

### Connection timeout

**Symptoms:** Frontend tries to connect but times out

**Fix:**
1. Verify backend URL is correct in Vercel env vars
2. Check backend is actually running (visit URL in browser)
3. Make sure backend URL uses `https://` not `http://`
4. Check firewall/network settings

### Socket.IO connection fails

**Symptoms:** `connect_error` in browser console

**Fix:**
1. Verify `NEXT_PUBLIC_SOCKET_URL` is set correctly
2. Check backend logs for errors
3. Make sure both frontend and backend are deployed
4. Try clearing browser cache

---

## Environment Variables Summary

### Backend (Railway/Render/Fly.io)

| Variable | Value | Required |
|----------|-------|----------|
| `PORT` | `5050` | Auto-set by platform |
| `CORS_ORIGIN` | `https://your-app.vercel.app,https://*.vercel.app` | Yes |

### Frontend (Vercel)

| Variable | Value | Required |
|----------|-------|----------|
| `NEXT_PUBLIC_SOCKET_URL` | `https://your-backend.railway.app` | Yes |

---

## Quick Checklist

- [ ] Backend deployed to Railway/Render/Fly.io
- [ ] Backend URL obtained (e.g., `https://xxx.railway.app`)
- [ ] `CORS_ORIGIN` set in backend with Vercel domain
- [ ] `NEXT_PUBLIC_SOCKET_URL` set in Vercel with backend URL
- [ ] Both services are running
- [ ] Tested connection from frontend
- [ ] No CORS errors in browser console

---

## Cost Estimates

- **Railway**: $5 free credit/month (usually enough for small apps)
- **Render**: Free tier (spins down after 15 min inactivity, wakes on request)
- **Fly.io**: Free tier includes 3 shared VMs

For production use, Railway or Render paid plans are recommended for always-on service.

---

## Need Help?

1. Check platform logs (Railway/Render/Fly.io)
2. Check Vercel deployment logs
3. Check browser console for errors
4. Verify all environment variables are set correctly
5. Make sure both services are deployed and running

