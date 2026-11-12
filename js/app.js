(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // ─── Theme toggle ───
  var themeToggle = document.getElementById('themeToggle');
  var themeMeta = document.querySelector('meta[name="theme-color"]');

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    if (themeToggle) {
      themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    }
    if (themeMeta) themeMeta.setAttribute('content', theme === 'dark' ? '#060a13' : '#f4f7fc');
  }

  applyTheme(root.getAttribute('data-theme') || 'dark');

  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem('theme', next); } catch (e) { /* private mode */ }
    });
  }

  // ─── Mobile nav ───
  var navbar = document.getElementById('navbar');
  var burger = document.getElementById('burger');
  var navMenu = document.getElementById('navMenu');

  function setMenu(open) {
    if (!navMenu || !burger) return;
    navMenu.classList.toggle('is-open', open);
    navbar.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }

  if (burger) {
    burger.addEventListener('click', function () {
      setMenu(burger.getAttribute('aria-expanded') !== 'true');
    });
  }

  document.querySelectorAll('.nav-menu a').forEach(function (link) {
    link.addEventListener('click', function () { setMenu(false); });
  });

  document.addEventListener('click', function (e) {
    if (navMenu && navMenu.classList.contains('is-open') && !e.target.closest('.nav')) setMenu(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && navMenu && navMenu.classList.contains('is-open')) {
      setMenu(false);
      burger.focus();
    }
  });

  // ─── Nav: background on scroll, hide on scroll down ───
  var lastY = window.scrollY;
  var ticking = false;

  function updateNav() {
    var y = window.scrollY;
    navbar.classList.toggle('is-scrolled', y > 24);
    var menuOpen = navMenu && navMenu.classList.contains('is-open');
    navbar.classList.toggle('is-hidden', !menuOpen && y > lastY && y > 320);
    lastY = y;
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      window.requestAnimationFrame(updateNav);
      ticking = true;
    }
  }, { passive: true });

  updateNav();

  // ─── Active nav link ───
  var navLinks = document.querySelectorAll('.nav-menu a[href^="#"]');
  var sections = [];

  navLinks.forEach(function (link) {
    var target = document.querySelector(link.getAttribute('href'));
    if (target) sections.push({ link: link, el: target });
  });

  // sections without a nav link (hero, contact) clear the highlight
  ['#top', '#contact'].forEach(function (sel) {
    var el = document.querySelector(sel);
    if (el) sections.push({ link: null, el: el });
  });

  if ('IntersectionObserver' in window && sections.length) {
    var activeObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        sections.forEach(function (s) {
          if (!s.link) return;
          var on = s.el === entry.target;
          s.link.classList.toggle('is-active', on);
          if (on) s.link.setAttribute('aria-current', 'true');
          else s.link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach(function (s) { activeObserver.observe(s.el); });
  }

  // ─── Scroll reveals (staggered within a group) ───
  var revealEls = document.querySelectorAll('.reveal');

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    // stagger siblings that share a parent
    var groups = new Map();
    revealEls.forEach(function (el) {
      var parent = el.parentElement;
      var i = groups.get(parent) || 0;
      el.style.setProperty('--d', Math.min(i, 5) * 0.08 + 's');
      groups.set(parent, i + 1);
    });

    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(function (el) { revealObserver.observe(el); });
  }

  // ─── Count-up numbers ───
  var counters = document.querySelectorAll('[data-count]');

  function runCounter(el) {
    var end = parseInt(el.getAttribute('data-count'), 10);
    var suffix = el.getAttribute('data-suffix') || '';
    var start = null;
    var duration = 1200;

    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(end * eased) + suffix;
      if (p < 1) window.requestAnimationFrame(step);
    }

    window.requestAnimationFrame(step);
  }

  if (!reduceMotion && 'IntersectionObserver' in window && counters.length) {
    var countObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          runCounter(entry.target);
          countObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });

    counters.forEach(function (el) { countObserver.observe(el); });
  }

  // ─── Hero glow follows pointer (desktop only) ───
  var hero = document.querySelector('.hero');

  if (hero && finePointer && !reduceMotion) {
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      hero.style.setProperty('--mx', ((e.clientX - r.left) / r.width) * 100 + '%');
      hero.style.setProperty('--my', ((e.clientY - r.top) / r.height) * 100 + '%');
    });
  }

  // ─── Skill card spotlight ───
  if (finePointer) {
    document.querySelectorAll('.skill').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--sx', e.clientX - r.left + 'px');
        card.style.setProperty('--sy', e.clientY - r.top + 'px');
      });
    });
  }

  // ─── Local time (Ho Chi Minh City) ───
  var timeEl = document.getElementById('localTime');

  function updateTime() {
    if (!timeEl) return;
    try {
      timeEl.textContent = new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Ho_Chi_Minh'
      }).format(new Date()) + ' (GMT+7)';
    } catch (e) {
      timeEl.textContent = 'GMT+7';
    }
  }

  updateTime();
  setInterval(updateTime, 30000);

  // ─── Project filters ───
  var filterBtns = document.querySelectorAll('.filter');
  var projects = document.querySelectorAll('.project');

  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var f = btn.getAttribute('data-filter');

      filterBtns.forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });

      projects.forEach(function (p) {
        var show = f === 'all' || p.getAttribute('data-cat') === f;
        if (show) {
          p.hidden = false;
          window.requestAnimationFrame(function () { p.classList.remove('is-hiding'); });
        } else if (reduceMotion) {
          p.hidden = true;
        } else {
          p.classList.add('is-hiding');
          setTimeout(function () {
            if (p.classList.contains('is-hiding')) p.hidden = true;
          }, 300);
        }
      });
    });
  });

  // ─── Copy email ───
  var copyBtn = document.getElementById('copyEmail');
  var copyStatus = document.getElementById('copyStatus');

  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var email = copyBtn.getAttribute('data-email');
      var label = copyBtn.querySelector('.copy-label');

      function selectEmailText() {
        var link = document.querySelector('.email-link');
        if (!link || !window.getSelection) return;
        var range = document.createRange();
        range.selectNodeContents(link);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }

      function done(ok) {
        copyBtn.classList.toggle('is-copied', ok);
        label.textContent = ok ? 'Copied!' : 'Selected — copy it';
        if (!ok) selectEmailText();
        if (copyStatus) {
          copyStatus.textContent = ok ? 'Email address copied to clipboard' : 'Email address selected, copy it manually';
        }
        setTimeout(function () {
          copyBtn.classList.remove('is-copied');
          label.textContent = 'Copy';
        }, 2400);
      }

      function legacyCopy() {
        var ta = document.createElement('textarea');
        ta.value = email;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
        document.body.removeChild(ta);
        return ok;
      }

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(email).then(
          function () { done(true); },
          function () { done(legacyCopy()); }
        );
      } else {
        done(legacyCopy());
      }
    });
  }
})();
