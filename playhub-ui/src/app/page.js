'use client';

import React, { useState, useEffect } from 'react';

export default function PlayHubHome() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSiteLocked, setIsSiteLocked] = useState(true);
  const [activeChip, setActiveChip] = useState('All');
  
  const [paymentMethod, setPaymentMethod] = useState('momo'); 
  const [selectedOp, setSelectedOp] = useState('mpesa');
  const [momoPhone, setMomoPhone] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardNum, setCardNum] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [payError, setPayError] = useState('');
  const [payStatusText, setPayStatusText] = useState('Pay with M-Pesa');

  const [activeVideo, setActiveVideo] = useState(null);
  const [isPpvLocked, setIsPpvLocked] = useState(false);

  const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5000/api';
  const operatorNames = { mpesa: 'M-Pesa', tigopesa: 'Tigo Pesa', airtel: 'Airtel Money', halopesa: 'HaloPesa' };
  const avGrads = [
    'linear-gradient(135deg,#7c5cff,#ff5fa2)', 'linear-gradient(135deg,#ffb56a,#ff3b3b)',
    'linear-gradient(135deg,#3ddc84,#1e9dd7)', 'linear-gradient(135deg,#ff5fa2,#ffd76a)'
  ];

  const fetchCloudVideos = async () => {
    try {
      const res = await fetch(`${BACKEND_API_URL}/videos`);
      if (res.ok) {
        const data = await res.json();
        setVideos(data);
      }
    } catch (err) {
      console.warn('Backend link offline, falling back to cache repositories.');
      const raw = window.localStorage.getItem('playhub_admin_videos');
      if (raw) setVideos(JSON.parse(raw));
    } finally {
      setLoading(false);
    }
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
    e.preventDefault();
    e.stopPropagation();
    setSelectedOp(networkKey);
  };

  const handleMethodTabSwitch = (e, methodKey) => {
    e.preventDefault();
    e.stopPropagation();
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
    if (v.length >= 3) {
      v = v.slice(0, 2) + '/' + v.slice(2);
    }
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

  // Handle simulated main entrance checkout loop
  const handleSiteGateSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setPayError('');

    if (paymentMethod === 'momo') {
      const cleanPhone = momoPhone.replace(/\D/g, '');
      // Keeps your exact 9-digit telecom validation rules completely untouched
      if (!/^\d{9}$/.test(cleanPhone)) {
        setPayError('Enter a valid 9-digit Tanzanian mobile number (e.g., 740 462 193).');
        return;
      }
    } else {
      const cleanCardNum = cardNum.replace(/\s+/g, '');
      const cleanCardExp = cardExp.trim();
      const cleanCardCvc = cardCvc.replace(/\D/g, '');

      if (cardName.trim().length < 2) { setPayError('Enter the name on the card.'); return; }
      if (cleanCardNum.length < 13 || cleanCardNum.length > 19) { setPayError('Enter a valid card number.'); return; }
      if (!/^\d{2}\/\d{2}$/.test(cleanCardExp)) { setPayError('Expiry must be in MM/YY format (e.g., 08/27).'); return; }
      if (cleanCardCvc.length < 3) { setPayError('Enter a valid CVC.'); return; }
    }

    setPayStatusText('Processing Sandbox Verification…');

    setTimeout(() => {
      window.localStorage.setItem('playhub_paid', '1');
      setIsSiteLocked(false);
      console.log("[REACT PAYWALL] Security Gate bypassed successfully via verified input metrics.");
    }, 1200);
  };

  // NEW DYNAMIC RUNTIME BYPASS FOR VS CODE EMBEDDED ENGINE
  const handleVsCodeForceClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Forces the validation function to run manually if the form action gets blocked
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
    if (activeChip === 'All') return true;
    const searchTag = activeChip.toLowerCase();
    return (
      v.title?.toLowerCase().includes(searchTag) ||
      v.channel?.toLowerCase().includes(searchTag)
    );
  });

  return (
    <div className={`min-h-screen bg-[#0f0f0f] text-[#f1f1f1] font-sans antialiased ${isSiteLocked ? 'overflow-hidden max-h-screen' : ''}`}>
      
      {/* HEADER TOP NAV */}
      <nav className="sticky top-0 z-40 flex items-center justify-between gap-4 border-b border-[#303030] bg-[#0f0f0f] px-4 py-2.5">
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="relative h-[21px] w-[30px] rounded-md bg-[#ff3b3b] after:absolute after:left-[11px] after:top-[5px] after:border-y-[5.5px] after:border-l-[9px] after:border-y-transparent after:border-l-white" />
          <span className="text-xl font-semibold tracking-tight">PlayHub</span>
        </div>
        
        <div className="flex-1 max-w-[600px] flex justify-center">
          <div className="flex w-full">
            <input 
              type="text" 
              placeholder="Search" 
              className="w-full rounded-l-full border border-[#303030] bg-[#181818] px-4 py-2 text-sm text-white outline-none focus:border-[#ff5f5f]"
            />
            <button className="flex w-11 items-center justify-center rounded-r-full border border-l-0 border-[#303030] bg-[#212121] text-[#aaaaaa] hover:bg-[#303030]">
              🔍
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button className="flex h-[34px] w-[34px] items-center justify-center rounded-full text-base hover:bg-[#212121]">🔁</button>
          <button className="flex h-[34px] w-[34px] items-center justify-center rounded-full text-base hover:bg-[#212121]">🔔</button>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#7c5cff] to-[#ff5fa2] text-xs font-semibold">JD</div>
        </div>
      </nav>

      <div className="flex">
        <aside className="sticky top-[57px] hidden h-[calc(100vh-57px)] w-[220px] shrink-0 overflow-y-auto border-r border-[#303030] p-3 md:block">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-5 rounded-xl bg-[#212121] px-3 py-2.5 text-sm font-semibold cursor-pointer"><span>⌂</span> Home</div>
            <div className="flex items-center gap-5 rounded-xl px-3 py-2.5 text-sm cursor-pointer hover:bg-[#212121]"><span>⚡</span> Shorts</div>
            <div className="flex items-center gap-5 rounded-xl px-3 py-2.5 text-sm cursor-pointer hover:bg-[#212121]"><span>📺</span> Subscriptions</div>
            <div className="h-px bg-[#303030] my-2.5 mx-1.5" />
            <div className="flex items-center gap-5 rounded-xl px-3 py-2.5 text-sm cursor-pointer hover:bg-[#212121]"><span>👤</span> You</div>
            <div className="flex items-center gap-5 rounded-xl px-3 py-2.5 text-sm cursor-pointer hover:bg-[#212121]"><span>🕑</span> History</div>
            <div className="h-px bg-[#303030] my-2.5 mx-1.5" />
            <div className="flex items-center gap-5 rounded-xl px-3 py-2.5 text-sm cursor-pointer hover:bg-[#212121]"><span>🎵</span> Music</div>
            <div className="flex items-center gap-5 rounded-xl px-3 py-2.5 text-sm cursor-pointer hover:bg-[#212121]"><span>🎥</span> Movies</div>
            <div className="flex items-center gap-5 rounded-xl px-3 py-2.5 text-sm cursor-pointer hover:bg-[#212121]"><span>🔥</span> Trending</div>
            <div className="h-px bg-[#303030] my-2.5 mx-1.5" />
            <a href="/admin" className="flex items-center gap-5 rounded-xl px-3 py-2.5 text-sm text-[#f1f1f1] transition hover:bg-[#212121]"><span>⚙</span> Admin dashboard</a>
          </div>
        </aside>

        <main className={`flex-1 p-5 relative transition-all duration-300 ${isSiteLocked ? 'blur-md pointer-events-none select-none' : ''}`}>
          <div className="flex gap-2.5 overflow-x-auto pb-4 mb-4 select-none no-scrollbar">
            {['All', 'Music', 'Gaming', 'News', 'Live', 'Podcasts', 'Recently uploaded'].map((chip) => (
              <div
                key={chip}
                onClick={() => setActiveChip(chip)}
                className={`shrink-0 border border-[#303030] px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition ${
                  activeChip === chip ? 'bg-white text-black border-white' : 'bg-[#212121] hover:bg-[#303030]'
                }`}
              >
                {chip}
              </div>
            ))}
          </div>

          {filteredVideos.length === 0 ? (
            <div className="text-center py-[60px] px-5 text-[#aaaaaa]">
              <div className="text-3xl mb-2.5">🎥</div>
              <h3 className="text-white font-medium text-base mb-1.5">No videos yet</h3>
              <p className="text-sm">Nothing has been uploaded by the admin yet.</p>
            </div>
          ) : (
            <div className="grid gap-x-4 gap-y-6 grid-cols-[repeat(auto-fill,minmax(240px,1fr))]">
              {filteredVideos.map((v, i) => (
                <div key={v.id || i} onClick={() => handleVerifyVideoAccess(v)} className="cursor-pointer group">
                  <div 
                    className="relative aspect-video w-full rounded-xl bg-cover bg-center overflow-hidden border border-[#212121]"
                    style={{ backgroundImage: v.thumb ? `url(${v.thumb})` : avGrads[i % avGrads.length] }}
                  >
                    <span className="absolute right-1.5 bottom-1.5 bg-black/80 px-1.5 py-0.5 text-[11px] rounded-md font-medium z-10">{v.length || '4:00'}</span>
                    {parseInt(v.price) > 0 && (
                      <div className="absolute top-2 left-2 bg-gradient-to-r from-[#ff3b3b] to-[#ff5f5f] text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow-lg z-10">
                        🔒 Premium
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2.5 mt-2.5">
                    <div className="h-9 w-9 rounded-full shrink-0 border border-[#212121]" style={{ background: avGrads[(i + 2) % avGrads.length] }} />
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium leading-snug line-clamp-2 text-white group-hover:text-[#ff3b3b] transition-colors">{v.title}</h3>
                      <p className="text-xs text-[#aaaaaa] mt-1 truncate">{v.channel}</p>
                      <p className="text-[12px] text-[#aaaaaa] mt-0.5">{getTimeAgo(v.uploadedAt)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* 🔐 ENTRANCE SUBSCRIPTION PAYWALL GATE MODAL OVERLAY */}
      {isSiteLocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-5 backdrop-blur-[2px]">
          <div className="w-full max-w-[400px] rounded-2xl border border-[#303030] bg-[#181818] p-7 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="relative h-[18px] w-[26px] rounded bg-[#ff3b3b] shrink-0 after:absolute after:left-[9.5px] after:top-[4px] after:border-y-[5px] after:border-l-[8px] after:border-y-transparent after:border-l-white" />
              <span className="font-semibold text-base">LeeHub</span>
            </div>
            <h2 className="text-xl font-bold mt-3.5 mb-1.5">Unlock your feed</h2>
            <p className="text-xs text-[#aaaaaa] leading-relaxed mb-5">Your home feed is locked until checkout is complete. Enter payment details to continue watching.</p>

            <div className="flex justify-between items-center bg-[#212121] border border-[#303030] rounded-xl px-3.5 py-3 mb-4">
              <span className="text-xs text-[#aaaaaa]">LeeHub Premium — monthly</span>
              <span className="text-lg font-semibold text-white">TSh 20,000</span>
            </div>

            <div className="flex gap-2 bg-[#212121] border border-[#303030] rounded-xl p-1 mb-4">
              <button 
                type="button" 
                onClick={(e) => handleMethodTabSwitch(e, 'momo')}
                className={`flex-1 rounded-lg text-xs font-semibold py-2.5 cursor-pointer transition-all duration-200 ${paymentMethod === 'momo' ? 'bg-[#181818] text-white shadow' : 'text-[#aaaaaa] hover:text-white'}`}
              >
                Mobile Money
              </button>
              <button 
                type="button" 
                onClick={(e) => handleMethodTabSwitch(e, 'card')}
                className={`flex-1 rounded-lg text-xs font-semibold py-2.5 cursor-pointer transition-all duration-200 ${paymentMethod === 'card' ? 'bg-[#181818] text-white shadow' : 'text-[#aaaaaa] hover:text-white'}`}
              >
                Card
              </button>
            </div>

            <form onSubmit={handleSiteGateSubmit}>
              {paymentMethod === 'momo' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-[#aaaaaa] mb-2 font-medium">Choose your network</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['mpesa', 'tigopesa', 'airtel', 'halopesa'].map((op) => (
                        <button
                          key={op}
                          type="button"
                          onClick={(e) => handleOperatorSwitch(e, op)}
                          className={`flex items-center gap-2 bg-[#212121] border text-xs p-2.5 rounded-lg text-left font-medium cursor-pointer transition-all duration-150 ${
                            selectedOp === op ? 'border-[#ff5f5f] bg-[#2a1f1f] text-white' : 'border-[#303030] text-[#aaaaaa] hover:text-white'
                          }`}
                        >
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: op === 'mpesa' ? '#4dba2b' : op === 'tigopesa' ? '#0072ce' : op === 'airtel' ? '#ff3b3b' : '#ffb800' }} />
                          {operatorNames[op]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center bg-[#212121] border border-[#303030] rounded-lg overflow-hidden focus-within:border-[#ff5f5f]">
                    <span className="pl-3 pr-1 text-sm text-[#aaaaaa] font-medium select-none">+255</span>
                    <input id="momoPhone" type="tel" value={momoPhone} onChange={handlePhoneInput} placeholder="740 462 193" className="w-full bg-transparent py-2.5 pr-3 text-sm text-white outline-none" />
                  </div>
                  <p className="text-[11px] text-[#aaaaaa]">You'll get a prompt on your phone from <strong className="text-white">{operatorNames[selectedOp]}</strong> to confirm TSh 20,000.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-col gap-1"><label htmlFor="cardName" className="text-xs text-[#aaaaaa] font-medium">Name on card</label><input id="cardName" type="text" value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="Jordan Diaz" className="w-full bg-[#212121] border border-[#303030] rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-[#ff5f5f]" /></div>
                  <div className="flex flex-col gap-1"><label htmlFor="cardNum" className="text-xs text-[#aaaaaa] font-medium">Card number</label><input id="cardNum" type="text" value={cardNum} onChange={handleCardNumInput} placeholder="1234 5678 9012 3456" className="w-full bg-[#212121] border border-[#303030] rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-[#ff5f5f]" /></div>
                  <div className="flex gap-2">
                    <div className="flex-1 flex flex-col gap-1"><label htmlFor="cardExp" className="text-xs text-[#aaaaaa] font-medium">Expiry</label><input id="cardExp" type="text" value={cardExp} onChange={handleCardExpInput} placeholder="08/27" className="w-full bg-[#212121] border border-[#303030] rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-[#ff5f5f]" /></div>
                    <div className="flex-1 flex flex-col gap-1"><label htmlFor="cardCvc" className="text-xs text-[#aaaaaa] font-medium">CVC</label><input id="cardCvc" type="text" value={cardCvc} onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="123" className="w-full bg-[#212121] border border-[#303030] rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-[#ff5f5f]" /></div>
                  </div>
                </div>
              )}
              {payError && <p className="text-[#ff5f5f] text-xs mt-3 font-medium">{payError}</p>}
              <button type="submit" className="w-full mt-5 bg-[#ff3b3b] text-white font-bold py-3 rounded-xl text-sm transition-all hover:bg-[#ff5f5f] cursor-pointer">{payStatusText}</button>
            </form>
          </div>
        </div>
      )}

      {/* 🎭 THEATER OVERLAY PLAYERS */}
      {activeVideo && (
        <div id="videoModal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-5 backdrop-blur-md">
          <div className="relative w-full max-w-[800px] aspect-video bg-black rounded-xl overflow-hidden border border-[#303030] flex items-center justify-center">
            <button onClick={() => { setActiveVideo(null); setIsPpvLocked(false); }} className="absolute top-3 right-3 bg-black/70 border border-[#444] text-white rounded-full w-9 h-9 cursor-pointer flex items-center justify-center text-sm z-50 hover:bg-black transition">✕</button>
            <div id="playerContainer" className="w-full h-full flex items-center justify-center relative z-20">
              {isPpvLocked ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#141414] text-white p-8 text-center select-none">
                  <div className="text-4xl mb-3.5">💎</div>
                  <h2 className="text-xl font-bold tracking-tight mb-2">Premium Video Locked</h2>
                  <p className="text-xs text-[#aaaaaa] max-w-[340px] leading-relaxed mb-6">Unlock access permanently for a one-time charge of <span className="text-[#ff3b3b] font-bold">TSh {parseInt(activeVideo.price).toLocaleString()}</span>.</p>
                  <button onClick={() => handleProcessLocalPPV(activeVideo.id)} className="bg-[#ff3b3b] text-white font-semibold px-8 py-3.5 rounded-xl text-sm transition hover:bg-[#ff5f5f]">Unlock Stream Access</button>
                </div>
              ) : (
                activeVideo.desc && (activeVideo.desc.includes('<iframe') || activeVideo.desc.includes('player.vimeo') || activeVideo.desc.includes('iframe src')) ? (
                  <div className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full" dangerouslySetInnerHTML={{ __html: activeVideo.desc }} />
                ) : (
                  <video id="nativePlayer" controls autoPlay controlsList="nodownload" onContextMenu={(e) => e.preventDefault()} src={activeVideo.desc?.startsWith('http') ? activeVideo.desc : 'https://w3schools.com'} className="w-full h-full object-contain bg-black" />
                )
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
