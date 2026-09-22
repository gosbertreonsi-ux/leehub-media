// ====== PLAYHUB BACKEND CLOUD HUB ======
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// Global Server-Side Memory Arrays (Replaces client-side LocalStorage)
let globalVideoFeed = [];
let userPaymentsDb = {};

// ==========================================
// 📁 VIDEO DATABASE API ENDPOINTS
// ==========================================

// 1. Fetch Global Video Feed List
app.get('/api/videos', (req, res) => {
  res.status(200).json(globalVideoFeed);
});

// 2. Add New Video Row from Admin Dashboard
app.post('/api/videos', (req, res) => {
  const { id, title, channel, length, desc, thumb, uploadedAt } = req.body;
  
  if (!title || !channel) {
    return res.status(400).json({ error: "Missing essential metadata fields." });
  }

  const securedVideoPayload = { id, title, channel, length, desc, thumb, uploadedAt };
  globalVideoFeed.unshift(securedVideoPayload);
  
  console.log(`Cloud DB: Successfully published "${title}" to global feed.`);
  res.status(201).json({ success: true, item: securedVideoPayload });
});

// 3. Remove Video from Feed via Admin Request
app.delete('/api/videos/:id', (req, res) => {
  const targetId = req.params.id;
  const initialLength = globalVideoFeed.length;
  
  globalVideoFeed = globalVideoFeed.filter(video => video.id !== targetId);
  
  if (globalVideoFeed.length === initialLength) {
    return res.status(404).json({ error: "Target video entry not found." });
  }

  console.log(`Cloud DB: Removed video asset ID [${targetId}] from feed.`);
  res.status(200).json({ success: true });
});

// ==========================================
// 💳 MONETIZATION API GATEWAYS (Sandbox / Palmpesa Pre-Wire)
// ==========================================
app.post('/api/initialize-payment', async (req, res) => {
  const { amount, currency, method, operator, phone, cardDetails } = req.body;
  const transactionRef = 'playhub-tx-' + Date.now();

  try {
    if (method === "momo") {
      console.log(`[PAYMENT] Initiating local STK Push verification loop to ${operator} for user: ${phone}`);
      return res.status(200).json({
        success: true,
        redirectUrl: null,
        message: "Sandbox verification mode initialized successfully."
      });
    } 

    if (method === "card") {
      console.log(`[PAYMENT] Initializing sandbox checkout window for card transaction...`);
      return res.status(200).json({
        success: true,
        redirectUrl: null,
        message: "Sandbox card verification initialized."
      });
    }

    res.status(400).json({ error: "Invalid payment configurations specified." });
  } catch (err) {
    console.error("Gateway interface timeout exception:", err.message);
    res.status(500).json({ error: "Payment processor connection timeout." });
  }
});

// 5. Verify Individual Pay-Per-View Content Entitlements
app.get('/api/verify-video', (req, res) => {
  const videoId = req.query.id;
  const mockUserSession = "guest_session_token"; 

  const sessionRecord = userPaymentsDb[mockUserSession];
  if (sessionRecord && sessionRecord.paidVideos.includes(videoId)) {
    return res.status(200).json({ purchased: true });
  }

  res.status(200).json({ purchased: false });
});

// ========================================================
// 🔄 LIVE TRANSACTION WEBHOOKS & RESPONSE VERIFICATION
// ========================================================
app.post('/api/payment-webhook', async (req, res) => {
  console.log("[WEBHOOK] Received an incoming transaction update from gateway...");
  const { status, tx_ref, amount } = req.body.data || req.body;

  if (status === "successful") {
    console.log(`[REVENUE SUCCESS] Transaction reference [${tx_ref}] verified for TZS ${amount}!`);
    userPaymentsDb["guest_session_token"] = { paidSiteEntrance: true, paidVideos: [] };
    return res.status(200).json({ status: "success", message: "Account entitlement activated." });
  }
  res.status(200).json({ status: "ignored", message: "Transaction incomplete or pending." });
});

app.get('/api/check-payment-status', (req, res) => {
  const mockUserSession = "guest_session_token";
  const record = userPaymentsDb[mockUserSession];

  if (record && record.paidSiteEntrance) {
    return res.status(200).json({ status: "completed", paid: true });
  }
  res.status(200).json({ status: "pending", paid: false });
});

// Startup Execution Directives
app.listen(PORT, () => {
  console.log(`======================================================`);
  console.log(`🚀 PlayHub Core Systems Active & Listening on Port ${PORT}`);
  console.log(`======================================================`);
});
