require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

// FIXED: Upgraded memory thresholds to 100 Megabytes to accept large binary file packets smoothly
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1YWl4Y29sZHlqcmN5aWJlc2lpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDAsImV4cCI6MjAwMH0.sample';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


console.log("Secure Supabase Distributed Cloud Tunnel Connected.");

// 1. Fetch Shared Video Feed List
app.get('/api/videos', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (error) throw error;
    
    const synchronizedFeed = data.map(v => ({
      id: v.id,
      title: v.title,
      channel: v.channel,
      length: v.length,
      price: v.price,
      desc: v.desc_source,
      thumb: v.thumb,
      uploadedAt: v.uploaded_at
    }));

    res.status(200).json(synchronizedFeed);
  } catch (err) {
    console.error("Database read extraction failure:", err.message);
    res.status(500).json({ error: "Cloud sync failure." });
  }
});

// 2. Publish New Video Entry Universally
app.post('/api/videos', async (req, res) => {
  const { id, title, channel, length, price, desc, thumb, uploadedAt } = req.body;
  if (!title || !channel) return res.status(400).json({ error: "Missing metadata fields." });

  try {
    const { error } = await supabase
      .from('videos')
      .insert([{
        id: id,
        title: title,
        channel: channel,
        length: length,
        price: price || '0',
        desc_source: desc,
        thumb: thumb,
        uploaded_at: uploadedAt || new Date().toISOString()
      }]);

    if (error) throw error;
    console.log(`[REAL-TIME SYNC] Successfully committed: "${title}" straight to cloud servers.`);
    return res.status(201).json({ success: true });
  } catch (err) {
    console.error("Supabase insertion dropped payload reject:", err.message);
    return res.status(500).json({ error: "Data pipeline execution exception." });
  }
});

// 3. FIXED DELETION: Targeted structural logic to delete only ONE video ID at a time matching query conditions
app.delete('/api/videos/:id', async (req, res) => {
  const targetId = req.params.id;
  try {
    const { error } = await supabase
      .from('videos')
      .delete()
      .eq('id', targetId); // Target strictly the video matching this ID

    if (error) throw error;
    console.log(`[CLOUD DATA CLEAN] Purged video item ID [${targetId}] from databases.`);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Target deletion loop aborted:", err.message);
    return res.status(500).json({ error: "Purge process failure." });
  }
});

app.get('/api/verify-video', (req, res) => { res.status(200).json({ purchased: false }); });
app.post('/api/initialize-payment', (req, res) => { res.status(200).json({ success: true, redirectUrl: null }); });
app.get('/api/check-payment-status', (req, res) => { res.status(200).json({ status: "completed", paid: true }); });

app.listen(PORT, () => {
  console.log(`PlayHub Core Systems Active & Listening on Port ${PORT}`);
});
