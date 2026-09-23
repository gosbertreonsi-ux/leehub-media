(function(){
  var STORAGE_KEY = "playhub_admin_videos";
  // Set to local connection channels during our offline workspace update phase
  var BACKEND_API_URL = "http://localhost:5000/api"; 

  var avGrads = [
    "linear-gradient(135deg,#7c5cff,#ff5fa2)","linear-gradient(135deg,#ffb56a,#ff3b3b)",
    "linear-gradient(135deg,#3ddc84,#1e9dd7)","linear-gradient(135deg,#ff5fa2,#ffd76a)"
  ];
  var thumbFallback = [
    "linear-gradient(135deg,#ff6a6a,#ffb56a)","linear-gradient(135deg,#6a8bff,#6affea)",
    "linear-gradient(135deg,#a06aff,#ff6ad5)","linear-gradient(135deg,#3ddc84,#1e7d34)"
  ];
  
  function rnd(arr){return arr[Math.floor(Math.random()*arr.length)];}

  async function loadAdminVideos(){
    try {
      var response = await fetch(BACKEND_API_URL + "/videos");
      if (response.ok) {
        return await response.json();
      }
    } catch(err) {
      console.warn("Backend server offline. Reading video arrays from local database cache.");
    }
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch(e){ return []; }
  }

  function timeAgo(iso){
    var mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if(mins < 1) return "just now";
    if(mins < 60) return mins + "m ago";
    var hrs = Math.round(mins/60);
    if(hrs < 24) return hrs + "h ago";
    return Math.round(hrs/24) + "d ago";
  }

  var grid = document.getElementById("grid");
  var emptyEl = document.getElementById("empty");

  function escapeHtml(s){
    return (s||"").replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"'"}[c];
    });
  }
  async function renderFeed(){
    var videos = await loadAdminVideos();
    if(videos.length === 0){
      grid.innerHTML = "";
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;
    grid.innerHTML = videos.map(function(v){
      var thumbStyle = v.thumb
        ? "background-image:url(" + v.thumb + ");"
        : "background:" + rnd(thumbFallback) + ";";
      
      return '<div class="card" onclick="verifyVideoAccess(\'' + v.id + '\')">'+
        '<div class="thumb" style="'+thumbStyle+'">'+
          '<span class="len">'+(v.length||"")+'</span>'+
        '</div>'+
        '<div class="meta">'+
          '<div class="ch-avatar" style="background:'+rnd(avGrads)+'"></div>'+
          '<div><h3>'+escapeHtml(v.title)+'</h3><p>'+escapeHtml(v.channel)+'<br>'+timeAgo(v.uploadedAt)+'</p></div>'+
        '</div></div>';
    }).join("");
  }

  window.verifyVideoAccess = async function(videoId) {
    var isSiteUnlocked = window.localStorage.getItem("playhub_paid") === "1";
    if (!isSiteUnlocked) {
      setLocked(true);
      return;
    }
    
    var currentVideos = await loadAdminVideos();
    var selectedVideo = currentVideos.find(function(item) { return item.id === videoId; });

    if (!selectedVideo) {
      console.error("Video target database reference missing.");
      return;
    }

    launchVideoPlayer(selectedVideo);
  };

    function launchVideoPlayer(videoObject) {
    var modal = document.getElementById("videoModal");
    var nativePlayer = document.getElementById("nativePlayer");
    var container = document.getElementById("playerContainer");

    if (!modal) return;
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";

    var ppvStorageKey = "playhub_ppv_paid_" + videoObject.id;
    var isVideoPurchased = window.localStorage.getItem(ppvStorageKey) === "1";

    var cleanPrice = parseInt(videoObject.price);
    if (isNaN(cleanPrice) || cleanPrice <= 0) {
      isVideoPurchased = true; 
    }

    // IF PREMIUM CARD LOCKED: Draw safe interface form elements directly inside the canvas layout
    if (!isVideoPurchased) {
      if (nativePlayer) nativePlayer.style.display = "none";
      var cost = cleanPrice.toLocaleString();
      
      container.innerHTML = `
        <div style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#141414; color:#fff; padding:30px; text-align:center; box-sizing:border-box; position:relative; z-index:9999;">
          <div style="font-size:42px; margin-bottom:14px;">💎</div>
          <h2 style="margin:0 0 8px; font-size:22px; font-weight:600;">Premium Video Locked</h2>
          <p style="margin:0 0 24px; color:#aaa; font-size:14px; max-width:340px;">
            Unlock access permanently to this film asset for a one-time fee of <span style="color:#ff3b3b; font-weight:700;">TSh ${cost}</span>.
          </p>
          <button id="innerUnlockBtn" style="background:#ff3b3b; color:#fff; border:none; padding:14px 32px; font-size:15px; font-weight:600; border-radius:10px; cursor:pointer; z-index:10000; position:relative; box-shadow:0 4px 15px rgba(255,59,59,0.3);">
            Unlock Video Now
          </button>
        </div>
      `;

      // Explicit target assignment to prevent click event bubbles from breaking
      setTimeout(function() {
        var btn = document.getElementById("innerUnlockBtn");
        if (btn) {
          btn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            window.processLocalPPV(videoObject.id);
          };
        }
      }, 50);
      return;
    }

    // IF UNLOCKED: Open media channel arrays natively
    if (videoObject.desc && (videoObject.desc.includes("iframe") || videoObject.desc.includes("vimeo") || videoObject.desc.includes("bunny"))) {
      if (nativePlayer) nativePlayer.style.display = "none";
      container.innerHTML = videoObject.desc; 
      var iframe = container.querySelector("iframe");
      if (iframe) { iframe.style.width = "100%"; iframe.style.height = "100%"; iframe.style.border = "none"; }
    } else {
      container.innerHTML = "";
      container.appendChild(nativePlayer);
      if (nativePlayer) {
        nativePlayer.style.display = "block";
        nativePlayer.src = (videoObject.desc && videoObject.desc.startsWith("http")) ? videoObject.desc : "https://w3schools.com";
        nativePlayer.play().catch(function(err){ console.log("Playback navigation setup notice."); });
      }
    }
  }

  window.processLocalPPV = function(videoId) {
    var ppvStorageKey = "playhub_ppv_paid_" + videoId;
    window.localStorage.setItem(ppvStorageKey, "1");
    alert("🎉 Payment Success! Video asset has been unlocked permanently.");
    
    // Rerender the active feed without forcing a full layout window crash update
    renderFeed();
    var currentVideos = window.localStorage.getItem("playhub_admin_videos");
    if(currentVideos) {
      var selected = JSON.parse(currentVideos).find(function(x){ return x.id === videoId; });
      if(selected) launchVideoPlayer(selected);
    }
  };

  window.closeVideoPlayer = function() {
    var modal = document.getElementById("videoModal");
    var nativePlayer = document.getElementById("nativePlayer");
    if (!modal) return;
    modal.style.display = "none";
    document.body.style.overflow = "auto";
    if (nativePlayer) { nativePlayer.pause(); nativePlayer.src = ""; }
  };

  renderFeed();
  window.addEventListener("storage", function(e){
    if(e.key === STORAGE_KEY) renderFeed();
  });
  // ---------- main paywall interface configuration ----------
  var gate = document.getElementById("gate");
  var form = document.getElementById("payForm");
  var errMsg = document.getElementById("errMsg");
  var payBtn = document.getElementById("payBtn");
  var toast = document.getElementById("toast");

  function setLocked(locked){
    if(locked){
      document.body.classList.add("locked");
      if(gate) gate.hidden = false;
    } else {
      document.body.classList.remove("locked");
      if(gate) gate.hidden = true;
    }
  }

  var alreadyPaid = false;
  try{ alreadyPaid = window.localStorage.getItem("playhub_paid") === "1"; }catch(e){ alreadyPaid = false; }
  setLocked(!alreadyPaid);

  var operatorNames = { mpesa:"M-Pesa", tigopesa:"Tigo Pesa", airtel:"Airtel Money", halopesa:"HaloPesa" };
  var currentMethod = "momo";
  var currentOp = "mpesa";

  var methodTabs = document.querySelectorAll(".method-tab");
  var panelMomo = document.getElementById("panel-momo");
  var panelCard = document.getElementById("panel-card");
  var momoHint = document.getElementById("momoHint");

  function refreshPayBtn(){
    if (!payBtn) return;
    if (errMsg) errMsg.textContent = "";
    
    if(currentMethod === "momo"){
      payBtn.textContent = "Pay with " + operatorNames[currentOp];
      if (momoHint) momoHint.textContent = "You'll get a prompt on your phone from " + operatorNames[currentOp] + " to confirm TSh 15,000.";
    } else {
      payBtn.textContent = "Pay TSh 15,000 with card";
    }
  }

  // FIXED: Dynamic switching logic between Mobile Money and Credit Cards
  methodTabs.forEach(function(tab){
    tab.onclick = function(e) {
      e.preventDefault();
      methodTabs.forEach(function(t){ t.classList.remove("active"); });
      tab.classList.add("active");
      currentMethod = tab.getAttribute("data-method");
      if (panelMomo) panelMomo.hidden = currentMethod !== "momo";
      if (panelCard) panelCard.hidden = currentMethod !== "card";
      refreshPayBtn();
    };
  });

  // FIXED: Activating click loops for Tigo, Airtel, and Halo Pesa network buttons
  document.querySelectorAll(".op").forEach(function(btn){
    btn.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      document.querySelectorAll(".op").forEach(function(b){ b.classList.remove("active"); });
      btn.classList.add("active");
      currentOp = btn.getAttribute("data-op");
      refreshPayBtn();
    };
  });

  refreshPayBtn();

  // Handle local main fee gate submission parameters
  form.addEventListener("submit", function(e){
    e.preventDefault();
    if (errMsg) errMsg.textContent = "";

    if(currentMethod === "momo"){
      var phone = document.getElementById("momoPhone").value.replace(/\D/g,"");
      if(!/^[67]\d{8}$/.test(phone)){
        if (errMsg) errMsg.textContent = "Enter a valid Tanzanian mobile number.";
        return;
      }
    } else {
      var name = document.getElementById("cardName").value.trim();
      if(name.length < 2){ if (errMsg) errMsg.textContent = "Enter the name on the card."; return; }
    }

    var finishedText = payBtn.textContent;
    payBtn.disabled = true;
    payBtn.textContent = "Processing Sandbox Verification…";

    setTimeout(function(){
      window.localStorage.setItem("playhub_paid","1");
      setLocked(false);
      payBtn.disabled = false;
      payBtn.textContent = finishedText;
      window.location.reload(); // Clean operational layout reload step
    }, 1200);
  });

  document.getElementById("momoPhone").oninput = function(e){
    e.target.value = e.target.value.replace(/\D/g,"").slice(0,9);
  };
  document.getElementById("cardNum").oninput = function(e){
    var v = e.target.value.replace(/\D/g,"").slice(0,19);
    e.target.value = v.replace(/(\d{4})(?=\d)/g,"$1 ");
  };
  document.getElementById("cardExp").oninput = function(e){
    var v = e.target.value.replace(/\D/g,"").slice(0,4);
    if(v.length >= 3) v = v.slice(0,2)+"/"+v.slice(2);
    e.target.value = v;
  };
})();
