import Chat from "./models/Chat.js";
import { authMiddleware } from "./middleware/auth.js";
import { checkUsageLimit, consumeUsage, getUsageSnapshot, resetUsageIfNeeded } from "./middleware/usage.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "./models/User.js";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import mongoose from "mongoose";
import Stripe from "stripe";

dotenv.config();

console.log("ENV:", process.env.MONGO_URI);
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB Error", err));

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID;

const SYSTEM_PROMPT = `You are an AI assistant for viral content ideas.
Return ONLY valid JSON.
Do not include markdown, code fences, comments, headings, or extra text.
Use category values strictly from: Funny, Educational, Viral.`;

const IDEAS_JSON_SCHEMA = {
  name: "ideas_response",
  strict: true,
  schema: {
    type: "object",
    properties: {
      ideas: {
        type: "array",
        minItems: 1,
        maxItems: 6,
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            category: { type: "string", enum: ["Funny", "Educational", "Viral"] },
          },
          required: ["title", "description", "category"],
          additionalProperties: false,
        },
      },
    },
    required: ["ideas"],
    additionalProperties: false,
  },
};

const cleanJsonString = (raw) => {
  if (!raw) return "";
  return raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/, "")
    .trim();
};

const validateIdeas = (ideas) => {
  if (!Array.isArray(ideas) || ideas.length === 0) {
    throw new Error("Invalid JSON format: ideas must be a non-empty array");
  }

  return ideas.map((idea) => {
    const title = String(idea.title || "").trim();
    const description = String(idea.description || "").trim();
    const category = String(idea.category || "").trim();

    if (!title || !description || !["Funny", "Educational", "Viral"].includes(category)) {
      throw new Error("Invalid JSON format: idea fields are missing or invalid");
    }

    return { title, description, category };
  });
};

const generateIdeasJson = async (userPrompt, conversationMessages = []) => {
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: {
      type: "json_schema",
      json_schema: IDEAS_JSON_SCHEMA,
    },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...conversationMessages,
      { role: "user", content: `Generate idea cards for: ${userPrompt}` },
    ],
  });

  const raw = cleanJsonString(completion.choices?.[0]?.message?.content || "");

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI returned invalid JSON");
  }

  return validateIdeas(parsed.ideas);
};

const SCRIPT_JSON_SCHEMA = {
  name: "script_response",
  strict: true,
  schema: {
    type: "object",
    properties: {
      hook: { type: "string" },
      script: { type: "string" },
      cta: { type: "string" },
      hashtags: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["hook", "script", "cta", "hashtags"],
    additionalProperties: false,
  },
};

const generateScript = async (idea) => {
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: {
      type: "json_schema",
      json_schema: SCRIPT_JSON_SCHEMA,
    },
    messages: [
      {
        role: "system",
        content: `You are a viral content scriptwriter. Return ONLY valid JSON. No markdown, no code fences, no extra text.`,
      },
      {
        role: "user",
        content: `Generate a short video script for this idea: ${idea}`,
      },
    ],
  });

  const raw = cleanJsonString(completion.choices?.[0]?.message?.content || "");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI returned invalid JSON for script");
  }

  if (!parsed.hook || !parsed.script || !parsed.cta || !Array.isArray(parsed.hashtags)) {
    throw new Error("Invalid script JSON format");
  }

  return {
    hook: String(parsed.hook).trim(),
    script: String(parsed.script).trim(),
    cta: String(parsed.cta).trim(),
    hashtags: parsed.hashtags.map((h) => String(h).trim()).filter(Boolean),
  };
};

const makeTitleFromMessage = (text) => {
  if (!text) return "New Chat";
  const clean = text.replace(/\s+/g, " ").trim();
  const words = clean.split(" ").slice(0, 7);
  const title = words.join(" ");
  return title.length > 50 ? `${title.slice(0, 50)}...` : title;
};

