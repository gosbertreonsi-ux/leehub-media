(function(){

    // ---------- ADMIN AUTENTICATION NODE ----------
  function verifyAdminAccess() {
    var sessionKey = window.sessionStorage.getItem("playhub_admin_auth");
    
    // Set your secret dashboard password here
    var secretPasscode = "playhub2026"; 

    if (sessionKey !== "verified") {
      // Hide dashboard body elements to prevent visual leaks
      document.body.style.display = "none";
      
      var attempt = prompt("Enter Admin Secure Passcode:");
      if (attempt === secretPasscode) {
        window.sessionStorage.setItem("playhub_admin_auth", "verified");
        document.body.style.display = "block";
      } else {
        alert("Access Denied: Invalid Security Token.");
        window.location.href = "index.html"; // Forwards intruders back to safety
      }
    }
  }
  // Run security scan immediately before rendering any dashboard lists
  verifyAdminAccess();


  var STORAGE_KEY = "playhub_admin_videos";
  var BACKEND_API_URL = "https://onrender.com"; // Replace with your exact Render URL

  async function loadVideos() {
    try {
      var response = await fetch(BACKEND_API_URL + "/videos");
      if (response.ok) return await response.json();
    } catch(err) {
      console.warn("Cloud infrastructure offline. Defaulting to local mirror.");
    }
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch(e) { return []; }
  }

  async function saveVideosFallback(list) {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch(e) {}
  }

  // ---------- video file processing element targets ----------
  var videoDrop = document.getElementById("videoDrop");
  var videoInput = document.getElementById("vSourceFile");
  var videoStatusText = document.getElementById("videoStatusText");
  var pendingVideoData = ""; // Stores web-ready video stream payload

  videoDrop.addEventListener("click", function(){ videoInput.click(); });
  videoInput.addEventListener("change", function(){
    var file = videoInput.files && videoInput.files[0];
    if(!file) return;
    
    var reader = new FileReader();
    reader.onload = function(ev) {
      pendingVideoData = ev.target.result; // Dynamic base64 binary buffer capture
      videoStatusText.textContent = "✅ Video Loaded: " + file.name;
    };
    reader.readAsDataURL(file);
  });

  // ---------- thumbnail handling ----------
  var drop = document.getElementById("thumbDrop");
  var fileInput = document.getElementById("vThumb");
  var preview = document.getElementById("thumbPreview");
  var pendingThumb = "";

  drop.addEventListener("click", function(){ fileInput.click(); });
  fileInput.addEventListener("change", function(){
    var file = fileInput.files && fileInput.files[0];
    if(!file) return;
    var reader = new FileReader();
    reader.onload = function(ev){
      var img = new Image();
      img.onload = function(){
        var canvas = document.createElement("canvas");
        var w = 480, h = Math.round(480 * (img.height / img.width));
        canvas.width = w; canvas.height = h;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        pendingThumb = canvas.toDataURL("image/jpeg", 0.72);
        preview.style.backgroundImage = "url(" + pendingThumb + ")";
        preview.classList.add("has-image");
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  // ---------- upload form submission ----------
  var form = document.getElementById("uploadForm");
  var errEl = document.getElementById("uploadErr");

  form.addEventListener("submit", async function(e){
    e.preventDefault();
    errEl.textContent = "";

    var title = document.getElementById("vTitle").value.trim();
    var channel = document.getElementById("vChannel").value.trim();
    var length = document.getElementById("vLength").value.trim();
    var desc = document.getElementById("vDesc").value.trim();

    if(!title || !channel){ errEl.textContent = "Title and channel name are required."; return; }
    if(!/^\d{1,2}:\d{2}$/.test(length)){ errEl.textContent = "Length must look like 4:12."; return; }
    if(!pendingVideoData){ errEl.textContent = "Please select a valid movie file to upload."; return; }

    var priceInput = document.getElementById("vPrice").value.trim();

    var newVideo = {
      id: Date.now().toString(36),
      title: title,
      channel: channel,
      length: length,
      thumb: pendingThumb,
      price: priceInput || "0", // Stores the specific value constraint
      desc: desc || "https://w3schools.com", 
      uploadedAt: new Date().toISOString()
    };



    var submitBtn = form.querySelector('button[type="submit"]');
    var originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Streaming media to server database...";

    try {
      var response = await fetch(BACKEND_API_URL + "/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newVideo)
      });

      if (response.ok) {
        form.reset();
        pendingThumb = ""; pendingVideoData = "";
        preview.style.backgroundImage = ""; preview.classList.remove("has-image");
        videoStatusText.textContent = "🎬 Click to choose a video file";
        submitBtn.disabled = false; submitBtn.textContent = originalBtnText;
        await renderList();
        return;
      }
    } catch(err) {
      console.warn("Server unavailable. Syncing layout parameters into local cache map.");
    }

    var list = await loadVideos();
    list.unshift(newVideo);
    await saveVideosFallback(list);

    form.reset();
    pendingThumb = ""; pendingVideoData = "";
    preview.style.backgroundImage = ""; preview.classList.remove("has-image");
    videoStatusText.textContent = "🎬 Click to choose a video file";
    submitBtn.disabled = false; submitBtn.textContent = originalBtnText;
    await renderList();
  });

  // ---------- list management + database deletion ----------
  var listEl = document.getElementById("adminList");
  var countEl = document.getElementById("count");

  function timeAgo(iso){
    var mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if(mins < 1) return "just now";
    if(mins < 60) return mins + "m ago";
    var hrs = Math.round(mins/60);
    if(hrs < 24) return hrs + "h ago";
    return Math.round(hrs/24) + "d ago";
  }

  async function renderList(){
    var list = await loadVideos();
    countEl.textContent = "(" + list.length + ")";
    if(list.length === 0){
      listEl.innerHTML = '<div class="admin-empty">Nothing uploaded yet — use the form to publish your first video.</div>';
      return;
    }
    listEl.innerHTML = list.map(function(v){
      var bg = v.thumb ? 'style="background-image:url(' + v.thumb + ')"' : "";
      return '<div class="admin-row" data-id="' + v.id + '">' +
        '<div class="thumb-sm" ' + bg + '></div>' +
        '<div class="row-info"><h4>' + escapeHtml(v.title) + '</h4>' +
        '<p>' + escapeHtml(v.channel) + ' &middot; ' + escapeHtml(v.length) + ' &middot; ' + timeAgo(v.uploadedAt) + '</p></div>' +
        '<button type="button" class="del" data-id="' + v.id + '" title="Delete">🗑</button>' +
        '</div>';
    }).join("");
  }

  function escapeHtml(s){
    return (s||"").replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"'"}[c];
    });
  }

  listEl.addEventListener("click", async function(e){
    var btn = e.target.closest(".del");
    if(!btn) return;
    var id = btn.getAttribute("data-id");

    try {
      var response = await fetch(BACKEND_API_URL + "/videos/" + id, { method: "DELETE" });
      if (response.ok) { await renderList(); return; }
    } catch(err) { console.warn("Network offline. Cleaning local cached instances."); }

    var currentList = await loadVideos();
    var filteredList = currentList.filter(function(v){ return v.id !== id; });
    await saveVideosFallback(filteredList);
    await renderList();
  });

  renderList();
})();
