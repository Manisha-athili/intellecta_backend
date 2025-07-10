import User from '../models/User.js';
import Prompt from "../models/Prompt.js";
import asyncHandler from "express-async-handler";

// users Profile
export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const userPrompts = await Prompt.find({ author: req.user.id });

  res.json({
    ...user.toObject(),
    prompts: userPrompts,
  });
});

export const getAccountSettings = asyncHandler( async(req, res) => {
  try {
    const user = await User.findById(req.user.id).select("settings");
    if (!user) return res.status(404).json({ message: "User not found" });
    console.log(user)
    res.json(user.settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export const updateAccountSettings = asyncHandler( async (req, res) => {
  try {
    const settings = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { settings },
      { new: true }
    ).select("settings");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user.settings);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

