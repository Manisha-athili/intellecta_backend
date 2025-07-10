import express from 'express';
import {
  sendRegisterationOtp,
   verifyOtpAndRegisterUser,
  resendOtp,
  
  loginUser,
  getCurrentUser,
  sendOtpForReset,
  verifyOtpAndResetPassword
  
} from '../Controllers/authController.js';


const router = express.Router();

router.post('/register', sendRegisterationOtp);
router.post('/verify-otp', verifyOtpAndRegisterUser);
router.post('/resend-otp', resendOtp);
router.post('/login', loginUser);  
router.post('/forgot-password', sendOtpForReset);
router.post('/reset-password', verifyOtpAndResetPassword);

export default router;
