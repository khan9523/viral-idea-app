import mongoose from "mongoose";

export const PROTECTED_PREMIUM_EMAIL = "test@gmail.com";

export const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

export const isGmailEmail = (email) => normalizeEmail(email).endsWith("@gmail.com");

export const isProtectedPremiumEmail = (email) => normalizeEmail(email) === PROTECTED_PREMIUM_EMAIL;

export const getEffectivePlan = (user) => (isProtectedPremiumEmail(user?.email) ? "premium" : user?.plan || "free");

export const ensureProtectedPremiumUser = async (user) => {
  if (!user) {
    return user;
  }

  const normalizedEmail = normalizeEmail(user.email);
  let hasChanges = false;

  if (user.email !== normalizedEmail) {
    user.email = normalizedEmail;
    hasChanges = true;
  }

  const effectivePlan = getEffectivePlan(user);
  if (user.plan !== effectivePlan) {
    user.plan = effectivePlan;
    hasChanges = true;
  }

  if (hasChanges && typeof user.save === "function") {
    await user.save();
  }

  return user;
};

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: false,
    default: null
  },
  plan: {
    type: String,
    enum: ["free", "premium"],
    default: "free"
  },
  subscriptionId: {
    type: String,
    default: null
  },
  currentPeriodEnd: {
    type: Date,
    default: null
  },
  billingStatus: {
    type: String,
    enum: ["inactive", "active", "canceled", "past_due"],
    default: "inactive"
  },
  usageCount: {
    type: Number,
    default: 0
  },
  lastReset: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

userSchema.pre("save", function saveHook() {
  if (this.email) {
    this.email = normalizeEmail(this.email);
  }

  if (isProtectedPremiumEmail(this.email)) {
    this.plan = "premium";
  }
});

const blockProtectedDeletionForQuery = async function blockProtectedDeletionForQuery() {
  const protectedUser = await this.model.findOne({
    ...this.getFilter(),
    email: PROTECTED_PREMIUM_EMAIL,
  }).select("_id");

  if (protectedUser) {
    throw new Error("Protected user cannot be deleted");
  }
};

const blockProtectedDeletionForDocument = function blockProtectedDeletionForDocument() {
  if (isProtectedPremiumEmail(this.email)) {
    throw new Error("Protected user cannot be deleted");
  }
};

userSchema.pre("findOneAndDelete", blockProtectedDeletionForQuery);
userSchema.pre("deleteMany", blockProtectedDeletionForQuery);
userSchema.pre("deleteOne", { query: true, document: false }, blockProtectedDeletionForQuery);
userSchema.pre("deleteOne", { document: true, query: false }, blockProtectedDeletionForDocument);

export default mongoose.model("User", userSchema);