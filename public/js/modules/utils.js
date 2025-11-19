(function () {
  const Utils = {
    clamp(n, min, max) { return Math.max(min, Math.min(max, n)); },
    isMobile() { return window.matchMedia('(max-width: 768px)').matches; },
    isTabletOrSmaller() { return window.matchMedia('(max-width: 1024px)').matches; },
    rafTween({ from = 0, to = 1, duration = 350, ease = null, onUpdate = () => {}, onComplete = () => {} } = {}) {
      const start = performance.now();
      const diff = to - from;
      const easing = typeof ease === 'function' ? ease : (t) => t; // linear
      function frame(now) {
        const t = Math.min(1, (now - start) / Math.max(1, duration));
        const v = from + diff * easing(t);
        try { onUpdate(v, t); } catch (_) {}
        if (t < 1) requestAnimationFrame(frame); else { try { onComplete(); } catch (_) {} }
      }
      requestAnimationFrame(frame);
    },
    delegate(root, type, selector, handler, options) {
      const r = typeof root === 'string' ? document.querySelector(root) : (root || document);
      if (!r) return () => {};
      const listener = (e) => {
        let el = e.target;
        while (el && el !== r) {
          if (el.matches && el.matches(selector)) {
            handler.call(el, e, el);
            return;
          }
          el = el.parentElement;
        }
      };
      r.addEventListener(type, listener, options || false);
      return () => r.removeEventListener(type, listener, options || false);
    },
    announce(msg) {
      let live = document.getElementById('aria-live-status');
      if (!live) {
        live = document.createElement('div');
        live.id = 'aria-live-status';
        live.className = 'sr-only';
        live.setAttribute('aria-live', 'polite');
        live.setAttribute('aria-atomic', 'true');
        document.body.appendChild(live);
      }
      try { live.textContent = String(msg || ''); } catch (_) {}
    },
    formatDate(dateString) {
      if (!dateString) return '—';
      const d = new Date(dateString);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
  };
  window.DashboardUtils = Utils;
})();
