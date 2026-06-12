/* Pardes background image/video management, focus editor, IDB persistence */

/* Shared helpers */
function bgFilter(brightness, blur) {
  var f = "brightness(" + (brightness || 100) + "%)";
  if (blur) f += " blur(" + blur + "px)";
  return f;
}

function setBodyBg(url) {
  document.body.style.backgroundImage = "url(\"" + url.replace(/"/g, '\\"') + "\")";
  document.body.style.backgroundSize = "cover";
  document.body.style.backgroundPosition = "center";
  document.body.style.backgroundRepeat = "no-repeat";
  document.body.style.backgroundAttachment = "fixed";
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
    if (_bgObjectUrl && _bgObjectUrl !== url) {
      try { URL.revokeObjectURL(_bgObjectUrl); } catch {} _bgObjectUrl = null;
    }

    if (kind === "image") {
      setBodyBg(url);
      if (bgVideo) { bgVideo.hidden = true; bgVideo.style.display = "none"; bgVideo.src = ""; }
    } else if (kind === "video" && bgVideo) {
      document.body.style.backgroundImage = "";
      bgVideo.src = url;
      bgVideo.hidden = false;
      bgVideo.style.display = "block";
    }

    saveBgState(kind, url, state);
  }

  function resetToDefault() {
    var bgVideo = Pardes.$("bgVideo");
    document.body.style.backgroundImage = "";
    if (bgVideo) { bgVideo.hidden = true; bgVideo.style.display = "none"; bgVideo.src = ""; }
    localStorage.removeItem("bg.state.v2");
    Pardes.idbDel().catch(function() {});
    if (_bgObjectUrl) { try { URL.revokeObjectURL(_bgObjectUrl); } catch {} _bgObjectUrl = null; }
    var popover = Pardes.$("bgPopover");
    if (popover) popover.hidden = true;
    if (bgVideo) {
      bgVideo.src = "assets/wallpaper.mp4";
      bgVideo.hidden = false;
      bgVideo.style.display = "block";
    }
  }

  async function loadPersistedBackground() {
    var bgRaw = localStorage.getItem("bg.state.v2");
    if (!bgRaw) return;
    var bg = JSON.parse(bgRaw);
    if (bg.value) return;

    var blob;
    try { blob = await Pardes.idbGet(); } catch {}
    if (!blob) return;

    var url = URL.createObjectURL(blob);
    _bgObjectUrl = url;

    if (bg.kind === "video") {
      var v = Pardes.$("bgVideo");
      if (v) {
        v.src = url;
        v.hidden = false;
        v.style.display = "block";
        v.style.objectPosition = (bg.bgX || 50) + "% " + (bg.bgY || 50) + "%";
        if (bg.blur || (bg.brightness && bg.brightness !== 100)) {
          v.style.filter = bgFilter(bg.brightness, bg.blur);
        }
        v.muted = !bg.sound;
      }
    } else {
      setBodyBg(url);
      document.body.style.backgroundPosition = (bg.bgX || 50) + "% " + (bg.bgY || 50) + "%";
      document.body.style.filter = bgFilter(bg.brightness, bg.blur);
    }
  }

  /* Background focus editor state */
  var focusState = {
    kind: "", value: "", bgX: 50, bgY: 50,
    blur: 0, brightness: 100, rotation: 0, sound: false
  };

  function openFocusEditor(kind, value) {
    var bgFocusImg = Pardes.$("bgFocusImg");
    var bgFocusVid = Pardes.$("bgFocusVid");
    var bgFocusBrightness = Pardes.$("bgFocusBrightness");
    var bgFocusBrightnessValue = Pardes.$("bgFocusBrightnessValue");
    var bgFocusBlurInput = Pardes.$("bgFocusBlurInput");
    var bgFocusBlurValue = Pardes.$("bgFocusBlurValue");
    var bgFocusBlurWrap = Pardes.$("bgFocusBlurWrap");
    var bgFocusSoundToggle = Pardes.$("bgFocusSoundToggle");

    focusState = {
      kind: kind, value: value, bgX: 50, bgY: 50,
      blur: 0, brightness: 100, rotation: 0, sound: false
    };

    if (kind === "image") {
      bgFocusImg.src = value;
      bgFocusImg.hidden = false;
      bgFocusVid.hidden = true;
      if (bgFocusVid.pause) bgFocusVid.pause();
    } else if (kind === "video") {
      bgFocusVid.src = value;
      bgFocusVid.hidden = false;
      bgFocusVid.play().catch(function() {});
      bgFocusImg.hidden = true;
    }

    bgFocusBrightness.value = 100;
    bgFocusBrightnessValue.textContent = "100%";
    bgFocusBlurInput.value = 0;
    bgFocusBlurValue.textContent = "0px";
    bgFocusBlurWrap.hidden = true;
    bgFocusSoundToggle.hidden = kind !== "video";
    bgFocusSoundToggle.textContent = "Sound: Off";

    resetPreviewTransform();
    var bgFocus = Pardes.$("bgFocus");
    if (bgFocus) bgFocus.hidden = false;
  }

  function resetPreviewTransform() {
    var bgFocusImg = Pardes.$("bgFocusImg");
    var bgFocusVid = Pardes.$("bgFocusVid");
    if (bgFocusImg) {
      bgFocusImg.style.transform = "scale(1)";
      bgFocusImg.style.objectPosition = "50% 50%";
    }
    if (bgFocusVid) {
      bgFocusVid.style.transform = "scale(1)";
      bgFocusVid.style.objectPosition = "50% 50%";
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
        };

        if (focusState.kind === "image") {
          document.body.style.backgroundPosition = state.bgX + "% " + state.bgY + "%";
          document.body.style.filter = bgFilter(state.brightness, state.blur);
          if (state.rotation !== 0) {
            document.body.style.transform = "rotate(" + state.rotation + "deg)";
          } else {
            document.body.style.transform = "";
          }
          var existing = JSON.parse(localStorage.getItem("bg.state.v2") || "{}");
          setBackground("image", existing.value || focusState.value, state);
        } else if (focusState.kind === "video") {
          var vid = Pardes.$("bgVideo");
          if (vid) {
            vid.style.objectPosition = state.bgX + "% " + state.bgY + "%";
            vid.style.filter = bgFilter(state.brightness, state.blur);
            vid.muted = !state.sound;
          }
          var existing2 = JSON.parse(localStorage.getItem("bg.state.v2") || "{}");
          setBackground("video", existing2.value || focusState.value, state);
        }

        closeFocusEditor();
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

    if (bgFocusCenter) {
      bgFocusCenter.addEventListener("click", function() {
        focusState.bgX = 50;
        focusState.bgY = 50;
        var img = Pardes.$("bgFocusImg");
        var vid = Pardes.$("bgFocusVid");
        if (img && !img.hidden) img.style.objectPosition = "50% 50%";
        if (vid && !vid.hidden) vid.style.objectPosition = "50% 50%";
      });
    }

    if (bgRotateLeft) {
      bgRotateLeft.addEventListener("click", function() {
        focusState.rotation = (focusState.rotation - 90) % 360;
        var img = Pardes.$("bgFocusImg");
        var vid = Pardes.$("bgFocusVid");
        var t = "rotate(" + focusState.rotation + "deg) scale(1)";
        if (img && !img.hidden) img.style.transform = t;
        if (vid && !vid.hidden) vid.style.transform = t;
      });
    }

    if (bgRotateRight) {
      bgRotateRight.addEventListener("click", function() {
        focusState.rotation = (focusState.rotation + 90) % 360;
        var img = Pardes.$("bgFocusImg");
        var vid = Pardes.$("bgFocusVid");
        var t = "rotate(" + focusState.rotation + "deg) scale(1)";
        if (img && !img.hidden) img.style.transform = t;
        if (vid && !vid.hidden) vid.style.transform = t;
      });
    }

    if (bgFocusSoundToggle) {
      bgFocusSoundToggle.addEventListener("click", function() {
        focusState.sound = !focusState.sound;
        bgFocusSoundToggle.textContent = focusState.sound ? "Sound: On" : "Sound: Off";
      });
    }

    /* Drag to reposition in focus editor */
    if (bgFocusPreview) {
      var isDragging = false;
      var startX, startY, startBgX, startBgY;

      bgFocusPreview.addEventListener("mousedown", function(e) {
        if (e.target.closest("button")) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startBgX = focusState.bgX;
        startBgY = focusState.bgY;
        bgFocusPreview.style.cursor = "grabbing";
      });

      document.addEventListener("mousemove", function(e) {
        if (!isDragging) return;
        var dx = e.clientX - startX;
        var dy = e.clientY - startY;
        var rect = bgFocusPreview.getBoundingClientRect();
        focusState.bgX = Math.max(0, Math.min(100, startBgX + (dx / rect.width) * 100));
        focusState.bgY = Math.max(0, Math.min(100, startBgY + (dy / rect.height) * 100));
        var objPos = focusState.bgX + "% " + focusState.bgY + "%";
        var img = Pardes.$("bgFocusImg");
        var vid = Pardes.$("bgFocusVid");
        if (img && !img.hidden) img.style.objectPosition = objPos;
        if (vid && !vid.hidden) vid.style.objectPosition = objPos;
      });

      document.addEventListener("mouseup", function() {
        if (isDragging) {
          isDragging = false;
          bgFocusPreview.style.cursor = "grab";
        }
      });
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

        try { await Pardes.idbPut(file); } catch (e) { console.warn("IDB put failed", e); }

        var url = URL.createObjectURL(file);
        openFocusEditor(kind, url);
        setBackground(kind, url);
        _bgObjectUrl = url;
        bgUpload.value = "";
      }, true);
    }
    loadPersistedBackground();

    /* Fallback to default wallpaper when no background is persisted */
    if (!localStorage.getItem("bg.state.v2")) {
      var vid = Pardes.$("bgVideo");
      if (vid) {
        vid.src = "assets/wallpaper.mp4";
        vid.hidden = false;
        vid.style.display = "block";
      }
    }
  }

  return {
    init: init,
    setBackground: setBackground,
    resetToDefault: resetToDefault,
    openFocusEditor: openFocusEditor,
    closeFocusEditor: closeFocusEditor,
  };
})();
