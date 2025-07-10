
import express from "express";
import {
  getUserProfile,
  // updateUserProfile,
  getAccountSettings,
  updateAccountSettings,
} from "../Controllers/userController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// get user profile
router.get('/profile', protect, getUserProfile);  

// GET account settings
router.get("/settings" ,protect, getAccountSettings);

// PUT update account settings
router.put("/settings" ,protect,updateAccountSettings);

export default router;

//  http://localhost:${PORT}/api/users/profile



