import User, { ensureProtectedPremiumUser, getEffectivePlan } from "../models/User.js";

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

    await ensureProtectedPremiumUser(dbUser);
    await resetUsageIfNeeded(dbUser);

    if (getEffectivePlan(dbUser) === "free" && dbUser.usageCount >= DAILY_FREE_LIMIT) {
      return res.status(403).json({
        error: "Daily limit reached. Upgrade to premium.",
        code: "LIMIT_EXCEEDED",
        plan: getEffectivePlan(dbUser),
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
  const plan = getEffectivePlan(user);

  if (plan === "free") {
    user.usageCount += 1;
    await user.save();
  }

  return {
    plan,
    usageCount: user.usageCount,
    remaining: plan === "premium" ? null : Math.max(0, DAILY_FREE_LIMIT - user.usageCount),
    dailyLimit: plan === "premium" ? null : DAILY_FREE_LIMIT,
  };
};

export const getUsageSnapshot = (user) => {
  const plan = getEffectivePlan(user);

  return {
    plan,
    usageCount: user.usageCount,
    remaining: plan === "premium" ? null : Math.max(0, DAILY_FREE_LIMIT - user.usageCount),
    dailyLimit: plan === "premium" ? null : DAILY_FREE_LIMIT,
  };
};
