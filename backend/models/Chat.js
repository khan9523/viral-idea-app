import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    ideas: {
      type: [
        {
          title: { type: String, required: true },
          description: { type: String, required: true },
          category: {
            type: String,
            enum: ["Funny", "Educational", "Viral"],
            required: true,
          },
        },
      ],
      default: undefined,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const chatSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  title: {
    type: String,
    default: "New Chat",
    trim: true,
  },
  messages: {
    type: [messageSchema],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Chat", chatSchema);