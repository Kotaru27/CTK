
      /* Decorative spotlights and keyboard affordances. Does not touch tool processing. */
      document.querySelectorAll('.home-card').forEach((card) => {
        card.addEventListener('pointermove', (event) => {
          if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
          const r = card.getBoundingClientRect();
          card.style.setProperty('--spot-x', ((event.clientX - r.left) / r.width * 100) + '%');
          card.style.setProperty('--spot-y', ((event.clientY - r.top) / r.height * 100) + '%');
        }, { passive: true });
        card.addEventListener('pointerleave', () => {
          card.style.setProperty('--spot-x', '50%');
          card.style.setProperty('--spot-y', '50%');
        });
      });
