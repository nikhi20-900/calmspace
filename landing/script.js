/**
 * CALMSPACE — "The Quiet Room" 3D Scene & Motion Controller
 * Performance:
 * - Decoupled transforms: .orb-slot handles scroll drift & depth; .orb handles breathing.
 * - Self-pausing requestAnimationFrame: runs ONLY when pointer/scroll changes, stops when settled.
 * - Card tilt: pure pointer tracking with fast 150ms transitions, independent of entrance animations.
 * - Zero inline styles in generated HTML.
 * - Full prefers-reduced-motion & tab visibility pause support.
 */

(function () {
  'use strict';

  // Verified config object
  const SUPPORT_CONFIG = [
    {
      id: 'tele-manas',
      name: 'Tele-MANAS',
      role: 'National Mental Health Helpline',
      number: '14416',
      hours: '24/7, Toll-free, 20+ languages',
      badge: 'Immediate Helpline',
      badgeClass: 'contact-badge--primary',
      urgent: true,
      source: 'MoHFW, Govt of India',
      lastVerified: '2026-11-01',
    },
    {
      id: 'emergency-112',
      name: 'National Emergency',
      role: 'Police, Medical & Ambulance Dispatch',
      number: '112',
      hours: '24/7 Nationwide',
      badge: 'Emergency Only',
      badgeClass: 'contact-badge--amber',
      urgent: true,
      source: 'Emergency Response Support System (ERSS)',
      lastVerified: '2026-11-01',
    },
    {
      id: 'campus-counselling',
      name: 'University Student Counselling Unit',
      role: 'Licensed Campus Psychologists',
      number: '+91-11-2659-7100',
      hours: 'Mon–Fri: 09:00–17:30 (Drop-ins welcome)',
      badge: 'Campus Partner',
      badgeClass: 'contact-badge--sage',
      urgent: false,
      source: 'Dean of Student Affairs (DoSA) Directory',
      lastVerified: '2026-11-15',
    },
    {
      id: 'icall-tiss',
      name: 'iCALL Psychosocial Helpline',
      role: 'Tata Institute of Social Sciences',
      number: '+91-9152-987-821',
      hours: 'Mon–Sat: 10:00–20:00',
      badge: 'Academic Initiative',
      badgeClass: 'contact-badge--primary',
      urgent: false,
      source: 'TISS Project Directory',
      lastVerified: '2026-11-05',
    },
  ];

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let isReducedMotion = motionQuery.matches;
  motionQuery.addEventListener('change', (e) => {
    isReducedMotion = e.matches;
  });

  const sceneInner = document.getElementById('sceneInner');
  const orbSlots = [
    { el: document.querySelector('.orb-slot-1'), depth: -200, factorX: -40, factorY: -20 },
    { el: document.querySelector('.orb-slot-2'), depth: -100, factorX:  50, factorY: -15 },
    { el: document.querySelector('.orb-slot-3'), depth: -150, factorX: -35, factorY:  30 },
    { el: document.querySelector('.orb-slot-4'), depth:  -80, factorX:  40, factorY:  25 },
    { el: document.querySelector('.orb-slot-5'), depth: -250, factorX:  60, factorY: -30 },
    { el: document.querySelector('.orb-slot-6'), depth: -120, factorX: -30, factorY:  40 },
  ];

  let isTabVisible = !document.hidden;
  document.addEventListener('visibilitychange', () => {
    isTabVisible = !document.hidden;
    if (isTabVisible) requestTick();
  });

  // 1. SELF-PAUSING RAF LOOP
  let targetTiltX = 0;
  let targetTiltY = 0;
  let currentTiltX = 0;
  let currentTiltY = 0;

  let targetScroll = 0;
  let currentScroll = 0;

  let isAnimating = false;
  let rafId = null;

  function applySceneTransforms() {
    if (!sceneInner) return;
    const driftY = (currentScroll - 0.5) * 80;
    const driftZ = -currentScroll * 120;
    sceneInner.style.transform = `rotateX(${currentTiltX.toFixed(2)}deg) rotateY(${currentTiltY.toFixed(2)}deg) translateY(${driftY.toFixed(1)}px) translateZ(${driftZ.toFixed(1)}px)`;

    const spreadFactor = Math.sin(currentScroll * Math.PI);
    orbSlots.forEach((slot) => {
      if (slot.el) {
        const x = (slot.factorX * spreadFactor).toFixed(1);
        const y = (slot.factorY * spreadFactor).toFixed(1);
        slot.el.style.transform = `translateZ(${slot.depth}px) translate3d(${x}px, ${y}px, 0)`;
      }
    });
  }

  function tick() {
    if (!isTabVisible || isReducedMotion || window.innerWidth < 640) {
      isAnimating = false;
      rafId = null;
      return;
    }

    const dTiltX = targetTiltX - currentTiltX;
    const dTiltY = targetTiltY - currentTiltY;
    const dScroll = targetScroll - currentScroll;

    currentTiltX += dTiltX * 0.08;
    currentTiltY += dTiltY * 0.08;
    currentScroll += dScroll * 0.08;

    applySceneTransforms();

    // Check if motion has settled within small epsilon
    const settled = Math.abs(dTiltX) < 0.01 &&
                    Math.abs(dTiltY) < 0.01 &&
                    Math.abs(dScroll) < 0.001;

    if (settled) {
      currentTiltX = targetTiltX;
      currentTiltY = targetTiltY;
      currentScroll = targetScroll;
      applySceneTransforms();
      isAnimating = false;
      rafId = null;
    } else {
      rafId = requestAnimationFrame(tick);
    }
  }

  function requestTick() {
    if (!isAnimating && isTabVisible && !isReducedMotion && window.innerWidth >= 640) {
      isAnimating = true;
      rafId = requestAnimationFrame(tick);
    }
  }

  // Pointer tracking capped at 6 degrees
  function onPointerMove(e) {
    if (isReducedMotion || !isTabVisible || window.innerWidth < 640) return;
    const halfW = window.innerWidth / 2;
    const halfH = window.innerHeight / 2;
    const normX = (e.clientX - halfW) / halfW;
    const normY = (e.clientY - halfH) / halfH;

    targetTiltX = -normY * 6; // max 6 deg
    targetTiltY = normX * 6;
    requestTick();
  }
  window.addEventListener('pointermove', onPointerMove, { passive: true });

  // Scroll tracking
  function onScroll() {
    if (!isTabVisible || isReducedMotion) return;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    targetScroll = maxScroll > 0 ? window.scrollY / maxScroll : 0;
    requestTick();
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  // Initial application of base depths
  applySceneTransforms();

  // 2. CARD HOVER 3D TILT (Crisp & non-conflicting)
  const tiltCards = document.querySelectorAll('[data-tilt]');
  if (!isReducedMotion) {
    tiltCards.forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        if (window.innerWidth < 640) return;
        const rect = card.getBoundingClientRect();
        const rotX = ((e.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * -4;
        const rotY = ((e.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * 4;
        card.style.transform = `perspective(800px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateY(-3px)`;
      });

      card.addEventListener('pointerleave', () => {
        card.style.transform = '';
      });
    });
  }

  // 3. SCROLL REVEAL (Isolated from card hover transitions)
  const revealElements = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !isReducedMotion) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealElements.forEach((el) => observer.observe(el));
  } else {
    revealElements.forEach((el) => el.classList.add('is-visible'));
  }

  // 4. POPULATE SUPPORT CONTACTS (Zero inline styles)
  const supportList = document.getElementById('supportContactsList');
  if (supportList) {
    supportList.innerHTML = SUPPORT_CONFIG.map((c) => {
      const telLink = `tel:${c.number.replace(/[^0-9+]/g, '')}`;
      return `
        <article class="contact-card ${c.urgent ? 'contact-card--urgent' : ''}" data-tilt>
          <span class="contact-badge ${c.badgeClass}">${c.badge}</span>
          <h3>${c.name}</h3>
          <p class="muted small">${c.role}</p>
          <div class="contact-hours small">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>${c.hours}</span>
          </div>
          <div class="contact-action">
            <a href="${telLink}" class="btn btn-primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              <span>Call ${c.number}</span>
            </a>
          </div>
          <p class="contact-meta">Verified: ${c.source} (${c.lastVerified})</p>
        </article>
      `;
    }).join('');
  }

  // 5. MODAL CONTROLS
  const modal = document.getElementById('supportModal');
  const openButtons = document.querySelectorAll('[data-open-support]');
  const closeButton = document.getElementById('closeSupportModal');

  function openModal() {
    if (modal) {
      modal.hidden = false;
      modal.setAttribute('aria-modal', 'true');
      requestAnimationFrame(() => {
        modal.classList.add('is-open');
      });
      document.body.style.overflow = 'hidden';
      if (closeButton) closeButton.focus();
    }
  }

  function closeModal() {
    if (modal) {
      modal.classList.remove('is-open');
      modal.removeAttribute('aria-modal');
      setTimeout(() => {
        modal.hidden = true;
      }, 250);
      document.body.style.overflow = '';
    }
  }

  openButtons.forEach((btn) => btn.addEventListener('click', openModal));
  if (closeButton) closeButton.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.hidden) closeModal();
    });
  }
})();
