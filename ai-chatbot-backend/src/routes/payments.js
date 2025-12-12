import express from "express";
import { verifyAuth } from "../middleware/authMiddleware.js";
import { 
  initializePayment, 
  verifyPayment, 
  handleWebhook, 
  getUserTransactions 
} from "../controllers/paystackController.js";

const router = express.Router();

// Initialize payment
router.post("/initialize", verifyAuth, initializePayment);

// Verify payment
router.get("/verify/:reference", verifyAuth, verifyPayment);

// Webhook endpoint (no auth needed - Paystack calls this)
router.post("/webhook", express.raw({type: 'application/json'}), handleWebhook);

// Get user transactions
router.get("/transactions", verifyAuth, getUserTransactions);

// Get payment plans
router.get("/plans", (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 'premium_monthly',
        name: 'Premium Monthly',
        description: 'Unlimited questions, priority support, advanced features',
        amount: 20.00,
        currency: 'GHS',
        interval: 'monthly',
        features: [
          'Unlimited AI conversations',
          'Priority customer support',
          'Advanced university search',
          'Scholarship recommendations',
          'Application deadline reminders'
        ]
      },
      {
        id: 'premium_yearly',
        name: 'Premium Yearly',
        description: 'All premium features with 2 months free',
        amount: 200.00,
        currency: 'GHS',
        interval: 'yearly',
        features: [
          'Unlimited AI conversations',
          'Priority customer support',
          'Advanced university search',
          'Scholarship recommendations',
          'Application deadline reminders',
          '2 months free'
        ],
        recommended: true
      }
    ]
  });
});

export default router;