(function () {
  const U = window.DashboardUtils || {};
  function setActiveNav(link) {
    try {
      document.querySelectorAll('.sidebar__nav-link').forEach(a => {
        a.classList.remove('sidebar__nav-link--active');
        a.removeAttribute('aria-current');
      });
      link.classList.add('sidebar__nav-link--active');
      link.setAttribute('aria-current', 'page');
    } catch (_) {}
  }

  function toggleSidebar() {
    if (window.smartMentor && typeof window.smartMentor.toggleSidebarVisibility === 'function') {
      window.smartMentor.toggleSidebarVisibility();
      return;
    }
    if (!U.isTabletOrSmaller || !U.isTabletOrSmaller()) return;
    const open = document.body.classList.contains('sidebar-open');
    document.body.classList.toggle('sidebar-open', !open);
    const toggle = document.getElementById('sidebar-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', String(!open));
  }

  function closeSidebarIfMobile() {
    if (window.smartMentor && typeof window.smartMentor.closeSidebar === 'function') {
      if (window.smartMentor.isMobile && window.smartMentor.isMobile()) window.smartMentor.closeSidebar();
      return;
    }
    if (!U.isMobile || !U.isMobile()) return;
    document.body.classList.remove('sidebar-open');
    const toggle = document.getElementById('sidebar-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }

  function bind() {
    // Toggle button
    const toggleBtn = document.getElementById('sidebar-toggle');
    if (toggleBtn) toggleBtn.addEventListener('click', toggleSidebar);

    // Nav link activation via delegation
    U.delegate('#sidebar', 'click', '.sidebar__nav-link', (e, el) => {
      const href = el.getAttribute('href');
      const isAnchor = !href || href === '#' || href.startsWith('#');
      if (isAnchor) {
        e.preventDefault();
        setActiveNav(el);
        closeSidebarIfMobile();
      } else {
        // allow navigation; still close sidebar on mobile for smoother UX
        closeSidebarIfMobile();
      }
    });

    // Outside click to close on mobile
    document.addEventListener('click', (event) => {
      const sidebar = document.getElementById('sidebar');
      const toggle = document.getElementById('sidebar-toggle');
      const isOpen = document.body.classList.contains('sidebar-open');
      if (!isOpen) return;
      if (U.isMobile && !U.isMobile()) return;
      if (sidebar && !sidebar.contains(event.target) && toggle && !toggle.contains(event.target)) {
        if (window.smartMentor && window.smartMentor.closeSidebar) {
          window.smartMentor.closeSidebar();
        } else {
          document.body.classList.remove('sidebar-open');
          if (toggle) toggle.setAttribute('aria-expanded', 'false');
        }
      }
    });

    // Sync on resize
    window.addEventListener('resize', () => {
      if (window.smartMentor && window.smartMentor.handleViewportChange) {
        window.smartMentor.handleViewportChange();
        return;
      }
      if (!U.isTabletOrSmaller || !U.isTabletOrSmaller()) {
        document.body.classList.remove('sidebar-open');
        if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'true');
      } else if (U.isMobile && U.isMobile()) {
        if (toggleBtn) toggleBtn.setAttribute('aria-expanded', document.body.classList.contains('sidebar-open') ? 'true' : 'false');
      }
    });

    // Set active nav based on current location on load
    try {
      const path = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
      const links = Array.from(document.querySelectorAll('.sidebar__nav-link'));
      const match = links.find((a) => {
        const href = (a.getAttribute('href') || '').toLowerCase();
        if (!href) return false;
        if (href === '#' || href.startsWith('#')) return false;
        const file = href.split('/').pop();
        if (!file) return false;
        if (path === '' && (file === 'index.html' || file === '/')) return true;
        return file === path;
      });
      if (match) setActiveNav(match);
    } catch (_) {}
  }

  window.DashboardNav = { init: bind };
})();
