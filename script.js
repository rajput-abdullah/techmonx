/* ===================================================================
   TechMonx — shared script (runs on every page)
=================================================================== */
document.addEventListener('DOMContentLoaded', function () {

  /* ---------- header scroll state ---------- */
  var header = document.getElementById('siteHeader');
  var backToTop = document.getElementById('backToTop');
  window.addEventListener('scroll', function () {
    if (header) header.classList.toggle('scrolled', window.scrollY > 30);
    if (backToTop) backToTop.classList.toggle('show', window.scrollY > 600);
  });
  if (backToTop) backToTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ---------- mobile nav drawer ---------- */
  var burger = document.getElementById('burger');
  var mobileNav = document.getElementById('mobileNav');
  if (burger && mobileNav) {
    burger.addEventListener('click', function () {
      mobileNav.classList.toggle('open');
    });
    mobileNav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { mobileNav.classList.remove('open'); });
    });
  }

  /* ---------- scroll reveal (cinematic: fade/slide/scale/line variants) ---------- */
  var revealEls = document.querySelectorAll('.reveal, .reveal-stagger, .reveal-left, .reveal-right, .reveal-scale, .reveal-line');
  if ('IntersectionObserver' in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- scroll-linked parallax (hardware-accelerated, mobile/reduced-motion safe) ---------- */
  var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var parallaxEls = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  if (parallaxEls.length && !prefersReducedMotion) {
    var parallaxTicking = false;
    function isMobileViewport() { return window.innerWidth <= 768; }
    function updateParallax() {
      parallaxTicking = false;
      if (isMobileViewport()) return;
      var vh = window.innerHeight;
      parallaxEls.forEach(function (el) {
        var rect = el.getBoundingClientRect();
        // only animate elements roughly within/near the viewport
        if (rect.bottom < -200 || rect.top > vh + 200) return;
        var speed = parseFloat(el.getAttribute('data-parallax-speed')) || 0.15;
        var offset = (rect.top - vh / 2) * speed * -1;
        el.style.setProperty('--py', offset.toFixed(1) + 'px');
      });
    }
    function requestParallaxTick() {
      if (!parallaxTicking) {
        parallaxTicking = true;
        window.requestAnimationFrame(updateParallax);
      }
    }
    window.addEventListener('scroll', requestParallaxTick, { passive: true });
    window.addEventListener('resize', requestParallaxTick);
    updateParallax();
  }

  /* ---------- energetic hover micro-interactions (desktop pointer only) ---------- */
  var supportsHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (supportsHover && !prefersReducedMotion) {
    var tiltTargets = document.querySelectorAll('.svc-card, .port-card, .blog-card, .testi-card, .value-card, .engage-card');
    tiltTargets.forEach(function (card) {
      card.classList.add('tilt-card');
      card.addEventListener('mousemove', function (e) {
        var rect = card.getBoundingClientRect();
        var px = (e.clientX - rect.left) / rect.width - 0.5;
        var py = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.setProperty('--tiltX', (py * -6).toFixed(2) + 'deg');
        card.style.setProperty('--tiltY', (px * 6).toFixed(2) + 'deg');
        card.style.setProperty('--tiltLift', '-4px');
      });
      card.addEventListener('mouseleave', function () {
        card.style.setProperty('--tiltX', '0deg');
        card.style.setProperty('--tiltY', '0deg');
        card.style.setProperty('--tiltLift', '0px');
      });
    });
  }

  /* ---------- counters ---------- */
  var counterGroups = document.querySelectorAll('[data-counter-group]');
  counterGroups.forEach(function (group) {
    var counted = false;
    var countIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !counted) {
          counted = true;
          var nums = group.querySelectorAll('.num[data-count]');
          nums.forEach(function (counter) {
            var target = +counter.getAttribute('data-count');
            var duration = 1400;
            var start = performance.now();
            function tick(now) {
              var progress = Math.min((now - start) / duration, 1);
              var eased = 1 - Math.pow(1 - progress, 3);
              counter.textContent = Math.floor(eased * target).toLocaleString();
              if (progress < 1) requestAnimationFrame(tick);
              else counter.textContent = target.toLocaleString();
            }
            requestAnimationFrame(tick);
          });
        }
      });
    }, { threshold: 0.4 });
    countIO.observe(group);
  });

  /* ---------- tabs ---------- */
  var tabGroups = document.querySelectorAll('[data-tabs]');
  tabGroups.forEach(function (group) {
    var btns = group.querySelectorAll('.tab-btn');
    var panelsWrap = document.querySelector('[data-tab-panels="' + group.getAttribute('data-tabs') + '"]');
    if (!panelsWrap) return;
    var panels = panelsWrap.querySelectorAll('.tab-panel');
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        btns.forEach(function (b) { b.classList.remove('active'); });
        panels.forEach(function (p) { p.classList.remove('active'); });
        btn.classList.add('active');
        var target = panelsWrap.querySelector('[data-panel="' + btn.getAttribute('data-tab') + '"]');
        if (target) target.classList.add('active');
      });
    });
  });

  /* ---------- portfolio / blog filter ---------- */
  var filterBtns = document.querySelectorAll('.filter-btn');
  var portCards = document.querySelectorAll('.port-card');
  var filterCards = document.querySelectorAll('[data-cat]');
  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var filter = btn.getAttribute('data-filter');
      filterCards.forEach(function (card) {
        var match = filter === 'all' || card.getAttribute('data-cat') === filter;
        card.style.display = match ? '' : 'none';
      });
    });
  });

  /* ---------- portfolio case-study modal ---------- */
  var overlay = document.getElementById('caseModal');
  if (overlay) {
    var panel = overlay.querySelector('.modal-panel');
    portCards.forEach(function (card) {
      card.addEventListener('click', function () {
        var bg = card.getAttribute('data-bg') || 'linear-gradient(135deg,#5B8CFF,#8B5CF6)';
        var tag = card.getAttribute('data-tag') || '';
        var title = card.getAttribute('data-title') || '';
        var intro = card.getAttribute('data-intro') || '';
        var scope = card.getAttribute('data-scope') || '';
        var tech = (card.getAttribute('data-tech') || '').split(',').filter(Boolean);
        var link = card.getAttribute('data-link') || '';
        var linkLabel = card.getAttribute('data-linklabel') || 'Visit Live Project';
        var kpis = [];
        for (var i = 1; i <= 4; i++) {
          var num = card.getAttribute('data-kpi' + i + '-num');
          var label = card.getAttribute('data-kpi' + i + '-label');
          if (num && label) kpis.push({ num: num, label: label });
        }
        var techHtml = tech.map(function (t) { return '<span>' + t + '</span>'; }).join('');
        var kpiHtml = kpis.map(function (k) {
          return '<div><div class="k-num">' + k.num + '</div><div class="k-label">' + k.label + '</div></div>';
        }).join('');
        var linkHtml = link ? '<div class="modal-links"><a href="' + link + '" target="_blank" rel="noopener">' + linkLabel + ' &rarr;</a></div>' : '';

        panel.innerHTML =
          '<button class="modal-close" id="modalCloseBtn" aria-label="Close">&#10005;</button>' +
          '<div class="modal-hero"><div class="grad-bg" style="background:' + bg + '"></div></div>' +
          '<div class="modal-body">' +
            '<span class="port-tag">' + tag + '</span>' +
            '<h3>' + title + '</h3>' +
            '<div class="modal-cols">' +
              '<div><h5>Case Intro</h5><p>' + intro + '</p></div>' +
              '<div><h5>Our Scope</h5><p>' + scope + '</p></div>' +
            '</div>' +
            (techHtml ? '<div class="modal-tech">' + techHtml + '</div>' : '') +
            (kpiHtml ? '<div class="modal-kpis">' + kpiHtml + '</div>' : '') +
            linkHtml +
          '</div>';

        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        panel.querySelector('#modalCloseBtn').addEventListener('click', closeModal);
      });
    });
    function closeModal() {
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    }
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
  }

  /* ---------- testimonial carousel ---------- */
  var carousel = document.getElementById('tCarousel');
  if (carousel) {
    var slides = carousel.querySelectorAll('.t-slide');
    var dotsWrap = document.getElementById('tDots');
    var current = 0;
    var timer;

    slides.forEach(function (_, i) {
      var dot = document.createElement('button');
      dot.className = 't-dot' + (i === 0 ? ' active' : '');
      dot.addEventListener('click', function () { goTo(i); });
      dotsWrap.appendChild(dot);
    });
    var dots = dotsWrap.querySelectorAll('.t-dot');

    function goTo(i) {
      slides[current].classList.remove('active');
      dots[current].classList.remove('active');
      current = (i + slides.length) % slides.length;
      slides[current].classList.add('active');
      dots[current].classList.add('active');
      resetTimer();
    }
    function next() { goTo(current + 1); }
    function prev() { goTo(current - 1); }
    function resetTimer() {
      clearInterval(timer);
      timer = setInterval(next, 6000);
    }
    var nextBtn = document.getElementById('tNext');
    var prevBtn = document.getElementById('tPrev');
    if (nextBtn) nextBtn.addEventListener('click', next);
    if (prevBtn) prevBtn.addEventListener('click', prev);
    resetTimer();
  }

  /* ---------- shared form submit helper ---------- */
  function submitForm(form, opts) {
    opts = opts || {};
    var data = new FormData(form);
    var email = data.get('email') || '';
    return fetch(form.getAttribute('action'), {
      method: 'POST',
      body: data,
      headers: { 'Accept': 'application/json' }
    }).then(function (res) {
      return res.json().catch(function () { return { ok: res.ok }; }).then(function (json) {
        if (!res.ok || json.ok === false) {
          throw new Error(json.error || 'Something went wrong.');
        }
        return json;
      });
    }).catch(function (err) {
      // Network/server issue (e.g. PHP mail unavailable) — fall back to a pre-filled mailto
      // so the enquiry still reaches info@techmonx.co.uk.
      if (opts.mailtoSubject) {
        var subject = encodeURIComponent(opts.mailtoSubject);
        var body = encodeURIComponent(opts.mailtoBody || '');
        window.open('mailto:info@techmonx.co.uk?subject=' + subject + '&body=' + body, '_blank');
      }
      throw err;
    });
  }

  /* ---------- contact form ---------- */
  var miniForm = document.getElementById('miniForm');
  if (miniForm) {
    var miniStatus = document.getElementById('miniFormStatus');
    miniForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = miniForm.querySelector('button[type="submit"]');
      var first = miniForm.querySelector('[name="first_name"]').value.trim();
      var last = miniForm.querySelector('[name="last_name"]').value.trim();
      var email = miniForm.querySelector('[name="email"]').value.trim();
      if (!first || !last || !email) {
        if (miniStatus) { miniStatus.textContent = 'Please fill in your name and email.'; miniStatus.style.color = 'var(--pink, #D946EF)'; }
        return;
      }
      var service = miniForm.querySelector('[name="service"]').value;
      var details = miniForm.querySelector('[name="details"]').value.trim();
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
      if (miniStatus) { miniStatus.textContent = ''; }
      submitForm(miniForm, {
        mailtoSubject: 'New enquiry from ' + first + ' ' + last + (service ? ' — ' + service : ''),
        mailtoBody: 'Name: ' + first + ' ' + last + '\nEmail: ' + email + '\nService: ' + service + '\n\n' + details
      }).then(function () {
        if (btn) btn.textContent = 'Message Sent ✓';
        if (miniStatus) { miniStatus.style.color = 'var(--teal, #38E8D4)'; miniStatus.textContent = "Thanks — we've received your message and will reply within one business day."; }
        miniForm.reset();
      }).catch(function () {
        if (btn) { btn.disabled = false; btn.textContent = 'Send Message'; }
        if (miniStatus) { miniStatus.style.color = 'var(--pink, #D946EF)'; miniStatus.textContent = "We couldn't send that automatically, so we've opened an email for you — please hit send there, or email info@techmonx.co.uk directly."; }
      });
    });
  }

  /* ---------- floating AI assistant chat ---------- */
  var chatFab = document.getElementById('chatFab');
  var chatPanel = document.getElementById('chatPanel');
  var chatPanelClose = document.getElementById('chatPanelClose');
  var chatForm = document.getElementById('chatForm');
  var chatBody = document.getElementById('chatBody');
  var chatBookLink = document.getElementById('chatBookLink');

  function openChat() {
    chatPanel.classList.add('open');
    chatPanel.setAttribute('aria-hidden', 'false');
    chatFab.classList.add('open');
    chatFab.setAttribute('aria-expanded', 'true');
  }
  function closeChat() {
    chatPanel.classList.remove('open');
    chatPanel.setAttribute('aria-hidden', 'true');
    chatFab.classList.remove('open');
    chatFab.setAttribute('aria-expanded', 'false');
  }
  if (chatFab && chatPanel) {
    chatFab.addEventListener('click', function () {
      chatPanel.classList.contains('open') ? closeChat() : openChat();
    });
    if (chatPanelClose) chatPanelClose.addEventListener('click', closeChat);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeChat();
    });
  }
  if (chatForm) {
    chatForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var msgEl = document.getElementById('chatMessage');
      var emailEl = document.getElementById('chatEmail');
      var msg = msgEl.value.trim();
      var email = emailEl.value.trim();
      if (!msg || !email) return;
      var userBubble = document.createElement('div');
      userBubble.className = 'chat-msg user';
      userBubble.textContent = msg;
      chatBody.appendChild(userBubble);
      chatBody.scrollTop = chatBody.scrollHeight;
      msgEl.value = '';
      submitForm(chatForm, {
        mailtoSubject: 'New enquiry via TechMonx site chat',
        mailtoBody: msg + '\n\nReply to: ' + email
      }).then(function () {
        var botBubble = document.createElement('div');
        botBubble.className = 'chat-msg bot';
        botBubble.textContent = 'Thanks! We\'ve logged your message and someone from the TechMonx team will reply to ' + email + ' shortly.';
        chatBody.appendChild(botBubble);
        chatBody.scrollTop = chatBody.scrollHeight;
      }).catch(function () {
        var botBubble = document.createElement('div');
        botBubble.className = 'chat-msg bot';
        botBubble.textContent = "We couldn't send that automatically, so we've opened an email for you, please hit send there so we get your message.";
        chatBody.appendChild(botBubble);
        chatBody.scrollTop = chatBody.scrollHeight;
      });
    });
  }

  /* ---------- booking modal ---------- */
  var bookFab = document.getElementById('bookFab');
  var bookModal = document.getElementById('bookModal');
  var bookModalClose = document.getElementById('bookModalClose');
  var bookForm = document.getElementById('bookForm');

  function openBooking() {
    if (!bookModal) return;
    bookModal.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (chatPanel && chatPanel.classList.contains('open')) closeChat();
  }
  function closeBooking() {
    if (!bookModal) return;
    bookModal.classList.remove('open');
    document.body.style.overflow = '';
  }
  if (bookFab) bookFab.addEventListener('click', openBooking);
  if (chatBookLink) chatBookLink.addEventListener('click', function (e) { e.preventDefault(); openBooking(); });
  document.querySelectorAll('[data-open-booking]').forEach(function (el) {
    el.addEventListener('click', function (e) { e.preventDefault(); openBooking(); });
  });
  if (bookModalClose) bookModalClose.addEventListener('click', closeBooking);
  if (bookModal) {
    bookModal.addEventListener('click', function (e) { if (e.target === bookModal) closeBooking(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeBooking(); });
  }
  if (bookForm) {
    var bookStatus = document.getElementById('bookFormStatus');
    bookForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = bookForm.querySelector('button[type="submit"]');
      var name = document.getElementById('bkName').value.trim();
      var email = document.getElementById('bkEmail').value.trim();
      var date = document.getElementById('bkDate').value;
      var time = document.getElementById('bkTime').value;
      var notes = document.getElementById('bkNotes').value.trim();
      if (!name || !email || !date || !time) return;
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
      if (bookStatus) bookStatus.textContent = '';
      submitForm(bookForm, {
        mailtoSubject: 'Meeting request from ' + name,
        mailtoBody: 'Name: ' + name + '\nEmail: ' + email + '\nPreferred date: ' + date + '\nPreferred time: ' + time + '\nNotes: ' + notes
      }).then(function () {
        if (btn) btn.textContent = 'Request Sent ✓';
        setTimeout(closeBooking, 1400);
      }).catch(function () {
        if (btn) { btn.disabled = false; btn.textContent = 'Request Meeting'; }
        if (bookStatus) { bookStatus.style.color = 'var(--pink, #D946EF)'; bookStatus.textContent = "We couldn't send that automatically, so we've opened an email for you, please hit send there."; }
      });
    });
  }
});
