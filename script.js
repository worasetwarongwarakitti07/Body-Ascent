/* ==========================================================================
   Body Scent — script.js (ใช้ร่วมทุกหน้า)
   ตรวจจาก element ที่มีในหน้านั้นๆ แล้วรันเฉพาะฟังก์ชันที่เกี่ยวข้อง
   - product.html : #product-list, #filter-bar
   - order.html   : #items, #total, #orderForm
   - admin.html   : #ordersTable
   ========================================================================== */

(function () {
  "use strict";

  var STORAGE_KEY = "bodyScentOrders";
  var MOODS = ["fresh", "sweet", "confident", "romance"];
  var MOOD_LABELS = {
    fresh: "Fresh",
    sweet: "Sweet",
    confident: "Confident",
    romance: "Romance"
  };
  var TYPE_LABELS = {
    spray: "สเปรย์",
    rollon: "โรลออน"
  };

  /* ---------- Helpers ---------- */

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatPrice(n) {
    var num = Number(n);
    return isFinite(num) ? num.toLocaleString("th-TH") : "";
  }

  function setValue(el, value) {
    if (!el) return;
    if ("value" in el) {
      el.value = value;
    } else {
      el.textContent = value;
    }
  }

  function getValue(el) {
    if (!el) return "";
    return ("value" in el ? el.value : el.textContent || "").trim();
  }

  // หา field ในฟอร์มจาก name หรือ id
  function getField(form, key) {
    return form.querySelector('[name="' + key + '"], #' + key);
  }

  function readOrders() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var data = raw ? JSON.parse(raw) : [];
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error("อ่านคำสั่งซื้อไม่สำเร็จ:", err);
      return [];
    }
  }

  /* ==========================================================================
     product.html
     ========================================================================== */

  function initProducts(list) {
    var bar = document.getElementById("filter-bar");
    var products = [];

    list.classList.add("grid");
    list.setAttribute("aria-live", "polite");

    // mood เริ่มต้นจาก ?mood=xxx
    var param = new URLSearchParams(window.location.search).get("mood");
    param = param ? param.toLowerCase() : "";
    var current = MOODS.indexOf(param) !== -1 ? param : "all";

    function cardHTML(p) {
      var itemName = p.name + (p.size ? " " + p.size : "");
      var query = new URLSearchParams({ item: itemName, price: p.price });
      var typeText = (TYPE_LABELS[p.type] || p.type) + (p.size ? " " + p.size : "");

      return (
        '<article class="card" data-mood="' + esc(p.mood) + '">' +
          '<div class="card__image">' +
            '<img src="' + esc(p.image) + '" alt="' + esc(p.name) + '" loading="lazy">' +
          "</div>" +
          '<div class="card__body">' +
            '<div class="card__meta">' +
              '<span class="mood-dot"></span>' +
              "<span>" + esc(MOOD_LABELS[p.mood] || p.mood) + "</span>" +
              "<span>" + esc(typeText) + "</span>" +
            "</div>" +
            '<h3 class="card__title">' + esc(p.name) + "</h3>" +
            '<p class="card__desc">' + esc(p.description) + "</p>" +
            '<div class="card__foot">' +
              '<span class="price">' + esc(formatPrice(p.price)) + "<small>บาท</small></span>" +
              '<a class="btn btn--accent" href="order.html?' + esc(query.toString()) + '">สั่งซื้อ</a>' +
            "</div>" +
          "</div>" +
        "</article>"
      );
    }

    function render() {
      var shown = products.filter(function (p) {
        return current === "all" || p.mood === current;
      });

      if (!shown.length) {
        list.innerHTML =
          '<p class="text-center" style="grid-column:1/-1">ไม่พบสินค้าในหมวดนี้</p>';
        return;
      }
      list.innerHTML = shown.map(cardHTML).join("");
    }

    function filterValue(btn) {
      return btn.dataset.filter || btn.dataset.mood || "all";
    }

    function updateButtons() {
      if (!bar) return;
      bar.querySelectorAll("button").forEach(function (btn) {
        var active = filterValue(btn) === current;
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-pressed", active ? "true" : "false");
      });
    }

    function setFilter(mood) {
      current = mood;
      updateButtons();
      render();
      try {
        var url = new URL(window.location.href);
        if (mood === "all") {
          url.searchParams.delete("mood");
        } else {
          url.searchParams.set("mood", mood);
        }
        window.history.replaceState(null, "", url);
      } catch (err) {
        /* ไม่สำคัญ: แค่ไม่อัปเดต URL */
      }
    }

    // สร้างปุ่มกรองให้ ถ้าใน HTML ยังไม่มีปุ่ม
    if (bar) {
      if (!bar.querySelector("button")) {
        bar.classList.add("filters");
        bar.innerHTML = [["all", "ทั้งหมด"]]
          .concat(
            MOODS.map(function (m) {
              return [m, MOOD_LABELS[m]];
            })
          )
          .map(function (f) {
            var dot =
              f[0] === "all"
                ? ""
                : '<span class="mood-dot" data-mood="' + f[0] + '"></span>';
            return (
              '<button type="button" class="filter" data-filter="' + f[0] + '">' +
              dot + esc(f[1]) + "</button>"
            );
          })
          .join("");
      }

      bar.addEventListener("click", function (e) {
        var btn = e.target.closest("button");
        if (btn && bar.contains(btn)) setFilter(filterValue(btn));
      });
    }

    fetch("products.json")
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        products = Array.isArray(data) ? data : [];
        updateButtons();
        render();
      })
      .catch(function (err) {
        console.error("โหลด products.json ไม่สำเร็จ:", err);
        list.innerHTML =
          '<p class="text-center" style="grid-column:1/-1">' +
          "ไม่สามารถโหลดรายการสินค้าได้ กรุณาลองใหม่อีกครั้ง</p>";
      });
  }

  /* ==========================================================================
     order.html
     ========================================================================== */

  function initOrder() {
    var params = new URLSearchParams(window.location.search);
    var itemsEl = document.getElementById("items");
    var totalEl = document.getElementById("total");
    var form = document.getElementById("orderForm");

    var item = (params.get("item") || "").trim();
    var priceNum = Number(params.get("price"));
    var hasPrice = params.get("price") !== null && params.get("price") !== "" &&
      isFinite(priceNum) && priceNum >= 0;

    // เติมทั้งสองช่องเสมอ
    setValue(itemsEl, item);
    if (totalEl) {
      if ("value" in totalEl) {
        setValue(totalEl, hasPrice ? String(priceNum) : "");
      } else {
        setValue(totalEl, hasPrice ? formatPrice(priceNum) + " บาท" : "");
      }
    }

    if (!form) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (typeof form.reportValidity === "function" && !form.reportValidity()) return;

      var totalText = getValue(totalEl).replace(/[^\d.]/g, "");
      var totalNum = parseFloat(totalText);

      var payload = {
        customerName: getValue(getField(form, "customerName")),
        contact: getValue(getField(form, "contact")),
        items: getValue(itemsEl),
        total: isFinite(totalNum) ? totalNum : 0,
        note: getValue(getField(form, "note")),
        timestamp: new Date().toISOString()
      };

      try {
        var orders = readOrders();
        orders.push(payload);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
      } catch (err) {
        console.error("บันทึกคำสั่งซื้อไม่สำเร็จ:", err);
        window.alert("ไม่สามารถบันทึกคำสั่งซื้อได้ กรุณาลองใหม่อีกครั้ง");
        return;
      }

      window.location.href = "thankyou.html";
    });
  }

  /* ==========================================================================
     admin.html
     ========================================================================== */

  function initAdmin(table) {
    var tbody = table.querySelector("tbody") || table.appendChild(document.createElement("tbody"));
    var orders = readOrders().slice().sort(function (a, b) {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    tbody.textContent = "";

    if (!orders.length) {
      var cols = table.querySelectorAll("thead th").length || 6;
      var emptyRow = document.createElement("tr");
      var emptyCell = document.createElement("td");
      emptyCell.colSpan = cols;
      emptyCell.className = "text-center";
      emptyCell.textContent = "ยังไม่มีคำสั่งซื้อ";
      emptyRow.appendChild(emptyCell);
      tbody.appendChild(emptyRow);
      return;
    }

    orders.forEach(function (o) {
      var date = new Date(o.timestamp);
      var dateText = isNaN(date.getTime()) ? "-" : date.toLocaleString("th-TH");
      var totalText = isFinite(Number(o.total)) ? formatPrice(o.total) + " บาท" : "-";

      // ใช้ textContent ทั้งหมด เพื่อไม่ให้ข้อความจากลูกค้าถูกตีความเป็น HTML
      [dateText, o.customerName, o.contact, o.items, totalText, o.note].reduce(
        function (row, text) {
          var td = document.createElement("td");
          td.textContent = text == null || text === "" ? "-" : text;
          row.appendChild(td);
          return row;
        },
        tbody.appendChild(document.createElement("tr"))
      );
    });
  }

  /* ---------- Init: ตรวจ element แล้วรันเฉพาะที่มีในหน้า ---------- */

  function init() {
    var productList = document.getElementById("product-list");
    if (productList) initProducts(productList);

    if (
      document.getElementById("orderForm") ||
      document.getElementById("items") ||
      document.getElementById("total")
    ) {
      initOrder();
    }

    var ordersTable = document.getElementById("ordersTable");
    if (ordersTable) initAdmin(ordersTable);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
