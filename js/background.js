/* Pardes background image/video management, focus editor, IDB persistence */

/* Shared helpers */
function bgFilter(brightness, blur) {
  var f = "brightness(" + (brightness || 100) + "%)";
  if (blur) f += " blur(" + blur + "px)";
  return f;
}

function computeZoomPan(vW, vH, mW, mH, scale, xc, yc, rotation) {
  var Rm = mW / mH;
  var Rv = vW / vH;
  var isRotated90 = (rotation % 180 !== 0);
  
  var sW, sH;
  if (isRotated90) {
    var RmPrime = 1 / Rm;
    if (RmPrime > Rv) {
      sH = vH;
      sW = vH * RmPrime;
    } else {
      sW = vW;
      sH = vW / RmPrime;
    }
  } else {
    if (Rm > Rv) {
      sH = vH;
      sW = vH * Rm;
    } else {
      sW = vW;
      sH = vW / Rm;
    }
  }
  
  var vW_visual = sW * scale;
  var vH_visual = sH * scale;
  
  var tx = vW_visual * (0.5 - xc);
  var ty = vH_visual * (0.5 - yc);
  
  var maxTx = (vW_visual - vW) / 2;
  var maxTy = (vH_visual - vH) / 2;
  
  var txConstrained = Math.max(-maxTx, Math.min(maxTx, tx));
  var tyConstrained = Math.max(-maxTy, Math.min(maxTy, ty));
  
  var actualXc = 0.5 - (txConstrained / vW_visual);
  var actualYc = 0.5 - (tyConstrained / vH_visual);
  
  return {
    layoutW: isRotated90 ? sH : sW,
    layoutH: isRotated90 ? sW : sH,
    tx: txConstrained,
    ty: tyConstrained,
    xc: actualXc,
    yc: actualYc
  };
}

