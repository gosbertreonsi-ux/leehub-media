(function(){
  var STORAGE_KEY = "playhub_admin_videos";
  var BACKEND_API_URL = "https://your-live-backend-api.com"; // Replace with your live Render URL later

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
        var serverVideos = await response.json();
        return serverVideos;
      }
    } catch(err) {
      console.warn("Backend unavailable, using local mirror fallback.");
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

        if (status.purchased && selectedVideo) {
        launchVideoPlayer(selectedVideo);
      } else if (selectedVideo) {
        // Reads specific token values instantly to show pricing dynamically
        var cost = selectedVideo.price && selectedVideo.price !== "0" ? "TSh " + parseInt(selectedVideo.price).toLocaleString() : "Premium Tokens";
        alert("Pay-Per-View: This premium video requires a separate payment of " + cost + " to unlock.");
      }

    
    var currentVideos = await loadAdminVideos();
    var selectedVideo = currentVideos.find(function(item) { return item.id === videoId; });

    try {
      var response = await fetch(BACKEND_API_URL + "/verify-video?id=" + videoId);
      var status = await response.json();
      
      if (status.purchased && selectedVideo) {
        launchVideoPlayer(selectedVideo);
      } else {
        alert("Pay-Per-View: This premium video requires a separate access payment.");
      }
    } catch(e) {
      if (selectedVideo) {
        launchVideoPlayer(selectedVideo);
      } else {
        alert("Opening Placeholder Video Asset ID: " + videoId);
      }
    }
  };

    function launchVideoPlayer(videoObject) {
    var modal = document.getElementById("videoModal");
    var nativePlayer = document.getElementById("nativePlayer");
    var container = document.getElementById("playerContainer");

    if (!modal) return;
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";

    if (videoObject.desc && (videoObject.desc.includes("iframe") || videoObject.desc.includes("vimeo") || videoObject.desc.includes("bunny"))) {
      nativePlayer.style.display = "none";
      container.innerHTML = videoObject.desc; 
      
      var iframe = container.querySelector("iframe");
      if (iframe) { iframe.style.width = "100%"; iframe.style.height = "100%"; iframe.style.border = "none"; }
    } else {
      container.innerHTML = "";
      container.appendChild(nativePlayer);
      nativePlayer.style.display = "block";
      nativePlayer.src = (videoObject.desc && videoObject.desc.startsWith("http")) ? videoObject.desc : "https://w3schools.com";
      nativePlayer.play();
    }
  }

  window.closeVideoPlayer = function() {
    var modal = document.getElementById("videoModal");
    var nativePlayer = document.getElementById("nativePlayer");
    
    if (!modal) return;
    modal.style.display = "none";
    document.body.style.overflow = "auto";
    
    if (nativePlayer) {
      nativePlayer.pause();
      nativePlayer.src = "";
    }
    document.getElementById("playerContainer").innerHTML = '<video id="nativePlayer" controls controlsList="nodownload" oncontextmenu="return false;" style="width: 100%; height: 100%; display: none;"></video>';
  };

  renderFeed();
  window.addEventListener("storage", function(e){
    if(e.key === STORAGE_KEY) renderFeed();
  });

    var gate = document.getElementById("gate");
  var form = document.getElementById("payForm");
  var errMsg = document.getElementById("errMsg");
  var payBtn = document.getElementById("payBtn");
  var toast = document.getElementById("toast");

  function setLocked(locked){
    if(locked){
      document.body.classList.add("locked");
      gate.hidden = false;
    } else {
      document.body.classList.remove("locked");
      gate.hidden = true;
    }
  }

  var alreadyPaid = false;
  try{
    alreadyPaid = window.localStorage.getItem("playhub_paid") === "1";
  }catch(e){ alreadyPaid = false; }

  setLocked(!alreadyPaid);
  if(alreadyPaid){
    toast.textContent = "Welcome back — feed unlocked";
    toast.classList.add("show");
    setTimeout(function(){ toast.classList.remove("show"); }, 2200);
  }

  var operatorNames = { mpesa:"M-Pesa", tigopesa:"Tigo Pesa", airtel:"Airtel Money", halopesa:"HaloPesa" };
  var currentMethod = "momo";
  var currentOp = "mpesa";

  var methodTabs = document.querySelectorAll(".method-tab");
  var panelMomo = document.getElementById("panel-momo");
  var panelCard = document.getElementById("panel-card");
  var momoHint = document.getElementById("momoHint");

  function refreshPayBtn(){
    errMsg.textContent = "";
    if(currentMethod === "momo"){
      payBtn.textContent = "Pay with " + operatorNames[currentOp];
      momoHint.textContent = "You'll get a prompt on your phone from " + operatorNames[currentOp] + " to confirm TSh 15,000.";
    } else {
      payBtn.textContent = "Pay TSh 15,000 with card";
    }
  }

  methodTabs.forEach(function(tab){
    tab.addEventListener("click", function(){
      methodTabs.forEach(function(t){ t.classList.remove("active"); });
      tab.classList.add("active");
      currentMethod = tab.getAttribute("data-method");
      panelMomo.hidden = currentMethod !== "momo";
      panelCard.hidden = currentMethod !== "card";
      refreshPayBtn();
    });
  });

  document.querySelectorAll(".op").forEach(function(btn){
    btn.addEventListener("click", function(){
      document.querySelectorAll(".op").forEach(function(b){ b.classList.remove("active"); });
      btn.classList.add("active");
      currentOp = btn.getAttribute("data-op");
      refreshPayBtn();
    });
  });

  refreshPayBtn();

  form.addEventListener("submit", async function(e){
    e.preventDefault();
    errMsg.textContent = "";

    var paymentPayload = {
      amount: 15000, currency: "TZS", method: currentMethod,
      operator: currentMethod === "momo" ? currentOp : null,
      phone: null, cardDetails: null
    };

    if(currentMethod === "momo"){
      var phone = document.getElementById("momoPhone").value.replace(/\D/g,"");
      if(!/^\d{8}$/.test(phone)){
        errMsg.textContent = "Enter a valid Tanzanian mobile number (e.g. 712 345 678).";
        return;
      }
      paymentPayload.phone = "+255" + phone;
    } else {
      var name = document.getElementById("cardName").value.trim();
      var num = document.getElementById("cardNum").value.replace(/\s+/g,"");
      var exp = document.getElementById("cardExp").value.trim();
      var cvc = document.getElementById("cardCvc").value.trim();

      if(name.length < 2){ errMsg.textContent = "Enter the name on the card."; return; }
      if(!/^\d{13,19}$/.test(num)){ errMsg.textContent = "Enter a valid card number."; return; }
      if(!/^\d{2}\/\d{2}$/.test(exp)){ errMsg.textContent = "Expiry must be in MM/YY format."; return; }
      if(!/^\d{3,4}$/.test(cvc)){ errMsg.textContent = "Enter a valid CVC."; return; }
      
      paymentPayload.cardDetails = { name: name, number: num, expiry: exp, cvc: cvc };
    }

    var finishedText = payBtn.textContent;
    payBtn.disabled = true;
    payBtn.textContent = currentMethod === "momo" ? "Waiting for " + operatorNames[currentOp] + " confirmation…" : "Processing…";

    try {
      var checkoutResponse = await fetch(BACKEND_API_URL + "/initialize-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentPayload)
      });
      var resultData = await checkoutResponse.json();
      if (resultData.success && resultData.redirectUrl) {
        window.location.href = resultData.redirectUrl;
        return;
      }
    } catch(err) {
      console.warn("Production gateway API error. Using simulation mode fallback.");
    }

    setTimeout(function(){
      try{ window.localStorage.setItem("playhub_paid","1"); }catch(e){}
      setLocked(false);
      toast.textContent = "Payment confirmed — feed unlocked";
      toast.classList.add("show");
      setTimeout(function(){ toast.classList.remove("show"); }, 2500);
      payBtn.disabled = false;
      payBtn.textContent = finishedText;
    }, currentMethod === "momo" ? 1600 : 900);
  });

  document.getElementById("momoPhone").addEventListener("input", function(e){
    e.target.value = e.target.value.replace(/\D/g,"").slice(0,9);
  });
  document.getElementById("cardNum").addEventListener("input", function(e){
    var v = e.target.value.replace(/\D/g,"").slice(0,19);
    e.target.value = v.replace(/(\d{4})(?=\d)/g,"$1 ");
  });
  document.getElementById("cardExp").addEventListener("input", function(e){
    var v = e.target.value.replace(/\D/g,"").slice(0,4);
    if(v.length >= 3) v = v.slice(0,2)+"/"+v.slice(2);
    e.target.value = v;
  });
})();


  // ---------- HEADER CHIP CONTENT FILTER ENGINE ----------
  document.querySelectorAll(".chip").forEach(function(chipElement) {
    chipElement.addEventListener("click", async function() {
      // 1. Swap active UI layout styles cleanly
      document.querySelectorAll(".chip").forEach(function(c) { c.classList.remove("active"); });
      chipElement.classList.add("active");

      var currentFilter = chipElement.textContent.trim().toLowerCase();
      var currentVideos = await loadAdminVideos();
      var gridContainer = document.getElementById("grid");

      // 2. Clear out container state if "All" is active, otherwise loop filter metrics
      if (currentFilter === "all") {
        renderFeed(); // Renders everything
        return;
      }

      // 3. Filter list objects by matching title parameters or channel signatures
      var filteredMatches = currentVideos.filter(function(v) {
        return v.title.toLowerCase().includes(currentFilter) || 
               (v.channel && v.channel.toLowerCase().includes(currentFilter));
      });

      if (filteredMatches.length === 0) {
        gridContainer.innerHTML = "";
        document.getElementById("empty").hidden = false;
        return;
      }

      document.getElementById("empty").hidden = true;
      gridContainer.innerHTML = filteredMatches.map(function(v) {
        var thumbStyle = v.thumb ? "background-image:url(" + v.thumb + ");" : "background:#333;";
        return '<div class="card" onclick="verifyVideoAccess(\'' + v.id + '\')">'+
          '<div class="thumb" style="'+thumbStyle+'"><span class="len">'+(v.length||"")+'</span></div>'+
          '<div class="meta">'+
            '<div class="ch-avatar" style="background:#555"></div>'+
            '<div><h3>'+escapeHtml(v.title)+'</h3><p>'+escapeHtml(v.channel)+'</p></div>'+
          '</div></div>';
      }).join("");
    });
  });
