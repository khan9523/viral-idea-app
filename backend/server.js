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

    STRICT RULES:
    - No "Sure", no intro
    - No markdown (**)
    - No extra explanation

    FORMAT:

    Idea 1: Title
    Short explanation

    Idea 2: Title
    Short explanation

    Keep it clean and minimal.
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