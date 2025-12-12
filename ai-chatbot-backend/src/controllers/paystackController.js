import https from 'https';
import crypto from 'crypto';
import { getCollection } from '../config/db.js';
import { ObjectId } from 'mongodb';

// Paystack configuration
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY;

// Initialize payment with Paystack
export const initializePayment = async (req, res) => {
  try {
    const { email, amount, currency = 'GHS', metadata } = req.body;
    const userId = req.user.id;

    if (!email || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Email and amount are required'
      });
    }

    // Convert amount to pesewas (Paystack uses pesewas for GHS)
    const amountInPesewas = Math.round(amount * 100);

    const params = JSON.stringify({
      email,
      amount: amountInPesewas,
      currency,
      reference: `glinax_${Date.now()}_${userId}`,
      callback_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/callback`,
      metadata: {
        userId,
        service: 'glinax_premium',
        ...metadata
      }
    });

    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: '/transaction/initialize',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      }
    };

    const paystackRequest = https.request(options, (paystackResponse) => {
      let data = '';

      paystackResponse.on('data', (chunk) => {
        data += chunk;
      });

      paystackResponse.on('end', async () => {
        try {
          const response = JSON.parse(data);
          
          if (response.status) {
            // Save transaction to database
            const transactionsCollection = await getCollection('transactions');
            await transactionsCollection.insertOne({
              user_id: new ObjectId(userId),
              reference: response.data.reference,
              amount: amount,
              currency,
              status: 'pending',
              paystack_data: response.data,
              created_at: new Date(),
              metadata
            });

            res.json({
              success: true,
              data: {
                authorization_url: response.data.authorization_url,
                access_code: response.data.access_code,
                reference: response.data.reference
              }
            });
          } else {
            res.status(400).json({
              success: false,
              message: response.message || 'Payment initialization failed'
            });
          }
        } catch (error) {
          console.error('Paystack response parsing error:', error);
          res.status(500).json({
            success: false,
            message: 'Payment service error'
          });
        }
      });
    });

    paystackRequest.on('error', (error) => {
      console.error('Paystack request error:', error);
      res.status(500).json({
        success: false,
        message: 'Payment service unavailable'
      });
    });

    paystackRequest.write(params);
    paystackRequest.end();

  } catch (error) {
    console.error('Initialize payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment initialization failed'
    });
  }
};

// Verify payment
export const verifyPayment = async (req, res) => {
  try {
    const { reference } = req.params;
    
    if (!reference) {
      return res.status(400).json({
        success: false,
        message: 'Payment reference is required'
      });
    }

    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: `/transaction/verify/${reference}`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      }
    };

    const paystackRequest = https.request(options, (paystackResponse) => {
      let data = '';

      paystackResponse.on('data', (chunk) => {
        data += chunk;
      });

      paystackResponse.on('end', async () => {
        try {
          const response = JSON.parse(data);
          
          if (response.status && response.data.status === 'success') {
            // Update transaction in database
            const transactionsCollection = await getCollection('transactions');
            const usersCollection = await getCollection('users');
            
            await transactionsCollection.updateOne(
              { reference },
              {
                $set: {
                  status: 'successful',
                  verified_at: new Date(),
                  paystack_verification: response.data
                }
              }
            );

            // Update user's premium status
            const userId = response.data.metadata.userId;
            await usersCollection.updateOne(
              { _id: new ObjectId(userId) },
              {
                $set: {
                  is_premium: true,
                  premium_activated_at: new Date(),
                  premium_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
                }
              }
            );

            res.json({
              success: true,
              message: 'Payment verified successfully',
              data: {
                status: response.data.status,
                amount: response.data.amount / 100, // Convert back from pesewas
                currency: response.data.currency,
                paid_at: response.data.paid_at
              }
            });
          } else {
            res.status(400).json({
              success: false,
              message: 'Payment verification failed',
              data: response.data
            });
          }
        } catch (error) {
          console.error('Payment verification parsing error:', error);
          res.status(500).json({
            success: false,
            message: 'Payment verification error'
          });
        }
      });
    });

    paystackRequest.on('error', (error) => {
      console.error('Payment verification request error:', error);
      res.status(500).json({
        success: false,
        message: 'Payment verification service unavailable'
      });
    });

    paystackRequest.end();

  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed'
    });
  }
};

// Webhook handler for Paystack
export const handleWebhook = async (req, res) => {
  try {
    const hash = crypto.createHmac('sha512', PAYSTACK_SECRET_KEY).update(JSON.stringify(req.body)).digest('hex');
    
    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(400).json({
        success: false,
        message: 'Invalid signature'
      });
    }

    const event = req.body;
    
    if (event.event === 'charge.success') {
      const { reference, status, amount, currency, metadata } = event.data;
      
      // Update transaction status
      const transactionsCollection = await getCollection('transactions');
      const usersCollection = await getCollection('users');
      
      await transactionsCollection.updateOne(
        { reference },
        {
          $set: {
            status: 'successful',
            webhook_received_at: new Date(),
            webhook_data: event.data
          }
        }
      );

      // Activate premium for user
      if (metadata && metadata.userId) {
        await usersCollection.updateOne(
          { _id: new ObjectId(metadata.userId) },
          {
            $set: {
              is_premium: true,
              premium_activated_at: new Date(),
              premium_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            }
          }
        );
      }

      console.log(`✅ Payment confirmed via webhook: ${reference}`);
    }

    res.status(200).json({ success: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed'
    });
  }
};

// Get user transactions
export const getUserTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const transactionsCollection = await getCollection('transactions');
    
    const transactions = await transactionsCollection.find({
      user_id: new ObjectId(userId)
    }).sort({ created_at: -1 }).limit(50).toArray();

    res.json({
      success: true,
      data: transactions
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions'
    });
  }
};