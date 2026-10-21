(function () {
  "use strict";

  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var motionOK = !reduceMotion.matches;

  // Run fn once when el scrolls into view (immediately if IntersectionObserver is missing)
  function onceVisible(el, fn, threshold) {
    if (!("IntersectionObserver" in window)) { fn(); return; }
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { io.disconnect(); fn(); }
    }, { threshold: threshold || 0.35 });
    io.observe(el);
  }

  // Footer year
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  // Header border/shadow once the page scrolls
  function onScroll() {
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Mobile menu
  function setMenu(open) {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    nav.classList.toggle("is-open", open);
  }
  toggle.addEventListener("click", function () {
    setMenu(toggle.getAttribute("aria-expanded") !== "true");
  });
  nav.addEventListener("click", function (e) {
    if (e.target.closest("a")) setMenu(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      setMenu(false);
      toggle.focus();
    }
  });
  window.matchMedia("(min-width: 901px)").addEventListener("change", function (mq) {
    if (mq.matches) setMenu(false);
  });

  // Move focus to the target section after in-page navigation (keyboard users)
  document.addEventListener("click", function (e) {
    var link = e.target.closest('a[href^="#"]');
    if (!link) return;
    var id = link.getAttribute("href").slice(1);
    if (id === "top") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: motionOK ? "smooth" : "auto" });
      history.replaceState(null, "", location.pathname + location.search);
      return;
    }
    var target = document.getElementById(id);
    if (target && !target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    if (target) setTimeout(function () { target.focus({ preventScroll: true }); }, 0);
  });

  // Highlight the nav link for the section in view
  var links = Array.prototype.slice.call(document.querySelectorAll(".nav-list a.nav-link"));
  var sections = links
    .map(function (a) { return document.querySelector(a.getAttribute("href")); })
    .filter(Boolean);

  function updateActive() {
    var line = header.offsetHeight + window.innerHeight * 0.3;
    var current = null;
    sections.forEach(function (s) {
      if (s.getBoundingClientRect().top <= line) current = s;
    });
    // Contact sits at the bottom of the page; no nav-link for it, so clear the highlight there
    var contact = document.getElementById("contact");
    if (contact && contact.getBoundingClientRect().top <= line) current = null;
    links.forEach(function (a) {
      var on = current && a.getAttribute("href") === "#" + current.id;
      a.classList.toggle("is-active", !!on);
      if (on) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
  }

  // Experience timeline: the line fills in as you scroll, markers light up when reached
  var timeline = document.querySelector(".timeline");
  var roles = timeline ? Array.prototype.slice.call(timeline.querySelectorAll(".role")) : [];

  function markerOffset(role) {
    var marker = role.querySelector(".role-body");
    var top = window.getComputedStyle(role).gridTemplateColumns.split(" ").length > 1 ? marker.offsetTop : role.offsetTop;
    return top + 13;
  }

  function updateTimeline() {
    if (!timeline) return;
    var max = markerOffset(roles[roles.length - 1]);
    var progress = window.innerHeight * 0.55 - timeline.getBoundingClientRect().top;
    progress = Math.max(0, Math.min(max, progress));
    timeline.style.setProperty("--tl-progress", progress + "px");
    var current = null;
    roles.forEach(function (role) {
      var reached = markerOffset(role) <= progress + 1;
      role.classList.toggle("is-reached", reached);
      if (reached) current = role;
    });
    roles.forEach(function (role) { role.classList.toggle("is-current", role === current); });
  }

  var ticking = false;
  function onScrollFrame() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { updateActive(); updateTimeline(); ticking = false; });
  }
  window.addEventListener("scroll", onScrollFrame, { passive: true });
  window.addEventListener("resize", onScrollFrame);
  updateActive();
  updateTimeline();

  // Pause the hero SVG animation for reduced-motion users
  var flow = document.getElementById("flow-svg");
  function syncMotion() {
    if (!flow || !flow.pauseAnimations) return;
    if (reduceMotion.matches) flow.pauseAnimations();
    else flow.unpauseAnimations();
  }
  syncMotion();
  reduceMotion.addEventListener("change", syncMotion);

  // Hero flow: hover, focus or tap a node to see the work behind it
  var FLOW_NOTES = {
    checkout: ["Checkout", "Ran continuous A/B tests on checkout design, pricing, offers and payment methods, and owned the payments side of the Apple Pay and Google Pay launch in France."],
    orchestration: ["Orchestration", "Payment flows across around five entities, with roughly five MIDs each, on ten payment platforms."],
    route: ["Route", "Tracked authorization and declines down to PSP, BIN and card type, and asked PSPs to reroute traffic when one underperformed."],
    retry: ["Retry", "Owned recurring billing, failed payments, retries and dunning, and helped move retry logic from Sticky.io Smart Dunning in-house."],
    authorized: ["Authorized", "Traced one market's authorization drop to an incorrect Mastercard prepaid parameter and drove the fix: ≈ +7% authorization."]
  };
  var caption = document.getElementById("flow-caption");
  var flowNodes = Array.prototype.slice.call(document.querySelectorAll(".flow-node"));

  function showFlowNote(node) {
    var note = FLOW_NOTES[node.getAttribute("data-node")];
    if (!note || !caption) return;
    flowNodes.forEach(function (n) {
      n.classList.toggle("is-active", n === node);
      n.setAttribute("aria-pressed", String(n === node));
    });
    caption.innerHTML = "";
    var title = document.createElement("strong");
    title.textContent = note[0];
    caption.appendChild(title);
    caption.appendChild(document.createTextNode(note[1]));
  }
  flowNodes.forEach(function (node) {
    node.setAttribute("aria-pressed", "false");
    node.addEventListener("mouseenter", function () { showFlowNote(node); });
    node.addEventListener("focus", function () { showFlowNote(node); });
    node.addEventListener("click", function () { showFlowNote(node); });
    node.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); showFlowNote(node); }
    });
  });

  // "How I investigate a problem": each step shows its part of the authorization case
  var STEP_EXAMPLES = [
    "I spotted the underperforming market in our payment KPIs.",
    "I broke declines down by country, MID, PSP, payment method and card type until the pattern pointed at Mastercard prepaid cards.",
    "I validated the finding with BI before acting on it.",
    "I traced the problem to an incorrect parameter on Mastercard prepaid transactions and drove the fix with Technology and the payment partner.",
    "I confirmed the recovery in the data. Authorization in that market improved by about 7%."
  ];
  var stepButtons = Array.prototype.slice.call(document.querySelectorAll(".step-btn"));
  var stepText = document.querySelector(".step-example-text");
  stepButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var i = Number(btn.getAttribute("data-step"));
      stepButtons.forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
      stepText.textContent = STEP_EXAMPLES[i];
      stepText.classList.remove("is-swapping");
      void stepText.offsetWidth; // restart the fade
      stepText.classList.add("is-swapping");
    });
  });

  // Count-up for the headline numbers
  function countUp(el) {
    var target = Number(el.getAttribute("data-count"));
    var prefix = el.getAttribute("data-prefix") || "";
    var suffix = el.getAttribute("data-suffix") || "";
    var final = el.textContent;
    var start = null;
    var duration = 1300;
    el.textContent = prefix + "0" + suffix;
    function frame(t) {
      if (start === null) start = t;
      var k = Math.min(1, (t - start) / duration);
      var eased = 1 - Math.pow(1 - k, 3);
      el.textContent = k < 1 ? prefix + Math.round(target * eased) + suffix : final;
      if (k < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  if (motionOK) {
    Array.prototype.slice.call(document.querySelectorAll("[data-count]")).forEach(function (el) {
      el.textContent = (el.getAttribute("data-prefix") || "") + "0" + (el.getAttribute("data-suffix") || "");
      var finalText = (el.getAttribute("data-prefix") || "") + el.getAttribute("data-count") + (el.getAttribute("data-suffix") || "");
      onceVisible(el, function () { el.textContent = finalText; countUp(el); }, 0.6);
    });
  }

  // Case study visuals animate in when they scroll into view
  var STATUS = {
    waiting: ["status--waiting", "Waiting"],
    progress: ["status--progress", "In progress"],
    done: ["status--done", "Done"]
  };
  function setStatus(el, key) {
    el.classList.remove("status--waiting", "status--progress", "status--done");
    el.classList.add(STATUS[key][0]);
    el.textContent = STATUS[key][1];
  }
  function playBoard(board) {
    var statuses = board.querySelectorAll(".status");
    var bell = board.querySelector(".board-note");
    if (statuses.length < 3) return;
    for (var i = 0; i < statuses.length; i++) setStatus(statuses[i], "waiting");
    var steps = [
      [500, function () { setStatus(statuses[0], "progress"); }],
      [1400, function () { setStatus(statuses[0], "done"); setStatus(statuses[1], "progress"); }]
    ];
    steps.forEach(function (s) {
      setTimeout(function () {
        s[1]();
        if (bell) {
          bell.classList.remove("is-ringing");
          void bell.offsetWidth;
          bell.classList.add("is-ringing");
        }
      }, s[0]);
    });
  }
  Array.prototype.slice.call(document.querySelectorAll(".case-visual")).forEach(function (visual) {
    if (!motionOK) return;
    Array.prototype.slice.call(visual.querySelectorAll(".chip")).forEach(function (chip, i) {
      chip.style.setProperty("--i", i);
      var li = chip.closest(".flow li");
      if (li) li.style.setProperty("--i", i);
    });
    var board = visual.querySelector(".board");
    if (board) {
      var statuses = board.querySelectorAll(".status");
      for (var i = 0; i < statuses.length; i++) setStatus(statuses[i], "waiting");
    }
    onceVisible(visual, function () {
      visual.classList.add("is-visible");
      if (board) playBoard(board);
    }, 0.5);
  });

  // Copy email address
  Array.prototype.slice.call(document.querySelectorAll(".copy-btn")).forEach(function (btn) {
    var label = btn.querySelector(".copy-label");
    var icon = btn.querySelector("use");
    var timer = null;
    btn.hidden = false;
    btn.setAttribute("aria-label", "Copy email address");
    btn.addEventListener("click", function () {
      var value = btn.getAttribute("data-copy");
      var done = function () {
        btn.classList.add("is-copied");
        label.textContent = "Copied";
        icon.setAttribute("href", "#i-check");
        btn.setAttribute("aria-label", "Email address copied");
        clearTimeout(timer);
        timer = setTimeout(function () {
          btn.classList.remove("is-copied");
          label.textContent = "Copy";
          icon.setAttribute("href", "#i-copy");
          btn.setAttribute("aria-label", "Copy email address");
        }, 2000);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(value).then(done, fallback);
      } else {
        fallback();
      }
      function fallback() {
        var ta = document.createElement("textarea");
        ta.value = value;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try { if (document.execCommand("copy")) done(); } catch (err) { /* leave the button as is */ }
        ta.remove();
      }
    });
  });
})();
/* ---------- Motion ideas: trace, coverage, decoder, chart, slider, marquee ---------- */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function $(id) { return document.getElementById(id); }

  /* 8. Marquee */
  var mq = document.querySelector(".fx-marquee");
  if (mq && !reduce) {
    var list = mq.querySelector(".platform-list"), track = document.createElement("div");
    track.className = "fx-marquee-track";
    list.parentNode.insertBefore(track, list); track.appendChild(list);
    var copy = list.cloneNode(true); copy.setAttribute("aria-hidden", "true"); track.appendChild(copy);
  }

  /* 1. Transaction trace (one or more panels) */
  Array.prototype.slice.call(document.querySelectorAll(".fx-trace-panel")).forEach(function (panel) {
    var hops = Array.prototype.slice.call(panel.querySelectorAll(".fx-hop"));
    var log = panel.querySelector(".fx-log"), timers = [];
    function line(t, cls, msg) {
      var d = document.createElement("div");
      var x = document.createElement("span"); x.className = "t"; x.textContent = t;
      var y = document.createElement("span"); y.className = cls; y.textContent = msg;
      d.appendChild(x); d.appendChild(y); log.appendChild(d);
    }
    function at(ms, fn) { timers.push(setTimeout(fn, ms)); }
    function run() {
      timers.forEach(clearTimeout); timers = [];
      log.innerHTML = "";
      hops.forEach(function (h) { h.className = "fx-hop"; h.querySelector(".fx-alt").textContent = ""; });
      var t = 0;
      at(t, function () { hops[0].classList.add("lit"); line("00:00", "hi", "auth request · Mastercard prepaid · FR"); });
      [1, 2, 3, 4].forEach(function (i) { t += 550; at(t, function () { hops[i].classList.add("lit"); }); });
      t += 500; at(t, function () { hops[4].classList.add("fail"); line("00:01", "bad", "✕ 05 · Do Not Honor"); });
      t += 1100; at(t, function () { line("00:02", "warn", "investigating · split by MID, PSP, BIN, card type"); });
      t += 1100; at(t, function () { line("00:03", "warn", "root cause · wrong prepaid parameter"); hops[3].querySelector(".fx-alt").textContent = "param fixed"; });
      t += 1100; at(t, function () { line("00:04", "hi", "fix applied · retry"); hops.forEach(function (h) { h.classList.remove("lit", "fail"); }); hops[0].classList.add("pass"); });
      [1, 2, 3, 4].forEach(function (i) { t += 450; at(t, function () { hops[i].classList.add("pass"); }); });
      t += 400; at(t, function () { line("00:05", "ok", "✓ 00 · Approved"); });
      t += 4500; at(t, run);
    }
    panel.querySelector(".fx-replay").addEventListener("click", run);
    if (reduce) { hops.forEach(function (h) { h.classList.add("pass"); }); return; }
    if ("IntersectionObserver" in window) {
      var started = false;
      new IntersectionObserver(function (e) { if (e[0].isIntersecting && !started) { started = true; run(); } }, { threshold: .3 }).observe(panel);
    } else { run(); }
  });

  /* 2. Coverage */
  var layers = ["Data and root cause", "Payments know-how", "Product delivery", "AI automation", "Merchants and stakeholders"];
  var profiles = {
    analyst: { head: "Covers 1 of 5 layers", s: ["on", "part", "off", "off", "part"],
      d: ["Dashboards, SQL, reporting", "Knows the KPIs, not the payment flow", "Not included", "Not included", "Reports to stakeholders"] },
    ops: { head: "Covers 1 of 5 layers", s: ["part", "on", "off", "off", "part"],
      d: ["Reads the dashboards", "PSPs, routing, disputes", "Not included", "Not included", "Partner contact"] },
    me: { head: "Covers all 5 layers", s: ["on", "on", "on", "on", "on"],
      d: ["Decline breakdowns by MID, PSP and BIN; ≈ +7% authorization", "9 platforms, routing, 3DS, fraud and chargebacks", "Apple Pay and Google Pay live in France", "AI agents: 2 weeks → 4 days", "Merchants, PSPs, Finance and CEO reporting"] }
  };
  var label = { on: "Covered", part: "Partly", off: "Not included" };
  var rows = $("fxRows");
  if (rows) {
    var slabs = Array.prototype.slice.call(document.querySelectorAll("#fxStack .fx-slab")).reverse();
    var tabs = document.querySelectorAll(".fx-tab");
    var show = function (key) {
      var p = profiles[key];
      $("fxCoverHead").textContent = p.head;
      rows.innerHTML = "";
      layers.forEach(function (name, i) {
        var r = document.createElement("div"); r.className = "fx-row";
        r.innerHTML = '<span class="n">0' + (i + 1) + '</span><span><b></b><small></small></span><span class="fx-chip ' + p.s[i] + '"></span>';
        r.querySelector("b").textContent = name;
        r.querySelector("small").textContent = p.d[i];
        r.querySelector(".fx-chip").textContent = label[p.s[i]];
        rows.appendChild(r);
        slabs[i].className = "fx-slab" + (p.s[i] === "on" ? " on" : p.s[i] === "part" ? " part" : "");
      });
      tabs.forEach(function (b) { b.setAttribute("aria-selected", String(b.getAttribute("data-p") === key)); });
    };
    tabs.forEach(function (b) { b.addEventListener("click", function () { show(b.getAttribute("data-p")); }); });
    show("me");
  }

  /* 4. Decoder */
  var codes = {
    "05": { t: "Do Not Honor", m: "A generic decline from the issuer. It hides the real reason, so the pattern matters more than the single transaction.", type: "Soft · investigate",
      c: ["Split by BIN, card type, MID and PSP to find the pattern", "Check 3DS and the parameters sent to the issuer", "Compare with other markets and acquirers"] },
    "51": { t: "Insufficient Funds", m: "The card is valid but the balance is too low. Common on recurring subscription payments.", type: "Soft · retry later",
      c: ["Retry timing and dunning logic", "Retry around typical pay days", "Customer messaging before the next attempt"] },
    "54": { t: "Expired Card", m: "The card on file has expired. The customer still wants to pay.", type: "Hard · update card",
      c: ["Account updater with the acquirer", "Card-update flow and reminder emails", "Share of subscriptions with cards expiring soon"] },
    "57": { t: "Not Permitted to Cardholder", m: "The issuer does not allow this type of transaction on this card, often prepaid or restricted cards.", type: "Hard · check setup",
      c: ["Card type and prepaid handling", "MCC and transaction flags sent to the scheme", "Whether to route these cards differently"] },
    "91": { t: "Issuer Unavailable", m: "A technical problem on the issuer or network side. The payment might pass a few minutes later.", type: "Soft · technical",
      c: ["PSP and acquirer status", "Short-delay retry or reroute to another acquirer", "Whether it clusters on one issuer or region"] },
    "14": { t: "Invalid Card Number", m: "The card number does not exist. Usually a typo, sometimes a card-testing attack.", type: "Hard · validate",
      c: ["Card number validation at checkout", "Spikes that point to card testing", "Velocity rules and BIN blocking"] }
  };
  var codesEl = $("fxCodes");
  if (codesEl) {
    var pick = function (k) {
      var c = codes[k];
      $("fxDcTitle").textContent = k + " · " + c.t;
      $("fxDcMean").textContent = c.m;
      var ty = $("fxDcType"); ty.textContent = c.type; ty.className = "fx-chip " + (c.type.indexOf("Soft") === 0 ? "part" : "off");
      var ul = $("fxDcCheck"); ul.innerHTML = "";
      c.c.forEach(function (x) { var li = document.createElement("li"); li.textContent = x; ul.appendChild(li); });
      codesEl.querySelectorAll(".fx-code").forEach(function (b) { b.setAttribute("aria-pressed", String(b.textContent === k)); });
    };
    ["05", "51", "54", "57", "91", "14"].forEach(function (k) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "fx-code"; b.textContent = k; b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function () { pick(k); });
      codesEl.appendChild(b);
    });
    pick("05");
  }

  /* 5. Chart (illustrative shape) */
  var pts = [[40, 72], [81, 70], [122, 74], [164, 71], [205, 112], [247, 150], [288, 154], [330, 151], [371, 118], [413, 78], [454, 60], [496, 52], [537, 48]];
  var lineEl = $("fxChartLine"), areaEl = $("fxChartArea"), anns = ["fxAnn1", "fxAnn2", "fxAnn3", "fxAnn4"];
  if (lineEl) {
    var pathTo = function (n) { var d = ""; for (var i = 0; i <= n; i++) d += (i ? " L" : "M") + pts[i][0] + " " + pts[i][1]; return d; };
    var paint = function (n) { var d = pathTo(n); lineEl.setAttribute("d", d); areaEl.setAttribute("d", d + " L" + pts[n][0] + " 190 L40 190 Z"); };
    var timer = null;
    var runChart = function () {
      clearInterval(timer);
      anns.forEach(function (id) { $(id).classList.remove("show"); });
      var n = 0;
      var step = function () {
        paint(n);
        if (n === 4) $("fxAnn1").classList.add("show");
        if (n === 6) $("fxAnn2").classList.add("show");
        if (n === 8) $("fxAnn3").classList.add("show");
        if (n === pts.length - 1) { $("fxAnn4").classList.add("show"); clearInterval(timer); }
        n++;
      };
      step(); timer = setInterval(step, 380);
    };
    paint(pts.length - 1); anns.forEach(function (id) { $(id).classList.add("show"); });
    $("fxChartReplay").addEventListener("click", runChart);
    if (!reduce && "IntersectionObserver" in window) {
      var started = false;
      new IntersectionObserver(function (e) { if (e[0].isIntersecting && !started) { started = true; runChart(); } }, { threshold: .4 }).observe(lineEl.ownerSVGElement);
    }
  }

  /* 6. Before/after slider */
  var range = $("fxBaRange");
  if (range) {
    var upd = function () {
      var v = range.value / 100, days = Math.round(14 - 10 * v);
      $("fxBaDays").textContent = days;
      $("fxBaBar").style.width = (days / 14 * 100) + "%";
      var mode = $("fxBaMode"); mode.textContent = v < .5 ? "Manual" : "AI-assisted"; mode.style.color = v < .5 ? "" : "var(--ok)";
      document.querySelectorAll(".fx-ba-steps .fx-chip").forEach(function (c) {
        var on = v >= parseFloat(c.getAttribute("data-auto"));
        c.textContent = on ? c.getAttribute("data-on") : "Manual";
        c.className = "fx-chip " + (on ? "on" : "off");
      });
    };
    range.addEventListener("input", upd); upd();
  }
})();
