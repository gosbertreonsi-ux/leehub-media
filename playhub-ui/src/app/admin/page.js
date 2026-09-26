'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  UploadCloud, 
  ShieldAlert, 
  DollarSign, 
  Tv, 
  Clock, 
  Coins, 
  Trash2, 
  Link, 
  Image as ImageIcon, 
  ArrowLeft, 
  FileVideo, 
  Activity,
  Layers
} from 'lucide-react';

// Database Connection Credentials
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ;


const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function AdminDashboard() {
   //admin key
  const KEY = process.env.NEXT_PUBLIC_PLAYHUB_SECRET_KEY || 'playhub2026';


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
  const [videoProvider, setVideoProvider] = useState('local_file'); 
  const [videoUrl, setVideoUrl] = useState('');
  const [totalSimulatedRevenue, setTotalSimulatedRevenue] = useState(0);

  // High-Capacity Media Asset Storage Buffers
  const [pendingThumb, setPendingThumb] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [videoFileName, setVideoStatusName] = useState('Select high-capacity film asset from disk');
  const [rawFileObject, setRawFileObject] = useState(null);
  
  // DATABASE TRACKING STATES
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState('');

  const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL ;
  



  useEffect(() => {
    const sessionAuth = window.sessionStorage.getItem('playhub_admin_auth');
    if (sessionAuth === 'verified') {
      setIsAuthenticated(true);
    }
    fetchUploadedVideos();
  }, []);

  // HYBRID FETCH
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
    setVideoStatusName(`${file.name} (${sizeInGB} GB)`);
    setVideoProvider('local_file');
  };

    // SMART LINK TRANSLATOR
  const compileVideoDescription = (overrideUrl) => {
    if (videoProvider === 'local_file') return overrideUrl || '';
    const linkInput = videoUrl.trim();
    
    if (linkInput.includes('<iframe')) {
      return linkInput;
    }
    if (videoProvider === 'vimeo') {
      const cleanId = linkInput.replace(/\D/g, '');
      return `<iframe src="https://vimeo.com{cleanId}?autoplay=1&title=0&byline=0&portrait=0" width="100%" height="100%" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
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

    if (videoProvider !== 'local_file' && !videoUrl.trim()) {
      setUploadError('Please provide an external streaming URL reference link or embed code.');
      return;
    }

    if (videoProvider === 'local_file' && !rawFileObject) {
      setUploadError('Please select a local video file from your computer to upload.');
      return;
    }

    setIsPublishing(true);
    let finalLiveStreamUrl = videoUrl.trim();
    const fixedUnifiedId = "vid_" + Math.random().toString(36).substring(2, 11);

    try {
      //  HIGH-CAPACITY PIPELINE
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

      const response = await fetch(`${BACKEND_API_URL}/videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanVideoPayload)
      });

      if (response.ok) {
        const raw = window.localStorage.getItem('playhub_admin_videos');
        const list = raw ? JSON.parse(raw) : [];
        list.unshift(cleanVideoPayload);
        window.localStorage.setItem('playhub_admin_videos', JSON.stringify(list));
        window.localStorage.setItem('playhub_home_feed_videos', JSON.stringify(list));
        
        resetUploadForm();
        await fetchUploadedVideos();
        return;
      }
    } catch (err) {
      console.error('Pipeline synchronization dropped reject:', err.message);
      setUploadError(`Storage Pipeline Error: ${err.message}.`);
    } finally {
      setIsPublishing(false);
    }
  };

  const resetUploadForm = () => {
    setTitle(''); setChannel(''); setLength(''); setPrice('0'); setDesc(''); setVideoUrl('');
    setPendingThumb(''); setRawFileObject(null); setUploadProgress(0); setUploadSpeed('');
    setVideoStatusName('Select high-capacity film asset from disk');
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
      <div className="flex min-h-screen items-center justify-center bg-[#0a0f0d] text-[#e2e8f0] px-4 font-sans antialiased">
        <div className="w-full max-w-[380px] rounded-3xl border border-[#222c26] bg-[#111613] p-7 shadow-2xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#ff3b3b]/10 border border-[#ff3b3b]/20 flex items-center justify-center text-[#ff3b3b]">
              <ShieldAlert size={18} />
            </div>
            <div>
              <h2 className="text-md font-bold text-white tracking-tight">PlayHub Console Deck</h2>
              <p className="text-[11px] text-[#888] font-medium mt-0.5">Administrative Auth Verification</p>
            </div>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); if (passcode === KEY) { window.sessionStorage.setItem('playhub_admin_auth', 'verified'); setIsAuthenticated(true); } else { setAuthError('Incorrect system authorization passcode.'); } }} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase font-bold tracking-widest text-[#666]">Security Token</label>
              <input type="password" placeholder="••••••••" value={passcode} onChange={(e) => setPasscode(e.target.value)} className="w-full bg-[#161d19] border border-[#26332d] rounded-xl px-4 py-3 text-sm text-white font-mono outline-none focus:border-[#ff3b3b] transition-all" />
            </div>
            {authError && <p className="text-[#ff5f5f] text-xs font-semibold tracking-tight">{authError}</p>}
            <button type="submit" className="w-full bg-gradient-to-r from-[#ff3b3b] to-[#ff5f5f] text-white font-extrabold py-3 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-[#ff3b3b]/10 hover:shadow-[#ff3b3b]/20 cursor-pointer transform active:scale-[0.99] transition-all">Verify Credentials</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070908] text-[#e2e8f0] font-sans antialiased selection:bg-[#ff3b3b]/20">
      {/* CONTROL ROOM TOP BANNER HEADER */}
      <nav className="sticky top-0 z-40 flex items-center justify-between border-b border-[#1c2420] bg-[#070908]/90 backdrop-blur-md px-6 py-3.5">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="relative h-5 w-8 rounded-md bg-[#ff3b3b] flex items-center justify-center transition-all hover:scale-105 active:scale-[0.98]">
            <div className="ml-0.5 border-y-[5px] border-l-[8px] border-y-transparent border-l-white" />
          </div>
          <span className="text-lg font-black tracking-tight text-white uppercase">PlayHub</span>
          <span className="bg-[#ff3b3b]/10 text-[#ff3b3b] border border-[#ff3b3b]/20 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">Control Panel</span>
        </div>
        <a href="/" className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#141c18] border border-[#222c26] text-[#aaa] hover:text-white hover:border-[#ff3b3b] transition-all duration-200">
          <ArrowLeft size={16} />
        </a>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8 grid gap-8 lg:grid-cols-12 items-start">
        {/* INPUT SUBMISSION WORKSPACE WRAPPER */}
        <div className="lg:col-span-5 space-y-6">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <UploadCloud size={20} className="text-[#ff3b3b]" /> Broadcast Studio
            </h1>
            <p className="text-xs text-[#888] mt-1">Distribute high-definition file streams straight to public matrix targets.</p>
          </div>

          <form onSubmit={handlePublishSubmit} className="bg-[#0e1411] border border-[#1c2420] rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="space-y-1.5">
              <label className="text-xs text-[#aaa] font-bold tracking-tight">Video Broadcast Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Swahili Dubbed Action Film" className="w-full bg-[#141d19] border border-[#222c26] rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#ff3b3b] focus:bg-[#101714] transition-all" required />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-[#aaa] font-bold tracking-tight">Studio Brand</label>
                <input type="text" value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="Channel Name" className="w-full bg-[#141d19] border border-[#222c26] rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-[#ff3b3b] transition-all" required />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-[#aaa] font-bold tracking-tight">Duration</label>
                <input type="text" value={length} onChange={(e) => setLength(e.target.value)} placeholder="e.g. 2h 15m" className="w-full bg-[#141d19] border border-[#222c26] rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-[#ff3b3b] transition-all" required />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-[#aaa] font-bold tracking-tight">Price (TSh)</label>
                <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full bg-[#141d19] border border-[#222c26] rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-[#ff3b3b] transition-all" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-[#aaa] font-bold tracking-tight">Host Pipeline</label>
                <select value={videoProvider} onChange={(e) => setVideoProvider(e.target.value)} className="w-full bg-[#141d19] border border-[#222c26] rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-[#ff3b3b] cursor-pointer transition-all">
                  <option value="local_file">Direct Local Film Asset</option>
                  <option value="mp4">YouTube Link / URL</option>
                  <option value="vimeo">Vimeo Frame Reference</option>
                  <option value="bunny">Bunny Stream Core</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-[#aaa] font-bold tracking-tight">Source Key Token</label>
                <input type="text" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder={videoProvider === 'local_file' ? 'Locked (Use picker field)' : 'Paste frame or link address'} disabled={videoProvider === 'local_file'} className="w-full bg-[#141d19] border border-[#222c26] rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-[#ff3b3b] disabled:opacity-30 transition-all" />
              </div>
            </div>

            {videoProvider === 'local_file' && (
              <div className="space-y-1.5 animate-fadeIn">
                <label className="text-xs text-[#aaa] font-bold tracking-tight">Heavy Video Source Asset</label>
                <div className="relative border border-[#222c26] border-dashed hover:border-[#ff3b3b] bg-[#141d19] rounded-xl p-4 text-center cursor-pointer transition-all duration-200">
                  <input type="file" accept="video/*" onChange={handleVideoFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
                  <div className="flex flex-col items-center gap-1.5 py-1">
                    <FileVideo size={18} className="text-[#555]" />
                    <span className="text-[11px] text-[#888] font-semibold truncate max-w-xs">{videoFileName}</span>
                  </div>
                </div>
              </div>
            )}


            <div className="space-y-1.5">
              <label className="text-xs text-[#aaa] font-bold tracking-tight">Cover Thumbnail Artwork</label>
              <div className="group relative border border-[#222c26] border-dashed hover:border-[#ff3b3b] bg-[#141d19] rounded-xl overflow-hidden aspect-video cursor-pointer flex items-center justify-center transition-all duration-200" style={{ backgroundImage: pendingThumb ? `url(${pendingThumb})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                <input type="file" accept="image/*" onChange={handleThumbnailChange} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
                {!pendingThumb && (
                  <div className="flex flex-col items-center gap-1.5 text-[#888]">
                    <ImageIcon size={18} className="text-[#555]" />
                    <span className="text-[11px] font-semibold">Attach grid layout picture</span>
                  </div>
                )}
              </div>
            </div>

            {uploadProgress > 0 && (
              <div className="bg-[#141d19] border border-[#222c26] p-3.5 rounded-xl space-y-2 animate-fadeIn">
                <div className="flex justify-between text-[11px] font-bold tracking-tight">
                  <span className="text-[#888] flex items-center gap-1"><Activity size={12} className="text-[#ff3b3b]" /> Streaming pipeline...</span>
                  <span className="text-white font-mono">{uploadSpeed} ({Math.round(uploadProgress)}%)</span>
                </div>
                <div className="w-full bg-[#1c2420] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-[#ff3b3b] to-[#ff5f5f] h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            {uploadError && <p className="text-[#ff5f5f] text-xs font-bold bg-[#ff5f5f]/10 p-2.5 rounded-xl border border-[#ff5f5f]/20 tracking-tight animate-shake">{uploadError}</p>}
            
            <button type="submit" disabled={isPublishing} className="w-full bg-gradient-to-r from-[#ff3b3b] to-[#ff5f5f] text-white font-extrabold py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-[#ff3b3b]/10 hover:shadow-[#ff3b3b]/20 cursor-pointer disabled:opacity-40 disabled:pointer-events-none transition-all duration-300 transform active:scale-[0.99]">
              {isPublishing ? 'Broadcasting layers...' : 'Publish to Feed Matrix'}
            </button>
          </form>
        </div>

        {/* FEED METRICS GRID ROW DISPLAY */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-gradient-to-br from-[#0e1411] to-[#070a08] border border-[#1c2420] rounded-3xl p-5 shadow-2xl flex justify-between items-center relative overflow-hidden">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-[#888] uppercase tracking-widest">Collective Simulated Portfolio</p>
              <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-1">
                TSh {totalSimulatedRevenue.toLocaleString()}
              </h2>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-[#ff3b3b]/10 border border-[#ff3b3b]/20 flex items-center justify-center text-[#ff3b3b] shadow-xl">
              <Coins size={20} />
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#666] flex items-center gap-2">
              <Layers size={14} /> Active Feed Matrix ({videos.length})
            </h2>
            
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1 no-scrollbar animate-fadeIn">
              {videos.length === 0 ? (
                <div className="border border-[#1c2420] rounded-2xl py-12 text-center text-xs text-[#888] bg-[#0e1411] font-medium shadow-xl">No active channels published yet.</div>
              ) : (
                videos.map((v, idx) => (
                  <div key={v.id || idx} className="flex items-center gap-3.5 border border-[#1c2420] bg-[#0e1411] p-3 rounded-2xl transition-all duration-200 hover:border-[#2d3b27] shadow-lg group">
                    <div className="h-12 w-20 rounded-xl border border-[#1c2420] bg-[#141d19] overflow-hidden shrink-0 relative flex items-center justify-center shadow-md">
                      <img
                        src={v.thumb && !v.thumb.startsWith('linear') ? v.thumb : "data:image/svg+xml;utf8,<svg xmlns='http://w3.org' width='100' height='100' viewBox='0 0 100 100'><rect width='100%' height='100%' fill='%23141d19'/></svg>"}
                        alt={v.title || "Thumbnail"}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        style={{ background: v.thumb && v.thumb.startsWith('linear') ? v.thumb : undefined }}
                        onError={(e) => { e.target.src = "data:image/svg+xml;utf8,<svg xmlns='http://w3.org' width='100' height='100' viewBox='0 0 100 100'><rect width='100%' height='100%' fill='%231c2420'/></svg>"; }}
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0 space-y-1">
                      <h4 className="text-xs font-bold text-white tracking-tight truncate leading-tight group-hover:text-[#ff3b3b] transition-colors">{v.title}</h4>
                      <p className="text-[11px] text-[#888] font-medium flex items-center gap-1.5 truncate">
                        <span className="flex items-center gap-0.5 text-white/60"><Tv size={10} /> {v.channel}</span>
                        <span>&middot;</span>
                        <span className="flex items-center gap-0.5"><Clock size={10} /> {v.length}</span>
                        <span>&middot;</span>
                        <span className="font-bold text-[#ff3b3b]">{parseInt(v.price) > 0 ? `TSh ${parseInt(v.price).toLocaleString()}` : 'Free'}</span>
                      </p>
                    </div>
                    
                    <button onClick={() => handleDeleteVideo(v.id)} className="text-[#555] hover:text-[#ff5f5f] hover:bg-[#ff3b3b]/10 p-2.5 rounded-xl transition-all duration-200 cursor-pointer shrink-0">
                      <Trash2 size={15} />
                    </button>
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
