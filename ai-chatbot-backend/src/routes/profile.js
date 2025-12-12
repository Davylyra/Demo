// src/routes/profile.js
import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { getCollection } from '../config/db.js';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';

const router = express.Router();

// Protected route to get the logged-in user's profile
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const usersCollection = await getCollection("users");

    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update profile
router.put('/update', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { name, email, password } = req.body;

  try {
    const usersCollection = await getCollection("users");
    const updateFields = { updated_at: new Date() };

    if (name) updateFields.name = name;
    if (email) updateFields.email = email;
    if (password) {
      updateFields.password_hash = await bcrypt.hash(password, 10);
    }

    if (Object.keys(updateFields).length === 1) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    const result = await usersCollection.findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Profile updated',
      user: {
        id: result.value._id.toString(),
        name: result.value.name,
        email: result.value.email,
        created_at: result.value.created_at
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;