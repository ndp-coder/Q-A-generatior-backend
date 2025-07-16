// server.js - Unified Backend for Gemini and Razorpay

// --- Dependencies ---
const express = require('express');
const cors = require('cors');
const Razorpay = require('razorpay');
const axios = require('axios');
const crypto = require('crypto'); // Required for payment verification

// --- Initialization ---
const app = express();
const PORT = 3000;

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Configurations ---
// IMPORTANT: Replace these placeholders with your actual keys!
const GEMINI_API_KEY = 'AIzaSyACYPOzwTuTuaD6UAjM46X_VDzaG0w6-xs';
const RAZORPAY_KEY_ID = 'rzp_test_hw3qip4z9xjYNM';
const RAZORPAY_KEY_SECRET = '2FGvfwpbhSwQrZjc2Ovd3sK8';

// --- Razorpay Instance ---
const razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
});

// =================================================================
// --- API ROUTES ---
// =================================================================

/**
 * @route   POST /generate
 * @desc    Handles all requests to the Gemini AI API
 */
app.post('/generate', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required.' });
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY') {
        return res.status(500).json({ error: 'Gemini API key is not configured on the server.' });
    }
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    try {
        const payload = { contents: [{ parts: [{ text: prompt }] }] };
        const response = await axios.post(GEMINI_API_URL, payload);
        console.log('✅ Gemini API call successful.');
        res.json(response.data);
    } catch (error) {
        console.error('❌ Gemini API Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to fetch response from Gemini API.' });
    }
});

/**
 * @route   POST /create-order
 * @desc    Creates a payment order with Razorpay (Step 1.1 from docs)
 */
app.post('/create-order', async (req, res) => {
    try {
        const { amount, currency = 'INR' } = req.body;
        if (!amount) return res.status(400).json({ error: 'Amount is required.' });
        if (!RAZORPAY_KEY_ID || RAZORPAY_KEY_ID === 'YOUR_RAZORPAY_KEY_ID') {
             return res.status(500).json({ error: 'Razorpay keys are not configured on the server.' });
        }
        const options = {
            amount,
            currency,
            receipt: `receipt_order_${new Date().getTime()}`
        };
        const order = await razorpay.orders.create(options);
        console.log('✅ Razorpay Order Created:', order.id);
        res.json(order);
    } catch (error) {
        console.error('❌ Razorpay Error:', error);
        res.status(500).json({ error: error.message || 'An internal server error occurred.' });
    }
});

/**
 * @route   POST /verify-payment
 * @desc    Verifies the payment signature (Step 1.5 from docs)
 */
app.post('/verify-payment', (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ status: 'failure', message: 'Missing payment details.' });
    }
    
    // Create the signature string as per Razorpay docs
    const body = razorpay_order_id + "|" + razorpay_payment_id;

    // Create the expected signature
    const expectedSignature = crypto
        .createHmac('sha256', RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

    // Compare the signatures
    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
        console.log('✅ Payment Verification Successful.');
        // Here you would typically save the payment details to your database
        res.json({
            status: 'success',
            message: 'Payment verified successfully.',
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
        });
    } else {
        console.error('❌ Payment Verification Failed.');
        res.status(400).json({
            status: 'failure',
            message: 'Invalid signature. Payment verification failed.'
        });
    }
});


// --- Server Start ---
app.listen(PORT, () => {
    console.log(`✅ Unified server is running on http://localhost:${PORT}`);
});