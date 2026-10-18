
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

      /* Purposeful active-marker motion for tool navigation and mode tabs.
         Only translate/size the indicator; never move media, labels or controls. */
      (() => {
        const groups = [
          ["tabRowPdf", "button[role=tab].active-mode", "forge-switch-indicator"],
          ["tabRowStills", "button[role=tab].active-mode", "forge-switch-indicator"],
          ["tabRowAdlinks", "button[role=tab].active-mode", "forge-switch-indicator"],
          ["storySubModeToggle", "button.active-mode", "forge-switch-indicator"],
          ["mainSidebar", ".nav-item.active", "forge-nav-indicator"]
        ];
        const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)");
        for (const [id, selector, className] of groups) {
          const host = document.getElementById(id);
          if (!host || host.querySelector("." + className)) continue;
          const indicator = document.createElement("span");
          indicator.className = className;
          indicator.setAttribute("aria-hidden", "true");
          host.appendChild(indicator);
          let raf = 0, placed = false;
          const position = () => {
            raf = 0;
            const active = host.querySelector(selector);
            const base = host.getBoundingClientRect();
            const rect = active?.getBoundingClientRect();
            if (!rect?.width || !rect?.height || !base.width) {
              indicator.style.opacity = "0";
              return;
            }
            if (!placed || reduce?.matches) indicator.style.transition = "none";
            indicator.style.width = (className === "forge-nav-indicator" ? 3 : rect.width) + "px";
            if (className === "forge-nav-indicator") {
              indicator.style.height = rect.height + "px";
              indicator.style.transform = "translate3d(0," + (rect.top - base.top + host.scrollTop) + "px,0)";
            } else {
              indicator.style.transform = "translate3d(" + (rect.left - base.left + host.scrollLeft) + "px,0,0)";
            }
            indicator.style.opacity = "1";
            if (!placed || reduce?.matches) {
              placed = true;
              requestAnimationFrame(() => { indicator.style.transition = ""; });
            }
          };
          const queue = () => {
            if (!raf) raf = requestAnimationFrame(position);
          };
          const observer = new MutationObserver(queue);
          observer.observe(host, {subtree:true,attributes:true,attributeFilter:["class","aria-selected","aria-current"]});
          const surfaceObserver = new MutationObserver(queue);
          surfaceObserver.observe(host,{attributes:true,attributeFilter:["class","style","hidden"]});
          if (typeof ResizeObserver !== "undefined") {
            const resize = new ResizeObserver(queue);
            resize.observe(host);
            host.querySelectorAll("button,.nav-item").forEach(item=>resize.observe(item));
          }
          window.addEventListener("resize",queue,{passive:true});
          if (className === "forge-nav-indicator") host.addEventListener("scroll",queue,{passive:true});
          position();
        }
      })();
