/**
 * Smart Mentor Timetable - Backend Integrated
 * Fetches and saves to /api/timetable
 */

class SmartTimetable {
  constructor() {
    this.timetable = null;
    this.filters = { day: 'all', subject: '' };
    this.density = localStorage.getItem('timetableDensity') || 'expanded';
    this.dragState = null;
    this.pendingDelete = null;
    this.loading = false;
    this.snapMinutes = 15;
    this.minBlockMinutes = 15;
    
    console.log('📅 Timetable initializing with backend...');
    this.init();
  }

  async init() {
    this.cacheElements();
    
    if (!this.elements.grid) {
      console.error('❌ Timetable container not found!');
      return;
    }

    this.attachEventListeners();
    await this.loadFromBackend();
    this.render();
    
    console.log('✅ Timetable initialized');
  }

  cacheElements() {
    this.elements = {
      grid: document.getElementById('timetable-grid'),
      dayFilter: document.getElementById('timetable-day-filter'),
      subjectFilter: document.getElementById('timetable-subject-filter'),
      clearFilters: document.getElementById('timetable-clear-filters'),
      densityButtons: document.querySelectorAll('#timetable-density-toggle .progress-view-toggle__button'),
      addBlockGlobal: document.getElementById('add-block-global'),
      
      // Block modal
      blockModal: document.getElementById('timetable-block-modal'),
      blockForm: document.getElementById('timetable-block-form'),
      blockFormId: document.getElementById('block-form-id'),
      blockFormDay: document.getElementById('block-form-day'),
      blockFormStart: document.getElementById('block-form-start'),
      blockFormEnd: document.getElementById('block-form-end'),
      blockFormSubject: document.getElementById('block-form-subject'),
      blockFormLocation: document.getElementById('block-form-location'),
      blockFormNotes: document.getElementById('block-form-notes'),
      blockFormColor: document.getElementById('block-form-color'),
      
      // Delete modal
      deleteModal: document.getElementById('timetable-delete-modal'),
      confirmDeleteBtn: document.getElementById('confirm-delete-block'),
      
      overlay: document.getElementById('task-modal-overlay'),
      toastContainer: document.getElementById('toast-container')
    };
  }

  async loadFromBackend() {
    this.loading = true;
    this.showLoading();

    try {
      const response = await fetch('/api/timetable');
      
      if (!response.ok) {
        throw new Error('Failed to fetch timetable');
      }

      const data = await response.json();
      this.timetable = this.normalizeTimetable(data);
      
      console.log('📦 Loaded timetable from backend:', this.timetable);
      
      // Check if we have blocks
      const totalBlocks = Object.values(this.timetable.days).reduce((sum, blocks) => sum + blocks.length, 0);
      console.log(`✅ Loaded ${totalBlocks} time blocks`);
      
    } catch (error) {
      console.error('❌ Failed to load timetable:', error);
      this.showToast('Failed to load timetable data', 'error');
      
      // Initialize with empty timetable
      this.timetable = this.createEmptyTimetable();
    } finally {
      this.loading = false;
      this.hideLoading();
    }
  }

  normalizeTimetable(data) {
    const normalized = {
      version: data.version || 1,
      weekStart: data.weekStart || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
      days: {}
    };

    const days = data.days || {};
    const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    dayKeys.forEach(day => {
      const blocks = days[day] || [];
      normalized.days[day] = blocks.map((block, index) => this.normalizeBlock(block, day, index));
    });

    return normalized;
  }

  normalizeBlock(block, day, index) {
    // Handle both formats: old (time, durationMinutes) and new (start, end)
    let start = block.start || block.time || '09:00';
    let end = block.end;

    // Calculate end time if only duration is given
    if (!end && block.durationMinutes) {
      const startMinutes = this.timeToMinutes(start);
      end = this.minutesToTime(startMinutes + block.durationMinutes);
    }

    // Default to 1 hour if no end time
    if (!end) {
      const startMinutes = this.timeToMinutes(start);
      end = this.minutesToTime(startMinutes + 60);
    }

    return {
      id: block.id || this.generateId(day, index),
      start: this.normalizeTime(start),
      end: this.normalizeTime(end),
      subject: block.subject || 'Untitled',
      location: block.location || block.room || '',
      notes: block.notes || '',
      color: block.color || this.getSubjectColor(block.subject)
    };
  }

