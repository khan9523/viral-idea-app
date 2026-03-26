# 🚀 Viral Idea App - Deployment Guide

This app now requires Google OAuth and JWT configuration in addition to your database and OpenAI settings.

## ✅ Features Implemented

1. ✅ **Category Selection** - 8 different content categories (Comedy, Educational, etc.)
2. ✅ **Save Favorites** - Save ideas to browser storage with local persistence
3. ✅ **Regenerate** - Get alternative suggestions for the same prompt
4. ✅ **Export Ideas** - Download as JSON or TXT format
5. ✅ **Mobile Responsive** - Fully optimized for phones, tablets, and desktops
6. ✅ **Category-aware AI** - Backend generates category-specific ideas

---

## 🌐 Deployment Options

### Option 1: Vercel + Render (Recommended - FREE)

#### Frontend Deployment (Vercel)

**Step 1: Prepare your repo**
```bash
# Initialize Git if not already done
cd c:\viral-idea-app
git init
git add .
git commit -m "Initial commit - Viral Idea App"
```

**Step 2: Connect to Vercel**
1. Go to https://vercel.com
2. Click "Sign Up" (use GitHub, GitLab, or Bitbucket account)
3. Click "New Project"
4. Select your repository
5. Leave all settings default
6. Click "Deploy"

**Step 3: Update Backend URL in frontend**
After deployment, Vercel will give you a URL like `https://viral-idea-app-xyz.vercel.app`

Update [frontend/src/App.jsx](frontend/src/App.jsx) line with your backend URL:
```javascript
// Replace http://localhost:3001 with your deployed backend URL
const res = await fetch('https://your-backend-url.com/generate', {
```

---

#### Backend Deployment (Render)

**Step 1: Create Render Account**
1. Go to https://render.com
2. Click "Sign Up" and create account
3. Connect your GitHub

**Step 2: Create Web Service**
1. Click "New +"
2. Select "Web Service"
3. Connect your GitHub repository
4. Fill in settings:
   - **Name**: `viral-idea-backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `cd backend && node server.js`
   - **Region**: Choose closest to you

**Step 3: Add Environment Variables**
1. In Render dashboard, go to "Environment"
2. Add:
   ```
   PORT = 5000
   MONGO_URI = your_mongodb_connection_string
   OPENAI_API_KEY = your_actual_key_here
   JWT_SECRET = replace_with_a_long_random_secret
   GOOGLE_CLIENT_ID = your_google_web_client_id.apps.googleusercontent.com
   FRONTEND_URL = https://your-vercel-app.vercel.app
   ```
3. Click "Create Web Service"

**Step 4: Update frontend with backend URL**
Once deployed, update App.jsx with your Render URL:
```javascript
const res = await fetch('https://viral-idea-backend.onrender.com/generate', {
```

---

### Option 2: Netlify + Railway

#### Frontend Deployment (Netlify)
1. Go to https://netlify.com
2. Drag and drop your `frontend` folder
3. Done! (takes 1 minute)

#### Backend Deployment (Railway)
1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub"
4. Add `OPENAI_API_KEY` environment variable
5. Set start command: `node backend/index.js`

---

### Option 3: Full Stack on Railway/Render

**Recommended if you want everything in one place:**

1. Push entire app to GitHub
2. Deploy to Railway or Render
3. Set up as monorepo with separate build configs

---

## 📋 Pre-Deployment Checklist

- [ ] Test locally: `http://localhost:5173` working
- [ ] Test backend: `http://localhost:3001/` returns `{"message":"Backend working"}`
- [ ] Test generate endpoint with category support
- [ ] Verify save favorites works in browser
- [ ] Test export functionality (JSON & TXT)
- [ ] Test on mobile browser (DevTools)
- [ ] OPENAI_API_KEY is valid and has credits
- [ ] Git repository initialized and committed

---

## 🔧 Environment Variables Needed

**Backend (.env file):**
```
OPENAI_API_KEY=sk-proj-xxxxx
PORT=3001
```

**Frontend (.env file):**
```
VITE_API_URL=https://your-backend-domain.com
VITE_GOOGLE_CLIENT_ID=your_google_web_client_id.apps.googleusercontent.com
```

---

## 📊 File Structure for Deployment

```
viral-idea-app/
├── backend/
│   ├── server.js         ← Main server file
│   ├── package.json
│   ├── .env              ← Keep secrets here
│   └── node_modules/
├── frontend/
│   ├── src/
│   │   ├── App.jsx       ← Update API URL here
│   │   └── App.css
│   ├── package.json
│   ├── vite.config.js
│   └── node_modules/
└── .gitignore            ← Add .env and node_modules
```

---

## 🛠️ Post-Deployment Testing

After deploying, test:

1. **Health Check**: Visit `https://your-backend-url.com/` 
   - Should see: `{"message":"Backend working"}`

2. **Google Sign-In**:
   - Confirm the frontend shows the Google button
   - Sign in with a Gmail account
   - Verify that the backend returns a JWT and the app loads chats/profile

3. **Generate with Category**:
   ```bash
   curl -X POST https://your-backend-url.com/generate \
     -H "Content-Type: application/json" \
     -d '{"prompt":"YouTube ideas","category":"Comedy"}'
   ```

4. **Frontend**: Visit `https://your-frontend-url.com`
   - Try generating an idea
   - Test saving to favorites
   - Test export functionality

---

## 🚨 Troubleshooting

**CORS Error?**
- Backend has CORS enabled ✅
- Check that frontend URL is correct in backend deployment

**Google button missing?**
- Verify `VITE_GOOGLE_CLIENT_ID` is set in Vercel
- Verify `GOOGLE_CLIENT_ID` is set in the backend
- Confirm your Google OAuth client allows the deployed frontend origin

**JWT errors?**
- Verify `JWT_SECRET` exists in backend environment variables
- Restart the backend after updating env vars

**API Key Error?**
- Verify OPENAI_API_KEY in environment variables
- Check that key has valid credits

**Port Issues?**
- For production, use PORT from environment variable
- Backend automatically uses `process.env.PORT || 3001`

---

## 🎯 Performance Optimization (Future)

- Add caching for generated ideas (Redis)
- Implement rate limiting
- Add database to store user ideas
- Create user accounts and authentication
- Build mobile app with React Native

---

## 📞 Support Resources

- **Vercel Docs**: https://vercel.com/docs
- **Render Docs**: https://render.com/docs
- **OpenAI API**: https://platform.openai.com/docs
- **Vite Docs**: https://vitejs.dev

---

Ready to deploy? Choose your deployment platform above and follow the steps! 🚀
