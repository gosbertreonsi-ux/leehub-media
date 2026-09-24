'use client';

import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Search, 
  Tv, 
  Sparkles, 
  Compass, 
  Film, 
  Grid, 
  Lock,
  Unlock, 
  Smartphone, 
  CreditCard, 
  AlertCircle, 
  RefreshCw,
  Clock,
  CheckCircle2,
  X,
  SlidersHorizontal,
  Sliders,
  DollarSign
} from 'lucide-react';

export default function PlayHubHome() {
  // Navigation & Core Content States
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSiteLocked, setIsSiteLocked] = useState(true);
  const [activeChip, setActiveChip] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Paywall Engine States
  const [paymentMethod, setPaymentMethod] = useState('momo'); 
  const [selectedOp, setSelectedOp] = useState('mpesa');
  const [momoPhone, setMomoPhone] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardNum, setCardNum] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [payError, setPayError] = useState('');
  const [payStatusText, setPayStatusText] = useState('Pay with M-Pesa');

  // Video Lightbox Context States
  const [activeVideo, setActiveVideo] = useState(null);
  const [isPpvLocked, setIsPpvLocked] = useState(false);

  const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5000/api';
  const operatorNames = { mpesa: 'M-Pesa', tigopesa: 'Tigo Pesa', airtel: 'Airtel Money', halopesa: 'HaloPesa' };

  // DUAL LOOKUP FETCH ROUTINE: Combines remote database with local storage streams flawlessly
  const fetchCloudVideos = async () => {
    let dbVideos = [];
    let localVideos = [];

    // Step A: Pull from remote database API
    try {
      const res = await fetch(`${BACKEND_API_URL}/videos`);
      if (res.ok) {
        dbVideos = await res.json();
      }
    } catch (err) {
      console.warn('Backend link offline, falling back to cache repositories.');
    }

    // Step B: Pull from administrative dual-sync local mirrors
    try {
      const rawAdmin = window.localStorage.getItem('playhub_admin_videos');
      const rawHome = window.localStorage.getItem('playhub_home_feed_videos');
      const chosenRaw = rawHome || rawAdmin;
      if (chosenRaw) {
        localVideos = JSON.parse(chosenRaw);
      }
    } catch (e) {
      console.error('Local feed stream reading block:', e);
    }

    // Step C: Merge matrices and wipe duplicating index IDs
    const compositeMap = new Map();
    [...localVideos, ...dbVideos].forEach(item => {
      if (item && item.id) compositeMap.set(item.id, item);
    });

    const finalSynchronizedFeed = Array.from(compositeMap.values()).sort((a, b) => 
      new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0)
    );

    setVideos(finalSynchronizedFeed);
    setLoading(false);
  };

  useEffect(() => {
    const entranceToken = window.localStorage.getItem('playhub_paid');
    if (entranceToken === '1') {
      setIsSiteLocked(false);
    }
    fetchCloudVideos();
  }, [BACKEND_API_URL]);

  useEffect(() => {
    if (paymentMethod === 'momo') {
      setPayStatusText(`Pay with ${operatorNames[selectedOp]}`);
    } else {
      setPayStatusText('Pay TSh 20,000 with card');
    }
    setPayError('');
  }, [paymentMethod, selectedOp]);

  const handleOperatorSwitch = (e, networkKey) => {
    e.preventDefault(); e.stopPropagation();
    setSelectedOp(networkKey);
  };

  const handleMethodTabSwitch = (e, methodKey) => {
    e.preventDefault(); e.stopPropagation();
    setPaymentMethod(methodKey);
    setPayError('');
  };

  const handlePhoneInput = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 9);
    setMomoPhone(val);
  };

  const handleCardNumInput = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 19);
    const spaced = v.replace(/(\d{4})(?=\d)/g, '\$1 ');
    setCardNum(spaced);
  };

  const handleCardExpInput = (e) => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
    setCardExp(v);
  };

    const handleVerifyVideoAccess = (video) => {
    if (isSiteLocked) return; 
    const ppvStorageKey = `playhub_ppv_paid_${video.id}`;
    const isVideoPurchased = window.localStorage.getItem(ppvStorageKey) === '1';
    const cleanPrice = parseInt(video.price);
    const isFree = isNaN(cleanPrice) || cleanPrice <= 0;

    setActiveVideo(video);
    if (!isFree && !isVideoPurchased) {
      setIsPpvLocked(true);
    } else {
      setIsPpvLocked(false);
    }
  };

  const handleSiteGateSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setPayError('');

    if (paymentMethod === 'momo') {
      const cleanPhone = momoPhone.replace(/\D/g, '');
      if (cleanPhone.length !== 9) {
        setPayError('Enter a valid 9-digit Tanzanian mobile number (e.g., 740 462 193).');
        return;
      }
    } else {
      const cleanCardNum = cardNum.replace(/\s+/g, '');
      const cleanCardExp = cardExp.trim();
      const cleanCardCvc = cardCvc.replace(/\D/g, '');

      if (cardName.trim().length < 2) { setPayError('Enter the name on the card.'); return; }
      if (cleanCardNum.length < 13 || cleanCardNum.length > 19) { setPayError('Enter a valid card number.'); return; }
      if (!/^\d{2}\/\d{2}\$/.test(cleanCardExp)) { setPayError('Expiry must be in MM/YY format (e.g., 08/27).'); return; }
      if (cleanCardCvc.length < 3) { setPayError('Enter a valid CVC.'); return; }
    }

    setPayStatusText('Processing Sandbox Verification…');

    setTimeout(() => {
      window.localStorage.setItem('playhub_paid', '1');
      setIsSiteLocked(false);
    }, 1200);
  };

  const handleVsCodeForceClick = (e) => {
    e.preventDefault(); e.stopPropagation();
    handleSiteGateSubmit(null); 
  };

  const handleProcessLocalPPV = async (videoId) => {
    const ppvStorageKey = `playhub_ppv_paid_${videoId}`;
    try {
      window.localStorage.setItem(ppvStorageKey, '1');
      alert('🎉 Payment Success! Video asset has been unlocked permanently.');
      setIsPpvLocked(false);
      await fetchCloudVideos(); 
    } catch (err) {
      alert('Storage cache writing failure.');
    }
  };

  const getTimeAgo = (isoString) => {
    if (!isoString) return 'just now';
    const mins = Math.round((Date.now() - new Date(isoString).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins === 1) return '1m ago';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.round(hrs / 24)}d ago`;
  };

  const filteredVideos = videos.filter((v) => {
    const textQuery = searchQuery.toLowerCase();
    const chipQuery = activeChip.toLowerCase();
    
    const matchesSearch = !searchQuery || (
      v.title?.toLowerCase().includes(textQuery) ||
      v.channel?.toLowerCase().includes(textQuery)
    );

    let matchesChip = true;
    if (activeChip === 'Premium') {
      matchesChip = parseInt(v.price) > 0;
    } else if (activeChip === 'Free') {
      matchesChip = parseInt(v.price) <= 0 || !v.price;
    } else if (activeChip !== 'All') {
      matchesChip = (
        v.title?.toLowerCase().includes(chipQuery) ||
        v.channel?.toLowerCase().includes(chipQuery)
      );
    }

    return matchesSearch && matchesChip;
  });

    return (
    <div className={`min-h-screen bg-[#09090b] text-[#f8fafc] font-sans antialiased selection:bg-[#ef4444]/30 ${isSiteLocked ? 'overflow-hidden max-h-screen' : ''}`}>
      
      {/* CINEMATIC NAVIGATION HEADER */}
      <nav className="sticky top-0 z-40 flex items-center justify-between gap-4 border-b border-[#27272a] bg-[#09090b]/90 backdrop-blur-md px-6 py-3">
        <div className="flex items-center gap-2.5 shrink-0 select-none">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#ef4444] to-[#b91c1c] text-white shadow-lg shadow-red-900/20">
            <Tv className="h-5 w-5" />
          </div>
          <span className="text-xl font-black tracking-wider bg-gradient-to-r from-white via-[#e4e4e7] to-[#a1a1aa] bg-clip-text text-transparent">PLAYHUB</span>
        </div>
        
        <div className="flex-1 max-w-[550px] relative">
          <div className="absolute left-4 top-2.5 text-[#71717a]">
            <Search className="h-4 w-4" />
          </div>
          <input 
            type="text" 
            placeholder="Search premium titles, channels, Swahili translations..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-full border border-[#27272a] bg-[#141416] px-5 py-2 pl-11 text-sm text-[#f8fafc] placeholder-[#52525b] outline-none focus:border-[#ef4444] focus:ring-1 focus:ring-[#ef4444]/20 transition-all focus:bg-[#09090b]"
          />
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button onClick={fetchCloudVideos} className="flex h-9 w-9 items-center justify-center rounded-full border border-[#27272a] bg-[#141416] text-[#e4e4e7] hover:bg-[#27272a] hover:text-white transition active:scale-95 cursor-pointer">
            <RefreshCw className="h-4 w-4" />
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#6366f1] to-[#a855f7] text-xs font-bold shadow-md shadow-indigo-900/20 select-none">
            JD
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* DESIGNER SIDEBAR NAVIGATION */}
        <aside className="sticky top-[61px] hidden md:flex h-[calc(100vh-61px)] w-[260px] shrink-0 flex-col justify-between border-r border-[#27272a] bg-[#09090b] p-4">
          <div className="space-y-6">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-[#71717a] uppercase tracking-widest px-3 mb-2">Discover</p>
              <button onClick={() => setActiveChip('All')} className={`flex w-full items-center gap-3.5 rounded-xl px-4 py-2.5 text-sm font-medium transition duration-200 cursor-pointer ${activeChip === 'All' ? 'bg-[#1c1c1e] text-white shadow-inner border border-[#27272a]' : 'text-[#a1a1aa] hover:bg-[#141416] hover:text-white'}`}>
                <Compass className="h-4 w-4" /> Home Feed
              </button>
              <button onClick={() => setActiveChip('Premium')} className={`flex w-full items-center gap-3.5 rounded-xl px-4 py-2.5 text-sm font-medium transition duration-200 cursor-pointer ${activeChip === 'Premium' ? 'bg-[#1c1c1e] text-white shadow-inner border border-[#27272a]' : 'text-[#a1a1aa] hover:bg-[#141416] hover:text-white'}`}>
                <Sparkles className="h-4 w-4 text-amber-400" /> Premium Dubbed
              </button>
              <button onClick={() => setActiveChip('Free')} className={`flex w-full items-center gap-3.5 rounded-xl px-4 py-2.5 text-sm font-medium transition duration-200 cursor-pointer ${activeChip === 'Free' ? 'bg-[#1c1c1e] text-white shadow-inner border border-[#27272a]' : 'text-[#a1a1aa] hover:bg-[#141416] hover:text-white'}`}>
                <Film className="h-4 w-4" /> Free Streams
              </button>
            </div>
            
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-[#71717a] uppercase tracking-widest px-3 mb-2">My Subscriptions</p>
              <div className="flex items-center gap-3 px-4 py-2 hover:bg-[#141416] rounded-xl transition duration-150 cursor-pointer group">
                <div className="h-6 w-6 rounded-lg bg-gradient-to-tr from-[#6366f1] to-[#a855f7] shrink-0" />
                <span className="text-xs text-[#e4e4e7] group-hover:text-white font-medium truncate">Swahili Media Studio</span>
              </div>
              <div className="flex items-center gap-3 px-4 py-2 hover:bg-[#141416] rounded-xl transition duration-150 cursor-pointer group">
                <div className="h-6 w-6 rounded-lg bg-gradient-to-tr from-[#f59e0b] to-[#ef4444] shrink-0" />
                <span className="text-xs text-[#e4e4e7] group-hover:text-white font-medium truncate">Bongo Movies HD</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#27272a]">
            <a href="/admin" className="flex items-center justify-center gap-2 w-full bg-[#141416] hover:bg-[#1c1c1e] border border-[#27272a] hover:border-[#ef4444] text-[#e4e4e7] hover:text-white text-xs font-semibold py-2.5 rounded-xl no-underline transition-all duration-200 shadow-md">
              <Sliders className="h-3.5 w-3.5" /> Control Panel
            </a>
          </div>
        </aside>

        {/* MAIN BODY FEED MATRIX OVERLAY */}
        <main className="flex-1 min-w-0 px-6 py-6 overflow-y-auto h-[calc(100vh-57px)]">
          
          {/* HORIZONTAL CATEGORIZATION QUICK CHIPS ROW */}
          <div className="flex gap-2.5 overflow-x-auto pb-5 no-scrollbar tracking-wide shrink-0">
            {['All', 'Action', 'Drama', 'Series', 'Dubbed', 'Premium', 'Free'].map((chip) => (
              <button
                key={chip}
                onClick={() => setActiveChip(chip)}
                className={`shrink-0 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer ${activeChip === chip ? 'bg-gradient-to-r from-[#ff3b3b] to-[#ff5f5f] text-white shadow-lg shadow-[#ff3b3b]/20 scale-[1.02]' : 'bg-[#181818] text-[#aaaaaa] border border-[#262626] hover:text-white hover:bg-[#212121]'}`}
              >
                {chip}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-3">
              <div className="w-8 h-8 border-2 border-[#ff3b3b] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-[#aaaaaa] tracking-wider animate-pulse">Synchronizing premium feed matrix...</p>
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="border border-[#262626] bg-[#121212] rounded-2xl p-16 text-center max-w-sm mx-auto mt-16 shadow-2xl animate-fadeIn">
              <div className="h-14 w-12 mx-auto mb-4 bg-[#ff3b3b]/10 border border-[#ff3b3b]/20 rounded-2xl flex items-center justify-center text-[#ff3b3b]">
                <Film size={24} />
              </div>
              <h4 className="text-sm font-bold text-white tracking-tight">No active broadcasts found</h4>
              <p className="text-xs text-[#aaaaaa] mt-1.5 leading-relaxed">No premium channels or streaming links match the active layout selections.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-8 mt-2">
              {filteredVideos.map((v, idx) => {
                const cleanPrice = parseInt(v.price) || 0;
                const isPremiumItem = cleanPrice > 0;
                const uniqueKey = v.id || `video-feed-${idx}`;
                return (
                  <div
                    key={uniqueKey}
                    onClick={() => handleVerifyVideoAccess(v)}
                    className="group flex flex-col bg-[#141414] border border-[#222222] hover:border-[#333333] rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 shadow-xl hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/40"
                  >
                    {/* HTML IMG CONTAINER ENGINE */}
                    <div className="relative aspect-video w-full bg-[#1a1a1a] overflow-hidden border-b border-[#222222]">
                      <img
                        src={v.thumb && !v.thumb.startsWith('linear') ? v.thumb : "data:image/svg+xml;utf8,<svg xmlns='http://w3.org' width='100' height='100' viewBox='0 0 100 100'><rect width='100%' height='100%' fill='%231a1a1a'/></svg>"}
                        alt={v.title || "Cover Artwork"}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        style={{
                          background: v.thumb && v.thumb.startsWith('linear') ? v.thumb : undefined
                        }}
                        onError={(e) => {
                          e.target.src = "data:image/svg+xml;utf8,<svg xmlns='http://w3.org' width='100' height='100' viewBox='0 0 100 100'><rect width='100%' height='100%' fill='%23222'/></svg>";
                        }}
                      />
                      {isPremiumItem && (
                        <div className="absolute top-3 left-3 bg-[#ff3b3b] text-white px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-widest shadow-md flex items-center gap-1">
                          <Lock size={10} /> PPV
                        </div>
                      )}
                      <span className="absolute bottom-3 right-3 bg-black/80 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide text-white border border-white/5 backdrop-blur-sm">
                        {v.length || 'Premium'}
                      </span>
                    </div>

                    <div className="p-4 flex flex-col flex-1 justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-white tracking-tight leading-snug truncate group-hover:text-[#ff3b3b] transition-colors duration-200">
                          {v.title}
                        </h4>
                        <p className="text-xs text-[#aaaaaa] mt-1 font-medium flex items-center gap-1.5 truncate">
                          <Tv size={12} className="text-[#666]" /> {v.channel}
                        </p>
                      </div>
                      <div className="flex items-center justify-between border-t border-[#222222] pt-3 mt-1">
                        <span className="text-xs font-extrabold tracking-wide text-[#ff3b3b] flex items-center gap-0.5">
                          {!isPremiumItem && <Compass size={12} className="text-[#ff3b3b]" />}
                          {isPremiumItem ? `TSh ${cleanPrice.toLocaleString()}` : 'FREE ACCESS'}
                        </span>
                        <span className="text-[10px] text-[#777] font-semibold flex items-center gap-1">
                          <Clock size={10} /> {getTimeAgo(v.uploadedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
      {/* GATEWAY ENTRY PAYWALL */}
      {isSiteLocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-hidden animate-fadeIn">
          
          {/* 🖼️ DIRECT LOCAL FOLDER HIGH-END CINEMATIC GRAPHIC IMAGE BACKGROUND */}
          <div className="absolute inset-0 w-full h-full z-0 overflow-hidden pointer-events-none select-none">
            {/* Multi-layered dark vignette shading to keep text contrast super high */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#070908] via-black/50 to-[#070908] z-0" />
            <div className="absolute inset-0 bg-black/40 z-10 backdrop-blur-[2px]" />
            <img
              src="/11.jpg"
              alt="Cinematic Backdrop"
              className="w-full h-full object-cover scale-[1.02] object-center transition-transform duration-700"
              onError={(e) => {
                // Fail-safe dynamic cloud abstract backup image if your local asset isn't in your public/ folder yet
                e.target.src = "https://unsplash.com";
              }}
            />
          </div>

          {/* GLASSMORPHIC PORTAL CONTROL WORKSPACE PLATFORM */}
          <div className="w-full max-w-[400px] bg-[#141414]/75 border border-white/10 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl shadow-black/90 space-y-5 z-20 animate-scaleUp border-t-white/15">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-[#ff3b3b]/10 border border-[#ff3b3b]/20 flex items-center justify-center text-[#ff3b3b]">
                  <Lock size={16} />
                </div>
                <span className="font-bold text-sm tracking-tight text-white">Premium Access Gate</span>
              </div>
            </div>
            
            <div className="bg-black/40 border border-white/5 rounded-2xl p-4 text-center relative overflow-hidden backdrop-blur-sm">
              <p className="text-[11px] font-bold text-[#aaa] uppercase tracking-widest">Handshake Passcode Fee</p>
              <h2 className="text-3xl font-black text-white mt-1 flex items-center justify-center gap-1">
                TSh 20,000 <span className="text-xs font-semibold text-[#888] uppercase tracking-normal">/ Full pass</span>
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/50 border border-white/5 rounded-xl backdrop-blur-sm">
              <button onClick={(e) => handleMethodTabSwitch(e, 'momo')} className={`py-2.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${paymentMethod === 'momo' ? 'bg-[#ff3b3b] text-white shadow-md' : 'text-[#aaa] hover:text-white'}`}>Mobile Money</button>
              <button onClick={(e) => handleMethodTabSwitch(e, 'card')} className={`py-2.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${paymentMethod === 'card' ? 'bg-[#ff3b3b] text-white shadow-md' : 'text-[#aaa] hover:text-white'}`}>Credit Card</button>
            </div>

            <form onSubmit={handleSiteGateSubmit} className="space-y-4">
              {paymentMethod === 'momo' ? (
                <div className="space-y-3">
                  <label className="text-[10px] text-[#aaa] font-bold uppercase tracking-widest block">Select Mobile Operator</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {['mpesa', 'tigopesa', 'airtel', 'halopesa'].map((op) => (
                      <button key={op} type="button" onClick={(e) => handleOperatorSwitch(e, op)} className={`py-2 text-[10px] font-extrabold rounded-lg border uppercase tracking-wider transition-all duration-200 cursor-pointer ${selectedOp === op ? 'border-[#ff3b3b] bg-[#ff3b3b]/10 text-white' : 'border-white/5 bg-black/20 text-[#aaa] hover:text-white'}`}>{op.replace('pesa', '')}</button>
                    ))}
                  </div>
                  <div>
                    <label className="block text-xs text-[#aaa] mb-1.5 font-bold tracking-tight">Tanzanian Mobile Number</label>
                    <div className="relative">
                      <span className="absolute left-4 top-3 text-xs font-bold text-[#666]">+255</span>
                      <input type="tel" placeholder="740 462 193" value={momoPhone} onChange={handlePhoneInput} className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-14 pr-4 text-xs text-white font-semibold outline-none focus:border-[#ff3b3b] focus:bg-black/60 transition-all" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 animate-fadeIn">
                  <div><label className="block text-xs text-[#aaa] mb-1.5 font-bold tracking-tight">Cardholder Name</label><input type="text" placeholder="John Doe" value={cardName} onChange={(e) => setCardName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#ff3b3b] focus:bg-black/60 transition-all" /></div>
                  <div><label className="block text-xs text-[#aaa] mb-1.5 font-bold tracking-tight">Card Number</label><input type="text" placeholder="4000 1234 5678 9010" value={cardNum} onChange={handleCardNumInput} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#ff3b3b] focus:bg-black/60 transition-all" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs text-[#aaa] mb-1.5 font-bold tracking-tight">Expiry Date</label><input type="text" placeholder="MM/YY" value={cardExp} onChange={handleCardExpInput} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white text-center outline-none focus:border-[#ff3b3b] focus:bg-black/60 transition-all" /></div>
                    <div><label className="block text-xs text-[#aaa] mb-1.5 font-bold tracking-tight">CVC</label><input type="password" placeholder="123" value={cardCvc} onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white text-center outline-none focus:border-[#ff3b3b] focus:bg-black/60 transition-all" /></div>
                  </div>
                </div>
              )}

              {payError && <p className="text-[#ff5f5f] text-xs font-bold text-center bg-[#ff5f5f]/10 p-2.5 rounded-xl border border-[#ff5f5f]/20 tracking-tight animate-shake">{payError}</p>}
              
              <button type="submit" onClick={handleVsCodeForceClick} className="w-full bg-gradient-to-r from-[#ff3b3b] to-[#ff5f5f] text-white font-extrabold py-3.5 rounded-xl text-xs tracking-wider uppercase transition-all duration-300 shadow-lg shadow-[#ff3b3b]/10 hover:shadow-[#ff3b3b]/20 cursor-pointer transform active:scale-[0.99]">
                {payStatusText}
              </button>
            </form>
          </div>
        </div>
      )}


      {/* THE EMBEDDED MEDIA IFRAME LIGHTBOX CONTROL ENGINE */}
      {activeVideo && !isSiteLocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-4xl bg-[#141414] border border-[#2a2a2a] rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 bg-[#1c1c1c] border-b border-[#2a2a2a]">
              <div className="min-w-0 pr-4">
                <h3 className="text-sm font-bold text-white truncate">{activeVideo.title}</h3>
                <p className="text-xs text-[#aaaaaa] mt-0.5 truncate">{activeVideo.channel}</p>
              </div>
              <button onClick={() => {
                const player = document.getElementById('main-lightbox-player');
                if (player) player.pause();
                setActiveVideo(null);
              }} className="text-[#888] hover:text-white bg-[#262626] hover:bg-[#333] h-8 w-8 rounded-full flex items-center justify-center cursor-pointer transition-colors duration-200">
                <X size={14} />
              </button>
            </div>

            <div className="relative aspect-video w-full bg-black flex items-center justify-center">
              {isPpvLocked ? (
                <div className="text-center p-6 space-y-4 max-w-sm z-20 animate-scaleUp">
                  <div className="h-14 w-12 mx-auto bg-[#ff3b3b]/10 border border-[#ff3b3b]/20 rounded-2xl flex items-center justify-center text-[#ff3b3b]">
                    <DollarSign size={24} />
                  </div>
                  <h3 className="text-base font-bold text-white tracking-tight">Premium Content Locked</h3>
                  <p className="text-xs text-[#aaaaaa] leading-relaxed">This premium video requires a separate one-time Pay-Per-View checkout unlock fee of <span className="text-white font-bold">TSh {parseInt(activeVideo.price).toLocaleString()}</span>.</p>
                  <button onClick={() => handleProcessLocalPPV(activeVideo.id)} className="w-full bg-[#ff3b3b] hover:bg-[#ff5f5f] text-white text-xs font-bold py-3 rounded-xl transition-all duration-200 shadow-lg cursor-pointer transform active:scale-[0.99]">
                    Unlock Video Asset Instantly
                  </button>
                </div>
              ) : activeVideo.desc && activeVideo.desc.includes('<iframe') ? (
                <div 
                  className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full border-0"
                  dangerouslySetInnerHTML={{ __html: activeVideo.desc }}
                />
              ) : (
                /* EXPLICIT HARDWARE OVERRIDE FOR MUTED VOLUME CONTROLS */
                <div className="w-full h-full relative group">
                  <video 
                    id="main-lightbox-player"
                    key={activeVideo.id}
                    src={activeVideo.desc ? `${activeVideo.desc}?t=${Date.now()}` : "https://w3schools.com"} 
                    controls 
                    playsInline
                    preload="auto"
                    crossOrigin="anonymous"
                    onPlay={(e) => {
                      e.target.muted = false;
                      if (e.target.volume === 0) e.target.volume = 1.0;
                    }}
                    onLoadedData={(e) => {
                      e.target.removeAttribute('muted');
                      e.target.muted = false;
                      e.target.volume = 1.0;
                    }}
                    className="w-full h-full object-contain" 
                  />
                  {/* SYSTEM AUDIO INITIALIZATION OVERLAY SCREEN */}
                  <div 
                    id="audio-unmute-gate"
                    onClick={(e) => {
                      const player = document.getElementById('main-lightbox-player');
                      if (player) {
                        player.removeAttribute('muted');
                        player.muted = false;
                        player.volume = 1.0;
                        player.play().catch(() => {});
                      }
                      e.currentTarget.style.display = 'none';
                    }}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 cursor-pointer z-30 transition-all duration-300 hover:bg-black/40"
                  >
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
