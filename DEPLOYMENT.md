# 🚀 Deployment Guide - Eco-Label Vision

This guide covers deploying the Eco-Label Vision application to production.

## 📋 Overview

The application has two main components:
- **Frontend**: React + Vite (deployed to Vercel)
- **Backend**: FastAPI + PyTorch (deployed to Render/Railway/Fly.io)

---

## 🎨 Frontend Deployment (Vercel)

### Step 1: Deploy to Vercel

1. Push your code to GitHub (already done!)
2. Go to [vercel.com](https://vercel.com) and sign in
3. Click "Add New Project"
4. Import your GitHub repository: `rudra-00018/bob-ai-hackathon--hackxplore-`
5. Configure the project:
   - **Framework Preset**: Vite
   - **Root Directory**: `src/frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### Step 2: Add Environment Variables

In Vercel project settings → Environment Variables, add:

```
VITE_API_URL=https://your-backend-url.onrender.com
VITE_CHAT_SOURCE=backend
```

### Step 3: Deploy

Click "Deploy" and wait for the build to complete.

### ✅ SPA Routing Fix

The `vercel.json` file has been added to handle client-side routing properly. This ensures that refreshing on routes like `/app/dashboard` or `/app/scanner` works correctly.

---

## ⚙️ Backend Deployment (Render)

### Step 1: Deploy to Render

1. Go to [render.com](https://render.com) and sign in
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `eco-label-backend`
   - **Root Directory**: `src/backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: Free (or upgrade for better performance)

### Step 2: Add Environment Variables

In Render service settings → Environment, add:

```
PORT=8001
SECRET_KEY=your-super-secret-key-here-min-32-chars
GROQ_API_KEY=your-groq-api-key-if-using-chat
CORS_ORIGINS=https://your-frontend-vercel-app.vercel.app,https://bob-ai-hackathon-hackxplore.vercel.app
```

To generate a secure SECRET_KEY, run:
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Step 3: Deploy

Click "Deploy" and wait for the service to start.

### Step 4: Update Frontend Environment

Once your backend is deployed, copy the URL (e.g., `https://eco-label-backend.onrender.com`) and update the Vercel environment variable:

```
VITE_API_URL=https://eco-label-backend.onrender.com
```

Then redeploy the frontend in Vercel.

---

## 🔄 Alternative Backend Deployments

### Railway.app

1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Configure:
   - **Root Directory**: `src/backend`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables (same as above)

### Fly.io

```bash
cd src/backend
fly launch
# Follow the prompts
fly secrets set SECRET_KEY="your-secret-key"
fly secrets set GROQ_API_KEY="your-groq-key"
fly deploy
```

---

## 🐛 Troubleshooting

### Issue: 404 on Page Refresh (Vercel)

**Solution**: The `vercel.json` and `public/_redirects` files have been added to handle SPA routing. Make sure these files are committed and pushed.

### Issue: Network Error on Login/Signup

**Solution**: 
1. Check that backend is running and accessible
2. Verify `VITE_API_URL` environment variable in Vercel points to your backend
3. Check CORS settings in backend to allow your frontend domain

### Issue: CORS Errors

**Solution**: Update `CORS_ORIGINS` environment variable in your backend deployment to include your Vercel frontend URL.

### Issue: Model Loading Errors

**Solution**: 
- Ensure `model.pth` and `model_meta.json` are in the `src/model/` directory
- Backend memory requirements: Minimum 512MB RAM (1GB recommended)
- Consider upgrading to a paid Render plan for better performance

---

## 📊 Monitoring

### Backend Health Check

Visit: `https://your-backend-url.com/health`

Should return:
```json
{
  "status": "healthy",
  "model_loaded": true,
  "database": "connected"
}
```

### Frontend Build Status

Check Vercel dashboard for build logs and deployment status.

---

## 🔐 Security Notes

1. **Never commit `.env` files** with real secrets
2. **Use strong SECRET_KEY** (min 32 characters)
3. **Enable HTTPS** (automatic on Vercel/Render)
4. **Set proper CORS_ORIGINS** to restrict API access
5. **Keep dependencies updated** for security patches

---

## 📱 Testing the Deployed App

1. Visit your Vercel frontend URL
2. Sign up with a test account
3. Upload a waste image to test the scanner
4. Check that predictions are returned correctly
5. Test navigation and page refreshes

---

## 💰 Cost Estimates

### Free Tier (Recommended for Hackathon)
- **Vercel**: Free (includes custom domain)
- **Render**: Free (with cold starts after 15 min inactivity)
- **Total**: $0/month

### Production Tier
- **Vercel Pro**: $20/month (better bandwidth, analytics)
- **Render Starter**: $7/month (no cold starts, better performance)
- **Total**: ~$27/month

---

## 🎯 Next Steps After Deployment

1. ✅ Add your live URL to the demo video
2. ✅ Update `README.md` with deployment links
3. ✅ Test all features on production
4. ✅ Monitor error logs in Vercel and Render dashboards
5. ✅ Share with judges! 🏆

---

## 📞 Support

If you encounter issues:
1. Check Vercel build logs
2. Check Render deployment logs
3. Test backend health endpoint
4. Verify environment variables are set correctly

---

**Good luck with your hackathon submission! 🚀**
