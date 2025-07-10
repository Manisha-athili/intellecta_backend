import User from '../models/User.js';
import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import generateToken from '../utils/generateToken.js';

dotenv.config();

// temp to store user data before verification of mail
const tempUsers = {};

// send mail via SendGrid
const sendEmail = async ({to, subject, html})=> {
  try{
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      host: "smtp.gmail.com",
      port: 465,
      auth: { 
        user: process.env.EMAIL_USER,  
        pass: process.env.EMAIL_PASS,
      },
    });
    const info = await transporter.sendMail({
      from: '"Intellect Team" <no-reply@intellect.com>',
      to,
      subject,
      html,
    });
    console.log("Email sent:", info.messageId)
  }catch (er){
    console.log("error sending email:", er.message);
    return `${er.message} error`
  }
}; // this will be called to send mail

// step 1 : send otp for registration 
export const sendRegisterationOtp = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const userExists = await User.findOne({ email });
  if (userExists) return res.status(400).json({ message: "User already exists" });

  function generateUsername(name) {
    const sanitized = name.replace(/\s+/g, '').toLowerCase();
    const randomNumber = Math.floor(Math.random() * 1000);
    return `${sanitized}${randomNumber}`;
  }

  const username = generateUsername(name);
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  const hashedpassword = await bcrypt.hash(password, 10);

  await sendEmail({
    to: email,
    subject: "Your Registration OTP",
    html: `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Verify Your Email</h2>
        <p>Please use the following OTP for registration:</p>
        <p style="font-size: 24px; font-weight: bold; color: #2c3e50;">${otp}</p>
        <p>This OTP will expire in 10 minutes.</p>
        <p>Thank you,<br/>The Intellect Team</p>
      </div>`
  });

  const user = new User({
    name,
    email,
    password: hashedpassword,
    resetOtp: otp,
    resetOtpExpires: resetOtpExpires,
    isVerified: false,
    settings: {
      username,
    }
  });

  await user.save();
  res.status(200).json({ message: "OTP sent to your email" });
});


// step 2 : first verify otp and register user 

export const verifyOtpAndRegisterUser = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email });

  if (!user || user.isVerified) {
    return res.status(400).json({ message: "Invalid request or user already verified." });
  }

  if (user.resetOtp !== otp || user.resetOtpExpires < Date.now()) {
    return res.status(400).json({ message: "Invalid or expired OTP." });
  }

  user.isVerified = true;
  user.resetOtp = undefined;
  user.resetOtpExpires = undefined;

  await user.save();

  res.status(201).json({
    message: "Registration successful!",
    token: generateToken(user._id),
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
    },
  });
});


// step 3 to resend otp
export const resendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  const user = await User.findOne({ email });

  if (!user || user.isVerified) {
    return res.status(400).json({ message: 'User not found or already verified.' });
  }

  const now = Date.now();
  const RESEND_OTP_INTERVAL = 60 * 1000; // 1 minute

  if (user.lastOtpSentAt && now - new Date(user.lastOtpSentAt).getTime() < RESEND_OTP_INTERVAL) {
    const waitTime = Math.ceil((RESEND_OTP_INTERVAL - (now - new Date(user.lastOtpSentAt).getTime())) / 1000);
    return res.status(429).json({ message: `Please wait ${waitTime} seconds before resending OTP.` });
  }

  const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const resetOtpExpires = new Date(now + 5 * 60 * 1000); // expires in 5 minutes

  user.resetOtp = newOtp;
  user.resetOtpExpires = resetOtpExpires;
  user.lastOtpSentAt = now;

  await user.save();

  await sendEmail({
    to: email,
    subject: "Your New OTP",
    html: `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Resend OTP</h2>
        <p>Your new OTP is:</p>
        <p style="font-size: 24px; font-weight: bold; color: #2c3e50;">${newOtp}</p>
        <p>This OTP will expire in 5 minutes.</p>
        <p>Thank you,<br/>The Intellect Team</p>
      </div>`
  });

  res.status(200).json({ message: 'OTP resent successfully.' });
});

// Login User
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  console.log(user)
  if (!user || !(await user.matchPassword(password))) {
    return res.status(423).json({status: "failed", message:"Invalid credentials"})
  }

  if (!user.isVerified) throw new Error("Please verify your email first.");

  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    token: generateToken(user._id),
    setting:user.settings,
  });
});

// Get logged-in user
export const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json(user);
});

// Send OTP for password reset
const OTP_RESEND_INTERVAL = 2 * 60 * 1000; // 2 minutes

export const sendOtpForReset = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) return res.status(404).json({ message: "User not found" });

  // Rate limiting
  const now = Date.now();
  if (user.lastOtpSentAt && now - user.lastOtpSentAt < OTP_RESEND_INTERVAL) {
    const waitTime = Math.ceil((OTP_RESEND_INTERVAL - (now - user.lastOtpSentAt)) / 1000);
    return res.status(429).json({ message: `Please wait ${waitTime} seconds before requesting another OTP.` });
  }

  // Generate and store OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.resetOtp = otp;
  user.resetOtpExpires = now + 10 * 60 * 1000;
  user.lastOtpSentAt = now;

  await user.save();

  // Send email
  await sendEmail({
    to: email,
    subject: "Password Reset OTP",
    html: `
      <h2>Password Reset Request</h2>
      <p>Your OTP to reset the password is:</p>
      <h3>${otp}</h3>
      <p>This OTP is valid for 10 minutes.</p>
    `,
  });

  res.status(200).json({ message: "OTP sent successfully to your email" });
});


