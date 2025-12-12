import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getCollection } from "../config/db.js";
import { ObjectId } from "mongodb";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key" ;

console.log("Auth router file is executing");

// Email + password validation helpers
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isStrongPassword = (password) => {
  return password.length >= 6;
};

// REGISTER
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ message: "All fields are required" });

  if (!isValidEmail(email))
    return res.status(400).json({ message: "Invalid email format" });

  if (!isStrongPassword(password))
    return res.status(400).json({
      message:
        "Password must be at least 8 characters long, include one uppercase, one lowercase, one number, and one special character",
    });

  try {
    const usersCollection = await getCollection("users");
    
    // Check if user exists
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Insert user (email not verified yet)
    const newUser = {
      name,
      email,
      password_hash,
      is_verified: false,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    const result = await usersCollection.insertOne(newUser);
    const user = {
      id: result.insertedId.toString(),
      name: newUser.name,
      email: newUser.email,
      is_verified: newUser.is_verified
    };
    
    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({ user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: "Email and password are required" });

  try {
    const usersCollection = await getCollection("users");
    
    const user = await usersCollection.findOne({ email });

    if (!user)
      return res.status(400).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid email or password" });

    const token = jwt.sign(
      { id: user._id.toString() },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        is_verified: user.is_verified,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

//  SEND EMAIL VERIFICATION CODE (called when user tries to pay)
router.post("/send-verification-code", async (req, res) => {
  const { email } = req.body;

  try {
    const usersCollection = await getCollection("users");
    
    const user = await usersCollection.findOne({ email });

    if (!user)
      return res.status(404).json({ message: "User not found" });

    if (user.is_verified)
      return res.status(400).json({ message: "Email already verified" });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await usersCollection.updateOne(
      { email },
      { 
        $set: { 
          verification_code: code, 
          verification_expires: expires,
          updated_at: new Date()
        } 
      }
    );

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"AI Chatbot" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Email Verification Code",
      text: `Your verification code is ${code}. It expires in 10 minutes.`,
    });

    res.status(200).json({ message: "Verification code sent to email" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

//  CONFIRM EMAIL CODE
router.post("/confirm-email", async (req, res) => {
  const { email, code } = req.body;

  try {
    const usersCollection = await getCollection("users");
    
    const user = await usersCollection.findOne({ email });

    if (!user)
      return res.status(404).json({ message: "User not found" });

    if (user.verification_code !== code)
      return res.status(400).json({ message: "Invalid verification code" });

    if (new Date() > new Date(user.verification_expires))
      return res.status(400).json({ message: "Verification code expired" });

    await usersCollection.updateOne(
      { email },
      { 
        $set: { 
          is_verified: true,
          updated_at: new Date()
        },
        $unset: {
          verification_code: "",
          verification_expires: ""
        }
      }
    );

    res.status(200).json({ message: "Email verified successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;