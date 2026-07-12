(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ─── Mobile Nav ───
  var burger = document.getElementById('burger');
  var navLinks = document.getElementById('navLinks');
  var navLinkItems = document.querySelectorAll('.nav-links a');

  function closeNav() {
    navLinks.classList.remove('open');
    burger.classList.remove('active');
  }

  function toggleNav() {
    navLinks.classList.toggle('open');
    burger.classList.toggle('active');
  }

  if (burger) {
    burger.addEventListener('click', toggleNav);
  }

  navLinkItems.forEach(function (link) {
    link.addEventListener('click', closeNav);
  });

  document.addEventListener('click', function (e) {
    if (!e.target.closest('.nav') && navLinks && navLinks.classList.contains('open')) {
      closeNav();
    }
  });

  // ─── Nav Hide/Show ───
  var lastScrollY = 0;
  var ticking = false;
  var navbar = document.getElementById('navbar');

  function updateNav() {
    var currentY = window.scrollY;

    if (currentY > 60) {
      navbar.classList.add('has-scrolled');
    } else {
      navbar.classList.remove('has-scrolled');
    }

    if (currentY > lastScrollY && currentY > 100) {
      navbar.classList.add('hidden');
    } else {
      navbar.classList.remove('hidden');
    }

    lastScrollY = currentY;
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      window.requestAnimationFrame(updateNav);
      ticking = true;
    }
  }, { passive: true });

  // ─── Scroll to Top ───
  var scrollBtn = document.getElementById('scrollTop');

  if (scrollBtn) {
    var heroEl = document.getElementById('hero') || document.getElementById('heroMobile');

    if (heroEl) {
      var observer = new IntersectionObserver(function (entries) {
        scrollBtn.classList.toggle('visible', !entries[0].isIntersecting);
      }, { threshold: 0.1 });
      observer.observe(heroEl);
    }

    scrollBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ─── Scroll Reveals (all variants) ───
  var revealTypes = ['.reveal', '.reveal-left', '.reveal-right', '.reveal-scale'];
  var revealSelector = revealTypes.join(', ');
  var revealEls = document.querySelectorAll(revealSelector);

  if (!reduceMotion && revealEls.length) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('visible'); });
  }

  // ─── Hero Parallax ───
  var heroBg = document.querySelector('.hero-bg-2');
  if (heroBg && !reduceMotion) {
    window.addEventListener('scroll', function () {
      var offset = window.scrollY;
      heroBg.style.transform = 'translateY(' + (offset * 0.15) + 'px)';
    }, { passive: true });
  }

  // ─── Timeline: scroll reveal + hover dim ───
  var timelineItems = document.querySelectorAll('.timeline-item');

  if (timelineItems.length) {
    // Item[0] (2026) active by default
    timelineItems[0].classList.add('active');

    // Scroll reveal: activate items sequentially as they enter viewport
    if (!reduceMotion) {
      var tlObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
            tlObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.25, rootMargin: '0px 0px -40px 0px' });

      for (var i = 1; i < timelineItems.length; i++) {
        tlObserver.observe(timelineItems[i]);
      }
    } else {
      for (var i = 1; i < timelineItems.length; i++) {
        timelineItems[i].classList.add('active');
      }
    }

    // Hover: dim all except the hovered one
    timelineItems.forEach(function (item) {
      item.addEventListener('mouseenter', function () {
        timelineItems.forEach(function (other) {
          if (other !== item) {
            other.classList.add('dimmed');
          }
        });
      });

      item.addEventListener('mouseleave', function () {
        timelineItems.forEach(function (other) {
          other.classList.remove('dimmed');
        });
      });
    });
  }

  // ─── Download CV Dropdown ───
  var downloadTrigger = document.querySelector('.btn-download-trigger');
  var downloadDropdown = document.querySelector('.btn-download-dropdown');

  if (downloadTrigger && downloadDropdown) {
    var dropdownParent = downloadTrigger.closest('.btn-download-cv');

    function closeDropdown(e) {
      if (!dropdownParent.contains(e.target)) {
        dropdownParent.classList.remove('open');
        document.removeEventListener('click', closeDropdown);
      }
    }

    downloadTrigger.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = dropdownParent.classList.contains('open');
      if (isOpen) {
        dropdownParent.classList.remove('open');
        document.removeEventListener('click', closeDropdown);
      } else {
        dropdownParent.classList.add('open');
        setTimeout(function () {
          document.addEventListener('click', closeDropdown);
        }, 0);
      }
    });
  }

})();
