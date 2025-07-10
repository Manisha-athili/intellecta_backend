// File: models/User.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    bio: String,
    avatar: String,
    isVerified: { type: Boolean, default: false },
    resetOtp: String,
    resetOtpExpires: Date,
    lastOtpSentAt: Date,
    settings: {
      // email:{email},
      twitterHandle: {
        type: String,
        trim: true,
        default: '',
      },username: {
        type: String,
        unique: true,
        trim: true,
      }
    },
    
  resetAttempts: [
    {
      date: {
        type: Date,
        default: Date.now,
      },
      ip: String,
      userAgent: String,
    },
  ],

  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("User", userSchema);
