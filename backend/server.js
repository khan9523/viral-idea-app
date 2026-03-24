import Chat from "./models/Chat.js";
import { authMiddleware } from "./middleware/auth.js";
import { checkUsage, consumeUsage, getUsageSnapshot, resetUsageIfNeeded } from "./middleware/usage.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "./models/User.js";
import Payment from "./models/Payment.js";
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

// Stripe webhook requires raw body to validate signature.
app.use(["/stripe/webhook", "/webhook"], express.raw({ type: "application/json" }));
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID;
const STRIPE_MONTHLY_PRICE_ID = process.env.STRIPE_MONTHLY_PRICE_ID;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const MONTHLY_PLAN_AMOUNT = 24900;

const ensureMonthlySubscriptionPrice = async () => {
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }

  if (STRIPE_MONTHLY_PRICE_ID) {
    return STRIPE_MONTHLY_PRICE_ID;
  }

  const prices = await stripe.prices.list({ active: true, limit: 100 });
  const existingPrice = prices.data.find((price) => (
    price.currency === "inr"
    && price.unit_amount === MONTHLY_PLAN_AMOUNT
    && price.recurring?.interval === "month"
    && price.metadata?.internalKey === "premium-monthly"
  ));

  if (existingPrice) {
    return existingPrice.id;
  }

  const products = await stripe.products.list({ active: true, limit: 100 });
  let product = products.data.find((item) => item.metadata?.internalKey === "premium-monthly");

  if (!product) {
    product = await stripe.products.create({
      name: "ViralAI Premium Monthly",
      description: "Monthly premium subscription for unlimited generations.",
      metadata: {
        internalKey: "premium-monthly",
      },
    });
  }

  const price = await stripe.prices.create({
    product: product.id,
    currency: "inr",
    unit_amount: MONTHLY_PLAN_AMOUNT,
    recurring: { interval: "month" },
    metadata: {
      internalKey: "premium-monthly",
    },
  });

  return price.id;
};

