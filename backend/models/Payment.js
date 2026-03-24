import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  amount: {
    type: Number,
    default: 0, // smallest currency unit (paise / cents)
  },
  currency: {
    type: String,
    default: "inr",
  },
  paymentId: {
    type: String,
    required: true,
    unique: true, // Stripe payment_intent id — deduplicates duplicate webhook calls
  },
    plan: {
      type: String,
      enum: ["monthly", "yearly", "premium", "unknown"],
      default: "unknown",
    },
    description: {
      type: String,
      default: "",
    },
  status: {
    type: String,
    enum: ["success", "failed", "pending"],
    default: "success",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Payment", paymentSchema);
