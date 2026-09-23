'use client';

import React, { useState, useEffect } from 'react';

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
  const [videoProvider, setVideoProvider] = useState('mp4'); // mp4, bunny, vimeo
  const [videoUrl, setVideoUrl] = useState('');
  const [totalSimulatedRevenue, setTotalSimulatedRevenue] = useState(0);

  // Buffer Engine Spaces
  const [pendingThumb, setPendingThumb] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

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

    // 1. Try pulling records from your cloud server database
    try {
      const res = await fetch(`${BACKEND_API_URL}/videos`);
      if (res.ok) {
        dbVideos = await res.json();
      }
    } catch (err) {
      console.warn('Remote database unreached. Pulling exclusively from offline fail-safe local arrays.');
    }

    // 2. Safely read and verify backup records inside local storage cache
    try {
      const raw = window.localStorage.getItem('playhub_admin_videos');
      if (raw) {
        localVideos = JSON.parse(raw);
      }
    } catch (e) {
      console.error('Local backup storage corrupted or unreadable.', e);
    }

    // 3. De-duplicate elements matching identical IDs to prevent double rows on screen
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

  // SMART LINK TRANSLATOR: Normalizes raw text codes into valid player components
  const compileVideoDescription = () => {
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

    // DUAL-STORAGE SUBMISSION ENGINE: Ships to both Database and LocalStorage simultaneously
  const handlePublishSubmit = async (e) => {
    e.preventDefault();
    setUploadError('');

    if (!title.trim() || !channel.trim()) {
      setUploadError('Title and channel names are mandatory.');
      return;
    }
    if (!videoUrl.trim()) {
      setUploadError('Please insert a streaming link address or embed asset.');
      return;
    }

    setIsPublishing(true);
    const compiledSource = compileVideoDescription();

    const cleanVideoPayload = {
      id: "vid_" + Date.now().toString(36),
      title: title.trim(),
      channel: channel.trim(),
      length: length.trim() || 'Premium',
      thumb: pendingThumb || 'linear-gradient(135deg,#212121,#111)', 
      price: price || '0',
      desc: compiledSource, 
      uploadedAt: new Date().toISOString()
    };

    // Step A: Persist inside LocalStorage instantly so it is immediately visible
    try {
      const raw = window.localStorage.getItem('playhub_admin_videos');
      const list = raw ? JSON.parse(raw) : [];
      list.unshift(cleanVideoPayload);
      window.localStorage.setItem('playhub_admin_videos', JSON.stringify(list));
      window.localStorage.setItem('playhub_home_feed_videos', JSON.stringify(list)); // Mirror feed key
    } catch (err) {
      console.error('LocalStorage write failure', err);
    }

    // Step B: Parallel request to sync payload with SQL tables via your live database route
    try {
      await fetch(`${BACKEND_API_URL}/videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanVideoPayload)
      });
    } catch (err) {
      console.warn('Database pipeline down - object cached safely on local storage layer instead.');
    }

    // Reset layout fields and update view counters
    resetUploadForm();
    await fetchUploadedVideos();
  };

  const resetUploadForm = () => {
    setTitle(''); setChannel(''); setLength(''); setPrice('0'); setDesc(''); setVideoUrl('');
    setPendingThumb(''); setIsPublishing(false);
  };

  const handleDeleteVideo = async (id) => {
    // Delete from Database
    try {
      await fetch(`${BACKEND_API_URL}/videos/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Database node absent. Processing direct local item wipe.');
    }

    // Delete from LocalStorage
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
                  <option value="mp4">Direct URL / YouTube Embed</option>
                  <option value="vimeo">Vimeo Video ID</option>
                  <option value="bunny">Bunny.net Stream Address</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-[#aaaaaa] font-medium">Source link / Reference ID</label>
                <input type="text" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Paste URL or embed key" className="w-full bg-[#212121] border border-[#303030] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#ff5f5f]" required />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#aaaaaa] font-medium">Cover Thumbnail Canvas</label>
              <div className="group relative border border-[#303030] border-dashed hover:border-[#ff3b3b] bg-[#212121] rounded-xl overflow-hidden aspect-video cursor-pointer flex items-center justify-center transition" style={{ backgroundImage: pendingThumb ? `url(${pendingThumb})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                <input type="file" accept="image/*" onChange={handleThumbnailChange} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
                {!pendingThumb && <span className="text-xs text-[#aaaaaa] pointer-events-none">📷 Select Cover Thumbnail picture</span>}
              </div>
            </div>

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
                    <div className="h-12 w-20 bg-cover bg-center rounded-lg border border-[#303030] shrink-0" style={{ backgroundImage: v.thumb && v.thumb.startsWith('linear') ? 'none' : `url(${v.thumb})`, background: v.thumb && v.thumb.startsWith('linear') ? v.thumb : undefined }} />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-white truncate">{v.title}</h4>
                      <p className="text-xs text-[#aaaaaa] truncate mt-0.5">{v.channel} &middot; {v.length} &middot; {parseInt(v.price) > 0 ? `TSh ${parseInt(v.price).toLocaleString()}` : 'Free'}</p>
                    </div>
                    <button onClick={() => handleDeleteVideo(v.id)} className="text-sm text-[#aaaaaa] p-2 hover:text-[#ff5f5f] rounded-lg hover:bg-[#212121] transition cursor-pointer">🗑</button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
