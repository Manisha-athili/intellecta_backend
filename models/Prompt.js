import mongoose from 'mongoose';

const promptSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  systemPrompt: { type: String, required: true },
  userMessages: [{ type: String }],
  assistantMessages: [{ type: String }],
  categories: [{ type: String }],
  isPrivate: { type: Boolean, default: false },
  copiedCount: { type: Number, default: 0 },
  forkCount: { type: Number, default: 0 },
  stars: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  username: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model('Prompt', promptSchema);
