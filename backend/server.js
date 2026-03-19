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
    const { prompt: userPrompt } = req.body;;

    const prompt = `
    User request: "${userPrompt}"

    Instructions:
    - Keep output VERY short and clean
    - Do NOT add introductions like "Sure" or explanations
    - Do NOT use bold, markdown, or symbols
   - Only return the final answer

    Format strictly like this:

    Idea 1: Title
    Short 2-line explanation

    Idea 2: Title
    Short 2-line explanation

    Rules:
    - Max 4 lines per idea
    - Keep it simple and professional
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