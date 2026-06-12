/* Pardes customize panel: widget visibility, opacity, sidebar mode, clock format */
Pardes.Customize = (function() {
  var layoutConfig = { hidden: [], positions: {} };
  var MENU_ITEMS = [
    { id: "widgets", label: "Widgets" },
    { id: "actions", label: "Actions" },
  ];

  /* Drag state variables */
  var dragWidget = null;
  var startPointerX = 0;
  var startPointerY = 0;
  var startWidgetLeft = 0;
  var startWidgetTop = 0;
  var dashRect = null;
  var holdTimer = null;
  var startX = 0;
  var startY = 0;
  var pointerId = null;

  function applyPositions() {
    var isDesktop = window.innerWidth > 1100;
    var meta = Pardes.Widgets.getMeta();
    meta.forEach(function(m) {
      var el = Pardes.$(m.id);
      if (!el) return;
      var pos = layoutConfig.positions[m.id];
      if (pos && isDesktop) {
        el.style.position = "absolute";
        el.style.gridColumn = "auto";
        el.style.gridRow = "auto";
        el.style.left = pos.left + "px";
        el.style.top = pos.top + "px";
        el.style.margin = "0";
      } else {
        el.style.position = "";
        el.style.gridColumn = "";
        el.style.gridRow = "";
        el.style.left = "";
        el.style.top = "";
        el.style.margin = "";
      }
    });
  }

  function startDrag(widget, e) {
    dragWidget = widget;
    
    // Coordinates computed at pointerdown (pre-scale layout)
    startPointerX = startX;
    startPointerY = startY;

    widget.style.position = "absolute";
    widget.style.gridColumn = "auto";
    widget.style.gridRow = "auto";
    widget.style.left = startWidgetLeft + "px";
    widget.style.top = startWidgetTop + "px";
    widget.style.margin = "0";
    widget.style.zIndex = "99999";
    widget.classList.add("widget-dragging");

    document.body.classList.add("dragging-widget");

    window.addEventListener("pointermove", onDragMove);
    window.addEventListener("pointerup", onDragEnd);
    window.addEventListener("pointercancel", onDragEnd);
  }

  function onDragMove(e) {
    if (!dragWidget || !dashRect) return;
    var deltaX = e.clientX - startPointerX;
    var deltaY = e.clientY - startPointerY;

    var newLeft = startWidgetLeft + deltaX;
    var newTop = startWidgetTop + deltaY;

    var widgetWidth = dragWidget.offsetWidth;
    var widgetHeight = dragWidget.offsetHeight;

    var minLeft = -dashRect.left;
    var maxLeft = window.innerWidth - dashRect.left - widgetWidth;
    var minTop = -dashRect.top;
    var maxTop = window.innerHeight - dashRect.top - widgetHeight;

    newLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
    newTop = Math.max(minTop, Math.min(newTop, maxTop));

    dragWidget.style.left = newLeft + "px";
    dragWidget.style.top = newTop + "px";
  }

  function onDragEnd() {
    if (dragWidget) {
      dragWidget.classList.remove("widget-dragging");
      dragWidget.style.zIndex = "";
      
      var widgetId = dragWidget.id;
      var currentLeft = parseFloat(dragWidget.style.left);
      var currentTop = parseFloat(dragWidget.style.top);

      if (!isNaN(currentLeft) && !isNaN(currentTop)) {
        layoutConfig.positions[widgetId] = { left: currentLeft, top: currentTop };
        saveLayoutConfig();
      }

      dragWidget = null;
    }

    document.body.classList.remove("dragging-widget");

    window.removeEventListener("pointermove", onDragMove);
    window.removeEventListener("pointerup", onDragEnd);
    window.removeEventListener("pointercancel", onDragEnd);
  }

  function onPointerDown(e) {
    var layoutPanel = Pardes.$("layoutPanel");
    if (!layoutPanel || layoutPanel.dataset.open !== "1") return;

    var widget = e.target.closest(".widget");
    if (!widget) return;

    if (e.target.closest("button, input, select, textarea, a, .fav-slot, .todo-del, .fav-clear, .cal-nav")) return;

    // Capture initial bounding rects and mouse coordinates BEFORE applying .widget-holding scale transformation
    var dashArea = Pardes.$("dashArea");
    if (dashArea) {
      dashRect = dashArea.getBoundingClientRect();
      var widgetRect = widget.getBoundingClientRect();
      startWidgetLeft = widgetRect.left - dashRect.left;
      startWidgetTop = widgetRect.top - dashRect.top;
    }

    startX = e.clientX;
    startY = e.clientY;
    pointerId = e.pointerId;

    widget.classList.add("widget-holding");

    holdTimer = setTimeout(function() {
      widget.classList.remove("widget-holding");
      startDrag(widget, e);
      cleanupHold();
    }, 500);

    window.addEventListener("pointermove", onPointerMoveBeforeDrag);
    window.addEventListener("pointerup", onPointerUpBeforeDrag);
    window.addEventListener("pointercancel", onPointerUpBeforeDrag);
  }

  function onPointerMoveBeforeDrag(e) {
    if (e.pointerId !== pointerId) return;
    var deltaX = e.clientX - startX;
    var deltaY = e.clientY - startY;
    if (Math.hypot(deltaX, deltaY) > 10) {
      var widget = e.target.closest(".widget");
      if (widget) widget.classList.remove("widget-holding");
      cleanupHold();
    }
  }

  function onPointerUpBeforeDrag(e) {
    if (e.pointerId !== pointerId) return;
    var widget = e.target.closest(".widget");
    if (widget) widget.classList.remove("widget-holding");
    cleanupHold();
  }

  function cleanupHold() {
    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
    window.removeEventListener("pointermove", onPointerMoveBeforeDrag);
    window.removeEventListener("pointerup", onPointerUpBeforeDrag);
    window.removeEventListener("pointercancel", onPointerUpBeforeDrag);
  }

  function loadLayoutConfig() {
    try {
      var raw = localStorage.getItem("layout.config.v1");
      if (raw) {
        var parsed = JSON.parse(raw);
        layoutConfig.hidden = Array.isArray(parsed.hidden) ? parsed.hidden : [];
        layoutConfig.positions = parsed.positions || {};
      }
    } catch {}
    return layoutConfig;
  }

  function saveLayoutConfig() {
    try {
      localStorage.setItem("layout.config.v1", JSON.stringify(layoutConfig));
    } catch {}
  }

  function applyHiddenFromBoot() {
    var meta = Pardes.Widgets.getMeta();
    meta.forEach(function(m) {
      if (layoutConfig.hidden.indexOf(m.id) !== -1) {
        var el = Pardes.$(m.id);
        if (el) el.style.display = "none";
      }
    });
  }

  function hideWidget(id) {
    if (layoutConfig.hidden.indexOf(id) === -1) layoutConfig.hidden.push(id);
    var el = Pardes.$(id);
    if (el) el.style.display = "none";
    saveLayoutConfig();
  }

  function restoreWidget(id) {
    layoutConfig.hidden = layoutConfig.hidden.filter(function(h) { return h !== id; });
    var el = Pardes.$(id);
    if (el) el.style.display = "";
    saveLayoutConfig();
  }

  function renderWidgetList() {
    var layoutList = Pardes.$("layoutList");
    if (!layoutList) return;

    layoutList.innerHTML = "";
    var meta = Pardes.Widgets.getMeta();

    meta.forEach(function(m) {
      var div = document.createElement("div");
      div.className = "layout-item";
      div.draggable = true;
      div.dataset.widgetId = m.id;

      var nameSpan = document.createElement("span");
      nameSpan.className = "layout-item-name";
      nameSpan.textContent = m.label;
      div.appendChild(nameSpan);

      var isHidden = layoutConfig.hidden.indexOf(m.id) !== -1;
      var toggleLabel = document.createElement("label");
      toggleLabel.className = "layout-item-toggle";
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !isHidden;
      cb.addEventListener("change", function() {
        if (cb.checked) {
          restoreWidget(m.id);
        } else {
          hideWidget(m.id);
        }
      });
      var slider = document.createElement("span");
      slider.className = "layout-toggle-slider";
      toggleLabel.appendChild(cb);
      toggleLabel.appendChild(slider);
      div.appendChild(toggleLabel);

      /* Drag drop */
      div.addEventListener("dragstart", function(e) {
        e.dataTransfer.setData("text/plain", m.id);
        e.dataTransfer.effectAllowed = "move";
        div.style.opacity = "0.5";
      });

      div.addEventListener("dragend", function() {
        div.style.opacity = "1";
      });

      div.addEventListener("dragover", function(e) { e.preventDefault(); });

      div.addEventListener("drop", function(e) {
        e.preventDefault();
        var id = e.dataTransfer.getData("text/plain");
        if (!id || id === m.id) return;
        var els = layoutList.querySelectorAll(".layout-item");
        var fromEl = null, toEl = null;
        els.forEach(function(el) {
          if (el.dataset.widgetId === id) fromEl = el;
          if (el.dataset.widgetId === m.id) toEl = el;
        });
        if (fromEl && toEl) {
          layoutList.insertBefore(fromEl, toEl.nextSibling);
        }
      });

      layoutList.appendChild(div);
    });
  }

  function init() {
    loadLayoutConfig();
    applyHiddenFromBoot();
    applyPositions();
    window.addEventListener("resize", applyPositions);

    var dashArea = Pardes.$("dashArea");
    if (dashArea) {
      dashArea.addEventListener("pointerdown", onPointerDown);
    }

    var layoutToggle = Pardes.$("layoutToggle");
    var layoutPanel = Pardes.$("layoutPanel");
    var layoutDoneBtn = Pardes.$("layoutDoneBtn");
    var layoutReset = Pardes.$("layoutReset");
    var folderOpacitySlider = Pardes.$("folderOpacitySlider");
    var folderOpacityValue = Pardes.$("folderOpacityValue");
    var layoutClockFormatToggle = Pardes.$("layoutClockFormatToggle");
    var sidebarModeToggle = Pardes.$("sidebarModeToggle");

    /* Toggle panel */
    function togglePanel() {
      var isOpen = layoutPanel.dataset.open === "1";
      if (isOpen) {
        layoutPanel.dataset.open = "0";
        document.body.classList.remove("layout-editing");
      } else {
        layoutPanel.dataset.open = "1";
        document.body.classList.add("layout-editing");
        layoutConfig = loadLayoutConfig();
        renderWidgetList();
        switchTab("widgets");
      }
    }

    if (layoutToggle) layoutToggle.addEventListener("click", togglePanel);
    if (layoutDoneBtn) layoutDoneBtn.addEventListener("click", togglePanel);

    /* Tabs */
    function switchTab(tabId) {
      var items = document.querySelectorAll(".layout-menu-item");
      items.forEach(function(el) { el.classList.toggle("active", el.dataset.tab === tabId); });
      var tabs = document.querySelectorAll(".layout-tab");
      tabs.forEach(function(el) { el.classList.toggle("active", el.dataset.tab === tabId); });
    }

    var layoutMenu = Pardes.$("layoutMenu");

    if (layoutMenu) {
      layoutMenu.innerHTML = "";
      MENU_ITEMS.forEach(function(item) {
        var btn = document.createElement("button");
        btn.className = "layout-menu-item";
        btn.dataset.tab = item.id;
        btn.textContent = item.label;
        btn.addEventListener("click", function() { switchTab(item.id); });
        layoutMenu.appendChild(btn);
      });
      switchTab("widgets");
    }

    /* Reset */
    if (layoutReset) {
      layoutReset.addEventListener("click", function() {
        layoutConfig = { hidden: [], positions: {} };
        saveLayoutConfig();
        var meta = Pardes.Widgets.getMeta();
        meta.forEach(function(m) {
          var el = Pardes.$(m.id);
          if (el) {
            el.style.display = "";
            el.style.position = "";
            el.style.gridColumn = "";
            el.style.gridRow = "";
            el.style.left = "";
            el.style.top = "";
            el.style.margin = "";
          }
        });
        renderWidgetList();
      });
    }

    /* Opacity */
    if (folderOpacitySlider && folderOpacityValue) {
      var savedOp = localStorage.getItem("widgets.opacity.v1") || "100";
      folderOpacitySlider.value = savedOp;
      folderOpacityValue.textContent = savedOp + "%";
      document.documentElement.style.setProperty("--widget-glass-opacity", String(Number(savedOp) / 100));
      document.documentElement.style.setProperty("--widget-border-opacity", String(Number(savedOp) / 100));

      folderOpacitySlider.addEventListener("input", function() {
        var val = folderOpacitySlider.value;
        folderOpacityValue.textContent = val + "%";
        var decimal = Number(val) / 100;
        document.documentElement.style.setProperty("--widget-glass-opacity", String(decimal));
        document.documentElement.style.setProperty("--widget-border-opacity", String(decimal));
        localStorage.setItem("widgets.opacity.v1", val);
      });
    }

    /* Clock format */
    if (layoutClockFormatToggle) {
      var is24h = Pardes.getLocal("pardes.clock24h") !== "false";
      layoutClockFormatToggle.textContent = is24h ? "24h / 12h" : "12h / 24h";
      layoutClockFormatToggle.addEventListener("click", function() {
        is24h = !is24h;
        Pardes.setLocal("pardes.clock24h", is24h);
        layoutClockFormatToggle.textContent = is24h ? "24h / 12h" : "12h / 24h";
        if (Pardes.Widgets && Pardes.Widgets.setClock24h) Pardes.Widgets.setClock24h(is24h);
      });
    }

    /* Sidebar mode */
    if (sidebarModeToggle) {
      var savedSidebar = Pardes.getLocal("pardes.sidebarMode", "dynamic");
      if (savedSidebar === "static") document.body.classList.add("sidebar-static");
      sidebarModeToggle.textContent = savedSidebar === "dynamic" ? "Sidebar: Dynamic" : "Sidebar: Static";

      sidebarModeToggle.addEventListener("click", function() {
        var isStatic = document.body.classList.contains("sidebar-static");
        document.body.classList.toggle("sidebar-static", !isStatic);
        var mode = !isStatic ? "static" : "dynamic";
        Pardes.setLocal("pardes.sidebarMode", mode);
        sidebarModeToggle.textContent = mode === "dynamic" ? "Sidebar: Dynamic" : "Sidebar: Static";
      });
    }

    /* Background button opens popover */
    var layoutChangeBgBtn = Pardes.$("layoutChangeBgBtn");
    var bgPopover = Pardes.$("bgPopover");
    if (layoutChangeBgBtn && bgPopover) {
      layoutChangeBgBtn.addEventListener("click", function() {
        var rect = layoutChangeBgBtn.getBoundingClientRect();
        bgPopover.style.position = "fixed";
        bgPopover.style.top = Math.min(rect.bottom + 8, window.innerHeight - 300) + "px";
        bgPopover.style.left = Math.min(rect.left, window.innerWidth - 340) + "px";
        bgPopover.hidden = !bgPopover.hidden;
      });
    }

    /* Close bg popover on outside click */
    document.addEventListener("click", function(e) {
      if (bgPopover && !bgPopover.hidden) {
        var triggers = [Pardes.$("bgPickFile"), Pardes.$("bgUrlApply"), Pardes.$("bgResetDefault"), Pardes.$("bgUrlInput"), layoutChangeBgBtn];
        var isTrigger = triggers.some(function(t) { return t && (t === e.target || (t.contains && t.contains(e.target))); });
        if (!isTrigger && !bgPopover.contains(e.target)) {
          bgPopover.hidden = true;
        }
      }
    });

    /* Escape closes panel */
    document.addEventListener("keydown", function(e) {
      if (e.key === "Escape" && layoutPanel && layoutPanel.dataset.open === "1") {
        togglePanel();
      }
    });

    renderWidgetList();
  }

  return {
    init: init,
    renderWidgetList: renderWidgetList,
    loadLayoutConfig: loadLayoutConfig,
    applyHiddenFromBoot: applyHiddenFromBoot,
    layoutConfig: function() { return layoutConfig; },
  };
})();
