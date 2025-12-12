import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import fetch from 'node-fetch';
import { connectDB } from './src/config/db.js';
import authRoutes from './src/routes/auth.js';
import profileRoutes from './src/routes/profile.js';
import chatRoutes from './src/routes/chats.js';
import paymentRoutes from './src/routes/payments.js';
import formRoutes from './src/routes/forms.js';

dotenv.config();

const app = express();

// 1. Allow ALL Origins (Fixes connection issues)
app.use(cors({
  origin: true, // Allow any origin
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// 2. Logging (So we see what's happening)
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.url}`);
  next();
});

// 3. Body Parsing
app.use((req, res, next) => {
  if (req.originalUrl.includes('/webhook')) return next();
  express.json({ limit: '10mb' })(req, res, () => {
    express.urlencoded({ extended: true })(req, res, next);
  });
});

const PORT = process.env.PORT || 5000;
connectDB().catch(console.error);

// ==========================================
// 🟢 THE "MISSING MENU" FIXES (Crucial!)
// ==========================================

// Fix 1: Health Checks
app.get('/health', (req, res) => res.send('OK'));
app.get('/api/health', (req, res) => res.send('OK'));

// Fix 2: Config (Catches /api/config AND /api/config/anything)
app.use('/api/config', (req, res) => {
  res.json({
    success: true,
    data: {
      appName: "Glinax Bot",
      apiBaseUrl: "http://localhost:5000/api",
      features: { enablePayments: true, enableUploads: true },
      // Add defaults for any specific keys frontend asks for
      api_base_url: "http://localhost:5000/api",
      timeout: 10000
    }
  });
});

// Fix 3: Content/Pages (Catches /api/content/pages/home etc)
app.use('/api/content', (req, res) => {
  res.json({
    success: true,
    data: {
      hero: { title: "Welcome", subtitle: "Ask me anything about universities" },
      sections: []
    }
  });
});

// Fix 4: Universities List (Prevents crash on load)
app.get('/api/universities', (req, res) => {
  res.json({ success: true, data: [] });
});

// Fix 5: Demo Chat Endpoint (No Auth Required) - ENHANCED
// This is now handled by the chat routes - removed duplicate

// ==========================================

// Import assessment routes
import assessmentRoutes from './src/routes/assessments.js';

// Real Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/chat', chatRoutes); // Note: singular 'chat' not 'chats'
app.use('/api/assessments', assessmentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/forms', formRoutes);

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));