Pardes.Background = (function() {
  var _bgObjectUrl = null;

  function saveBgState(kind, value, state) {
    var safeValue = value && !value.startsWith("blob:") && !value.startsWith("data:") ? value : "";
    localStorage.removeItem("bg.state.v2");
    localStorage.setItem("bg.state.v2", JSON.stringify(Object.assign({ kind: kind, value: safeValue }, state)));
  }

  function setBackground(kind, url, state) {
    var bgVideo = Pardes.$("bgVideo");
    var bgImage = Pardes.$("bgImage");
    if (_bgObjectUrl && _bgObjectUrl !== url) {
      try { URL.revokeObjectURL(_bgObjectUrl); } catch {} _bgObjectUrl = null;
    }

    if (kind === "image") {
      if (bgImage) {
        bgImage.src = url;
        bgImage.hidden = false;
        bgImage.style.display = "block";
      }
      if (bgVideo) {
        bgVideo.hidden = true;
        bgVideo.style.cssText = "";
        bgVideo.src = "";
      }
    } else if (kind === "video" && bgVideo) {
      if (bgImage) {
        bgImage.hidden = true;
        bgImage.style.cssText = "";
        bgImage.src = "";
      }
      bgVideo.muted = state ? !state.sound : true;
      bgVideo.src = url;
      bgVideo.hidden = false;
      bgVideo.play().catch(function() {});
    }

    saveBgState(kind, url, state);
  }

  function resetToDefault() {
    var bgVideo = Pardes.$("bgVideo");
    var bgImage = Pardes.$("bgImage");
    if (bgVideo) {
      bgVideo.hidden = true;
      bgVideo.style.cssText = "";
      bgVideo.src = "";
      bgVideo.muted = true;
    }
    if (bgImage) {
      bgImage.hidden = true;
      bgImage.style.cssText = "";
      bgImage.src = "";
    }
    localStorage.removeItem("bg.state.v2");
    Pardes.idbDel().catch(function() {});
    if (_bgObjectUrl) { try { URL.revokeObjectURL(_bgObjectUrl); } catch {} _bgObjectUrl = null; }
    
    var popover = Pardes.$("bgPopover");
    if (popover) popover.hidden = true;
    
    if (bgVideo) {
      bgVideo.muted = true;
      bgVideo.src = "assets/wallpaper.mp4";
      bgVideo.hidden = false;
      bgVideo.play().catch(function() {});
    }
  }

  function updatePageBackground() {
    var bgRaw = localStorage.getItem("bg.state.v2");
    if (!bgRaw) return;
    var bg = JSON.parse(bgRaw);
    
    var zoom = bg.zoom || 1;
    var xc = bg.bgX !== undefined ? bg.bgX / 100 : 0.5;
    var yc = bg.bgY !== undefined ? bg.bgY / 100 : 0.5;
    var rotation = bg.rotation || 0;
    
    var activeEl = null;
    var mW = 0, mH = 0;
    
    if (bg.kind === "video") {
      activeEl = Pardes.$("bgVideo");
      if (activeEl) {
        mW = activeEl.videoWidth;
        mH = activeEl.videoHeight;
      }
    } else {
      activeEl = Pardes.$("bgImage");
      if (activeEl) {
        mW = activeEl.naturalWidth;
        mH = activeEl.naturalHeight;
      }
    }
    
    if (!activeEl || !mW || !mH) return;
    
    var vW = window.innerWidth;
    var vH = window.innerHeight;
    
    var res = computeZoomPan(vW, vH, mW, mH, zoom, xc, yc, rotation);
    
    activeEl.style.width = res.layoutW + "px";
    activeEl.style.height = res.layoutH + "px";
    activeEl.style.position = "fixed";
    activeEl.style.left = "50%";
    activeEl.style.top = "50%";
    activeEl.style.transform = "translate(-50%, -50%) translate(" + res.tx + "px, " + res.ty + "px) rotate(" + rotation + "deg) scale(" + zoom + ")";
    activeEl.style.filter = bgFilter(bg.brightness, bg.blur);
  }

  async function loadPersistedBackground() {
    var bgRaw = localStorage.getItem("bg.state.v2");
    if (!bgRaw) return;
    var bg = JSON.parse(bgRaw);

    var url = bg.value;
    if (!url) {
      var blob;
      try { blob = await Pardes.idbGet(); } catch {}
      if (!blob) return;
      url = URL.createObjectURL(blob);
      _bgObjectUrl = url;
    }

    var bgVideo = Pardes.$("bgVideo");
    var bgImage = Pardes.$("bgImage");

    if (bg.kind === "video") {
      if (bgVideo) {
        bgVideo.muted = !bg.sound;
        bgVideo.src = url;
        bgVideo.hidden = false;
        bgVideo.style.display = "block";
        bgVideo.play().catch(function() {
          bgVideo.muted = true;
          bgVideo.play().catch(function() {});
        });
      }
      if (bgImage) {
        bgImage.hidden = true;
        bgImage.style.display = "none";
        bgImage.src = "";
      }
    } else {
      if (bgImage) {
        bgImage.src = url;
        bgImage.hidden = false;
        bgImage.style.display = "block";
      }
      if (bgVideo) {
        bgVideo.hidden = true;
        bgVideo.style.display = "none";
        bgVideo.src = "";
      }
    }
  }

  /* Background focus editor state */
  var focusState = {
    kind: "", value: "", bgX: 50, bgY: 50,
    blur: 0, brightness: 100, rotation: 0, sound: false, zoom: 1
  };

  function openFocusEditor(kind, value, savedState) {
    var bgFocusImg = Pardes.$("bgFocusImg");
    var bgFocusVid = Pardes.$("bgFocusVid");
    var bgFocusBrightness = Pardes.$("bgFocusBrightness");
    var bgFocusBrightnessValue = Pardes.$("bgFocusBrightnessValue");
    var bgFocusBlurInput = Pardes.$("bgFocusBlurInput");
    var bgFocusBlurValue = Pardes.$("bgFocusBlurValue");
    var bgFocusBlurWrap = Pardes.$("bgFocusBlurWrap");
    var bgFocusSoundToggle = Pardes.$("bgFocusSoundToggle");
    var bgFocusZoom = Pardes.$("bgFocusZoom");
    var bgFocusZoomValue = Pardes.$("bgFocusZoomValue");

    /* Size the card to match the viewport aspect ratio */
    var card = document.querySelector(".bg-focus-card");
    if (card) {
      var vAspect = window.innerWidth / window.innerHeight;
      /* Reserve vertical space for the chrome: ~110px header + controls + actions */
      var CHROME_H = 178;
      var maxCardW = window.innerWidth - 40;
      var maxCardH = window.innerHeight - 40;
      var previewH, cardW, cardH;
      /* Try fitting by width first */
      cardW = Math.min(maxCardW, 1200);
      previewH = Math.round(cardW / vAspect);
      cardH = previewH + CHROME_H;
      if (cardH > maxCardH) {
        cardH = maxCardH;
        previewH = cardH - CHROME_H;
        cardW = Math.round(previewH * vAspect);
      }
      card.style.setProperty("--bg-focus-card-w", cardW + "px");
      card.style.setProperty("--bg-focus-card-h", cardH + "px");
      card.style.width = cardW + "px";
      card.style.height = cardH + "px";
    }

    var state = savedState || {};

    focusState = {
      kind: kind,
      value: value,
      bgX: state.bgX !== undefined ? state.bgX : 50,
      bgY: state.bgY !== undefined ? state.bgY : 50,
      blur: state.blur || 0,
      brightness: state.brightness !== undefined ? state.brightness : 100,
      rotation: state.rotation || 0,
      sound: state.sound || false,
      zoom: state.zoom || 1
    };

    if (kind === "image") {
      bgFocusImg.src = value;
      bgFocusImg.hidden = false;
      bgFocusVid.hidden = true;
      if (bgFocusVid.pause) bgFocusVid.pause();
    } else if (kind === "video") {
      if (bgFocusVid) {
        bgFocusVid.muted = !focusState.sound;
      }
      bgFocusVid.src = value;
      bgFocusVid.hidden = false;
      bgFocusVid.play().catch(function() {});
      bgFocusImg.hidden = true;
    }

    bgFocusBrightness.value = focusState.brightness;
    bgFocusBrightnessValue.textContent = focusState.brightness + "%";
    
    bgFocusBlurInput.value = focusState.blur || 12;
    bgFocusBlurValue.textContent = focusState.blur + "px";
    bgFocusBlurWrap.hidden = !focusState.blur;
    
    var bgFocusBlurToggle = Pardes.$("bgFocusBlurToggle");
    if (bgFocusBlurToggle) {
      bgFocusBlurToggle.textContent = focusState.blur ? "Blur: On" : "Blur: Off";
    }

    bgFocusSoundToggle.hidden = kind !== "video";
    bgFocusSoundToggle.textContent = focusState.sound ? "Sound: On" : "Sound: Off";

    if (bgFocusZoom) {
      bgFocusZoom.value = Math.round(focusState.zoom * 100);
    }
    if (bgFocusZoomValue) {
      bgFocusZoomValue.textContent = Math.round(focusState.zoom * 100) + "%";
    }

    applyPreviewFilter();
    
    var bgFocus = Pardes.$("bgFocus");
    if (bgFocus) bgFocus.hidden = false;
  }

  function updatePreviewTransform() {
    var img = Pardes.$("bgFocusImg");
    var vid = Pardes.$("bgFocusVid");
    var activeEl = focusState.kind === "image" ? img : vid;
    if (!activeEl) return;
    
    var mW = focusState.kind === "image" ? activeEl.naturalWidth : activeEl.videoWidth;
    var mH = focusState.kind === "image" ? activeEl.naturalHeight : activeEl.videoHeight;
    if (!mW || !mH) return;
    
    var preview = Pardes.$("bgFocusPreview");
    if (!preview) return;
    var rect = preview.getBoundingClientRect();
    var vW = rect.width;
    var vH = rect.height;
    if (!vW || !vH) return;
    
    var zoom = focusState.zoom || 1;
    var xc = focusState.bgX / 100;
    var yc = focusState.bgY / 100;
    var rotation = focusState.rotation || 0;
    
    var res = computeZoomPan(vW, vH, mW, mH, zoom, xc, yc, rotation);
    
    activeEl.style.width = res.layoutW + "px";
    activeEl.style.height = res.layoutH + "px";
    activeEl.style.transform = "translate(-50%, -50%) translate(" + res.tx + "px, " + res.ty + "px) rotate(" + rotation + "deg) scale(" + zoom + ")";
    
    focusState.bgX = res.xc * 100;
    focusState.bgY = res.yc * 100;
  }

  function resetPreviewTransform() {
    var bgFocusImg = Pardes.$("bgFocusImg");
    var bgFocusVid = Pardes.$("bgFocusVid");
    if (bgFocusImg) {
      bgFocusImg.style.transform = "";
      bgFocusImg.style.width = "";
      bgFocusImg.style.height = "";
    }
    if (bgFocusVid) {
      bgFocusVid.style.transform = "";
      bgFocusVid.style.width = "";
      bgFocusVid.style.height = "";
    }
  }

  function closeFocusEditor() {
    var bgFocus = Pardes.$("bgFocus");
    var bgFocusImg = Pardes.$("bgFocusImg");
    var bgFocusVid = Pardes.$("bgFocusVid");
    if (bgFocus) bgFocus.hidden = true;
    if (bgFocusImg) bgFocusImg.hidden = true;
    if (bgFocusVid) {
      bgFocusVid.hidden = true;
      if (bgFocusVid.pause) bgFocusVid.pause();
    }
  }

  function applyPreviewFilter() {
    var bgFocusImg = Pardes.$("bgFocusImg");
    var bgFocusVid = Pardes.$("bgFocusVid");
    var filter = bgFilter(focusState.brightness, focusState.blur > 0 ? focusState.blur : 0);
    if (bgFocusImg && !bgFocusImg.hidden) bgFocusImg.style.filter = filter;
    if (bgFocusVid && !bgFocusVid.hidden) bgFocusVid.style.filter = filter;
  }

  function initFocusEditor() {
    var bgFocus = Pardes.$("bgFocus");
    if (!bgFocus) return;

    var bgFocusBackdrop = Pardes.$("bgFocusBackdrop");
    var bgFocusClose = Pardes.$("bgFocusClose");
    var bgFocusCancel = Pardes.$("bgFocusCancel");
    var bgFocusApply = Pardes.$("bgFocusApply");
    var bgFocusPreview = Pardes.$("bgFocusPreview");
    var bgFocusBlurToggle = Pardes.$("bgFocusBlurToggle");
    var bgFocusBlurWrap = Pardes.$("bgFocusBlurWrap");
    var bgFocusBlurInput = Pardes.$("bgFocusBlurInput");
    var bgFocusBlurValue = Pardes.$("bgFocusBlurValue");
    var bgFocusBrightness = Pardes.$("bgFocusBrightness");
    var bgFocusBrightnessValue = Pardes.$("bgFocusBrightnessValue");
    var bgFocusCenter = Pardes.$("bgFocusCenter");
    var bgRotateLeft = Pardes.$("bgRotateLeft");
    var bgRotateRight = Pardes.$("bgRotateRight");
    var bgFocusSoundToggle = Pardes.$("bgFocusSoundToggle");
    var bgFocusZoom = Pardes.$("bgFocusZoom");
    var bgFocusZoomValue = Pardes.$("bgFocusZoomValue");

    var bgFocusImg = Pardes.$("bgFocusImg");
    var bgFocusVid = Pardes.$("bgFocusVid");

    if (bgFocusImg) {
      bgFocusImg.addEventListener("load", function() {
        updatePreviewTransform();
      });
    }
    if (bgFocusVid) {
      bgFocusVid.addEventListener("loadedmetadata", function() {
        updatePreviewTransform();
      });
    }

    if (bgFocusBackdrop) bgFocusBackdrop.addEventListener("click", closeFocusEditor);
    if (bgFocusClose) bgFocusClose.addEventListener("click", closeFocusEditor);
    if (bgFocusCancel) bgFocusCancel.addEventListener("click", closeFocusEditor);

    if (bgFocusApply) {
      bgFocusApply.addEventListener("click", function() {
        var state = {
          bgX: focusState.bgX,
          bgY: focusState.bgY,
          blur: focusState.blur,
          brightness: focusState.brightness,
          rotation: focusState.rotation,
          sound: focusState.sound,
          zoom: focusState.zoom
        };

        var existing = JSON.parse(localStorage.getItem("bg.state.v2") || "{}");
        setBackground(focusState.kind, existing.value || focusState.value, state);
        closeFocusEditor();
        updatePageBackground();
      });
    }

    if (bgFocusBlurToggle) {
      bgFocusBlurToggle.addEventListener("click", function() {
        var isOn = bgFocusBlurWrap.hidden;
        bgFocusBlurWrap.hidden = !isOn;
        bgFocusBlurToggle.textContent = isOn ? "Blur: On" : "Blur: Off";
        focusState.blur = isOn ? Number(bgFocusBlurInput.value) : 0;
        applyPreviewFilter();
      });
    }

    if (bgFocusBlurInput) {
      bgFocusBlurInput.addEventListener("input", function() {
        focusState.blur = Number(bgFocusBlurInput.value);
        bgFocusBlurValue.textContent = focusState.blur + "px";
        applyPreviewFilter();
      });
    }

    if (bgFocusBrightness) {
      bgFocusBrightness.addEventListener("input", function() {
        focusState.brightness = Number(bgFocusBrightness.value);
        bgFocusBrightnessValue.textContent = focusState.brightness + "%";
        applyPreviewFilter();
      });
    }

    if (bgFocusZoom) {
      bgFocusZoom.addEventListener("input", function() {
        focusState.zoom = Number(bgFocusZoom.value) / 100;
        if (bgFocusZoomValue) {
          bgFocusZoomValue.textContent = bgFocusZoom.value + "%";
        }
        updatePreviewTransform();
      });
    }

    if (bgFocusCenter) {
      bgFocusCenter.addEventListener("click", function() {
        focusState.bgX = 50;
        focusState.bgY = 50;
        updatePreviewTransform();
      });
    }

    if (bgRotateLeft) {
      bgRotateLeft.addEventListener("click", function() {
        focusState.rotation = (focusState.rotation - 90) % 360;
        updatePreviewTransform();
      });
    }

    if (bgRotateRight) {
      bgRotateRight.addEventListener("click", function() {
        focusState.rotation = (focusState.rotation + 90) % 360;
        updatePreviewTransform();
      });
    }

    if (bgFocusSoundToggle) {
      bgFocusSoundToggle.addEventListener("click", function() {
        focusState.sound = !focusState.sound;
        bgFocusSoundToggle.textContent = focusState.sound ? "Sound: On" : "Sound: Off";
        var bgFocusVid = Pardes.$("bgFocusVid");
        if (bgFocusVid) {
          bgFocusVid.muted = !focusState.sound;
        }
      });
    }

    /* Drag to reposition in focus editor */
    if (bgFocusPreview) {
      var isDragging = false;
      var startX, startY;
      var startTx, startTy;

      bgFocusPreview.addEventListener("mousedown", function(e) {
        if (e.target.closest("button")) return;
        
        var img = Pardes.$("bgFocusImg");
        var vid = Pardes.$("bgFocusVid");
        var activeEl = focusState.kind === "image" ? img : vid;
        if (!activeEl) return;
        
        var mW = focusState.kind === "image" ? activeEl.naturalWidth : activeEl.videoWidth;
        var mH = focusState.kind === "image" ? activeEl.naturalHeight : activeEl.videoHeight;
        if (!mW || !mH) return;
        
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        
        var rect = bgFocusPreview.getBoundingClientRect();
        var vW = rect.width;
        var vH = rect.height;
        var zoom = focusState.zoom || 1;
        var xc = focusState.bgX / 100;
        var yc = focusState.bgY / 100;
        var rotation = focusState.rotation || 0;
        
        var res = computeZoomPan(vW, vH, mW, mH, zoom, xc, yc, rotation);
        startTx = res.tx;
        startTy = res.ty;
        
        bgFocusPreview.style.cursor = "grabbing";
      });

      document.addEventListener("mousemove", function(e) {
        if (!isDragging) return;
        
        var img = Pardes.$("bgFocusImg");
        var vid = Pardes.$("bgFocusVid");
        var activeEl = focusState.kind === "image" ? img : vid;
        if (!activeEl) return;
        
        var mW = focusState.kind === "image" ? activeEl.naturalWidth : activeEl.videoWidth;
        var mH = focusState.kind === "image" ? activeEl.naturalHeight : activeEl.videoHeight;
        if (!mW || !mH) return;
        
        var rect = bgFocusPreview.getBoundingClientRect();
        var vW = rect.width;
        var vH = rect.height;
        
        var dx = e.clientX - startX;
        var dy = e.clientY - startY;
        
        var targetTx = startTx + dx;
        var targetTy = startTy + dy;
        
        var rotation = focusState.rotation || 0;
        var isRotated90 = (rotation % 180 !== 0);
        var Rm = mW / mH;
        var Rv = vW / vH;
        
        var sW, sH;
        if (isRotated90) {
          var RmPrime = 1 / Rm;
          if (RmPrime > Rv) {
            sH = vH;
            sW = vH * RmPrime;
          } else {
            sW = vW;
            sH = vW / RmPrime;
          }
        } else {
          if (Rm > Rv) {
            sH = vH;
            sW = vH * Rm;
          } else {
            sW = vW;
            sH = vW / Rm;
          }
        }
        
        var vW_visual = sW * (focusState.zoom || 1);
        var vH_visual = sH * (focusState.zoom || 1);
        
        var xc = 0.5 - (targetTx / vW_visual);
        var yc = 0.5 - (targetTy / vH_visual);
        
        var res = computeZoomPan(vW, vH, mW, mH, focusState.zoom || 1, xc, yc, rotation);
        
        focusState.bgX = res.xc * 100;
        focusState.bgY = res.yc * 100;
        
        activeEl.style.transform = "translate(-50%, -50%) translate(" + res.tx + "px, " + res.ty + "px) rotate(" + rotation + "deg) scale(" + (focusState.zoom || 1) + ")";
      });

      document.addEventListener("mouseup", function() {
        if (isDragging) {
          isDragging = false;
          bgFocusPreview.style.cursor = "grab";
        }
      });

      /* Scroll wheel zoom */
      bgFocusPreview.addEventListener("wheel", function(e) {
        e.preventDefault();
        var zoomStep = e.deltaY * -0.002;
        var newZoom = Math.max(1, Math.min(5, (focusState.zoom || 1) + zoomStep));
        focusState.zoom = newZoom;
        
        var bgFocusZoom = Pardes.$("bgFocusZoom");
        var bgFocusZoomValue = Pardes.$("bgFocusZoomValue");
        if (bgFocusZoom) {
          bgFocusZoom.value = Math.round(newZoom * 100);
        }
        if (bgFocusZoomValue) {
          bgFocusZoomValue.textContent = Math.round(newZoom * 100) + "%";
        }
        
        updatePreviewTransform();
      }, { passive: false });
    }
  }

  function init() {
    var bgUpload = Pardes.$("bgUpload");
    var bgPopover = Pardes.$("bgPopover");
    var bgPickFile = Pardes.$("bgPickFile");
    var bgUrlInput = Pardes.$("bgUrlInput");
    var bgUrlApply = Pardes.$("bgUrlApply");
    var bgResetDefault = Pardes.$("bgResetDefault");

    if (bgPickFile && bgUpload) {
      bgPickFile.addEventListener("click", function() { bgUpload.click(); });
    }

    if (bgUrlApply && bgUrlInput) {
      bgUrlApply.addEventListener("click", function() {
        var url = bgUrlInput.value.trim();
        if (!url) return;
        if (/\.(mp4|webm|ogg)(\?|#|$)/i.test(url)) {
          setBackground("video", url);
          if (Pardes.$("bgFocus")) openFocusEditor("video", url);
        } else {
          setBackground("image", url);
          if (Pardes.$("bgFocus")) openFocusEditor("image", url);
        }
        if (bgPopover) bgPopover.hidden = true;
      });
      bgUrlInput.addEventListener("keydown", function(e) {
        if (e.key === "Enter") bgUrlApply.click();
      });
    }

    if (bgResetDefault) {
      bgResetDefault.addEventListener("click", resetToDefault);
    }

    initFocusEditor();

    /* Upload handler with focus editor */
    if (bgPickFile && bgUpload && Pardes.$("bgFocus")) {
      bgUpload.addEventListener("change", async function handler() {
        var file = bgUpload.files && bgUpload.files[0];
        if (!file) return;
        var isVideo = file.type.startsWith("video/");
        var kind = isVideo ? "video" : "image";

        try { await Pardes.idbPut(file); } catch (err) { void err; }

        var url = URL.createObjectURL(file);
        openFocusEditor(kind, url);
        setBackground(kind, url);
        _bgObjectUrl = url;
        bgUpload.value = "";
      }, true);
    }

    var bgImage = Pardes.$("bgImage");
    if (bgImage) {
      bgImage.addEventListener("load", updatePageBackground);
    }
    var bgVideo = Pardes.$("bgVideo");
    if (bgVideo) {
      bgVideo.addEventListener("loadedmetadata", updatePageBackground);
    }

    loadPersistedBackground();

    /* Fallback to default wallpaper when no background is persisted */
    if (!localStorage.getItem("bg.state.v2")) {
      var vid = Pardes.$("bgVideo");
      if (vid) {
        vid.muted = true;
        vid.src = "assets/wallpaper.mp4";
        vid.hidden = false;
        vid.play().catch(function() {});
      }
    }

    window.addEventListener("resize", updatePageBackground);
  }

  return {
    init: init,
    setBackground: setBackground,
    resetToDefault: resetToDefault,
    openFocusEditor: openFocusEditor,
    closeFocusEditor: closeFocusEditor,
  };
})();
