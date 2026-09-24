'use client';

import React, { useState, useEffect } from 'react';

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
      
      // LENIENT LENGTH CONTROLLER: Grants access seamlessly as long as exactly 9 digits are supplied!
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
    <div className={`min-h-screen bg-[#0f0f0f] text-[#f1f1f1] font-sans antialiased ${isSiteLocked ? 'overflow-hidden max-h-screen' : ''}`}>
      
      {/* HEADER TOP NAV */}
      <nav className="sticky top-0 z-40 flex items-center justify-between gap-4 border-b border-[#303030] bg-[#0f0f0f]/95 backdrop-blur px-4 py-2.5">
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="relative h-[21px] w-[30px] rounded-md bg-[#ff3b3b] after:absolute after:left-[11px] after:top-[5px] after:border-y-[5.5px] after:border-l-[9px] after:border-y-transparent after:border-l-white" />
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-[#b3b3b3] bg-clip-text text-transparent">PlayHub</span>
        </div>
        
        <div className="flex-1 max-w-[600px] flex justify-center">
          <div className="flex w-full">
            <input 
              type="text" 
              placeholder="Search movies, channels, studio releases..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-l-full border border-[#303030] bg-[#181818] px-4 py-2 text-sm text-white outline-none focus:border-[#ff3b3b] transition focus:bg-[#121212]"
            />
            <button className="flex w-11 items-center justify-center rounded-r-full border border-l-0 border-[#303030] bg-[#212121] text-[#aaaaaa] hover:bg-[#303030]">
              🔍
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button onClick={fetchCloudVideos} className="flex h-[34px] w-[34px] items-center justify-center rounded-full text-base hover:bg-[#212121] cursor-pointer">🔁</button>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#7c5cff] to-[#ff5fa2] text-xs font-semibold select-none">JD</div>
        </div>
      </nav>

      <div className="flex">
        {/* COMPACT SIDEBAR PANELS LAYER */}
        <aside className="sticky top-[57px] hidden md:flex h-[calc(100vh-57px)] w-[240px] shrink-0 flex-col justify-between border-r border-[#303030] bg-[#0f0f0f] p-3">
          <div className="space-y-1">
            <button onClick={() => setActiveChip('All')} className={`flex w-full items-center gap-4 rounded-xl px-4 py-2.5 text-sm font-medium transition cursor-pointer ${activeChip === 'All' ? 'bg-[#212121] text-white font-semibold' : 'text-[#f1f1f1] hover:bg-[#212121]'}`}>
              🏠 Home Feed
            </button>
            <button onClick={() => setActiveChip('Premium')} className={`flex w-full items-center gap-4 rounded-xl px-4 py-2.5 text-sm font-medium transition cursor-pointer ${activeChip === 'Premium' ? 'bg-[#212121] text-white font-semibold' : 'text-[#f1f1f1] hover:bg-[#212121]'}`}>
              💎 Premium Dubbed
            </button>
            <button onClick={() => setActiveChip('Free')} className={`flex w-full items-center gap-4 rounded-xl px-4 py-2.5 text-sm font-medium transition cursor-pointer ${activeChip === 'Free' ? 'bg-[#212121] text-white font-semibold' : 'text-[#f1f1f1] hover:bg-[#212121]'}`}>
              🎟 Free Streams
            </button>
            <hr className="border-[#303030] my-3" />
            <p className="text-[11px] font-semibold text-[#aaaaaa] uppercase tracking-wider px-4 mb-2">My Subscriptions</p>
            <div className="flex items-center gap-3 px-4 py-1.5 hover:bg-[#212121] rounded-xl cursor-pointer"><div className="h-6 w-6 rounded-full bg-gradient-to-tr from-[#7c5cff] to-[#ff5fa2]" /><span className="text-xs text-white truncate">Swahili Media Studio</span></div>
            <div className="flex items-center gap-3 px-4 py-1.5 hover:bg-[#212121] rounded-xl cursor-pointer"><div className="h-6 w-6 rounded-full bg-gradient-to-tr from-[#ffb56a] to-[#ff3b3b]" /><span className="text-xs text-white truncate">Bongo Movies HD</span></div>
          </div>
          <div className="p-2 border-t border-[#303030]">
            <a href="/admin" className="block text-center bg-[#212121] border border-[#303030] hover:border-[#ff3b3b] text-white text-xs font-semibold py-2 rounded-lg no-underline transition">⚙️ Control Panel</a>
          </div>
        </aside>

        {/* MAIN BODY FEED MATRIX OVERLAY */}
        <main className="flex-1 min-w-0 px-4 py-5 overflow-y-auto h-[calc(100vh-57px)]">
          <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar tracking-wide shrink-0">
            {['All', 'Action', 'Drama', 'Series', 'Dubbed', 'Premium', 'Free'].map((chip) => (
              <button
                key={chip}
                onClick={() => setActiveChip(chip)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${activeChip === chip ? 'bg-white text-black' : 'bg-[#212121] text-white border border-[#303030] hover:bg-[#303030]'}`}
              >
                {chip}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-2">
              <div className="w-7 h-7 border-2 border-[#ff3b3b] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-[#aaaaaa]">Synchronizing premium feeds...</p>
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="border border-[#303030] bg-[#181818] rounded-xl p-12 text-center max-w-sm mx-auto mt-12 shadow-xl">
              <span className="text-3xl block mb-2">🎬</span>
              <h4 className="text-sm font-bold text-white">No active broadcasts</h4>
              <p className="text-xs text-[#aaaaaa] mt-1">No channels or links published match the active matrix selection.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8 mt-2">
              {filteredVideos.map((v, idx) => {
                const cleanPrice = parseInt(v.price) || 0;
                const isPremiumItem = cleanPrice > 0;
                const uniqueKey = v.id || `video-feed-${idx}`;
                return (
                  <div
                    key={uniqueKey}
                    onClick={() => handleVerifyVideoAccess(v)}
                    className="group flex flex-col bg-[#121212] border border-[#242424] hover:border-[#383838] rounded-xl overflow-hidden cursor-pointer transition shadow-lg duration-200"
                  >
                    {/* FIXED: Uses HTML img block to bypass CSS base64 string limitation blockers */}
                    <div className="relative aspect-video w-full bg-[#1c1c1c] overflow-hidden border-b border-[#242424]">
                      <img
                        src={v.thumb && !v.thumb.startsWith('linear') ? v.thumb : "data:image/svg+xml;utf8,<svg xmlns='http://w3.org' width='100' height='100' viewBox='0 0 100 100'><rect width='100%' height='100%' fill='%231a1a1a'/></svg>"}
                        alt={v.title || "Cover Artwork"}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        style={{
                          background: v.thumb && v.thumb.startsWith('linear') ? v.thumb : undefined
                        }}
                        onError={(e) => {
                          e.target.src = "data:image/svg+xml;utf8,<svg xmlns='http://w3.org' width='100' height='100' viewBox='0 0 100 100'><rect width='100%' height='100%' fill='%23222'/></svg>";
                        }}
                      />
                      {isPremiumItem && (
                        <div className="absolute top-2 left-2 bg-[#ff3b3b] text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shadow">PPV</div>
                      )}
                      <span className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-medium tracking-wide text-white">
                        {v.length || 'Premium'}
                      </span>
                    </div>

                    <div className="p-3 flex flex-col flex-1 justify-between gap-2.5">
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-white leading-snug truncate group-hover:text-[#ff5f5f] transition">
                          {v.title}
                        </h4>
                        <p className="text-xs text-[#aaaaaa] mt-0.5 truncate font-medium">{v.channel}</p>
                      </div>
                      <div className="flex items-center justify-between border-t border-[#242424] pt-2 mt-0.5">
                        <span className="text-xs font-bold text-[#ff3b3b]">
                          {isPremiumItem ? `TSh ${cleanPrice.toLocaleString()}` : 'FREE STREAM'}
                        </span>
                        <span className="text-[11px] text-[#888] font-medium">{getTimeAgo(v.uploadedAt)}</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-md">
          <div className="w-full max-w-[400px] bg-[#181818] border border-[#303030] rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-2">
              <div className="relative h-[18px] w-[26px] rounded bg-[#ff3b3b] shrink-0 after:absolute after:left-[9.5px] after:top-[4px] after:border-y-[5px] after:border-l-[8px] after:border-y-transparent after:border-l-white" />
              <span className="font-bold text-base text-white">PlayHub Premium Access Gate</span>
            </div>
            
            <div className="bg-[#212121] border border-[#303030] rounded-xl p-3 text-center">
              <p className="text-xs text-[#aaaaaa]">Main Platform Handshake Passcode Fee</p>
              <h2 className="text-2xl font-extrabold text-white mt-1">TSh 20,000 <span className="text-xs font-medium text-[#aaaaaa]">/ full pass</span></h2>
            </div>

            <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#121212] border border-[#242424] rounded-xl">
              <button onClick={(e) => handleMethodTabSwitch(e, 'momo')} className={`py-2 text-xs font-bold rounded-lg transition cursor-pointer ${paymentMethod === 'momo' ? 'bg-[#ff3b3b] text-white' : 'text-[#aaaaaa] hover:text-white'}`}>Mobile Money</button>
              <button onClick={(e) => handleMethodTabSwitch(e, 'card')} className={`py-2 text-xs font-bold rounded-lg transition cursor-pointer ${paymentMethod === 'card' ? 'bg-[#ff3b3b] text-white' : 'text-[#aaaaaa] hover:text-white'}`}>Credit Card</button>
            </div>

            <form onSubmit={handleSiteGateSubmit} className="space-y-3.5">
              {paymentMethod === 'momo' ? (
                <div className="space-y-2">
                  <label className="text-[11px] text-[#aaaaaa] font-medium uppercase tracking-wider">Select Mobile Network Provider</label>
                  <div className="grid grid-cols-4 gap-1">
                    {['mpesa', 'tigopesa', 'airtel', 'halopesa'].map((op) => (
                      <button key={op} type="button" onClick={(e) => handleOperatorSwitch(e, op)} className={`py-2 text-[10px] font-bold rounded-lg border uppercase tracking-wider transition cursor-pointer ${selectedOp === op ? 'border-[#ff3b3b] bg-[#ff3b3b]/10 text-white' : 'border-[#303030] bg-[#212121] text-[#aaaaaa] hover:text-white'}`}>{op.replace('pesa', '')}</button>
                    ))}
                  </div>
                  <div>
                    <label className="block text-xs text-[#aaaaaa] mb-1.5 font-medium">Tanzanian Mobile Number</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-sm font-semibold text-[#aaaaaa]">+255</span>
                      <input type="tel" placeholder="740 462 193" value={momoPhone} onChange={handlePhoneInput} className="w-full bg-[#212121] border border-[#303030] rounded-xl py-2.5 pl-14 pr-3 text-sm text-white font-semibold outline-none focus:border-[#ff3b3b]" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div><label className="block text-xs text-[#aaaaaa] mb-1 font-medium">Cardholder Name</label><input type="text" placeholder="John Doe" value={cardName} onChange={(e) => setCardName(e.target.value)} className="w-full bg-[#212121] border border-[#303030] rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#ff3b3b]" /></div>
                  <div><label className="block text-xs text-[#aaaaaa] mb-1 font-medium">Card Number</label><input type="text" placeholder="4000 1234 5678 9010" value={cardNum} onChange={handleCardNumInput} className="w-full bg-[#212121] border border-[#303030] rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#ff3b3b]" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="block text-xs text-[#aaaaaa] mb-1 font-medium">Expiry Date</label><input type="text" placeholder="MM/YY" value={cardExp} onChange={handleCardExpInput} className="w-full bg-[#212121] border border-[#303030] rounded-xl px-3 py-2 text-sm text-white text-center outline-none focus:border-[#ff3b3b]" /></div>
                    <div><label className="block text-xs text-[#aaaaaa] mb-1 font-medium">CVC</label><input type="password" placeholder="123" value={cardCvc} onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))} className="w-full bg-[#212121] border border-[#303030] rounded-xl px-3 py-2 text-sm text-white text-center outline-none focus:border-[#ff3b3b]" /></div>
                  </div>
                </div>
              )}

              {payError && <p className="text-[#ff5f5f] text-xs font-semibold text-center bg-[#ff5f5f]/10 p-2 rounded-xl border border-[#ff5f5f]/20">{payError}</p>}
              
              <button type="submit" onClick={handleVsCodeForceClick} className="w-full bg-[#ff3b3b] text-white font-bold py-3 rounded-xl text-sm transition hover:bg-[#ff5f5f] shadow-lg cursor-pointer">
                {payStatusText}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MEDIA IFRAME LIGHTBOX CONTROL ENGINE */}
      {activeVideo && !isSiteLocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl bg-[#181818] border border-[#303030] rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 bg-[#212121] border-b border-[#303030]">
              <div className="min-w-0 pr-4">
                <h3 className="text-sm font-bold text-white truncate">{activeVideo.title}</h3>
                <p className="text-xs text-[#aaaaaa] mt-0.5 truncate">{activeVideo.channel}</p>
              </div>
              <button onClick={() => setActiveVideo(null)} className="text-xs text-[#aaaaaa] hover:text-white bg-[#303030] h-7 w-7 rounded-full flex items-center justify-center cursor-pointer transition">✕</button>
            </div>

            <div className="relative aspect-video w-full bg-black flex items-center justify-center">
              {isPpvLocked ? (
                <div className="text-center p-6 space-y-4 max-w-sm z-20">
                  <span className="text-4xl block">🪙</span>
                  <h3 className="text-lg font-bold text-white">Premium Content Locked</h3>
                  <p className="text-xs text-[#aaaaaa]">This premium video requires a separate one-time Pay-Per-View checkout unlock fee of <span className="text-white font-bold">TSh {parseInt(activeVideo.price).toLocaleString()}</span>.</p>
                  <button onClick={() => handleProcessLocalPPV(activeVideo.id)} className="w-full bg-[#ff3b3b] text-white text-xs font-bold py-2.5 rounded-xl transition hover:bg-[#ff5f5f] shadow-lg cursor-pointer">Unlock Video Asset Instantly</button>
                </div>
              ) : activeVideo.desc && activeVideo.desc.includes('<iframe') ? (
                <div 
                  className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full border-0"
                  dangerouslySetInnerHTML={{ __html: activeVideo.desc }}
                />
              ) : (
                <video src={activeVideo.desc || "https://w3schools.com"} controls playsInline className="w-full h-full object-contain" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
