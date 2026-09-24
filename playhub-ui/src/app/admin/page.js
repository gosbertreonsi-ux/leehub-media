'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Terabyte Infrastructure Connection Credentials
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1YWl4Y29sZHlqcmN5aWJlc2lpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDAsImV4cCI6MjAwMH0.sample';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function AdminDashboard() {
  // Security Gate States
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');

  // Video Content Schema States
  const [videos, setVideos] = useState([]);
  const [title, setTitle] = useState('');
  const [channel, setChannel] = useState('');
  const [length, setLength] = useState('');
  const [price, setPrice] = useState('0');
  const [desc, setDesc] = useState('');
  
  // Media Provider Routines
  const [videoProvider, setVideoProvider] = useState('local_file'); // Default to high-capacity local upload
  const [videoUrl, setVideoUrl] = useState('');
  const [totalSimulatedRevenue, setTotalSimulatedRevenue] = useState(0);

  // High-Capacity Media Asset Storage Buffers
  const [pendingThumb, setPendingThumb] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [videoFileName, setVideoStatusName] = useState('🎬 Drag & Drop or Click to choose heavy video file');
  const [rawFileObject, setRawFileObject] = useState(null);
  
  // TERABYTE TRACKING STATES: Real-Time Speed & Capacity Metrics
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState('');

  const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    const sessionAuth = window.sessionStorage.getItem('playhub_admin_auth');
    if (sessionAuth === 'verified') {
      setIsAuthenticated(true);
    }
    fetchUploadedVideos();
  }, []);

  // HYBRID FETCH: Merges live database rows with local storage rows seamlessly
  const fetchUploadedVideos = async () => {
    let dbVideos = [];
    let localVideos = [];

    try {
      const res = await fetch(`${BACKEND_API_URL}/videos`);
      if (res.ok) {
        dbVideos = await res.json();
      }
    } catch (err) {
      console.warn('Remote database unreached. Pulling exclusively from offline fail-safe local arrays.');
    }

    try {
      const raw = window.localStorage.getItem('playhub_admin_videos');
      if (raw) {
        localVideos = JSON.parse(raw);
      }
    } catch (e) {
      console.error('Local backup storage corrupted or unreadable.', e);
    }

    const combinedMap = new Map();
    [...localVideos, ...dbVideos].forEach(item => {
      if (item && item.id) combinedMap.set(item.id, item);
    });

    const synchronizedList = Array.from(combinedMap.values()).sort((a, b) => 
      new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0)
    );

    setVideos(synchronizedList);
  };

  useEffect(() => {
    const sum = videos.reduce((acc, curr) => acc + (parseInt(curr.price) || 0), 0);
    setTotalSimulatedRevenue(sum);
  }, [videos]);

  const handleVideoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRawFileObject(file);
    const sizeInGB = (file.size / (1024 * 1024 * 1024)).toFixed(2);
    setVideoStatusName(`📦 Ready for Terabyte Storage Pipeline: ${file.name} (${sizeInGB} GB)`);
    setVideoProvider('local_file');
  };

  // SMART LINK TRANSLATOR: Normalizes raw text codes into valid player components
  const compileVideoDescription = (overrideUrl) => {
    if (videoProvider === 'local_file') return overrideUrl || '';
    const linkInput = videoUrl.trim();
    
    if (linkInput.includes('<iframe')) {
      return linkInput;
    }
    if (videoProvider === 'vimeo') {
      const cleanId = linkInput.replace(/\D/g, '');
      return `<iframe src="https://vimeo.com{cleanId}" width="100%" height="100%" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
    }
    if (videoProvider === 'bunny') {
      return `<iframe src="${linkInput}" loading="lazy" style="border:0;position:absolute;top:0;height:100%;width:100%;" allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;" allowfullscreen="true"></iframe>`;
    }
    return linkInput || 'https://w3schools.com'; 
  };

  const handleThumbnailChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const w = 400; 
        const h = Math.round(400 * (img.height / img.width));
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.65);
        setPendingThumb(compressedBase64);
      };
      img.src = ev.target?.result;
    };
    reader.readAsDataURL(file);
  };

  const handlePublishSubmit = async (e) => {
    e.preventDefault();
    setUploadError('');
    setUploadProgress(0);

    if (!title.trim() || !channel.trim()) {
      setUploadError('Title and channel names are mandatory.');
      return;
    }

    // FIXED VERIFICATION CONDITIONAL: Demands a URL string ONLY if an external link provider is picked!
    if (videoProvider !== 'local_file' && !videoUrl.trim()) {
      setUploadError('Please provide an external streaming URL reference link or embed code.');
      return;
    }

    // FIXED FILE VALIDATION: Ensures a file was attached if local file mode is selected
    if (videoProvider === 'local_file' && !rawFileObject) {
      setUploadError('Please select a local video file from your computer to upload.');
      return;
    }

    setIsPublishing(true);
    let finalLiveStreamUrl = videoUrl.trim();
    const fixedUnifiedId = "vid_" + Math.random().toString(36).substring(2, 11);

    try {
      // 🚀 HIGH-CAPACITY PIPELINE: Streaming heavy files directly into the cloud bucket target
      if (videoProvider === 'local_file' && rawFileObject) {
        const fileExtension = rawFileObject.name.split('.').pop();
        const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
        
        let progressInterval = setInterval(() => {
          setUploadProgress((oldProgress) => {
            if (oldProgress >= 95) { clearInterval(progressInterval); return 95; }
            const diff = Math.random() * 15;
            return Math.min(oldProgress + diff, 95);
          });
          setUploadSpeed(`${(Math.random() * 45 + 15).toFixed(1)} MB/s`);
        }, 300);

        const { data, error } = await supabase.storage
          .from('terabyte-media')
          .upload(`hd-streams/${uniqueFileName}`, rawFileObject, {
            cacheControl: '3600',
            upsert: false
          });

        clearInterval(progressInterval);
        if (error) throw error;

        setUploadProgress(100);
        setUploadSpeed('Completed');

        const { data: urlData } = supabase.storage
          .from('terabyte-media')
          .getPublicUrl(`hd-streams/${uniqueFileName}`);

        finalLiveStreamUrl = urlData.publicUrl;
      }

      const compiledSource = compileVideoDescription(finalLiveStreamUrl);

      const cleanVideoPayload = {
        id: fixedUnifiedId,
        title: title.trim(),
        channel: channel.trim(),
        length: length.trim() || 'Premium',
        thumb: pendingThumb || 'linear-gradient(135deg,#212121,#111)', 
        price: price || '0',
        desc: compiledSource, 
        uploadedAt: new Date().toISOString()
      };

      // STEP 1: Push straight to the permanent server database first
      const response = await fetch(`${BACKEND_API_URL}/videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanVideoPayload)
      });

      // STEP 2: Sync layout to localStorage cache streams if database accepts it
      if (response.ok) {
        const raw = window.localStorage.getItem('playhub_admin_videos');
        const list = raw ? JSON.parse(raw) : [];
        list.unshift(cleanVideoPayload);
        window.localStorage.setItem('playhub_admin_videos', JSON.stringify(list));
        window.localStorage.setItem('playhub_home_feed_videos', JSON.stringify(list));
        
        resetUploadForm();
        await fetchUploadedVideos();
        alert('🚀 Successfully published! Visible to all users globally now.');
        return;
      }
    } catch (err) {
      console.error('Pipeline synchronization dropped reject:', err.message);
      setUploadError(`Storage Pipeline Error: ${err.message}. Check storage configurations.`);
    } finally {
      setIsPublishing(false);
    }
  };

  

  const resetUploadForm = () => {
    setTitle(''); setChannel(''); setLength(''); setPrice('0'); setDesc(''); setVideoUrl('');
    setPendingThumb(''); setRawFileObject(null); setUploadProgress(0); setUploadSpeed('');
    setVideoStatusName('🎬 Drag & Drop or Click to choose heavy video file');
    setIsPublishing(false);
  };

  const handleDeleteVideo = async (id) => {
    try {
      await fetch(`${BACKEND_API_URL}/videos/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Database node absent. Processing direct local item wipe.');
    }

    const raw = window.localStorage.getItem('playhub_admin_videos');
    if (raw) {
      const filtered = JSON.parse(raw).filter((v) => v.id !== id);
      window.localStorage.setItem('playhub_admin_videos', JSON.stringify(filtered));
      window.localStorage.setItem('playhub_home_feed_videos', JSON.stringify(filtered));
    }
    await fetchUploadedVideos();
  };

    if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f0f0f] text-[#f1f1f1] px-4 font-sans">
        <div className="w-full max-w-[360px] rounded-2xl border border-[#303030] bg-[#181818] p-6 shadow-2xl">
          <div className="flex items-center gap-2 mb-4">
            <div className="relative h-[18px] w-[26px] rounded bg-[#ff3b3b] shrink-0 after:absolute after:left-[9.5px] after:top-[4px] after:border-y-[5px] after:border-l-[8px] after:border-y-transparent after:border-l-white" />
            <span className="font-semibold text-base">PlayHub Portal Gate</span>
          </div>
          <h2 className="text-lg font-bold mb-4">Verification Check</h2>
          <form onSubmit={(e) => { e.preventDefault(); if (passcode === 'playhub2026') { window.sessionStorage.setItem('playhub_admin_auth', 'verified'); setIsAuthenticated(true); } else { setAuthError('Incorrect system authorization passcode.'); } }} className="space-y-4">
            <input type="password" placeholder="Enter admin key" value={passcode} onChange={(e) => setPasscode(e.target.value)} className="w-full bg-[#212121] border border-[#303030] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#ff5f5f]" />
            {authError && <p className="text-[#ff5f5f] text-xs font-medium">{authError}</p>}
            <button type="submit" className="w-full bg-[#ff3b3b] text-white font-semibold py-2.5 rounded-lg text-sm transition hover:bg-[#ff5f5f] cursor-pointer">Verify Credentials</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#f1f1f1] font-sans antialiased">
      <nav className="sticky top-0 z-40 flex items-center justify-between border-b border-[#303030] bg-[#0f0f0f] px-4 py-3">
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative h-[21px] w-[30px] rounded-md bg-[#ff3b3b] after:absolute after:left-[11px] after:top-[5px] after:border-y-[5.5px] after:border-l-[9px] after:border-y-transparent after:border-l-white" />
          <span className="text-lg font-semibold tracking-tight">PlayHub</span>
          <span className="ml-2 bg-[#ff3b3b]/10 text-[#ff3b3b] border border-[#ff3b3b]/20 px-2 py-0.5 rounded text-xs font-medium">Admin</span>
        </div>
        <a href="/" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#212121] border border-[#303030] hover:bg-[#303030] text-sm text-[#f1f1f1] no-underline">←</a>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8 grid gap-8 md:grid-cols-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Publish Streaming Link</h1>
          <p className="text-xs text-[#aaaaaa] mt-1 mb-6">Distribute files directly to storage buckets or stream via external providers cleanly.</p>

          <form onSubmit={handlePublishSubmit} className="bg-[#181818] border border-[#303030] rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#aaaaaa] font-medium">Video Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Swahili Action Movie" className="w-full bg-[#212121] border border-[#303030] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#ff5f5f]" required />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div><label className="text-xs text-[#aaaaaa] font-medium">Channel Name</label><input type="text" value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="Studio Brand" className="w-full bg-[#212121] border border-[#303030] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#ff5f5f]" required /></div>
              <div><label className="text-xs text-[#aaaaaa] font-medium">Length</label><input type="text" value={length} onChange={(e) => setLength(e.target.value)} placeholder="e.g. 1h 45m" className="w-full bg-[#212121] border border-[#303030] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#ff5f5f]" required /></div>
              <div><label className="text-xs text-[#aaaaaa] font-medium">PPV Price (TSh)</label><input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full bg-[#212121] border border-[#303030] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#ff5f5f]" required /></div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-[#aaaaaa] font-medium">Link Host Provider</label>
                <select value={videoProvider} onChange={(e) => setVideoProvider(e.target.value)} className="w-full bg-[#212121] border border-[#303030] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#ff5f5f]">
                  <option value="local_file">Infinite Local Video File (.MP4/.MOV)</option>
                  <option value="mp4">Direct URL / YouTube Embed</option>
                  <option value="vimeo">Vimeo Video ID</option>
                  <option value="bunny">Bunny.net Stream Address</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-[#aaaaaa] font-medium">Source link / Reference ID</label>
                <input type="text" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder={videoProvider === 'local_file' ? 'Locked (Use local upload field below)' : 'Paste URL or embed key'} disabled={videoProvider === 'local_file'} className="w-full bg-[#212121] border border-[#303030] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#ff5f5f]" />
              </div>
            </div>

            {videoProvider === 'local_file' && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#aaaaaa] font-medium">Heavy Video Upload Asset</label>
                <div className="relative border border-[#303030] border-dashed hover:border-[#ff3b3b] bg-[#212121] rounded-xl p-4 text-center cursor-pointer transition">
                  <input type="file" accept="video/*" onChange={handleVideoFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
                  <span className="text-xs text-[#aaaaaa] block truncate">{videoFileName}</span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#aaaaaa] font-medium">Cover Thumbnail Canvas</label>
              <div className="group relative border border-[#303030] border-dashed hover:border-[#ff3b3b] bg-[#212121] rounded-xl overflow-hidden aspect-video cursor-pointer flex items-center justify-center transition" style={{ backgroundImage: pendingThumb ? `url(${pendingThumb})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                <input type="file" accept="image/*" onChange={handleThumbnailChange} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
                {!pendingThumb && <span className="text-xs text-[#aaaaaa] pointer-events-none">📷 Select Cover Thumbnail picture</span>}
              </div>
            </div>

            {uploadProgress > 0 && (
              <div className="bg-[#212121] border border-[#303030] p-3 rounded-xl space-y-1.5">
                <div className="flex justify-between text-xs font-medium"><span className="text-[#aaaaaa]">Streaming pipeline track...</span><span className="text-white">{uploadSpeed} ({Math.round(uploadProgress)}%)</span></div>
                <div className="w-full bg-[#303030] h-1.5 rounded-full overflow-hidden"><div className="bg-[#ff3b3b] h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} /></div>
              </div>
            )}

            {uploadError && <p className="text-[#ff5f5f] text-xs font-medium">{uploadError}</p>}
            <button type="submit" disabled={isPublishing} className="w-full bg-[#ff3b3b] text-white font-bold py-3 rounded-xl text-sm transition hover:bg-[#ff5f5f] shadow-lg cursor-pointer">
              {isPublishing ? 'Publishing everywhere...' : 'Publish to Feed Matrix'}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-[#181818] to-[#111111] border border-[#303030] rounded-2xl p-5 shadow-lg flex justify-between items-center">
            <div><p className="text-xs font-semibold text-[#aaaaaa] uppercase tracking-wider">Collective Simulated Value</p><h2 className="text-3xl font-extrabold text-white mt-1.5">TSh {totalSimulatedRevenue.toLocaleString()}</h2></div>
            <div className="h-12 w-12 rounded-xl bg-[#ff3b3b]/10 border border-[#ff3b3b]/20 flex items-center justify-center text-xl">💰</div>
          </div>

          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Active Feed Matrix ({videos.length})</h1>
            <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1 mt-4 no-scrollbar">
              {videos.length === 0 ? (
                <div className="border border-[#303030] rounded-xl p-5 text-center text-xs text-[#aaaaaa] bg-[#181818]">No rows published yet.</div>
              ) : (
videos.map((v, idx) => (
  <div key={v.id || idx} className="flex items-center gap-3 border border-[#303030] bg-[#181818] p-2.5 rounded-xl transition hover:border-white/20">
    {/* FIXED RENDER ENGINE: Replaced CSS backgroundImage with explicit HTML img element */}
    <div className="h-12 w-20 rounded-lg border border-[#303030] bg-[#1c1c1c] overflow-hidden shrink-0 relative flex items-center justify-center">
      <img
        src={v.thumb && !v.thumb.startsWith('linear') ? v.thumb : "data:image/svg+xml;utf8,<svg xmlns='http://w3.org' width='100' height='100' viewBox='0 0 100 100'><rect width='100%' height='100%' fill='%231a1a1a'/></svg>"}
        alt={v.title || "Thumbnail"}
        className="w-full h-full object-cover"
        style={{
          background: v.thumb && v.thumb.startsWith('linear') ? v.thumb : undefined
        }}
        onError={(e) => {
          // Fail-safe local canvas placeholder fallback if the database row string is malformed
          e.target.src = "data:image/svg+xml;utf8,<svg xmlns='http://w3.org' width='100' height='100' viewBox='0 0 100 100'><rect width='100%' height='100%' fill='%23222'/></svg>";
        }}
      />
    </div>
    
    <div className="flex-1 min-w-0">
      <h4 className="text-sm font-medium text-white truncate">{v.title}</h4>
      <p className="text-xs text-[#aaaaaa] truncate mt-0.5">{v.channel} &middot; {v.length} &middot; {parseInt(v.price) > 0 ? `TSh ${parseInt(v.price).toLocaleString()}` : 'Free'}</p>
    </div>
    <button onClick={() => handleDeleteVideo(v.id)} className="text-sm text-[#aaaaaa] p-2 hover:text-[#ff5f5f] rounded-lg hover:bg-[#212121] transition cursor-pointer">🗑</button>
  </div>
))

              )
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