const SYSTEM_PROMPT = `You are a helpful AI assistant for viral content ideas.
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

const getConversationContext = (messages = [], limit = 10) => {
  return messages
    .filter((msg) => msg?.role === "user" || msg?.role === "assistant")
    .map((msg) => ({
      role: msg.role,
      content: String(msg.content || ""),
    }))
    .filter((msg) => msg.content.trim())
    .slice(-limit);
};

const generateIdeasJson = async (conversationMessages = []) => {
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: {
      type: "json_schema",
      json_schema: IDEAS_JSON_SCHEMA,
    },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...conversationMessages,
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
    const chats = await Chat.find({ userId: req.user.id, "messages.0": { $exists: true } })
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

app.post("/chat/:id", authMiddleware, checkUsage, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const chat = await Chat.findOne({ _id: req.params.id, userId: req.user.id });

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    const userMessage = { role: "user", content: message.trim(), createdAt: new Date() };

    if (chat.messages.length === 0) {
      chat.title = makeTitleFromMessage(userMessage.content);
    }

    chat.messages.push(userMessage);
    await chat.save();

    const conversationHistory = getConversationContext(chat.messages, 10);

    const ideas = await generateIdeasJson(conversationHistory);
    const assistantContent = JSON.stringify(ideas);

    chat.messages.push({
      role: "assistant",
      content: assistantContent,
      ideas,
      createdAt: new Date(),
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

app.post("/generate", authMiddleware, checkUsage, async (req, res) => {
  try {
    const { prompt, chatId } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const userText = prompt.trim();
    const userMessage = { role: "user", content: userText, createdAt: new Date() };
    let chat = null;
    let conversationMessages = [{ role: "user", content: userText }];

    if (chatId) {
      chat = await Chat.findOne({ _id: chatId, userId: req.user.id });
      if (!chat) {
        return res.status(404).json({ error: "Chat not found" });
      }

      if (chat.messages.length === 0) {
        chat.title = makeTitleFromMessage(userText);
      }

      chat.messages.push(userMessage);
      await chat.save();
      conversationMessages = getConversationContext(chat.messages, 10);
    }

    const ideas = await generateIdeasJson(conversationMessages);

    if (chat) {
      chat.messages.push({
        role: "assistant",
        content: JSON.stringify(ideas),
        ideas,
        createdAt: new Date(),
      });
      await chat.save();
    }

    const usage = await consumeUsage(req.dbUser);

    res.json({ ideas, usage, chat });
  } catch (err) {
    console.log("GENERATE ERROR:", err);
    const message = err.message || "Generation failed";
    const status = message.includes("invalid JSON") ? 502 : 500;
    res.status(status).json({ error: message });
  }
});

app.delete("/chat/:id/messages", authMiddleware, async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.user.id });

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    chat.messages = [];
    chat.title = "New Chat";
    await chat.save();

    res.json({ chat, message: "Chat cleared" });
  } catch (err) {
    console.log("CLEAR CHAT ERROR:", err);
    res.status(500).json({ error: err.message });
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

app.get("/profile", authMiddleware, async (req, res) => {
  try {
    const dbUser = await User.findById(req.user.id).select("email plan usageCount lastReset subscriptionId currentPeriodEnd billingStatus");

    if (!dbUser) {
      return res.status(404).json({ error: "User not found" });
    }

    await resetUsageIfNeeded(dbUser);
    const usage = getUsageSnapshot(dbUser);

    res.json({
      email: dbUser.email,
      plan: dbUser.plan,
      billingStatus: dbUser.billingStatus,
      subscriptionId: dbUser.subscriptionId,
      currentPeriodEnd: dbUser.currentPeriodEnd,
      usageCount: usage.usageCount,
      remainingUsage: usage.remaining ?? -1,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const createCheckoutSessionHandler = async (req, res) => {
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
      success_url: `${FRONTEND_URL}?payment=success`,
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
};

const createSubscriptionHandler = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!stripe) {
      return res.status(500).json({ error: "Stripe is not configured" });
    }

    if (user.subscriptionId && user.plan === "premium") {
      return res.status(400).json({ error: "An active subscription already exists" });
    }

    const monthlyPriceId = await ensureMonthlySubscriptionPrice();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: monthlyPriceId, quantity: 1 }],
      success_url: `${FRONTEND_URL}?payment=success`,
      cancel_url: `${FRONTEND_URL}?payment=cancelled`,
      customer_email: user.email,
      client_reference_id: String(user._id),
      metadata: {
        userId: String(user._id),
        plan: "monthly",
        description: "Premium monthly subscription",
      },
      subscription_data: {
        metadata: {
          userId: String(user._id),
          plan: "monthly",
        },
      },
    });

    user.billingStatus = "inactive";
    await user.save();

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

app.post("/create-checkout-session", authMiddleware, createCheckoutSessionHandler);
app.post("/billing/create-checkout-session", authMiddleware, createCheckoutSessionHandler);
app.post("/create-subscription", authMiddleware, createSubscriptionHandler);

app.post("/billing/cancel-subscription", authMiddleware, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: "Stripe is not configured" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.subscriptionId) {
      return res.status(400).json({ error: "No active subscription found" });
    }

    await stripe.subscriptions.cancel(user.subscriptionId);

    user.plan = "free";
    user.subscriptionId = null;
    user.currentPeriodEnd = null;
    user.billingStatus = "canceled";
    await user.save();

    res.json({ message: "Subscription canceled", plan: user.plan, billingStatus: user.billingStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const handleStripeWebhook = async (req, res) => {
  try {
    if (!stripe || !STRIPE_WEBHOOK_SECRET) {
      return res.status(500).json({ error: "Stripe webhook is not configured" });
    }

    const signature = req.headers["stripe-signature"];
    if (!signature) {
      return res.status(400).json({ error: "Missing stripe-signature header" });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = session.client_reference_id || session.metadata?.userId;

      if (userId) {
        const user = await User.findById(userId);
        if (user && session.mode === "subscription") {
          user.subscriptionId = session.subscription || null;
          user.billingStatus = "inactive";
          await user.save();
        }

        if (user && session.mode !== "subscription" && user.plan !== "premium") {
          user.plan = "premium";
          await user.save();
        }

        if (user && session.mode !== "subscription") {
          // Persist payment record — idempotent via unique paymentId
          const paymentId = session.payment_intent || session.id;
          const purchasedPlan = session.metadata?.plan || "premium";
          await Payment.findOneAndUpdate(
            { paymentId },
            {
              userId: user._id,
              amount: session.amount_total ?? 0,
              currency: session.currency ?? "inr",
              paymentId,
              plan: purchasedPlan,
              description: session.metadata?.description || "Premium plan upgrade",
              status: "success",
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        }
      }
    }

    if (event.type === "invoice.paid") {
      const invoice = event.data.object;
      const subscriptionId = typeof invoice.subscription === "string"
        ? invoice.subscription
        : invoice.subscription?.id;

      let userId = invoice.parent?.subscription_details?.metadata?.userId || invoice.lines?.data?.[0]?.metadata?.userId;

      const subscription = subscriptionId ? await stripe.subscriptions.retrieve(subscriptionId) : null;
      if (!userId && subscription) {
        userId = subscription.metadata?.userId;
      }

      if (userId) {
        const user = await User.findById(userId);
        if (user) {
          user.plan = "premium";
          user.subscriptionId = subscription?.id || user.subscriptionId;
          user.currentPeriodEnd = subscription?.current_period_end
            ? new Date(subscription.current_period_end * 1000)
            : user.currentPeriodEnd;
          user.billingStatus = subscription?.status === "active"
            ? "active"
            : subscription?.status === "past_due"
            ? "past_due"
            : "inactive";
          await user.save();

          const paymentId = invoice.payment_intent || invoice.id;
          await Payment.findOneAndUpdate(
            { paymentId },
            {
              userId: user._id,
              amount: invoice.amount_paid ?? invoice.amount_due ?? 0,
              currency: invoice.currency ?? "inr",
              paymentId,
              plan: "monthly",
              description: "Premium monthly subscription",
              status: "success",
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        }
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      const user = await User.findOne({ subscriptionId: subscription.id });

      if (user) {
        user.plan = "free";
        user.subscriptionId = null;
        user.currentPeriodEnd = null;
        user.billingStatus = "canceled";
        await user.save();
      }
    }

    res.json({ received: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

app.post("/stripe/webhook", handleStripeWebhook);
app.post("/webhook", handleStripeWebhook);

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

// GET /billing/history — returns the authenticated user's payment history
app.get("/billing/history", authMiddleware, async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({ payments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /billing/stats — summary stats for the billing dashboard
app.get("/billing/stats", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    await resetUsageIfNeeded(user);

    const [payments] = await Promise.all([
      Payment.find({ userId: req.user.id, status: "success" }).lean(),
    ]);
    const usageSnap = getUsageSnapshot(user);

    const totalSpent = payments.reduce((sum, p) => sum + (p.amount ?? 0), 0);
    const totalPayments = payments.length;
    const sortedPayments = [...payments].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      plan: user.plan,
      billingStatus: user.billingStatus,
      subscriptionId: user.subscriptionId,
      currentPeriodEnd: user.currentPeriodEnd,
      usageCount: usageSnap.usageCount,
      dailyLimit: usageSnap.dailyLimit,
      remaining: usageSnap.remaining,
      totalSpent,          // smallest currency unit
      totalPayments,
      lastPaymentAt: sortedPayments[0]?.createdAt ?? null,
      memberSince: user._id.getTimestamp(),
    });
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