  createEmptyTimetable() {
    return {
      version: 1,
      weekStart: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      days: {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: []
      }
    };
  }

  async saveTimetable(message = 'Saved') {
    try {
      // Prepare data for backend (convert to their format)
      const backendFormat = {
        weekStart: this.timetable.weekStart,
        days: {},
        updatedAt: new Date().toISOString()
      };

      Object.entries(this.timetable.days).forEach(([day, blocks]) => {
        backendFormat.days[day] = blocks.map(block => ({
          time: block.start,
          subject: block.subject,
          room: block.location,
          durationMinutes: this.calculateDuration(block.start, block.end),
          // Also include new format for compatibility
          id: block.id,
          start: block.start,
          end: block.end,
          location: block.location,
          notes: block.notes,
          color: block.color
        }));
      });

      const response = await fetch('/api/timetable', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backendFormat)
      });

      if (!response.ok) {
        throw new Error('Failed to save timetable');
      }

      const saved = await response.json();
      this.timetable = this.normalizeTimetable(saved);
      
      this.showToast(message, 'success');
      console.log('✅ Timetable saved to backend');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to save timetable:', error);
      this.showToast('Failed to save changes', 'error');
      return false;
    }
  }

  attachEventListeners() {
    // Filters
    this.elements.dayFilter?.addEventListener('change', () => {
      this.filters.day = this.elements.dayFilter.value;
      this.render();
    });

    this.elements.subjectFilter?.addEventListener('input', () => {
      this.filters.subject = this.elements.subjectFilter.value.toLowerCase();
      this.render();
    });

    this.elements.clearFilters?.addEventListener('click', () => {
      this.filters = { day: 'all', subject: '' };
      if (this.elements.dayFilter) this.elements.dayFilter.value = 'all';
      if (this.elements.subjectFilter) this.elements.subjectFilter.value = '';
      this.render();
    });

    // Density toggle
    this.elements.densityButtons?.forEach(btn => {
      btn.addEventListener('click', () => {
        const density = btn.dataset.density;
        this.setDensity(density);
      });
    });

    // Add block
    this.elements.addBlockGlobal?.addEventListener('click', () => {
      const day = this.filters.day !== 'all' ? this.filters.day : this.getTodayKey();
      this.openBlockForm(day);
    });

    // Block form
    this.elements.blockForm?.addEventListener('submit', (e) => this.handleBlockSave(e));

    // Delete confirmation
    this.elements.confirmDeleteBtn?.addEventListener('click', () => this.confirmDelete());

    // Modal close
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.closeModal(btn.dataset.closeModal);
      });
    });

    // Grid interactions
    if (this.elements.grid) {
      this.elements.grid.addEventListener('click', (e) => this.handleGridClick(e));
      this.elements.grid.addEventListener('keydown', (e) => this.handleKeydown(e));
      this.elements.grid.setAttribute('data-density', this.density);
    }

    this.updateDensityUI();
  }

  render() {
    if (!this.elements.grid) return;

    const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayLabels = {
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday'
    };

    const selectedDay = this.filters.day;
    const daysToRender = selectedDay === 'all' ? daysOrder : [selectedDay];

    this.elements.grid.innerHTML = '';
    this.elements.grid.className = 'timetable-grid';

    daysToRender.forEach(day => {
      const col = this.createDayColumn(day, dayLabels[day]);
      this.elements.grid.appendChild(col);
    });
  }

  createDayColumn(day, label) {
    const col = document.createElement('section');
    col.className = 'day-column';
    col.dataset.day = day;

    // Header
    const header = document.createElement('div');
    header.className = 'day-header';
    
    const today = this.getTodayKey();
    if (day === today) {
      header.classList.add('day-header--today');
    }

    header.innerHTML = `
      <span>${label}</span>
      <button class="icon-button add-block-button" data-action="add-block" data-day="${day}" 
              aria-label="Add block on ${label}" title="Add time block">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
    `;

    // Blocks container
    const blocksContainer = document.createElement('div');
    blocksContainer.className = 'day-blocks';

    // Get and filter blocks
    let blocks = (this.timetable.days[day] || []).slice();

    if (this.filters.subject) {
      blocks = blocks.filter(b => 
        (b.subject || '').toLowerCase().includes(this.filters.subject)
      );
    }

    // Sort by start time
    blocks.sort((a, b) => this.timeToMinutes(a.start) - this.timeToMinutes(b.start));

    if (blocks.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state empty-state--small';
      empty.innerHTML = '<p>No classes scheduled</p>';
      blocksContainer.appendChild(empty);
    } else {
      blocks.forEach((block, index) => {
        const blockEl = this.createBlockElement(block, day, index);
        blocksContainer.appendChild(blockEl);
      });
    }

    col.appendChild(header);
    col.appendChild(blocksContainer);

    return col;
  }

  createBlockElement(block, day, index) {
    const el = document.createElement('div');
    el.className = 'time-block';
    el.dataset.blockId = block.id;
    el.dataset.day = day;
    el.tabIndex = 0;
    el.draggable = true;

    const color = block.color || '#3b82f6';
    const duration = this.calculateDuration(block.start, block.end);

    el.innerHTML = `
      <div class="time-block__color" style="background: ${color}"></div>
      <div class="time-block__content">
        <div class="time-block__title">${this.escapeHtml(block.subject)}</div>
        <div class="time-block__meta">
          <span class="time-block__time">${this.formatTime(block.start)} – ${this.formatTime(block.end)}</span>
          ${block.location ? `<span class="time-block__separator">•</span><span class="time-block__location">${this.escapeHtml(block.location)}</span>` : ''}
        </div>
        ${block.notes ? `<div class="time-block__notes">${this.escapeHtml(block.notes)}</div>` : ''}
      </div>
      <div class="time-block__actions">
        <button class="icon-button" data-action="edit-block" data-day="${day}" data-block-id="${block.id}" 
                title="Edit" aria-label="Edit block">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="icon-button" data-action="duplicate-block" data-day="${day}" data-block-id="${block.id}" 
                title="Duplicate" aria-label="Duplicate block">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </button>
        <button class="icon-button" data-action="delete-block" data-day="${day}" data-block-id="${block.id}" 
                title="Delete" aria-label="Delete block">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    `;

    // Drag and drop
    el.addEventListener('dragstart', (e) => this.handleDragStart(e, block, day));
    el.addEventListener('dragend', (e) => this.handleDragEnd(e));

    return el;
  }

  handleGridClick(e) {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const day = btn.dataset.day;
    const blockId = btn.dataset.blockId;

    switch (action) {
      case 'add-block':
        this.openBlockForm(day);
        break;
      case 'edit-block':
        this.openBlockForm(day, blockId);
        break;
      case 'duplicate-block':
        this.duplicateBlock(day, blockId);
        break;
      case 'delete-block':
        this.openDeleteConfirm(day, blockId);
        break;
    }
  }

  handleKeydown(e) {
    const block = e.target.closest('.time-block');
    if (!block) return;

    const day = block.dataset.day;
    const blockId = block.dataset.blockId;

    // Enter to edit
    if (e.key === 'Enter') {
      e.preventDefault();
      this.openBlockForm(day, blockId);
    }

    // Delete/Backspace to delete
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      this.openDeleteConfirm(day, blockId);
    }

    // Ctrl/Cmd + D to duplicate
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      this.duplicateBlock(day, blockId);
    }
  }

  handleDragStart(e, block, day) {
    this.dragState = { block, day };
    e.currentTarget.classList.add('dragging');
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', block.id);
    }
  }

  handleDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    this.dragState = null;
  }

  openBlockForm(day, blockId = null) {
    const isEdit = !!blockId;
    const block = isEdit ? this.findBlock(day, blockId) : null;

    document.getElementById('timetable-block-title').textContent = isEdit ? 'Edit Time Block' : 'Add Time Block';

    if (isEdit && block) {
      this.elements.blockFormId.value = block.id;
      this.elements.blockFormDay.value = day;
      this.elements.blockFormStart.value = block.start;
      this.elements.blockFormEnd.value = block.end;
      this.elements.blockFormSubject.value = block.subject;
      this.elements.blockFormLocation.value = block.location || '';
      this.elements.blockFormNotes.value = block.notes || '';
      this.elements.blockFormColor.value = block.color || '#3b82f6';
    } else {
      this.elements.blockForm.reset();
      this.elements.blockFormId.value = '';
      this.elements.blockFormDay.value = day;
      this.elements.blockFormStart.value = '09:00';
      this.elements.blockFormEnd.value = '10:00';
      this.elements.blockFormColor.value = '#3b82f6';
    }

    this.openModal('timetable-block-modal');
  }

  async handleBlockSave(e) {
    e.preventDefault();

    const blockId = this.elements.blockFormId.value;
    const day = this.elements.blockFormDay.value;
    const start = this.normalizeTime(this.elements.blockFormStart.value);
    const end = this.normalizeTime(this.elements.blockFormEnd.value);
    const subject = this.elements.blockFormSubject.value.trim();

    // Validation
    if (!subject) {
      this.showToast('Subject is required', 'error');
      return;
    }

    if (this.timeToMinutes(end) <= this.timeToMinutes(start)) {
      this.showToast('End time must be after start time', 'error');
      return;
    }

    const blockData = {
      id: blockId || this.generateId(day),
      start,
      end,
      subject,
      location: this.elements.blockFormLocation.value.trim(),
      notes: this.elements.blockFormNotes.value.trim(),
      color: this.elements.blockFormColor.value
    };

    const blocks = this.timetable.days[day] || [];
    const existingIndex = blocks.findIndex(b => b.id === blockId);

    if (existingIndex >= 0) {
      blocks[existingIndex] = blockData;
    } else {
      blocks.push(blockData);
    }

    this.timetable.days[day] = blocks;

    await this.saveTimetable(blockId ? 'Block updated' : 'Block added');
    this.closeModal('timetable-block-modal');
    this.render();
  }

  openDeleteConfirm(day, blockId) {
    this.pendingDelete = { day, blockId };
    this.openModal('timetable-delete-modal');
  }

  async confirmDelete() {
    if (!this.pendingDelete) return;

    const { day, blockId } = this.pendingDelete;
    const blocks = this.timetable.days[day] || [];
    const index = blocks.findIndex(b => b.id === blockId);

    if (index >= 0) {
      blocks.splice(index, 1);
      this.timetable.days[day] = blocks;
      await this.saveTimetable('Block deleted');
    }

    this.closeModal('timetable-delete-modal');
    this.pendingDelete = null;
    this.render();
  }

  async duplicateBlock(day, blockId) {
    const block = this.findBlock(day, blockId);
    if (!block) return;

    // Shift time by 1 hour
    const startMinutes = this.timeToMinutes(block.start);
    const endMinutes = this.timeToMinutes(block.end);
    const duration = endMinutes - startMinutes;

    const newStart = this.minutesToTime(startMinutes + 60);
    const newEnd = this.minutesToTime(endMinutes + 60);

    const duplicate = {
      ...block,
      id: this.generateId(day),
      start: newStart,
      end: newEnd,
      subject: `${block.subject} (Copy)`
    };

    const blocks = this.timetable.days[day] || [];
    blocks.push(duplicate);
    this.timetable.days[day] = blocks;

    await this.saveTimetable('Block duplicated');
    this.render();
  }

  findBlock(day, blockId) {
    const blocks = this.timetable.days[day] || [];
    return blocks.find(b => b.id === blockId);
  }

  setDensity(density) {
    this.density = density === 'compact' ? 'compact' : 'expanded';
    localStorage.setItem('timetableDensity', this.density);
    if (this.elements.grid) {
      this.elements.grid.setAttribute('data-density', this.density);
    }
    this.updateDensityUI();
  }

  updateDensityUI() {
    this.elements.densityButtons?.forEach(btn => {
      const btnDensity = btn.dataset.density;
      const isActive = btnDensity === this.density;
      btn.classList.toggle('progress-view-toggle__button--active', isActive);
      btn.setAttribute('aria-pressed', isActive);
    });
  }

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    if (this.elements.overlay) {
      this.elements.overlay.removeAttribute('hidden');
      setTimeout(() => this.elements.overlay.classList.add('active'), 10);
    }

    modal.removeAttribute('hidden');
    setTimeout(() => {
      modal.classList.add('active');
      const firstInput = modal.querySelector('input, select, textarea');
      if (firstInput) firstInput.focus();
    }, 10);
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.remove('active');
    if (this.elements.overlay) {
      this.elements.overlay.classList.remove('active');
    }

    setTimeout(() => {
      modal.setAttribute('hidden', '');
      if (this.elements.overlay && !document.querySelector('.modal.active')) {
        this.elements.overlay.setAttribute('hidden', '');
      }
    }, 300);
  }

  showLoading() {
    if (this.elements.grid) {
      this.elements.grid.innerHTML = '<div class="loading-spinner">Loading timetable...</div>';
    }
  }

  hideLoading() {
    // Will be replaced by render()
  }

  showToast(message, type = 'success') {
    console.log(`📢 [${type}]`, message);

    if (!this.elements.toastContainer) {
      const toast = document.createElement('div');
      toast.className = `toast toast--${type}`;
      toast.textContent = message;
      toast.style.cssText = 'position:fixed;bottom:2rem;right:2rem;background:var(--success-color);color:white;padding:1rem 1.5rem;border-radius:8px;z-index:9999;';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
      return;
    }

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    this.elements.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // Helper methods
  getTodayKey() {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[new Date().getDay()];
  }

  generateId(day = '', index = 0) {
    return `${day}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  normalizeTime(time) {
    if (!time) return '09:00';
    const match = time.match(/^(\d{1,2}):(\d{2})/);
    if (!match) return '09:00';
    
    const hours = Math.max(0, Math.min(23, parseInt(match[1], 10)));
    const minutes = Math.max(0, Math.min(59, parseInt(match[2], 10)));
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  timeToMinutes(time) {
    if (!time) return 0;
    const [h, m] = time.split(':').map(n => parseInt(n, 10) || 0);
    return h * 60 + m;
  }

  minutesToTime(minutes) {
    const h = Math.floor(minutes / 60) % 24;
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  calculateDuration(start, end) {
    return this.timeToMinutes(end) - this.timeToMinutes(start);
  }

  formatTime(time) {
    if (!time) return '—';
    const [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
  }

  getSubjectColor(subject) {
    const colors = {
      'mathematics': '#3b82f6',
      'math': '#3b82f6',
      'physics': '#10b981',
      'chemistry': '#f59e0b',
      'biology': '#84cc16',
      'english': '#ec4899',
      'history': '#ef4444',
      'computer science': '#8b5cf6',
      'geography': '#06b6d4'
    };
    
    return colors[(subject || '').toLowerCase()] || '#6366f1';
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.smartTimetable = new SmartTimetable();
  });
} else {
  window.smartTimetable = new SmartTimetable();
}
