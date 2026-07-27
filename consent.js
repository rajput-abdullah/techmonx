/*
 * TechMonx — cookie consent + privacy-conscious GA4 loader
 * -----------------------------------------------------------------
 * - Sets Google Consent Mode v2 to "denied" by default on every page,
 *   before anything else runs.
 * - Shows a first-visit banner (Accept all / Reject non-essential /
 *   Manage preferences) and a fuller preferences modal.
 * - Only loads GA4 (gtag.js) after the visitor explicitly accepts
 *   analytics — the tag is never present in page source.
 * - Exposes window.techmonxTrack(name, params) so other scripts can
 *   fire events safely; it no-ops until analytics is actually active
 *   and never accepts PII fields.
 * - Persists the choice in localStorage so it's honoured on return
 *   visits, and exposes .js-cookie-settings links (footer) to reopen
 *   the preferences modal at any time.
 */
(function () {
  "use strict";

  var CONSENT_KEY = "techmonx_cookie_consent_v1";
  var CONSENT_VERSION = 1;

  // ---- Consent Mode v2: deny everything by default, immediately ----
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = window.gtag || gtag;

  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    functionality_storage: "granted",
    security_storage: "granted",
    wait_for_update: 500
  });

  function readConsent() {
    try {
      var raw = window.localStorage.getItem(CONSENT_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== CONSENT_VERSION) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function writeConsent(analytics) {
    var record = {
      analytics: !!analytics,
      timestamp: new Date().toISOString(),
      version: CONSENT_VERSION
    };
    try {
      window.localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
    } catch (e) {
      /* localStorage unavailable (private mode etc.) — consent still
         applies for this page load, just won't persist */
    }
    return record;
  }

  // ---- GA4 loader — only ever called after explicit opt-in ----
  var ga4Loaded = false;
  function loadGA4() {
    if (ga4Loaded) return;
    var id = window.TECHMONX_GA4_ID;
    if (!id) return; // no Measurement ID configured yet — stay inert
    ga4Loaded = true;

    gtag("consent", "update", {
      analytics_storage: "granted"
    });

    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
    document.head.appendChild(script);

    gtag("js", new Date());
    gtag("config", id, {
      anonymize_ip: true,
      allow_google_signals: false,
      send_page_view: true
    });
  }

  function applyConsent(record) {
    if (record && record.analytics) {
      loadGA4();
    } else {
      gtag("consent", "update", {
        analytics_storage: "denied"
      });
    }
  }

  // ---- Public tracking helper — no PII, no-ops until analytics is active ----
  window.techmonxTrack = function (eventName, params) {
    if (!ga4Loaded || !eventName) return;
    var safeParams = {};
    if (params && typeof params === "object") {
      Object.keys(params).forEach(function (key) {
        var value = params[key];
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
          safeParams[key] = value;
        }
      });
    }
    gtag("event", eventName, safeParams);
  };

  // ---- Boot: apply any stored choice immediately ----
  var existing = readConsent();
  if (existing) {
    applyConsent(existing);
  }

  // ---- UI wiring ----
  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  ready(function () {
    var banner = document.getElementById("cookieBanner");
    var modal = document.getElementById("cookieModal");
    var toggleAnalytics = document.getElementById("cookieToggleAnalytics");
    var btnAcceptAll = document.getElementById("cookieAcceptAll");
    var btnRejectNonEssential = document.getElementById("cookieRejectNonEssential");
    var btnManage = document.getElementById("cookieManage");
    var btnModalSave = document.getElementById("cookieModalSave");
    var btnModalAcceptAll = document.getElementById("cookieModalAcceptAll");
    var btnModalClose = document.getElementById("cookieModalClose");

    function hideBanner() {
      if (banner) banner.classList.remove("is-visible");
    }
    function showBanner() {
      if (banner) banner.classList.add("is-visible");
    }
    function openModal() {
      if (!modal) return;
      var current = readConsent();
      if (toggleAnalytics) toggleAnalytics.checked = !!(current && current.analytics);
      modal.classList.add("open");
      document.body.classList.add("cookie-modal-open");
    }
    function closeModal() {
      if (!modal) return;
      modal.classList.remove("open");
      document.body.classList.remove("cookie-modal-open");
    }

    // First visit (no stored choice yet): show the banner.
    if (!existing) {
      showBanner();
    }

    if (btnAcceptAll) {
      btnAcceptAll.addEventListener("click", function () {
        var record = writeConsent(true);
        applyConsent(record);
        hideBanner();
        closeModal();
      });
    }
    if (btnRejectNonEssential) {
      btnRejectNonEssential.addEventListener("click", function () {
        var record = writeConsent(false);
        applyConsent(record);
        hideBanner();
        closeModal();
      });
    }
    if (btnManage) {
      btnManage.addEventListener("click", function () {
        openModal();
      });
    }
    if (btnModalSave) {
      btnModalSave.addEventListener("click", function () {
        var wantsAnalytics = toggleAnalytics ? !!toggleAnalytics.checked : false;
        var record = writeConsent(wantsAnalytics);
        applyConsent(record);
        hideBanner();
        closeModal();
      });
    }
    if (btnModalAcceptAll) {
      btnModalAcceptAll.addEventListener("click", function () {
        var record = writeConsent(true);
        applyConsent(record);
        hideBanner();
        closeModal();
      });
    }
    if (btnModalClose) {
      btnModalClose.addEventListener("click", function () {
        closeModal();
      });
    }
    if (modal) {
      modal.addEventListener("click", function (e) {
        if (e.target === modal) closeModal();
      });
    }
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && modal && modal.classList.contains("open")) {
        closeModal();
      }
    });

    // Footer / in-page "Cookie settings" links reopen preferences at any time.
    var settingsLinks = document.querySelectorAll(".js-cookie-settings");
    settingsLinks.forEach(function (link) {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        openModal();
      });
    });

    // ---- Automatic click tracking (no PII — labels/paths only) ----
    document.addEventListener("click", function (e) {
      var el = e.target.closest ? e.target.closest("a, button") : null;
      if (!el || !window.techmonxTrack) return;

      var href = el.getAttribute && el.getAttribute("href");

      if (href && href.indexOf("tel:") === 0) {
        window.techmonxTrack("phone_click", { link_url: href });
        return;
      }
      if (href && href.indexOf("mailto:") === 0) {
        window.techmonxTrack("email_click", {});
        return;
      }
      if (href && /^https?:\/\//i.test(href)) {
        var host = "";
        try {
          host = new URL(href).hostname;
        } catch (err) {
          host = "";
        }
        var socialHosts = ["facebook.com", "instagram.com", "linkedin.com", "twitter.com", "x.com", "tiktok.com", "youtube.com"];
        var isSocial = socialHosts.some(function (h) {
          return host.indexOf(h) !== -1;
        });
        if (isSocial && host.indexOf(window.location.hostname) === -1) {
          window.techmonxTrack("social_click", { platform: host });
          return;
        }
      }

      var text = (el.textContent || "").trim().toLowerCase();
      if (text.indexOf("start a project") !== -1) {
        window.techmonxTrack("cta_start_project_click", { page_path: window.location.pathname });
      } else if (text.indexOf("let's talk") !== -1 || text.indexOf("lets talk") !== -1) {
        window.techmonxTrack("cta_lets_talk_click", { page_path: window.location.pathname });
      }
    });

    // ---- Page-type view events (no PII — path/category only) ----
    if (window.techmonxTrack) {
      var path = window.location.pathname;
      if (/\/services\.html/i.test(path) || /\/services\//i.test(path)) {
        window.techmonxTrack("view_service_page", { page_path: path });
      } else if (/\/project-/i.test(path) || /\/portfolio\.html/i.test(path)) {
        window.techmonxTrack("view_project_page", { page_path: path });
      }
    }
  });
})();
