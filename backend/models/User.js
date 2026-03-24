import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
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
  }
});

export default mongoose.model("User", userSchema);