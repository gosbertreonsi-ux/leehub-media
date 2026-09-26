//IMPORTS AND COMPS SETUP
'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Search,
  Tv,
  Compass,
  Film,
  Lock,
  AlertCircle,
  RefreshCw,
  Clock,
  X,
  Minimize2,
  Maximize2
} from 'lucide-react';

// Placeholder thumbnail — self-contained SVG so it never depends on an external host
const FALLBACK_THUMB =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="225">
       <rect width="100%" height="100%" fill="#18181b"/>
       <text x="50%" y="50%" fill="#52525b" font-family="sans-serif" font-size="16"
         text-anchor="middle" dominant-baseline="middle">No thumbnail</text>
     </svg>`
  );

// Film-grain texture, tiled over the whole app — matches the reference site's
// near-black, grainy backdrop. Self-contained SVG filter, no image request.
const NOISE_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export default function PlayHubHome() {
  //STATE VARIABLES
  // Navigation & Core Content
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSiteLocked, setIsSiteLocked] = useState(false);
  const [activeChip, setActiveChip] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Paywall Engine
  const [paymentMethod, setPaymentMethod] = useState('momo');
  const [selectedOp, setSelectedOp] = useState('mpesa');
  const [momoPhone, setMomoPhone] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardNum, setCardNum] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [payError, setPayError] = useState('');
  const [payStatusText, setPayStatusText] = useState('Pay with M-Pesa');

  // Site-wide payment verification/polling
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [currentTransactionId, setCurrentTransactionId] = useState(null);

  // Per-video (PPV) payment verification/polling
  const [isCheckingPpv, setIsCheckingPpv] = useState(false);
  const [currentPpvTxId, setCurrentPpvTxId] = useState(null);
  const [ppvStatusText, setPpvStatusText] = useState('Pay to Unlock Video');

  // Lightbox / video player
  const [activeVideo, setActiveVideo] = useState(null);
  const [isPpvLocked, setIsPpvLocked] = useState(false);
  const [isMiniPlayer, setIsMiniPlayer] = useState(false);

  const mainRef = useRef(null);

  const handleCloseVideo = () => {
    setActiveVideo(null);
    setIsPpvLocked(false);
    setIsCheckingPpv(false);
    setCurrentPpvTxId(null);
    setIsMiniPlayer(false);
  };

  const BACKEND_API_URL = '/api';

  //DATA FETCHING
  const fetchCloudVideos = async () => {
    let dbVideos = [];
    let localVideos = [];

    try {
      const res = await fetch(`${BACKEND_API_URL}/videos`);
      if (res.ok) dbVideos = await res.json();
    } catch (err) {
      console.warn('Backend link offline, falling back to cache repositories.');
    }

    try {
      const rawAdmin = window.localStorage.getItem('playhub_admin_videos');
      const rawHome = window.localStorage.getItem('playhub_home_feed_videos');
      const chosenRaw = rawHome || rawAdmin;
      if (chosenRaw) localVideos = JSON.parse(chosenRaw);
    } catch (e) {
      console.error('Local feed stream reading block:', e);
    }

    const compositeMap = new Map();
    [...localVideos, ...dbVideos].forEach(item => {
      if (item && item.id) compositeMap.set(item.id, item);
    });

    // NORMALIZE: AdminDashboard saves videos as { thumb, length, desc, ... }
    // while this screen reads { thumbnailUrl, duration, videoUrl, ... } — map them here
    // so nothing downstream has to know about the admin's field names.
    const normalized = Array.from(compositeMap.values()).map((v) => {
      const thumbIsUsableUrl = v.thumb && !v.thumb.startsWith('linear');
      return {
        ...v,
        thumbnailUrl: v.thumbnailUrl || (thumbIsUsableUrl ? v.thumb : null),
        duration: v.duration || v.length || '0:00',
        videoUrl: v.videoUrl || v.desc || '',
      };
    });

    // No slicing/capping here on purpose — every video that comes back from
    // the backend or local cache stays in the feed, whether that's 10 or 1000.
    // The grid below renders in normal document flow, so the browser's own
    // scrolling handles however many cards that turns out to be.
    const finalSynchronizedFeed = normalized.sort((a, b) =>
      new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0)
    );

    setVideos(finalSynchronizedFeed);
    setLoading(false);
  };

  //FETCH CLOUD VIDEOS ON MOUNT
  useEffect(() => {
    fetchCloudVideos();
  }, []);

  //POLL SITE-WIDE PAYMENT STATUS
  useEffect(() => {
    if (!currentTransactionId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${BACKEND_API_URL}/payments/status/${currentTransactionId}`);
        const data = await res.json();

        if (data.status === 'completed' || data.status === 'success') {
          clearInterval(interval);
          setIsCheckingPayment(false);
          setCurrentTransactionId(null);
          setIsSiteLocked(false);
          setPayStatusText('Pay with M-Pesa');
        } else if (data.status === 'failed' || data.status === 'cancelled') {
          clearInterval(interval);
          setIsCheckingPayment(false);
          setCurrentTransactionId(null);
          setPayError('Payment was not completed. Please try again.');
          setPayStatusText('Pay with M-Pesa');
        }
        // otherwise still pending — keep polling
      } catch (err) {
        console.error('Payment status poll failed:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [currentTransactionId]);

  //POLL PER-VIDEO (PPV) PAYMENT STATUS
  useEffect(() => {
    if (!currentPpvTxId || !activeVideo) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${BACKEND_API_URL}/payments/status/${currentPpvTxId}`);
        const data = await res.json();

        if (data.status === 'completed' || data.status === 'success') {
          clearInterval(interval);
          window.localStorage.setItem(`playhub_ppv_paid_${activeVideo.id}`, '1');
          setIsCheckingPpv(false);
          setCurrentPpvTxId(null);
          setIsPpvLocked(false);
          setPpvStatusText('Pay to Unlock Video');
        } else if (data.status === 'failed' || data.status === 'cancelled') {
          clearInterval(interval);
          setIsCheckingPpv(false);
          setCurrentPpvTxId(null);
          setPpvStatusText(`Pay TSh ${parseInt(activeVideo.price).toLocaleString()} to Unlock`);
        }
        // otherwise still pending — keep polling
      } catch (err) {
        console.error('PPV status poll failed:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [currentPpvTxId, activeVideo]);

  //PAYWALL FORM HANDLERS
  const handleOperatorSwitch = (e, networkKey) => {
    e.preventDefault(); e.stopPropagation();
    if (isCheckingPayment) return;
    setSelectedOp(networkKey);
  };

  const handleMethodTabSwitch = (e, methodKey) => {
    e.preventDefault(); e.stopPropagation();
    if (isCheckingPayment) return;
    setPaymentMethod(methodKey);
    setPayError('');
  };

  const handlePhoneInput = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 9);
    setMomoPhone(val);
  };

  const handleCardNumInput = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 19);
    const spaced = v.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNum(spaced);
  };

  const handleCardExpInput = (e) => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
    setCardExp(v);
  };

  //VIDEO ACCESS CHECK
  const handleVerifyVideoAccess = (video) => {
    if (isSiteLocked) return;
    const ppvStorageKey = `playhub_ppv_paid_${video.id}`;
    const isVideoPurchased = window.localStorage.getItem(ppvStorageKey) === '1';
    const cleanPrice = parseInt(video.price);
    const isFree = isNaN(cleanPrice) || cleanPrice <= 0;

    setActiveVideo(video);
    setIsMiniPlayer(false);
    if (!isFree && !isVideoPurchased) {
      setIsPpvLocked(true);
      setPpvStatusText(`Pay TSh ${cleanPrice.toLocaleString()} to Unlock`);
    } else {
      setIsPpvLocked(false);
    }
  };

  //SITE GATE PAYMENT
  const handleSiteGateSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isCheckingPayment) return;
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
      if (!/^\d{2}\/\d{2}$/.test(cleanCardExp)) { setPayError('Expiry must be in MM/YY format (e.g., 08/27).'); return; }
      if (cleanCardCvc.length < 3) { setPayError('Enter a valid CVC.'); return; }
    }

    setIsCheckingPayment(true);
    setPayStatusText('Initiating Push Request...');

    try {
      const response = await fetch(`${BACKEND_API_URL}/payments/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: paymentMethod,
          phone: `255${momoPhone}`,
          operator: selectedOp,
          amount: 20000,
          currency: 'TZS'
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Gateway connection timeout.');

      setCurrentTransactionId(data.transactionId);
      setPayStatusText('Enter PIN prompt on your phone...');

    } catch (err) {
      setPayError(err.message || 'Payment initiation failed. Please check network.');
      setIsCheckingPayment(false);
    }
  };

  //PPV PAYMENT
  const handleProcessLocalPPV = async (video) => {
    if (isCheckingPpv) return;
    setIsCheckingPpv(true);
    setPpvStatusText('Initiating Push Request...');

    try {
      const response = await fetch(`${BACKEND_API_URL}/payments/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'momo',
          phone: `255${momoPhone || '740000000'}`,
          operator: selectedOp,
          amount: parseInt(video.price),
          currency: 'TZS',
          videoId: video.id
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Gateway communication failure.');

      setCurrentPpvTxId(data.transactionId);
      setPpvStatusText('Enter PIN on phone...');

    } catch (err) {
      alert(err.message || 'Video access payment request failed.');
      setPpvStatusText(`Pay TSh ${parseInt(video.price).toLocaleString()} to Unlock`);
      setIsCheckingPpv(false);
    }
  };

  //RELATIVE TIME
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

  //FILTERING LOGIC
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
    // Root frame: <main> below is the single scrollable region. A fixed film-grain
    // layer sits over everything (near-black + grain, matching the reference look).
    <div className="h-screen w-full bg-[#07070a] text-[#f8fafc] font-sans antialiased selection:bg-[#ef4444]/30 overflow-hidden relative">

      {/* FILM GRAIN — persistent, tiled, sits above the background but below UI */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none opacity-[0.16] mix-blend-overlay"
        style={{ backgroundImage: NOISE_BG, backgroundRepeat: 'repeat' }}
      />

      {/* FLOATING MINIMAL NAV */}
      <nav className="fixed top-0 inset-x-0 z-40 flex items-center justify-between gap-4 px-6 py-4 bg-gradient-to-b from-black/85 via-black/30 to-transparent pointer-events-none">
        <div className="flex items-center gap-2.5 shrink-0 select-none pointer-events-auto">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#ef4444] to-[#b91c1c] text-white shadow-lg shadow-red-900/20">
            <Tv className="h-5 w-5" />
          </div>
          <span className="text-xl font-black tracking-wider bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">PLAYHUB</span>
        </div>

        <div className="relative max-w-md w-full hidden md:block pointer-events-auto">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Search premium videos, channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-neutral-500 outline-none focus:border-[#ef4444] backdrop-blur-md transition-all"
          />
        </div>

        <div className="flex items-center gap-3 pointer-events-auto">
          <button className="p-2 text-neutral-300 hover:text-white rounded-xl hover:bg-white/10 transition-all">
            <Compass className="h-5 w-5" />
          </button>
          <div className="h-8 w-px bg-white/10" />
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-neutral-700 to-neutral-500 border border-neutral-600 flex items-center justify-center text-xs font-bold text-white select-none">PH</div>
        </div>
      </nav>

      {/* FLOATING FILTER CHIPS */}
      <div className="fixed top-[66px] inset-x-0 z-30 flex justify-center px-4 pointer-events-none">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pointer-events-auto max-w-full bg-black/30 backdrop-blur-md border border-white/10 rounded-2xl px-2 py-1.5 shadow-xl">
          {['All', 'Premium', 'Free', 'Movies', 'Series', 'Live'].map((chip) => (
            <button
              key={chip}
              onClick={() => setActiveChip(chip)}
              className={`px-3.5 py-1.5 text-[11px] font-bold rounded-xl whitespace-nowrap transition-all border ${
                activeChip === chip
                  ? 'bg-white text-black border-white shadow-md'
                  : 'bg-transparent text-neutral-300 border-transparent hover:text-white hover:bg-white/10'
              }`}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN SCROLL REGION — a normal document-flow grid, so it scrolls the
          ordinary way and every matching video (10 or 1000+) is reachable by
          just scrolling, instead of being pinned/measured/animated in. */}
      <main ref={mainRef} className={`relative z-0 h-screen w-full scroll-smooth ${isSiteLocked ? 'overflow-hidden' : 'overflow-y-scroll'}`}>
        <div className="w-full px-4 sm:px-6 pt-32 pb-16">
          {loading ? (
            <div className="flex justify-center mt-24">
              <span className="text-[10px] tracking-[0.3em] text-neutral-600 uppercase">Loading streams…</span>
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="text-center px-6 mt-24">
              <Film className="h-8 w-8 text-neutral-700 mx-auto mb-2" />
              <p className="text-xs text-neutral-500">No media streams match your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10 max-w-[1400px] mx-auto">
              {filteredVideos.map((video) => {
                const itemPrice = parseInt(video.price);
                const isPremium = !isNaN(itemPrice) && itemPrice > 0;

                return (
                  <div
                    key={video.id}
                    onClick={() => handleVerifyVideoAccess(video)}
                    className="group cursor-pointer flex flex-col"
                  >
                    {/* Thumbnail — background-cover so any source image, whatever
                        its native size, fills the frame edge-to-edge without
                        stretching or letterboxing. */}
                    <div
                      className="relative w-full aspect-video rounded-2xl overflow-hidden bg-neutral-900 bg-center bg-cover ring-1 ring-white/10 group-hover:ring-white/25 transition-all"
                      style={{
                        backgroundImage: `url(${video.thumbnailUrl || FALLBACK_THUMB})`,
                      }}
                    >
                      <div className="absolute top-3 right-3 flex items-center gap-1.5">
                        {isPremium ? (
                          <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black px-2 py-0.5 rounded-md backdrop-blur-md uppercase tracking-wider">Premium</span>
                        ) : (
                          <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-md backdrop-blur-md uppercase tracking-wider">Free</span>
                        )}
                      </div>

                      <div className="absolute bottom-2.5 right-2.5 bg-black/75 px-1.5 py-0.5 rounded text-[11px] font-bold text-neutral-200 tracking-tight">
                        {video.duration || '0:00'}
                      </div>

                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
                        <div className="h-14 w-14 rounded-full bg-white/90 text-black flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-all duration-300">
                          <Play className="h-6 w-6 fill-current ml-0.5" />
                        </div>
                      </div>
                    </div>

                    {/* Meta row — YouTube-style: channel avatar, title, then a
                        secondary line of channel · time-ago (· price when paid). */}
                    <div className="flex items-start gap-3 mt-3">
                      <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-tr from-neutral-700 to-neutral-500 border border-neutral-600 flex items-center justify-center text-xs font-bold text-white select-none">
                        {(video.channel || 'PH').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-[15px] leading-snug text-neutral-100 group-hover:text-white transition-colors tracking-tight line-clamp-2">
                          {video.title}
                        </h3>
                        <p className="text-[13px] text-neutral-400 mt-1 font-medium truncate">
                          {video.channel || 'PlayHub Streamer'}
                        </p>
                        <div className="flex items-center gap-1.5 text-[12px] text-neutral-500 font-semibold mt-0.5">
                          <span className="flex items-center gap-1"><Clock size={11} /> {getTimeAgo(video.uploadedAt)}</span>
                          {isPremium && (
                            <>
                              <span className="text-neutral-600">·</span>
                              <span className="text-amber-400 font-extrabold">TSh {parseInt(video.price).toLocaleString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* VIDEO LIGHTBOX PLAYER — ONE persistent tree for both full & mini modes.
          Only className/text changes between modes; the <video>/<iframe> node itself
          never unmounts, so playback position and "playing" state survive the toggle. */}
      {activeVideo && (
        <div
          className={
            isMiniPlayer
              ? 'fixed bottom-4 right-4 z-50 w-64 sm:w-80 rounded-2xl overflow-hidden shadow-2xl shadow-black/60 border border-[#27272a] bg-[#0e0e11] animate-fadeIn transition-all duration-300'
              : 'fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn'
          }
        >
          <div
            className={
              isMiniPlayer
                ? 'w-full flex flex-col'
                : 'bg-[#0e0e11] border border-[#27272a] w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]'
            }
          >
            <div
              className={
                isMiniPlayer
                  ? 'flex items-center justify-between px-2.5 py-2 bg-neutral-900/80'
                  : 'flex items-center justify-between p-4 border-b border-[#27272a] bg-neutral-900/40'
              }
            >
              <div className="truncate pr-4">
                {!isMiniPlayer && (
                  <span className="text-[10px] bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20 font-bold px-2 py-0.5 rounded uppercase tracking-wider">Theater View</span>
                )}
                <h2
                  className={
                    isMiniPlayer
                      ? 'text-[11px] font-bold text-white truncate'
                      : 'text-sm font-bold text-white truncate mt-1 tracking-tight'
                  }
                >
                  {activeVideo.title}
                </h2>
              </div>
              <div className={isMiniPlayer ? 'flex items-center gap-1 shrink-0' : 'flex items-center gap-2 shrink-0'}>
                <button
                  onClick={() => setIsMiniPlayer(!isMiniPlayer)}
                  className={
                    isMiniPlayer
                      ? 'h-6 w-6 flex items-center justify-center rounded-lg hover:bg-white/10 text-neutral-300 hover:text-white transition-all cursor-pointer'
                      : 'h-8 w-8 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-xl flex items-center justify-center transition-all cursor-pointer'
                  }
                  title={isMiniPlayer ? 'Expand' : 'Minimize — keep watching while you browse'}
                >
                  {isMiniPlayer ? <Maximize2 size={12} /> : <Minimize2 size={14} />}
                </button>
                <button
                  onClick={handleCloseVideo}
                  className={
                    isMiniPlayer
                      ? 'h-6 w-6 flex items-center justify-center rounded-lg hover:bg-white/10 text-neutral-300 hover:text-white transition-all cursor-pointer'
                      : 'h-8 w-8 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-xl flex items-center justify-center transition-all cursor-pointer'
                  }
                  title="Close"
                >
                  <X size={isMiniPlayer ? 12 : 16} />
                </button>
              </div>
            </div>

            <div
              className={
                isMiniPlayer
                  ? 'aspect-video bg-black relative'
                  : 'flex-1 bg-black relative flex items-center justify-center aspect-video min-h-[300px]'
              }
            >
              {isPpvLocked ? (
                isMiniPlayer ? (
                  <button
                    onClick={() => setIsMiniPlayer(false)}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-center p-3 cursor-pointer"
                  >
                    <Lock size={16} className="text-amber-400" />
                    <span className="text-[10px] text-neutral-300 font-semibold">Locked — tap to expand & unlock</span>
                  </button>
                ) : (
                  <div className="absolute inset-0 bg-[#0e0e11]/90 backdrop-blur-md p-6 flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto z-10">
                    <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                      <Lock size={20} className={isCheckingPpv ? "animate-pulse" : ""} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white tracking-tight">Pay-Per-View Locked Asset</h3>
                      <p className="text-xs text-neutral-400 mt-1.5 leading-normal">This specific video item requires an individual standalone micro-payment access token to unlock viewing credentials.</p>
                    </div>
                    <div className="bg-black/40 border border-white/5 rounded-xl px-4 py-2 text-center w-full">
                      <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Video Pricing Fee</span>
                      <p className="text-xl font-black text-amber-400 mt-0.5">TSh {parseInt(activeVideo.price).toLocaleString()}</p>
                    </div>
                    <button
                      disabled={isCheckingPpv}
                      onClick={() => handleProcessLocalPPV(activeVideo)}
                      className={`w-full font-extrabold py-3 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer
                        ${isCheckingPpv
                          ? 'bg-neutral-800 text-neutral-500 border border-white/5 shadow-none animate-pulse cursor-not-allowed'
                          : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black shadow-amber-500/10 active:scale-[0.99]'
                        }`}
                    >
                      {isCheckingPpv && (
                        <RefreshCw size={12} className="animate-spin text-amber-500" />
                      )}
                      {isCheckingPpv ? ppvStatusText : `Pay TSh ${parseInt(activeVideo.price).toLocaleString()} to Unlock`}
                    </button>
                  </div>
                )
              ) : activeVideo.videoUrl?.trim().startsWith('<iframe') ? (
                // Vimeo / Bunny / any raw <iframe embed> saved by the admin dashboard
                // — this stays mounted across mode switches, so playback continues.
                <div
                  className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full"
                  dangerouslySetInnerHTML={{ __html: activeVideo.videoUrl }}
                />
              ) : (
                // Direct playable file — this <video> node stays mounted across mode
                // switches (same tree position in both branches), so currentTime and
                // "playing" state are preserved instead of restarting from 0.
                <video
                  src={activeVideo.videoUrl}
                  controls
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* GATEWAY ENTRY PAYWALL CONTROLLER WITH SPOTLIGHT ASSIST */}
      {isSiteLocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-hidden group/bg">

          <div className="absolute inset-0 w-full h-full z-0 overflow-hidden pointer-events-none select-none">
            <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-black/50 to-[#09090b] z-20" />
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-all duration-500 z-10
              group-hover/bg:bg-black/10
              [background:radial-gradient(circle_at_center,transparent_20%,rgba(0,0,0,0.65)_60%)]"
            />
            <img
              src="/11.jpg"
              alt="Cinematic Background Backdrop"
              className="w-full h-full object-cover object-center transition-all duration-700 ease-out
                opacity-40 scale-[1.01]
                group-hover/bg:opacity-90 group-hover/bg:scale-[1.04]"
              onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_THUMB; }}
            />
          </div>

          <div className="w-full max-w-[400px] bg-[#141414]/75 border border-white/10 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl shadow-black/90 space-y-5 z-20 border-t-white/15">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/20 flex items-center justify-center text-[#ef4444]">
                  <Lock size={16} className={isCheckingPayment ? "animate-pulse" : ""} />
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
              <button disabled={isCheckingPayment} onClick={(e) => handleMethodTabSwitch(e, 'momo')} className={`py-2.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${isCheckingPayment ? 'opacity-40 cursor-not-allowed' : ''} ${paymentMethod === 'momo' ? 'bg-[#ef4444] text-white shadow-md' : 'text-[#aaa] hover:text-white'}`}>Mobile Money</button>
              <button disabled={isCheckingPayment} onClick={(e) => handleMethodTabSwitch(e, 'card')} className={`py-2.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${isCheckingPayment ? 'opacity-40 cursor-not-allowed' : ''} ${paymentMethod === 'card' ? 'bg-[#ef4444] text-white shadow-md' : 'text-[#aaa] hover:text-white'}`}>Credit Card</button>
            </div>

            <form onSubmit={handleSiteGateSubmit} className="space-y-4">
              {paymentMethod === 'momo' ? (
                <div className="space-y-3">
                  <label className="text-[10px] text-[#aaa] font-bold uppercase tracking-widest block">Select Mobile Operator</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {['mpesa', 'tigopesa', 'airtel', 'halopesa'].map((op) => (
                      <button key={op} disabled={isCheckingPayment} type="button" onClick={(e) => handleOperatorSwitch(e, op)} className={`py-2 text-[10px] font-extrabold rounded-lg border uppercase tracking-wider transition-all duration-200 cursor-pointer ${isCheckingPayment ? 'opacity-40 cursor-not-allowed' : ''} ${selectedOp === op ? 'border-[#ef4444] bg-[#ef4444]/10 text-white' : 'border-white/5 bg-black/20 text-[#aaa] hover:text-white'}`}>{op.replace('pesa', '')}</button>
                    ))}
                  </div>
                  <div>
                    <label className="block text-xs text-[#aaa] mb-1.5 font-bold tracking-tight">Tanzanian Mobile Number</label>
                    <div className="relative">
                      <span className="absolute left-4 top-3 text-xs font-bold text-[#666]">+255</span>
                      <input disabled={isCheckingPayment} type="tel" placeholder="740 462 193" value={momoPhone} onChange={handlePhoneInput} className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-14 pr-4 text-xs text-white font-semibold outline-none focus:border-[#ef4444] focus:bg-black/60 transition-all disabled:opacity-50" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div><label className="block text-xs text-[#aaa] mb-1.5 font-bold tracking-tight">Cardholder Name</label><input disabled={isCheckingPayment} type="text" placeholder="John Doe" value={cardName} onChange={(e) => setCardName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#ef4444] focus:bg-black/60 transition-all disabled:opacity-50" /></div>
                  <div><label className="block text-xs text-[#aaa] mb-1.5 font-bold tracking-tight">Card Number</label><input disabled={isCheckingPayment} type="text" placeholder="4000 1234 5678 9010" value={cardNum} onChange={handleCardNumInput} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#ef4444] focus:bg-black/60 transition-all disabled:opacity-50" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs text-[#aaa] mb-1.5 font-bold tracking-tight">Expiry Date</label><input disabled={isCheckingPayment} type="text" placeholder="MM/YY" value={cardExp} onChange={handleCardExpInput} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white text-center outline-none focus:border-[#ef4444] focus:bg-black/60 transition-all disabled:opacity-50" /></div>
                    <div><label className="block text-xs text-[#aaa] mb-1.5 font-bold tracking-tight">CVC</label><input disabled={isCheckingPayment} type="password" placeholder="123" value={cardCvc} onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white text-center outline-none focus:border-[#ef4444] focus:bg-black/60 transition-all disabled:opacity-50" /></div>
                  </div>
                </div>
              )}

              {payError && (
                <p className="text-[#ff5f5f] text-xs font-bold text-center bg-[#ff5f5f]/10 p-2.5 rounded-xl border border-[#ff5f5f]/20 tracking-tight flex items-center justify-center gap-1.5">
                  <AlertCircle size={13} /> {payError}
                </p>
              )}

              <button
                type="submit"
                disabled={isCheckingPayment}
                className={`w-full text-white font-extrabold py-3.5 rounded-xl text-xs tracking-wider uppercase transition-all duration-300 shadow-lg flex items-center justify-center gap-2 cursor-pointer
                  ${isCheckingPayment
                    ? 'bg-neutral-800 text-neutral-400 border border-white/5 shadow-none animate-pulse cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#ef4444] to-[#b91c1c] shadow-red-900/10 hover:shadow-red-900/20 active:scale-[0.99]'
                  }`}
              >
                {isCheckingPayment && (
                  <RefreshCw size={13} className="animate-spin text-[#ef4444]" />
                )}
                {payStatusText}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}