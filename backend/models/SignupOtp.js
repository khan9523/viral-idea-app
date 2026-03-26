import mongoose from "mongoose";

const signupOtpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  otpHash: {
    type: String,
    required: true,
  },
  otpExpiresAt: {
    type: Date,
    required: true,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  resendCount: {
    type: Number,
    default: 0,
  },
  lastSentAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

signupOtpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 900 });

export default mongoose.model("SignupOtp", signupOtpSchema);
