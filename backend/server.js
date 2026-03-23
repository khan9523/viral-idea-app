import Chat from "./models/Chat.js";
import { authMiddleware } from "./middleware/auth.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "./models/User.js";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import mongoose from "mongoose";

dotenv.config();

// ✅ MongoDB
console.log("ENV:", process.env.MONGO_URI);
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected ✅"))
  .catch(err => console.log("MongoDB Error ❌", err));

const app = express();
app.use(cors());
app.use(express.json());

// ✅ OpenAI
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


// ================= GENERATE =================
app.post("/generate", authMiddleware, async (req, res) => {
  try {
    const { prompt: userPrompt } = req.body;

    if (!userPrompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

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

    const result = response.choices[0].message.content;

    // Save chat
    const newChat = new Chat({
      userId: req.user.id,
      prompt: userPrompt,
      response: result,
    });

    await newChat.save();

    res.json({ result });

  } catch (error) {
    console.log("REAL GENERATE ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});


// ================= SIGNUP =================
app.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("SIGNUP BODY:", req.body);

    if (!email || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      email,
      password: hashedPassword,
    });

    await newUser.save();

    res.json({ message: "User created successfully" });

  } catch (err) {
    console.log("REAL SIGNUP ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});


// ================= LOGIN =================
app.post("/login", async (req, res) => {
  try {
    console.log("LOGIN BODY:", req.body);

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: "Wrong password" });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });

  } catch (err) {
    console.log("REAL LOGIN ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});


// ================= HISTORY =================
app.get("/history", authMiddleware, async (req, res) => {
  try {
    const chats = await Chat.find({ userId: req.user.id })
      .sort({ createdAt: -1 });

    res.json(chats);

  } catch (err) {
    console.log("REAL HISTORY ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});


// ================= SERVER =================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});