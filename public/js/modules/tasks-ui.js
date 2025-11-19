(function () {
  const U = window.DashboardUtils || {};

  function updateAssignmentCount() {
    const badge = document.querySelector('[data-count="assignments"]');
    const items = document.querySelectorAll('[data-assignments-container] .assignment-item');
    const active = Array.from(items).filter(i => !i.classList.contains('assignment-item--completed')).length;
    if (badge) badge.textContent = `${active} Active`;
  }

  function initAssignmentList() {
    const container = document.querySelector('[data-assignments-container]');
    if (!container) return;

    // Delegated checkbox toggle
    U.delegate(container, 'change', '[data-assignment-checkbox]', (e, el) => {
      const wrapper = el.closest('.assignment-item');
      const checked = el.checked;
      if (wrapper) {
        wrapper.classList.toggle('assignment-item--completed', !!checked);
        const title = wrapper.querySelector('.assignment-item__title')?.textContent?.trim() || 'Assignment';
        U.announce(`${title} marked ${checked ? 'complete' : 'incomplete'}`);
      }
      updateAssignmentCount();
    });

    // Hover focus effects on priority indicator
    U.delegate(container, 'mouseenter', '.assignment-item', (e, el) => {
      const pr = el.querySelector('[data-priority-indicator]');
      if (pr) pr.classList.add('is-hovered');
    }, true);
    U.delegate(container, 'mouseleave', '.assignment-item', (e, el) => {
      const pr = el.querySelector('[data-priority-indicator]');
      if (pr) pr.classList.remove('is-hovered');
    }, true);

    updateAssignmentCount();
  }

  function init() {
    initAssignmentList();
  }

  window.DashboardTasksUI = { init };
})();
