import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Backend working' });
});

// Generate endpoint (GET)
app.get('/generate', (req, res) => {
  res.json({ 
    message: 'Generate endpoint working',
    timestamp: new Date().toISOString()
  });
});

// Generate endpoint (POST with OpenAI)
app.post('/generate', async (req, res) => {
  try {
    const { prompt, category = 'General' } = req.body;

    if (!prompt) {
      return res.status(400).json({
        error: 'Prompt is required',
        timestamp: new Date().toISOString()
      });
    }

    console.log('Received prompt:', prompt, 'Category:', category);
    console.log('API Key set:', !!process.env.OPENAI_API_KEY);

    try {
      // Try OpenAI first
      const systemPrompt = `You are a creative idea generator specializing in ${category} content. Generate unique, innovative, and viral-worthy ideas based on user prompts. Make your ideas catchy and actionable for social media (YouTube, TikTok, Instagram, etc.). Format as a numbered list if multiple ideas.`;
      
      const message = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 1000,
      });

      res.json({
        success: true,
        prompt: prompt,
        category: category,
        idea: message.choices[0].message.content,
        model: message.model,
        timestamp: new Date().toISOString()
      });
    } catch (apiError) {
      console.warn('OpenAI API unavailable, using demo ideas:', apiError.message);
      // Fallback to demo idea
      const demoIdeas = [
        `Create a series called "Day in My Life Shorts" - 15-60 second clips showing different moments. Focus on relatable daily situations that your audience identifies with. Hook with a question in the first frame.`,
        `Start a "Before & After" shorts series showing transformations or life hacks. Example: "Unflattering angle vs. good lighting" or "My morning routine vs. What I tell people." High engagement potential.`,
        `Launch "Speed Tour" shorts of interesting places, objects, or processes. Pair with trending audio. People love fast-paced transformations and reveals - perfect for social media format.`,
        `Create "Satisfying Shorts" - repetitive, aesthetic, or ASMR-style content (organizing, cooking, crafting). These typically get algorithmic boosts due to high watch-through rates.`,
        `Make "Myth Busting" or "Did You Know?" shorts. Quick facts that surprise people. End with a surprising twist or call-to-action for engagement.`,
      ];
      
      res.json({
        success: true,
        prompt: prompt,
        category: category,
        idea: demoIdeas[Math.floor(Math.random() * demoIdeas.length)],
        model: 'demo',
        isDemoMode: true,
        apiError: apiError.message,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Generate endpoint error:', {
      message: error.message,
      status: error.status,
      type: error.type,
    });
    res.status(500).json({
      error: 'Failed to generate idea',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
