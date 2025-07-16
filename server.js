// server.js - Final Unified Backend

const express = require('express');
const cors = require('cors');
const Razorpay = require('razorpay');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Security: Environment Variables ---
// Render will provide these values from the Environment section in your dashboard.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

// --- CORS Configuration ---
// This allows your Netlify frontend to talk to this Render backend.
const corsOptions = {
    origin: 'https://qandagenerator.netlify.app', // Your Netlify URL
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());

// --- Razorpay Instance ---
const razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
});

// --- API Routes ---

app.get('/', (req, res) => {
    res.status(200).send('Backend is running!');
});

app.post('/generate', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required.' });
    if (!GEMINI_API_KEY) return res.status(500).json({ error: 'Gemini API key not configured on server.' });
    
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    try {
        const payload = { contents: [{ parts: [{ text: prompt }] }] };
        const response = await axios.post(GEMINI_API_URL, payload);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch from Gemini API.' });
    }
});

app.post('/create-order', async (req, res) => {
    try {
        const { amount, currency = 'INR' } = req.body;
        if (!amount) return res.status(400).json({ error: 'Amount is required.' });
        if (!RAZORPAY_KEY_ID) return res.status(500).json({ error: 'Razorpay keys not configured.' });
        
        const options = { amount, currency, receipt: `receipt_${new Date().getTime()}` };
        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/verify-payment', (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(body.toString()).digest('hex');
    
    if (expectedSignature === razorpay_signature) {
        res.json({ status: 'success' });
    } else {
        res.status(400).json({ status: 'failure' });
    }
});

// --- Server Start ---
app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
});
