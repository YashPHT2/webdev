// DashboardTimetable Module
// Save this as: public/js/modules/timetable.js

(function () {
  'use strict';

  const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // Sample data - replace with API calls later
  let timetableBlocks = [
    {
      id: 'block-1',
      day: 'monday',
      subject: 'Calculus',
      startTime: '09:00',
      endTime: '10:30',
      location: 'Room 301',
      notes: 'Bring calculator',
      color: '#3b82f6'
    },
    {
      id: 'block-2',
      day: 'monday',
      subject: 'Physics',
      startTime: '11:00',
      endTime: '12:30',
      location: 'Lab 2',
      notes: '',
      color: '#10b981'
    },
    {
      id: 'block-3',
      day: 'tuesday',
      subject: 'English Literature',
      startTime: '10:00',
      endTime: '11:30',
      location: 'Room 205',
      notes: '',
      color: '#f59e0b'
    },
    {
      id: 'block-4',
      day: 'wednesday',
      subject: 'Chemistry',
      startTime: '09:00',
      endTime: '10:30',
      location: 'Lab 1',
      notes: 'Lab coat required',
      color: '#8b5cf6'
    },
    {
      id: 'block-5',
      day: 'wednesday',
      subject: 'Mathematics',
      startTime: '14:00',
      endTime: '15:30',
      location: 'Room 204',
      notes: '',
      color: '#ec4899'
    },
    {
      id: 'block-6',
      day: 'thursday',
      subject: 'History',
      startTime: '14:00',
      endTime: '15:30',
      location: 'Room 102',
      notes: '',
      color: '#ef4444'
    },
    {
      id: 'block-7',
      day: 'friday',
      subject: 'Computer Science',
      startTime: '10:00',
      endTime: '12:00',
      location: 'Lab 3',
      notes: 'Laptop required',
      color: '#06b6d4'
    }
  ];

  let currentDensity = 'expanded';
  let currentFilter = { day: 'all', subject: '' };
  let editingBlockId = null;

  const DashboardTimetable = {
    init() {
      const container = document.querySelector('[data-component="timetable"]');
      if (!container) return;

      this.setupEventListeners();
      this.render();
      this.updateTodayBadge();
    },

    setupEventListeners() {
      // Density toggle
      const densityButtons = document.querySelectorAll('#timetable-density-toggle .progress-view-toggle__button');
      densityButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const density = btn.dataset.density;
          this.setDensity(density);
        });
      });

      // Filters
      const dayFilter = document.getElementById('timetable-day-filter');
      const subjectFilter = document.getElementById('timetable-subject-filter');
      const clearFilters = document.getElementById('timetable-clear-filters');

      if (dayFilter) {
        dayFilter.addEventListener('change', (e) => {
          currentFilter.day = e.target.value;
          this.render();
        });
      }

      if (subjectFilter) {
        subjectFilter.addEventListener('input', (e) => {
          currentFilter.subject = e.target.value.toLowerCase();
          this.render();
        });
      }

      if (clearFilters) {
        clearFilters.addEventListener('click', () => {
          currentFilter = { day: 'all', subject: '' };
          if (dayFilter) dayFilter.value = 'all';
          if (subjectFilter) subjectFilter.value = '';
          this.render();
        });
      }

      // Add block buttons
      document.getElementById('add-block-global')?.addEventListener('click', () => {
        this.openBlockModal();
      });

      // Block form
      const blockForm = document.getElementById('timetable-block-form');
      if (blockForm) {
        blockForm.addEventListener('submit', (e) => {
          e.preventDefault();
          this.saveBlock();
        });
      }

      // Delete confirmation
      document.getElementById('confirm-delete-block')?.addEventListener('click', () => {
        this.deleteBlock(editingBlockId);
      });

      // Modal close handlers
      document.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => {
          const modalId = btn.dataset.closeModal;
          this.closeModal(modalId);
        });
      });
    },

    setDensity(density) {
      currentDensity = density;
      const grid = document.getElementById('timetable-grid');
      if (grid) {
        grid.dataset.density = density;
      }
      
      // Update button states
      document.querySelectorAll('#timetable-density-toggle .progress-view-toggle__button').forEach(btn => {
        if (btn.dataset.density === density) {
          btn.classList.add('progress-view-toggle__button--active');
          btn.setAttribute('aria-pressed', 'true');
        } else {
          btn.classList.remove('progress-view-toggle__button--active');
          btn.setAttribute('aria-pressed', 'false');
        }
      });
    },

    render() {
      const grid = document.getElementById('timetable-grid');
      if (!grid) return;

      grid.innerHTML = '';
      grid.dataset.density = currentDensity;

      const filteredDays = currentFilter.day === 'all' 
        ? DAYS 
        : [currentFilter.day];

      filteredDays.forEach((day, index) => {
        const dayColumn = this.createDayColumn(day, DAY_LABELS[DAYS.indexOf(day)]);
        grid.appendChild(dayColumn);
      });
    },

    createDayColumn(day, label) {
      const column = document.createElement('div');
      column.className = 'day-column';
      column.dataset.day = day;

      // Header
      const header = document.createElement('div');
      header.className = 'day-header';
      header.innerHTML = `
        <span>${label}</span>
        <button class="icon-button" data-day="${day}" aria-label="Add block to ${label}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      `;

      header.querySelector('button').addEventListener('click', (e) => {
        e.stopPropagation();
        this.openBlockModal(null, day);
      });

      // Blocks container
      const blocksContainer = document.createElement('div');
      blocksContainer.className = 'day-blocks';

      const dayBlocks = this.getFilteredBlocks(day);
      
      if (dayBlocks.length === 0) {
        blocksContainer.innerHTML = `
          <div class="empty-state--small">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 1rem; color: var(--text-tertiary)">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <p style="color: var(--text-secondary); font-size: 0.875rem;">No classes scheduled</p>
          </div>
        `;
      } else {
        dayBlocks.forEach(block => {
          const blockEl = this.createBlockElement(block);
          blocksContainer.appendChild(blockEl);
        });
      }

      column.appendChild(header);
      column.appendChild(blocksContainer);

      return column;
    },

    createBlockElement(block) {
      const el = document.createElement('div');
      el.className = 'time-block';
      el.dataset.blockId = block.id;
      el.tabIndex = 0;
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', `${block.subject} from ${block.startTime} to ${block.endTime}`);

      // Calculate duration for visual sizing
      const duration = this.calculateDuration(block.startTime, block.endTime);
      const minHeight = currentDensity === 'compact' ? 80 : 100;
      const heightPerHour = currentDensity === 'compact' ? 50 : 70;
      const blockHeight = Math.max(minHeight, duration * heightPerHour);

      el.style.minHeight = `${blockHeight}px`;

      el.innerHTML = `
        <div class="time-block__color" style="background-color: ${block.color}"></div>
        <div class="time-block__content">
          <div class="time-block__title">${this.escapeHtml(block.subject)}</div>
          <div class="time-block__meta">
            <span style="display: flex; align-items: center; gap: 4px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              ${block.startTime} - ${block.endTime}
            </span>
            ${block.location ? `
              <span style="display: flex; align-items: center; gap: 4px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                ${this.escapeHtml(block.location)}
              </span>
            ` : ''}
          </div>
          ${block.notes ? `<div class="time-block__notes">${this.escapeHtml(block.notes)}</div>` : ''}
        </div>
        <div class="time-block__actions">
          <button class="icon-button" data-action="edit" title="Edit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="icon-button" data-action="delete" title="Delete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      `;

      // Event listeners
      el.addEventListener('click', (e) => {
        if (!e.target.closest('[data-action]')) {
          this.openBlockModal(block.id);
        }
      });

      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.openBlockModal(block.id);
        }
      });

      el.querySelector('[data-action="edit"]').addEventListener('click', (e) => {
        e.stopPropagation();
        this.openBlockModal(block.id);
      });

      el.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
        e.stopPropagation();
        this.confirmDelete(block.id);
      });

      return el;
    },

    calculateDuration(startTime, endTime) {
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      const start = startHour + startMin / 60;
      const end = endHour + endMin / 60;
      return end - start;
    },

    getFilteredBlocks(day) {
      let blocks = timetableBlocks.filter(b => b.day === day);
      
      if (currentFilter.subject) {
        blocks = blocks.filter(b => 
          b.subject.toLowerCase().includes(currentFilter.subject)
        );
      }

      // Sort by start time
      blocks.sort((a, b) => a.startTime.localeCompare(b.startTime));
      
      return blocks;
    },

    openBlockModal(blockId = null, presetDay = null) {
      editingBlockId = blockId;
      const modal = document.getElementById('timetable-block-modal');
      const overlay = document.getElementById('task-modal-overlay');
      const form = document.getElementById('timetable-block-form');
      
      if (!modal || !form) return;

      const title = modal.querySelector('#timetable-block-title');
      title.textContent = blockId ? 'Edit Time Block' : 'Add Time Block';

      if (blockId) {
        const block = timetableBlocks.find(b => b.id === blockId);
        if (block) {
          document.getElementById('block-form-id').value = block.id;
          document.getElementById('block-form-day').value = block.day;
          document.getElementById('block-form-subject').value = block.subject;
          document.getElementById('block-form-start').value = block.startTime;
          document.getElementById('block-form-end').value = block.endTime;
          document.getElementById('block-form-location').value = block.location || '';
          document.getElementById('block-form-notes').value = block.notes || '';
          document.getElementById('block-form-color').value = block.color;
        }
      } else {
        form.reset();
        document.getElementById('block-form-id').value = '';
        if (presetDay) {
          document.getElementById('block-form-day').value = presetDay;
        }
        document.getElementById('block-form-color').value = '#2563eb';
      }

      modal.removeAttribute('hidden');
      modal.classList.add('active');
      overlay?.removeAttribute('hidden');
      overlay?.classList.add('active');
      
      // Focus first input
      setTimeout(() => document.getElementById('block-form-subject')?.focus(), 100);
    },

    closeModal(modalId) {
      const modal = document.getElementById(modalId);
      const overlay = document.getElementById('task-modal-overlay');
      
      if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.setAttribute('hidden', ''), 300);
      }
      
      if (overlay) {
        overlay.classList.remove('active');
        setTimeout(() => overlay.setAttribute('hidden', ''), 300);
      }
    },

    saveBlock() {
      const id = document.getElementById('block-form-id').value;
      const block = {
        id: id || `block-${Date.now()}`,
        day: document.getElementById('block-form-day').value,
        subject: document.getElementById('block-form-subject').value,
        startTime: document.getElementById('block-form-start').value,
        endTime: document.getElementById('block-form-end').value,
        location: document.getElementById('block-form-location').value,
        notes: document.getElementById('block-form-notes').value,
        color: document.getElementById('block-form-color').value
      };

      if (id) {
        const index = timetableBlocks.findIndex(b => b.id === id);
        if (index !== -1) {
          timetableBlocks[index] = block;
        }
      } else {
        timetableBlocks.push(block);
      }

      this.closeModal('timetable-block-modal');
      this.render();
      this.showToast(id ? 'Block updated' : 'Block added', 'success');
    },

    confirmDelete(blockId) {
      editingBlockId = blockId;
      const modal = document.getElementById('timetable-delete-modal');
      const overlay = document.getElementById('task-modal-overlay');
      
      if (modal) {
        modal.removeAttribute('hidden');
        modal.classList.add('active');
      }
      if (overlay) {
        overlay.removeAttribute('hidden');
        overlay.classList.add('active');
      }
    },

    deleteBlock(blockId) {
      timetableBlocks = timetableBlocks.filter(b => b.id !== blockId);
      this.closeModal('timetable-delete-modal');
      this.render();
      this.showToast('Block deleted', 'success');
    },

    updateTodayBadge() {
      const badge = document.querySelector('[data-current-day]');
      if (!badge) return;

      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const dayIndex = DAYS.indexOf(today);
      
      if (dayIndex !== -1) {
        badge.textContent = `Today: ${DAY_LABELS[dayIndex]}`;
      }
    },

    showToast(message, type = 'success') {
      const container = document.getElementById('toast-container');
      if (!container) return;

      const toast = document.createElement('div');
      toast.className = `toast toast--${type}`;
      toast.textContent = message;
      
      container.appendChild(toast);
      
      setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    },

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  };

  // Export to global scope
  window.DashboardTimetable = DashboardTimetable;
})();