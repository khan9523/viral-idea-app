import Chat from "./models/Chat.js";
import { authMiddleware } from "./middleware/auth.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "./models/User.js";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

import mongoose from "mongoose";
console.log("ENV:", process.env.MONGO_URI);
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected ✅"))
  .catch(err => console.log("MongoDB Error ❌", err));

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/generate", authMiddleware, async (req, res) => {
  try {
    const { prompt: userPrompt } = req.body;

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

    // ✅ Step 1: Generate AI response
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const result = response.choices[0].message.content;

    // ✅ Step 2: Save chat AFTER getting result
    const newChat = new Chat({
      userId: req.user.id,
      prompt: userPrompt,
      response: result,
    });

    await newChat.save();

    // ✅ Step 3: Send response
    res.json({ result });

  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Error generating ideas" });
  }
});


app.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    // check user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      email,
      password: hashedPassword
    });

    await newUser.save();

    res.json({ message: "User created successfully" });

  } catch (err) {
    res.status(500).json({ error: "Signup failed" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: "Wrong password" });
    }

    // create token
    const token = jwt.sign(
      { id: user._id },
      "secret123",
      { expiresIn: "7d" }
    );

    res.json({ token });

  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

app.get("/history", authMiddleware, async (req, res) => {
  try {
    const chats = await Chat.find({ userId: req.user.id })
      .sort({ createdAt: -1 });

    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

app.listen(5000, () => console.log("Server running on port 5000"));