// Verify OTP and reset password
export const verifyOtpAndResetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  const user = await User.findOne({
    email,
    resetOtp: otp,
    resetOtpExpires: { $gt: Date.now() },
  });

  if (!user) return res.status(400).json({ message: "Invalid or expired OTP" });

  user.password = newPassword;

  user.resetOtp = undefined;
  user.resetOtpExpires = undefined;

  await user.save();

  res.json({ message: "Password reset successful" });
});

















// // Utility: Create and send Ethereal email
// const sendEmail = async ({ to, subject, html }) => {
//   try{
//     const transporter = nodemailer.createTransport({
//       host: "smtp.sendgrid.net",
//       port: 587,
//       auth: {
//         user: "apikey",
//         pass: process.env.SENDGRID_API_KEY,
//       },
//     }); 
//     const info = await transporter.sendMail({
//       from: 'intellectaprompt123@gmail.com',
//         to, 
//         subject, 
//         html });
//       console.log("Verification email sent:", info.messageId);
//   }catch(e){
//     console.error("Error sending email:", error.message);
//   }};

// //  Register new user 
// export const registerUser = asyncHandler(async (req,res)=>{
//     const {name, email, password} = req.body;
//     const userExists = await User.findOne({email});
//     if(userExists) throw new Error("User already exists");

//     const user = await User.create({name, email, password });

//     // email verfication 
//     const token = generateToken(user._id);
//     console.log(token);
//     await sendEmail({
//         to: email,
//         subject: "verify your email",
//         html: `<p>Click to verify: <a href="http://localhost:5000/api/auth/verify/${token}"> Verify Email</a></p>`
//     });

//     res.status(201).json({messages: "Registered successfully. Check your email to verify.", token});
// });


// //  Login user
// export const loginUser = asyncHandler(async (req, res) => {

//   const { email, password } = req.body;
//   const user = await User.findOne({ email });
//   console.log(user)

//   if (!user) throw new Error("Invalid credentials");

//   if (!user.isVerified) throw new Error("Please verify your email first.");

//   if (!user || !(await user.matchPassword(password))) throw new Error("Invalid credentials");

//   res.json({
//     _id: user._id,
//     name: user.name,
//     email: user.email,
//     token: generateToken(user._id),
//   });
// });

// //  Get logged-in user
// export const getCurrentUser = asyncHandler(async (req, res) => {
//   const user = await User.findById(req.user.id);
//   res.json(user);
// });

// //   Verify email
// export const verifyEmail = asyncHandler(async (req, res) => {
//   try {
//   const { token } = req.params;
//   const decoded = jwt.verify(token, process.env.JWT_SECRET);
//   const user = await User.findById(decoded.id);
//    if (!user) return res.status(404).json({ message: "User not found" });
//   user.isVerified = true;
//   await user.save();
//   res.send("Email verified successfully");
//   } catch(err){
//     res.status(400).json({message: "Invaild or expired token"});
//   }
// });

// export const sendOtpForReset = asyncHandler(async (req,res)=>{
//   const {email} = req.body
//   const user = await User.findOne({email});

//   if(!email){
//     return res.status(404).json({message: "User Not Found"});
//   }

//   const otp = Math.floor(100000 + Math.random() * 900000).toString();

//   user.resetOtp = otp;
//   user.resetOtpExpires = Date.now() + 5*60*1000;
//   await user.save();

//   try {
//     const response = await sendEmail({
//     to: email,
//     subject: "Password Reset OTP",
//     html:`
//     <div style="font-family: Arial, sans-serif; color: #333;">
//       <h2>Password Reset Request</h2>
//       <p>We received a request to reset the password for your account.</p>
//       <p>Please use the following OTP (One-Time Password) to reset your password:</p>
//       <p style="font-size: 24px; font-weight: bold; color: #2c3e50;">${otp}</p>
//       <p>This OTP is valid for 10 minutes. If you did not request a password reset, you can safely ignore this email.</p>
//       <p>Thank you,<br/>The Intellect Team</p>
//     </div>
//   `
//   }
//   )
//     return res.status(200).json({ message: "OTP sent successfully to your email" });
//   } catch (error) {
//     console.error("Email sending failed:", error);
//     return res.status(500).json({ message: "Failed to send OTP email. Please try again later." });
//   }

  
// })

// export const verifyOtpAndResetPassword = asyncHandler( async (req, res) => {
//   const {email , otp , newPassword, confirmPassword} = req.body

//   if(newPassword != confirmPassword) return res.status(400).json({message : "Password not match"})

//   const user = await User.findOne({
//     email,
//     resetOtp : otp,
//     resetOtpExpires : { $gt : Date.now() },
//   });

//   if(!user){
//     return res.status(400).json({message: "Invaild  or expired OTP"});
//   }

//   user.password = newPassword;
//   user.resetOtp = null;
//   user.resetOtpExpires = null;

//   await user.save();

//   res.json({ message : "password reset successful"})

// }
// )
