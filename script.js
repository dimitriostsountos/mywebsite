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
