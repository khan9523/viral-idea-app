# 💡 Viral Idea App

Generate viral social media ideas using AI! Create YouTube Shorts, TikTok videos, Instagram Reels, and more with AI-powered suggestions.

## ✨ Features

- 🚀 **AI-Powered Idea Generation** - Uses GPT-4 to create unique, viral-worthy ideas
- 🏷️ **8 Content Categories** - Comedy, Educational, Inspirational, Trending, Lifestyle, Tech, Business, General
- 💾 **Save Favorites** - Bookmark your favorite ideas (stored in browser)
- 📄 **Export Ideas** - Download ideas as JSON or Text
- 🔄 **Regenerate** - Get alternative suggestions for the same prompt
- 📱 **Mobile Responsive** - Works seamlessly on all devices
- 🌍 **Free to Use** - Just need an OpenAI API key for AI features

## 🎯 Live Demo

- **Frontend**: https://viral-idea-app-xyz.vercel.app (Coming Soon)
- **Backend API**: https://viral-idea-backend.onrender.com (Coming Soon)

## 🛠️ Tech Stack

**Frontend:**
- React 19
- Vite (bundler)
- CSS3 with Flexbox & Grid
- Browser Storage API

**Backend:**
- Node.js + Express
- OpenAI API (GPT-4o-mini)
- CORS enabled

## 📦 Installation

### Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/viral-idea-app.git
cd viral-idea-app

# Frontend Setup
cd frontend
npm install
npm run dev    # Runs on http://localhost:5173

# Backend Setup (in another terminal)
cd backend
npm install
# Create .env file with:
#   OPENAI_API_KEY=your_key_here
#   PORT=3001
node index.js  # Runs on http://localhost:3001
```

## 🚀 Deployment

### Option 1: Vercel (Frontend) + Render (Backend)

**Frontend Deployment:**
1. Push to GitHub
2. Go to https://vercel.com
3. Import your repository
4. Deploy (Vercel auto-detects Vite)
5. Update `API_URL` in frontend after backend is deployed

**Backend Deployment:**
1. Go to https://render.com
2. Create Web Service
3. Connect GitHub repo
4. Set Start Command: `node backend/index.js`
5. Add Environment Variable: `OPENAI_API_KEY`

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

## 🔑 Getting an OpenAI API Key

1. Go to https://platform.openai.com/account/api-keys
2. Create a new API key
3. Add it to your `.env` file
4. Add $5+ credits to your account for API usage

## 📋 Usage

1. **Select Category** - Choose the type of content you want ideas for
2. **Enter Prompt** - Describe your channel, topic, or idea
3. **Generate** - Click "Generate Idea" to get AI suggestions
4. **Save** - Click ❤️ to save to favorites
5. **Export** - Download ideas as JSON or Text
6. **Regenerate** - Get different suggestions for the same prompt

## 🎨 Category Examples

- **Comedy** - Funny skits, relatable humor, pranks
- **Educational** - Tutorials, how-to, learning content
- **Inspirational** - Motivational, life lessons, success stories
- **Trending** - Current trends, viral challenges, memes
- **Lifestyle** - Daily life, travel, wellness, fitness
- **Tech** - Programming, gadgets, software reviews
- **Business** - Entrepreneurship, marketing, startups

## 📊 Project Structure

```
viral-idea-app/
├── backend/
│   ├── index.js                    # Express server & API routes
│   ├── package.json
│   ├── .env                        # API keys (don't commit!)
│   └── node_modules/
├── frontend/
│   ├── src/
│   │   ├── App.jsx                 # Main React component
│   │   ├── App.css                 # Styles
│   │   ├── index.css
│   │   ├── main.jsx
│   │   └── assets/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── node_modules/
├── .gitignore
├── DEPLOYMENT.md                   # Deployment guide
└── README.md                       # This file
```

## 🔌 API Endpoints

### GET `/`
Health check endpoint
```
Response: {"message":"Backend working"}
```

### POST `/generate`
Generate an idea based on prompt and category
```
Request Body:
{
  "prompt": "YouTube Shorts for tech channel",
  "category": "Tech"
}

Response:
{
  "success": true,
  "prompt": "YouTube Shorts for tech channel",
  "category": "Tech",
  "idea": "Create a series...",
  "model": "gpt-4o-mini-2024-07-18",
  "timestamp": "2026-03-18T00:29:26.000Z"
}
```

## 🎛️ Environment Variables

### Backend (.env)
```
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
PORT=3001
```

### Frontend (.env.local) - Optional
```
VITE_API_URL=https://your-backend-domain.com
```

## 📱 Mobile Optimization

- Responsive design for all screen sizes
- Touch-friendly buttons and inputs
- Mobile-optimized category selection
- Smooth animations on mobile devices

## 🐛 Troubleshooting

**"CORS error" when generating ideas?**
- Backend has CORS enabled ✅
- Check API URL in frontend code

**"API Key error"?**
- Verify key in .env file
- Ensure key has valid credits
- Generate new key if needed

**Ideas not saving?**
- Browser must have localStorage enabled
- Check browser console for errors

## 🚦 API Rate Limits

- OpenAI: Check your API plan limits
- Free tier: ~$5 = ~1000 requests
- Demo mode activates if quota exceeded

## 🎯 Future Enhancements

- [ ] User authentication & accounts
- [ ] Idea sharing & collaboration
- [ ] Advanced editing & customization
- [ ] Video preview generation
- [ ] Mobile app (React Native)
- [ ] Database storage (MongoDB)
- [ ] Idea analytics & trending
- [ ] Community submissions
- [ ] Premium tier with faster generation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - See LICENSE file for details

## 👨‍💼 Author

Created with ❤️ by You!

## 📞 Support

- Issues: GitHub Issues
- Questions: GitHub Discussions
- Docs: [DEPLOYMENT.md](./DEPLOYMENT.md)

---

**Made with React, Vite, Node.js, and OpenAI** 🚀
