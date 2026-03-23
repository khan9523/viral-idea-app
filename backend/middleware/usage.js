import User from "../models/User.js";

const DAILY_FREE_LIMIT = 5;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const resetUsageIfNeeded = async (user) => {
  const lastReset = user.lastReset ? new Date(user.lastReset) : new Date(0);
  const now = new Date();

  if (now.getTime() - lastReset.getTime() >= DAY_IN_MS) {
    user.usageCount = 0;
    user.lastReset = now;
    await user.save();
  }
};

export const checkUsageLimit = async (req, res, next) => {
  try {
    const dbUser = await User.findById(req.user.id);

    if (!dbUser) {
      return res.status(404).json({ error: "User not found" });
    }

    await resetUsageIfNeeded(dbUser);

    if (dbUser.plan === "free" && dbUser.usageCount >= DAILY_FREE_LIMIT) {
      return res.status(403).json({
        error: "Daily free limit reached. Upgrade to premium for unlimited generations.",
        code: "LIMIT_EXCEEDED",
        plan: dbUser.plan,
        usageCount: dbUser.usageCount,
        remaining: 0,
      });
    }

    req.dbUser = dbUser;
    next();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export const consumeUsage = async (user) => {
  if (user.plan === "free") {
    user.usageCount += 1;
    await user.save();
  }

  return {
    plan: user.plan,
    usageCount: user.usageCount,
    remaining: user.plan === "premium" ? null : Math.max(0, DAILY_FREE_LIMIT - user.usageCount),
    dailyLimit: user.plan === "premium" ? null : DAILY_FREE_LIMIT,
  };
};

export const getUsageSnapshot = (user) => ({
  plan: user.plan,
  usageCount: user.usageCount,
  remaining: user.plan === "premium" ? null : Math.max(0, DAILY_FREE_LIMIT - user.usageCount),
  dailyLimit: user.plan === "premium" ? null : DAILY_FREE_LIMIT,
});
