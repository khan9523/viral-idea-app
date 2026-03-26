# ViralAI Deployment Steps (Simple)

Follow these steps in order. Do not skip.

## 1. Create Google OAuth Client ID
1. Open https://console.cloud.google.com
2. Create/select a project.
3. Open APIs and Services -> Credentials.
4. Click Create Credentials -> OAuth client ID.
5. Choose Web application.
6. Add Authorized JavaScript origins:
   - http://localhost:5173
   - https://YOUR-FRONTEND-DOMAIN.vercel.app
7. Save and copy the Client ID.

You will use this same Client ID in backend and frontend env vars.

## 2. Prepare Local Env Files
From project root:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env.local
```

Edit backend/.env and set:

```env
PORT=5000
MONGO_URI=your-mongodb-uri
OPENAI_API_KEY=your-openai-key
JWT_SECRET=your-long-random-secret
GOOGLE_CLIENT_ID=your-google-client-id
FRONTEND_URL=http://localhost:5173
```

Edit frontend/.env.local and set:

```env
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

## 3. Test Locally First
Open Terminal 1:

```powershell
cd backend
npm install
npm start
```

Open Terminal 2:

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 and verify:
1. Google sign-in button is visible.
2. Gmail login works.
3. App opens after login.

## 4. Deploy Backend to Render
1. Create a Render Web Service from the backend folder.
2. Set these env vars in Render:
   - PORT=5000
   - MONGO_URI=your-mongodb-uri
   - OPENAI_API_KEY=your-openai-key
   - JWT_SECRET=your-long-random-secret
   - GOOGLE_CLIENT_ID=your-google-client-id
   - FRONTEND_URL=https://YOUR-FRONTEND-DOMAIN.vercel.app
3. Deploy and copy your backend URL, for example:
   - https://your-backend.onrender.com

## 5. Deploy Frontend to Vercel
1. Create/import project in Vercel from the frontend folder.
2. Set env vars in Vercel:
   - VITE_API_URL=https://your-backend.onrender.com
   - VITE_GOOGLE_CLIENT_ID=your-google-client-id
3. Deploy and copy your frontend URL.

## 6. Update Google OAuth Origins
Go back to Google Cloud OAuth client and ensure both are present:
1. http://localhost:5173
2. https://YOUR-FRONTEND-DOMAIN.vercel.app

Save changes.

## 7. Final Production Test
1. Open your Vercel frontend URL.
2. Click Google sign in.
3. Login with Gmail.
4. Confirm app loads and API calls work.

## If Something Fails
1. Google button missing: check VITE_GOOGLE_CLIENT_ID in Vercel/local env.
2. Login fails: verify frontend domain is added in Google OAuth origins.
3. 500 on /google-login: verify backend GOOGLE_CLIENT_ID and JWT_SECRET.
4. Network errors: verify VITE_API_URL points to live backend URL.
