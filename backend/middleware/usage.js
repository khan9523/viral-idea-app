import User from "../models/User.js";

const DAILY_FREE_LIMIT = 5;

const getDayKey = (date) => {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
};

export const resetUsageIfNeeded = async (user) => {
  const lastReset = user.lastReset ? new Date(user.lastReset) : new Date(0);
  const now = new Date();

  if (getDayKey(lastReset) !== getDayKey(now)) {
    user.usageCount = 0;
    user.lastReset = now;
    await user.save();
  }
};

export const checkUsage = async (req, res, next) => {
  try {
    const dbUser = await User.findById(req.user.id);

    if (!dbUser) {
      return res.status(404).json({ error: "User not found" });
    }

    await resetUsageIfNeeded(dbUser);

    if (dbUser.plan === "free" && dbUser.usageCount >= DAILY_FREE_LIMIT) {
      return res.status(403).json({
        error: "Daily limit reached. Upgrade to premium.",
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

// Backward-compatible alias used by existing imports.
export const checkUsageLimit = checkUsage;

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