app.post("/chat", authMiddleware, async (req, res) => {
  try {
    const chat = await Chat.create({
      userId: req.user.id,
      title: "New Chat",
      messages: [],
    });

    res.status(201).json({ chat });
  } catch (err) {
    console.log("CREATE CHAT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/chats", authMiddleware, async (req, res) => {
  try {
    const chats = await Chat.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .select("_id title createdAt messages");

    const summaries = chats.map((chat) => ({
      _id: chat._id,
      title: chat.title,
      createdAt: chat.createdAt,
      preview: chat.messages.length > 0 ? chat.messages[0].content : "",
    }));

    res.json(summaries);
  } catch (err) {
    console.log("GET CHATS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/chat/:id", authMiddleware, async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.user.id });

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    res.json({ chat });
  } catch (err) {
    console.log("GET CHAT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/chat/:id", authMiddleware, checkUsageLimit, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const chat = await Chat.findOne({ _id: req.params.id, userId: req.user.id });

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    const userMessage = { role: "user", content: message.trim() };

    if (chat.messages.length === 0) {
      chat.title = makeTitleFromMessage(userMessage.content);
    }

    chat.messages.push(userMessage);

    const conversationHistory = chat.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const ideas = await generateIdeasJson(message.trim(), conversationHistory.slice(-8));
    const assistantContent = JSON.stringify(ideas);

    chat.messages.push({
      role: "assistant",
      content: assistantContent,
      ideas,
    });

    await chat.save();

    const usage = await consumeUsage(req.dbUser);

    res.json({
      chat,
      ideas,
      usage,
    });
  } catch (err) {
    console.log("ADD MESSAGE ERROR:", err);
    const message = err.message || "Generation failed";
    const status = message.includes("invalid JSON") ? 502 : 500;
    res.status(status).json({ error: message });
  }
});

app.delete("/chat/:id", authMiddleware, async (req, res) => {
  try {
    const deleted = await Chat.findOneAndDelete({ _id: req.params.id, userId: req.user.id });

    if (!deleted) {
      return res.status(404).json({ error: "Chat not found" });
    }

    res.json({ message: "Chat deleted" });
  } catch (err) {
    console.log("DELETE CHAT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/generate", authMiddleware, checkUsageLimit, async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const ideas = await generateIdeasJson(prompt.trim());
    const usage = await consumeUsage(req.dbUser);

    res.json({ ideas, usage });
  } catch (err) {
    console.log("GENERATE ERROR:", err);
    const message = err.message || "Generation failed";
    const status = message.includes("invalid JSON") ? 502 : 500;
    res.status(status).json({ error: message });
  }
});

app.get("/usage", authMiddleware, async (req, res) => {
  try {
    const dbUser = await User.findById(req.user.id);

    if (!dbUser) {
      return res.status(404).json({ error: "User not found" });
    }

    await resetUsageIfNeeded(dbUser);
    res.json(getUsageSnapshot(dbUser));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/billing/create-checkout-session", authMiddleware, async (req, res) => {
  try {
    if (!stripe || !STRIPE_PRICE_ID) {
      return res.status(500).json({ error: "Stripe is not configured" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${FRONTEND_URL}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}?payment=cancelled`,
      customer_email: user.email,
      client_reference_id: String(user._id),
      metadata: {
        userId: String(user._id),
      },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/billing/verify-session", authMiddleware, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: "Stripe is not configured" });
    }

    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required" });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return res.status(400).json({ error: "Payment not completed" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const refId = session.client_reference_id || session.metadata?.userId;
    if (String(refId) !== String(user._id)) {
      return res.status(403).json({ error: "Payment session does not match user" });
    }

    user.plan = "premium";
    await user.save();

    res.json({ message: "Upgraded to premium", plan: user.plan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/generate-script", authMiddleware, async (req, res) => {
  try {
    const { idea } = req.body;

    if (!idea || !String(idea).trim()) {
      return res.status(400).json({ error: "idea is required" });
    }

    const script = await generateScript(String(idea).trim());

    res.json({ script });
  } catch (err) {
    console.log("GENERATE SCRIPT ERROR:", err);
    const message = err.message || "Script generation failed";
    const status = message.includes("invalid JSON") ? 502 : 500;
    res.status(status).json({ error: message });
  }
});

app.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

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
      plan: "free",
      usageCount: 0,
      lastReset: new Date(),
    });

    await newUser.save();

    res.json({ message: "User created successfully" });
  } catch (err) {
    console.log("REAL SIGNUP ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/login", async (req, res) => {
  try {
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

    res.json({ token, plan: user.plan });
  } catch (err) {
    console.log("REAL LOGIN ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
