# Deploying Poly Poker to Vercel

## Overview
This app has two parts:
1. **Frontend (Next.js)** - Deploy to Vercel
2. **Backend (Socket.IO Server)** - Deploy separately (Railway/Render recommended)

---

## Step 1: Deploy Frontend to Vercel

### Option A: Via Vercel Dashboard (Easiest)

1. **Push your code to GitHub** (if not already done)
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Go to Vercel Dashboard**
   - Visit https://vercel.com
   - Sign up/Login with GitHub
   - Click "Add New Project"
   - Import your GitHub repository

3. **Configure Project**
   - Framework Preset: **Next.js** (auto-detected)
   - Root Directory: `./` (default)
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)

4. **Add Environment Variables**
   - Click "Environment Variables"
   - Add: `NEXT_PUBLIC_SOCKET_URL` = `https://your-socket-server.railway.app` (or your socket server URL)
   - Make sure it's available for Production, Preview, and Development

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Your app will be live at `https://your-project.vercel.app`

### Option B: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Add environment variable
vercel env add NEXT_PUBLIC_SOCKET_URL
# Enter your socket server URL when prompted
```

---

## Step 2: Deploy Socket Server (Choose One)

### Option A: Railway (Recommended - Free tier available)

1. **Go to Railway**
   - Visit https://railway.app
   - Sign up with GitHub
   - Click "New Project" → "Deploy from GitHub repo"

2. **Select Your Repository**
   - Choose your poly-poker repo
   - Railway will auto-detect it

3. **Configure Service**
   - Add a new service
   - Set start command: `npm run mock:server`
   - Set port: `5050` (or use Railway's PORT env var)

4. **Add Environment Variables** (if needed)
   - `PORT=5050` (Railway provides this automatically)

5. **Get Your URL**
   - Railway will give you a URL like: `https://your-app.railway.app`
   - **Important**: Update your Vercel env var `NEXT_PUBLIC_SOCKET_URL` to this URL

### Option B: Render (Free tier available)

1. **Go to Render**
   - Visit https://render.com
   - Sign up with GitHub
   - Click "New" → "Web Service"

2. **Connect Repository**
   - Select your GitHub repo

3. **Configure**
   - Name: `poly-poker-socket`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm run mock:server`
   - Plan: Free

4. **Environment Variables**
   - `PORT=5050` (Render provides this automatically)

5. **Deploy**
   - Click "Create Web Service"
   - Get your URL and update Vercel env var

### Option C: Fly.io (Free tier available)

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Launch app
fly launch

# Set start command
fly scale count 1
```

---

## Step 3: Update Socket Server for Production

You may need to update your socket server to use the PORT environment variable:

```typescript
// In scripts/mock-socket-server.ts
const PORT = process.env.PORT || 5050;
httpServer.listen(PORT, () => {
  console.log(`Socket server running on port ${PORT}`);
});
```

Also update CORS to allow your Vercel domain:

```typescript
const io = new Server(httpServer, {
  cors: { 
    origin: [
      'http://localhost:3000',
      'https://your-project.vercel.app',
      'https://*.vercel.app' // Allow all Vercel previews
    ], 
    methods: ['GET', 'POST'] 
  },
});
```

---

## Step 4: Update Frontend Socket URL

Make sure your frontend uses the environment variable:

```typescript
// src/lib/socket.ts should already use:
const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5050';
```

---

## Quick Checklist

- [ ] Code pushed to GitHub
- [ ] Frontend deployed to Vercel
- [ ] Socket server deployed to Railway/Render/Fly.io
- [ ] Environment variable `NEXT_PUBLIC_SOCKET_URL` set in Vercel
- [ ] CORS updated in socket server to allow Vercel domain
- [ ] Test the deployed app!

---

## Troubleshooting

### Socket connection fails
- Check that `NEXT_PUBLIC_SOCKET_URL` is set correctly in Vercel
- Verify CORS allows your Vercel domain
- Check socket server logs for errors

### Build fails on Vercel
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify TypeScript compiles: `npm run typecheck`

### Socket server won't start
- Check that `PORT` environment variable is set
- Verify start command is correct: `npm run mock:server`
- Check server logs for errors

---

## Free Tier Limits

- **Vercel**: Unlimited deployments, 100GB bandwidth/month
- **Railway**: $5 free credit/month (usually enough for small apps)
- **Render**: Free tier with some limitations (spins down after inactivity)
- **Fly.io**: 3 shared VMs free

---

## Need Help?

Check the logs:
- Vercel: Project → Deployments → Click deployment → View logs
- Railway: Service → Logs tab
- Render: Service → Logs tab

