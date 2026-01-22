# 🧹 Sweep Deployment Guide

## Quick Deploy

### Frontend → Vercel (Free)

1. **Connect GitHub to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import `nirholas/sweep` (or your fork)
   - Set **Root Directory** to `frontend`
   - Click Deploy

2. **Set Environment Variables** (in Vercel dashboard → Settings → Environment Variables)
   ```
   NEXT_PUBLIC_API_URL=https://your-railway-app.up.railway.app
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
   ```

3. **Get WalletConnect Project ID**
   - Go to [cloud.reown.com](https://cloud.reown.com)
   - Create a new project
   - Copy the Project ID

### Backend → Railway (~$5/month)

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Deploy from GitHub**
   - Click "New Project" → "Deploy from GitHub repo"
   - Select `nirholas/sweep` (or your fork)
   - Railway auto-detects the Node.js project

3. **Add PostgreSQL**
   - Click "New" → "Database" → "PostgreSQL"
   - Railway automatically sets `DATABASE_URL`

4. **Add Redis**
   - Click "New" → "Database" → "Redis"
   - Railway automatically sets `REDIS_URL`

5. **Set Environment Variables** (Settings → Variables)
   ```bash
   # Required
   NODE_ENV=production
   PORT=3000
   
   # API Keys (get from each provider)
   ALCHEMY_API_KEY=your_key
   COINGECKO_API_KEY=your_key
   
   # Optional (for full features)
   ONEINCH_API_KEY=your_key
   LIFI_API_KEY=your_key
   PIMLICO_API_KEY=your_key
   HELIUS_API_KEY=your_key
   ```

6. **Generate Domain**
   - Settings → Networking → Generate Domain
   - Copy the URL for Vercel's `NEXT_PUBLIC_API_URL`

---

## Alternative: Render

### Backend + Database on Render

1. Go to [render.com](https://render.com)
2. New → Web Service → Connect GitHub
3. Select repo, set:
   - **Build Command**: `npm install --legacy-peer-deps && npm run build`
   - **Start Command**: `npm start`
4. Add PostgreSQL (New → PostgreSQL)
5. Add Redis (New → Redis)
6. Set environment variables

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `NODE_ENV` | ✅ | `production` |
| `PORT` | ✅ | `3000` |
| `ALCHEMY_API_KEY` | ✅ | For RPC calls |
| `COINGECKO_API_KEY` | ⚠️ | For token prices |
| `ONEINCH_API_KEY` | ⚠️ | For swap quotes |
| `LIFI_API_KEY` | ⚠️ | For cross-chain |
| `PIMLICO_API_KEY` | ⚠️ | For account abstraction |
| `HELIUS_API_KEY` | ⚠️ | For Solana |

⚠️ = Recommended for full functionality

---

## Cost Estimates

| Service | Provider | Monthly Cost |
|---------|----------|--------------|
| Frontend | Vercel | **Free** |
| Backend | Railway | ~$5-10 |
| PostgreSQL | Railway | ~$5 |
| Redis | Railway | ~$5 |
| **Total** | | **~$15-20/month** |

---

## After Deployment

1. **Run database migrations**
   ```bash
   # In Railway, add a one-time job or run locally:
   DATABASE_URL=your_railway_postgres_url npm run db:migrate
   ```

2. **Update Vercel env vars** with your Railway API URL

3. **Test the app** at your Vercel domain

4. **Set up custom domain** (optional)
   - Vercel: Settings → Domains → Add `sweep.exchange`
   - Railway: Settings → Networking → Custom Domain → Add `api.sweep.exchange`

---

## Troubleshooting

**Build fails on Vercel?**
- Make sure Root Directory is set to `frontend`

**API not connecting?**
- Check `NEXT_PUBLIC_API_URL` has no trailing slash
- Check Railway service is running (green dot)

**Database connection fails?**
- Verify `DATABASE_URL` is set in Railway
- Run `npm run db:migrate` if tables don't exist
