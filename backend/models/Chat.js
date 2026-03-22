import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
  userId: String,
  prompt: String,
  response: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Chat", chatSchema);