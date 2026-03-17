import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/generate", async (req, res) => {
  try {
    const { niche } = req.body;

    const prompt = `
Give 5 viral YouTube Shorts ideas for ${niche} niche.
Include:
- Hook
- Title
- Hashtags
Make it for Indian audience.
`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    res.json({
      result: response.choices[0].message.content,
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Error generating ideas" });
  }
});

app.listen(5000, () => console.log("Server running on port 5000"));