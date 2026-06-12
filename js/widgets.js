/* Pardes widgets: todo, clock, date, favorites */
Pardes.Widgets = (function() {
  var clockInterval = null;
  var is24h = Pardes.getLocal("pardes.clock24h") !== "false";
  var _updateClock = null;
  var _meta = null;

  var META = [
    { id: "todoCard",    label: "To do" },
    { id: "dateCard",    label: "Date" },
    { id: "clockCard",   label: "Clock" },
    { id: "favCard",     label: "Favorites" },
  ];

  var MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  var DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

  function getMeta() {
    if (!_meta) _meta = META;
    return _meta;
  }

  function init() {
    initTodo();
    initClock();
    initDate();
    initFavorites();
  }

  /* ---- TODO ---- */
  function initTodo() {
    var input = Pardes.$("todoInput");
    var addBtn = Pardes.$("todoAddBtn");
    var list = Pardes.$("todoList");
    var dateBtn = Pardes.$("todoDateBtn");
    var dateInput = Pardes.$("todoDate");

    function formatDate(d) {
      if (!d) return "";
      var parts = d.split("-");
      if (parts.length !== 3) return d;
      return parts[2] + "." + parts[1] + "." + parts[0];
    }

    function renderTodos() {
      var items = JSON.parse(Pardes.getLocal("pardes.todos", "[]"));
      list.innerHTML = "";
      items.forEach(function(item, i) {
        var li = document.createElement("li");
        li.className = item.done ? "done" : "";

        var label = document.createElement("label");
        var cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = !!item.done;
        cb.addEventListener("change", function() {
          items[i].done = cb.checked;
          Pardes.setLocal("pardes.todos", JSON.stringify(items));
          renderTodos();
        });
        var span = document.createElement("span");
        span.textContent = item.text;
        label.appendChild(cb);
        label.appendChild(span);
        li.appendChild(label);

        if (item.date) {
          var ds = document.createElement("span");
          ds.className = "todo-date";
          ds.textContent = formatDate(item.date);
          li.appendChild(ds);
        }

        var del = document.createElement("button");
        del.className = "todo-del";
        del.textContent = "\u2715";
        del.addEventListener("click", function() {
          items.splice(i, 1);
          Pardes.setLocal("pardes.todos", JSON.stringify(items));
          renderTodos();
        });
        li.appendChild(del);

        list.appendChild(li);
      });
    }

    if (addBtn && input) {
      addBtn.addEventListener("click", function() {
        var text = input.value.trim();
        if (!text) return;
        var items = JSON.parse(Pardes.getLocal("pardes.todos", "[]"));
        items.push({ text: text, done: false, date: dateInput ? dateInput.value : "" });
        Pardes.setLocal("pardes.todos", JSON.stringify(items));
        input.value = "";
        if (dateInput) dateInput.value = "";
        if (dateBtn) dateBtn.textContent = "Date";
        renderTodos();
      });
      input.addEventListener("keydown", function(e) {
        if (e.key === "Enter") { e.preventDefault(); addBtn.click(); }
      });
    }

    if (dateInput && dateBtn) {
      dateBtn.addEventListener("click", function() {
        dateInput.showPicker ? dateInput.showPicker() : dateInput.focus();
      });
      dateInput.addEventListener("change", function() {
        dateBtn.textContent = dateInput.value ? formatDate(dateInput.value) : "Date";
        dateBtn.classList.toggle("is-set", !!dateInput.value);
      });
    }

    renderTodos();
  }

  /* ---- CLOCK ---- */
  function initClock() {
    var clockTime = Pardes.$("clockTime");
    var clockDate = Pardes.$("clockDate");
    var clockCard = Pardes.$("clockCard");
    var btnMode = Pardes.$("btnClockModeToggle");
    var analogSvg = Pardes.$("analogClockSvg");
    var analogTicks = Pardes.$("analogTicks");
    var hourHand = Pardes.$("hourHand");
    var minuteHand = Pardes.$("minuteHand");
    var secondHand = Pardes.$("secondHand");
    var minutesToggle = document.querySelector("#clockCard .clock-minutes-toggle");

    var showSeconds = Pardes.getLocal("pardes.clockSeconds") !== "false";
    var clockMode = Pardes.getLocal("pardes.clockMode", "digital");

    if (clockMode === "analog" && clockCard) clockCard.classList.add("is-analog");

    if (analogTicks && analogSvg) {
      analogTicks.innerHTML = "";
      for (var i = 0; i < 12; i++) {
        var angle = (i * 30 - 90) * Math.PI / 180;
        var x1 = 40 * Math.cos(angle), y1 = 40 * Math.sin(angle);
        var x2 = 44 * Math.cos(angle), y2 = 44 * Math.sin(angle);
        var line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", x1); line.setAttribute("y1", y1);
        line.setAttribute("x2", x2); line.setAttribute("y2", y2);
        line.classList.add("analog-tick");
        analogTicks.appendChild(line);
      }
    }

    _updateClock = function updateClock() {
      var now = new Date();
      var h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();

      if (clockTime) {
        var displayH = is24h ? h : (h % 12 || 12);
        var ampm = !is24h ? (h < 12 ? " AM" : " PM") : "";
        var timeStr = String(displayH).padStart(2, "0") + ":" + String(m).padStart(2, "0");
        if (showSeconds) timeStr += ":" + String(s).padStart(2, "0");
        clockTime.innerHTML = timeStr + (ampm ? "<span class=\"clock-ampm\">" + ampm.trim() + "</span>" : "");
        if (clockCard) clockCard.classList.toggle("is-ampm", !!ampm);
      }

      if (clockDate) {
        clockDate.textContent = DAYS[now.getDay()] + ", " + MONTHS[now.getMonth()] + " " + now.getDate() + ", " + now.getFullYear();
      }

      if (hourHand && minuteHand && secondHand) {
        var hAngle = (h % 12) * 30 + m * 0.5;
        var mAngle = m * 6 + s * 0.1;
        var sAngle = s * 6;
        hourHand.setAttribute("transform", "rotate(" + hAngle + ")");
        minuteHand.setAttribute("transform", "rotate(" + mAngle + ")");
        secondHand.setAttribute("transform", "rotate(" + sAngle + ")");
      }
    }

    _updateClock();
    if (clockInterval) clearInterval(clockInterval);
    clockInterval = setInterval(_updateClock, 1000);

    if (btnMode) {
      btnMode.addEventListener("click", function() {
        clockMode = clockMode === "digital" ? "analog" : "digital";
        Pardes.setLocal("pardes.clockMode", clockMode);
        if (clockCard) clockCard.classList.toggle("is-analog", clockMode === "analog");
      });
    }

    if (minutesToggle) {
      minutesToggle.addEventListener("click", function() {
        showSeconds = !showSeconds;
        Pardes.setLocal("pardes.clockSeconds", showSeconds);
        _updateClock();
      });
    }
  }

  /* ---- DATE ---- */
  function initDate() {
    var weekday = Pardes.$("dateWeekday");
    var day = Pardes.$("dateDay");
    var month = Pardes.$("dateMonth");
    var calTitle = Pardes.$("calTitle");
    var calGrid = Pardes.$("calGrid");
    var calPrev = Pardes.$("calPrev");
    var calNext = Pardes.$("calNext");
    var dateCard = Pardes.$("dateCard");
    var sizeToggle = Pardes.$("btnDateSizeToggle");

    var calDate = new Date();
    var isDateWide = Pardes.getLocal("pardes.dateWide") === "true";
    if (isDateWide && dateCard) dateCard.classList.add("date-wide");

    function updateDate() {
      var now = new Date();
      if (weekday) weekday.textContent = DAYS[now.getDay()].toUpperCase();
      if (day) day.textContent = now.getDate();
      if (month) month.textContent = MONTHS[now.getMonth()].toUpperCase().slice(0, 3);
    }

    function renderCalendar() {
      if (!calGrid || !calTitle) return;
      var year = calDate.getFullYear(), m = calDate.getMonth();
      calTitle.textContent = MONTHS[m] + " " + year;

      var firstDay = new Date(year, m, 1).getDay();
      var daysInMonth = new Date(year, m + 1, 0).getDate();
      var daysInPrev = new Date(year, m, 0).getDate();
      var today = new Date();

      calGrid.innerHTML = "";

      var startOffset = firstDay === 0 ? 6 : firstDay - 1;
      for (var i = startOffset - 1; i >= 0; i--) {
        var d = document.createElement("div");
        d.textContent = daysInPrev - i;
        d.classList.add("other-month");
        calGrid.appendChild(d);
      }

      for (var i2 = 1; i2 <= daysInMonth; i2++) {
        var d2 = document.createElement("div");
        d2.textContent = i2;
        if (i2 === today.getDate() && m === today.getMonth() && year === today.getFullYear()) {
          d2.classList.add("today");
        }
        calGrid.appendChild(d2);
      }

      var total = calGrid.children.length;
      var remaining = (7 - (total % 7)) % 7;
      for (var i3 = 1; i3 <= remaining; i3++) {
        var d3 = document.createElement("div");
        d3.textContent = i3;
        d3.classList.add("other-month");
        calGrid.appendChild(d3);
      }
    }

    updateDate();
    renderCalendar();

    if (calPrev) calPrev.addEventListener("click", function() { calDate.setMonth(calDate.getMonth() - 1); renderCalendar(); });
    if (calNext) calNext.addEventListener("click", function() { calDate.setMonth(calDate.getMonth() + 1); renderCalendar(); });

    if (sizeToggle) {
      sizeToggle.addEventListener("click", function() {
        isDateWide = !isDateWide;
        Pardes.setLocal("pardes.dateWide", isDateWide);
        if (dateCard) dateCard.classList.toggle("date-wide", isDateWide);
      });
    }
  }

  /* ---- FAVORITES ---- */
  function initFavorites() {
    var favSlots = Pardes.$("favSlots");
    if (!favSlots) return;

    function renderFavorites() {
      var favs = JSON.parse(Pardes.getLocal("pardes.favorites", "[]"));
      favSlots.innerHTML = "";

      for (let i = 0; i < 3; i++) {
        var slot = document.createElement("div");
        slot.className = "fav-slot" + (favs[i] ? "" : " fav-empty");
        slot.dataset.index = i;

        if (favs[i]) {
          var img = document.createElement("img");
          img.className = "fav-ico";
          img.src = favs[i].icon || "https://www.google.com/s2/favicons?sz=64&domain_url=" + encodeURIComponent(favs[i].url);
          img.alt = favs[i].title;
          slot.title = favs[i].title;
          slot.addEventListener("click", function() { window.location.href = favs[i].url; });

          var clear = document.createElement("button");
          clear.className = "fav-clear";
          clear.textContent = "\u2715";
          clear.addEventListener("click", function(e) {
            e.stopPropagation();
            var arr = JSON.parse(Pardes.getLocal("pardes.favorites", "[]"));
            arr.splice(i, 1);
            Pardes.setLocal("pardes.favorites", JSON.stringify(arr));
            renderFavorites();
          });
          slot.appendChild(img);
          slot.appendChild(clear);
        } else {
          var num = document.createElement("div");
          num.className = "fav-num";
          num.textContent = "+";
          slot.appendChild(num);

          slot.addEventListener("click", function() {
            var url = prompt("Enter URL:");
            if (!url) return;
            var title = prompt("Enter title:", url);
            var arr = JSON.parse(Pardes.getLocal("pardes.favorites", "[]"));
            arr[i] = { url: url, title: title || url, icon: "" };
            Pardes.setLocal("pardes.favorites", JSON.stringify(arr));
            renderFavorites();
          });
        }

        favSlots.appendChild(slot);
      }
    }

    renderFavorites();
  }

  function setClock24h(val) {
    is24h = val;
    if (_updateClock) _updateClock();
  }

  return {
    init: init,
    getMeta: getMeta,
    setClock24h: setClock24h,
  };
})();
