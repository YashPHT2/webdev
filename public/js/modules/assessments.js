/**
 * Smart Mentor Assessments Manager
 * Track exams, tests, and evaluations
 */

class AssessmentsManager {
  constructor() {
    this.assessments = [];
    this.filters = {
      subject: '',
      dateFrom: '',
      dateTo: ''
    };
    this.pendingDelete = null;
    
    console.log('📝 Assessments Manager initializing...');
    this.init();
  }

  async init() {
    try {
      this.cacheElements();
      
      if (!this.elements.list) {
        console.error('❌ Assessment list not found!');
        return;
      }

      this.attachEventListeners();
      await this.loadAssessments();
      this.render();
      
      console.log('✅ Assessments Manager initialized with', this.assessments.length, 'assessments');
    } catch (error) {
      console.error('❌ Assessments initialization failed:', error);
      this.showError('Failed to initialize assessments');
    }
  }

  cacheElements() {
    this.elements = {
      list: document.getElementById('assessments-list'),
      count: document.querySelector('[data-assessments-count]'),
      loading: document.getElementById('assessments-loading'),
      error: document.getElementById('assessments-error'),
      
      // Filters
      filterSubject: document.getElementById('assessment-filter-subject'),
      filterFrom: document.getElementById('assessment-filter-from'),
      filterTo: document.getElementById('assessment-filter-to'),
      
      // Buttons
      addBtn: document.getElementById('add-assessment'),
      
      // Modal
      modal: document.getElementById('assessment-form-modal'),
      overlay: document.getElementById('assessment-modal-overlay'),
      modalClose: document.getElementById('assessment-modal-close'),
      modalCancel: document.getElementById('assessment-modal-cancel'),
      form: document.getElementById('assessment-form'),
      formTitle: document.getElementById('assessment-form-title'),
      formId: document.getElementById('assessment-form-id'),
      formTitleInput: document.getElementById('assessment-form-title-input'),
      formSubject: document.getElementById('assessment-form-subject'),
      formDate: document.getElementById('assessment-form-date'),
      formTime: document.getElementById('assessment-form-time'),
      formResources: document.getElementById('assessment-form-resources'),
    };

    console.log('✓ Elements cached');
  }

  attachEventListeners() {
    // Add assessment
    this.elements.addBtn?.addEventListener('click', () => this.openAssessmentForm());
    
    // Filters
    this.elements.filterSubject?.addEventListener('change', () => {
      this.filters.subject = this.elements.filterSubject.value;
      this.render();
    });
    
    this.elements.filterFrom?.addEventListener('change', () => {
      this.filters.dateFrom = this.elements.filterFrom.value;
      this.render();
    });
    
    this.elements.filterTo?.addEventListener('change', () => {
      this.filters.dateTo = this.elements.filterTo.value;
      this.render();
    });
    
    // Form submit
    this.elements.form?.addEventListener('submit', (e) => this.handleSubmit(e));
    
    // Modal close
    this.elements.modalClose?.addEventListener('click', () => this.closeModal());
    this.elements.modalCancel?.addEventListener('click', () => this.closeModal());
    this.elements.overlay?.addEventListener('click', () => this.closeModal());
    
    console.log('✓ Event listeners attached');
  }

  async loadAssessments() {
    this.showLoading();

    try {
      console.log('📡 Fetching assessments...');
      
      const response = await fetch('/api/assessments');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      this.assessments = Array.isArray(data) ? data : [];
      
      console.log('✓ Loaded', this.assessments.length, 'assessments');
      
    } catch (error) {
      console.warn('⚠️ API failed, using localStorage:', error.message);
      this.assessments = this.loadFromLocalStorage();
    } finally {
      this.hideLoading();
    }
  }

  loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem('smartMentorAssessments');
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('📦 Loaded from localStorage:', parsed.length);
        return parsed;
      }
    } catch (error) {
      console.warn('⚠️ localStorage read failed:', error);
    }
    
    return this.createDemoAssessments();
  }

  createDemoAssessments() {
    console.log('✨ Creating demo assessments');
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const twoWeeks = new Date(today);
    twoWeeks.setDate(twoWeeks.getDate() + 14);

    return [
      {
        id: 'demo-1',
        title: 'Mathematics Midterm Exam',
        subject: 'Mathematics',
        date: this.formatDate(tomorrow),
        time: '09:00',
        resources: [
          'https://www.khanacademy.org/math/algebra',
          'https://www.mathsisfun.com/algebra/'
        ],
        createdAt: new Date().toISOString()
      },
      {
        id: 'demo-2',
        title: 'Physics Lab Test',
        subject: 'Physics',
        date: this.formatDate(nextWeek),
        time: '14:00',
        resources: [
          'https://www.physicsclassroom.com/'
        ],
        createdAt: new Date().toISOString()
      },
      {
        id: 'demo-3',
        title: 'Chemistry Final Exam',
        subject: 'Chemistry',
        date: this.formatDate(twoWeeks),
        time: '10:30',
        resources: [],
        createdAt: new Date().toISOString()
      }
    ];
  }

  saveToLocalStorage() {
    try {
      localStorage.setItem('smartMentorAssessments', JSON.stringify(this.assessments));
      console.log('💾 Saved to localStorage');
    } catch (error) {
      console.warn('⚠️ localStorage write failed:', error);
    }
  }

  async saveAssessment(assessment) {
    try {
      const isEdit = !!assessment.id && this.assessments.find(a => a.id === assessment.id);
      
      console.log(`💾 Saving assessment (${isEdit ? 'edit' : 'create'}):`, assessment.title);
      
      const response = await fetch(`/api/assessments${isEdit ? `/${assessment.id}` : ''}`, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assessment)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const saved = await response.json();
      
      if (isEdit) {
        const index = this.assessments.findIndex(a => a.id === assessment.id);
        if (index >= 0) this.assessments[index] = saved;
      } else {
        this.assessments.push(saved);
      }

      this.saveToLocalStorage();
      this.showToast(isEdit ? 'Assessment updated' : 'Assessment created', 'success');
      
      return true;
    } catch (error) {
      console.warn('⚠️ Backend save failed, using localStorage:', error.message);
      
      // Fallback to localStorage
      if (!assessment.id) {
        assessment.id = this.generateId();
        assessment.createdAt = new Date().toISOString();
      }
      assessment.updatedAt = new Date().toISOString();
      
      const existingIndex = this.assessments.findIndex(a => a.id === assessment.id);
      if (existingIndex >= 0) {
        this.assessments[existingIndex] = assessment;
      } else {
        this.assessments.push(assessment);
      }
      
      this.saveToLocalStorage();
      this.showToast('Assessment saved locally', 'warning');
      
      return true;
    }
  }

  async deleteAssessment(assessmentId) {
    try {
      console.log('🗑️ Deleting assessment:', assessmentId);
      
      const response = await fetch(`/api/assessments/${assessmentId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      this.assessments = this.assessments.filter(a => a.id !== assessmentId);
      this.saveToLocalStorage();
      this.showToast('Assessment deleted', 'success');
      
      return true;
    } catch (error) {
      console.warn('⚠️ Backend delete failed, using localStorage:', error.message);
      
      this.assessments = this.assessments.filter(a => a.id !== assessmentId);
      this.saveToLocalStorage();
      this.showToast('Assessment deleted locally', 'warning');
      
      return true;
    }
  }

  render() {
    if (!this.elements.list) return;

    console.log('🎨 Rendering assessments...');

    // Get filtered and sorted assessments
    const filtered = this.getFilteredAssessments();
    const sorted = this.sortAssessments(filtered);

    // Update count
    if (this.elements.count) {
      this.elements.count.textContent = sorted.length;
    }

    // Update subject filter options
    this.updateSubjectFilter();

    // Update sidebar widgets
    this.updateNextAssessmentWidget();
    this.updateStatsWidget();
    this.updateSubjectBreakdown();

    // Clear list
    this.elements.list.innerHTML = '';

    if (sorted.length === 0) {
      this.showEmptyState();
      return;
    }

    // Render assessments
    sorted.forEach(assessment => {
      const item = this.createAssessmentItem(assessment);
      this.elements.list.appendChild(item);
    });

    console.log('✓ Rendered', sorted.length, 'assessments');
  }

  updateNextAssessmentWidget() {
    const widget = document.getElementById('next-assessment-widget');
    if (!widget) return;

    const upcoming = this.assessments
      .filter(a => new Date(`${a.date}T${a.time || '00:00'}`) >= new Date())
      .sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time || '00:00'}`);
        const dateB = new Date(`${b.date}T${b.time || '00:00'}`);
        return dateA - dateB;
      });

    if (upcoming.length === 0) {
      widget.innerHTML = '<div class="next-assessment-widget__empty">No upcoming assessments</div>';
      return;
    }

    const next = upcoming[0];
    const nextDate = new Date(`${next.date}T${next.time || '00:00'}`);
    const daysUntil = this.getDaysUntil(nextDate);

    widget.innerHTML = `
      <div class="next-assessment-widget__content">
        <h4 class="next-assessment-widget__title">${this.escapeHtml(next.title)}</h4>
        <span class="next-assessment-widget__subject">${this.escapeHtml(next.subject || 'General')}</span>
        <div class="next-assessment-widget__countdown">
          <div>
            <div class="countdown-number">${Math.abs(daysUntil)}</div>
            <div class="countdown-label">${daysUntil === 1 ? 'day' : 'days'}</div>
          </div>
        </div>
        <div class="next-assessment-widget__datetime">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span>${this.formatDisplayDate(nextDate)}</span>
        </div>
        ${next.time ? `
          <div class="next-assessment-widget__datetime">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span>${this.formatTime(next.time)}</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  updateStatsWidget() {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const thisWeek = this.assessments.filter(a => {
      const date = new Date(a.date);
      return date >= startOfWeek && date >= now;
    }).length;

    const thisMonth = this.assessments.filter(a => {
      const date = new Date(a.date);
      return date >= startOfMonth && date >= now;
    }).length;

    const total = this.assessments.filter(a => new Date(a.date) >= now).length;

    const thisWeekEl = document.getElementById('stat-this-week');
    const thisMonthEl = document.getElementById('stat-this-month');
    const totalEl = document.getElementById('stat-total');

    if (thisWeekEl) thisWeekEl.textContent = thisWeek;
    if (thisMonthEl) thisMonthEl.textContent = thisMonth;
    if (totalEl) totalEl.textContent = total;
  }

  updateSubjectBreakdown() {
    const breakdown = document.getElementById('subject-breakdown');
    if (!breakdown) return;

    const subjects = {};
    
    this.assessments
      .filter(a => new Date(a.date) >= new Date())
      .forEach(a => {
        const subject = a.subject || 'General';
        subjects[subject] = (subjects[subject] || 0) + 1;
      });

    const entries = Object.entries(subjects).sort((a, b) => b[1] - a[1]);

    if (entries.length === 0) {
      breakdown.innerHTML = '<div class="next-assessment-widget__empty">No upcoming assessments</div>';
      return;
    }

    breakdown.innerHTML = entries.map(([subject, count]) => `
      <div class="subject-breakdown-item">
        <span class="subject-breakdown-item__name">${this.escapeHtml(subject)}</span>
        <span class="subject-breakdown-item__count">${count}</span>
      </div>
    `).join('');
  }

  getFilteredAssessments() {
    return this.assessments.filter(assessment => {
      // Subject filter
      if (this.filters.subject && assessment.subject !== this.filters.subject) {
        return false;
      }

      // Date range filter
      const assessmentDate = new Date(assessment.date);
      
      if (this.filters.dateFrom) {
        const fromDate = new Date(this.filters.dateFrom);
        if (assessmentDate < fromDate) return false;
      }

      if (this.filters.dateTo) {
        const toDate = new Date(this.filters.dateTo);
        if (assessmentDate > toDate) return false;
      }

      return true;
    });
  }

  sortAssessments(assessments) {
    return assessments.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time || '00:00'}`);
      const dateB = new Date(`${b.date}T${b.time || '00:00'}`);
      return dateA - dateB;
    });
  }

  createAssessmentItem(assessment) {
    const item = document.createElement('div');
    item.className = 'assessment-item';
    item.dataset.assessmentId = assessment.id;

    const assessmentDate = new Date(`${assessment.date}T${assessment.time || '00:00'}`);
    const daysUntil = this.getDaysUntil(assessmentDate);
    const isPast = daysUntil < 0;
    const isToday = daysUntil === 0;
    const isUpcoming = daysUntil > 0 && daysUntil <= 7;

    let statusClass = '';
    let statusText = '';
    
    if (isPast) {
      statusClass = 'assessment-item--past';
      statusText = 'Completed';
    } else if (isToday) {
      statusClass = 'assessment-item--today';
      statusText = 'Today';
    } else if (isUpcoming) {
      statusClass = 'assessment-item--upcoming';
      statusText = `In ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`;
    } else {
      statusText = `In ${daysUntil} days`;
    }

    item.classList.add(statusClass);

    const resourcesHtml = assessment.resources && assessment.resources.length > 0
      ? assessment.resources.map(url => 
          `<a href="${this.escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="assessment-resource">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
            ${this.truncateUrl(url)}
          </a>`
        ).join('')
      : '';

    item.innerHTML = `
      <div class="assessment-item__header">
        <div class="assessment-item__title-section">
          <h3 class="assessment-item__title">${this.escapeHtml(assessment.title)}</h3>
          <div class="assessment-item__meta">
            <span class="assessment-item__subject">${this.escapeHtml(assessment.subject || 'General')}</span>
            <span class="assessment-item__separator">•</span>
            <span class="assessment-item__date">${this.formatDisplayDate(assessmentDate)}</span>
            ${assessment.time ? `<span class="assessment-item__separator">•</span><span class="assessment-item__time">${this.formatTime(assessment.time)}</span>` : ''}
          </div>
        </div>
        <div class="assessment-item__status">
          <span class="assessment-badge assessment-badge--${statusClass.replace('assessment-item--', '')}">${statusText}</span>
        </div>
      </div>
      ${resourcesHtml ? `<div class="assessment-item__resources">${resourcesHtml}</div>` : ''}
      <div class="assessment-item__actions">
        <button class="icon-button" data-action="edit" data-id="${assessment.id}" 
                title="Edit assessment" aria-label="Edit ${this.escapeHtml(assessment.title)}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="icon-button" data-action="delete" data-id="${assessment.id}" 
                title="Delete assessment" aria-label="Delete ${this.escapeHtml(assessment.title)}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    `;

    // Event listeners
    const editBtn = item.querySelector('[data-action="edit"]');
    const deleteBtn = item.querySelector('[data-action="delete"]');

    editBtn?.addEventListener('click', () => this.openAssessmentForm(assessment));
    deleteBtn?.addEventListener('click', () => this.handleDelete(assessment));

    return item;
  }

  showEmptyState() {
    this.elements.list.innerHTML = `
      <div class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <rect x="3" y="3" width="18" height="14" rx="2"></rect>
          <path d="M7 7h10M7 11h6"></path>
        </svg>
        <h3>No assessments found</h3>
        <p>Add your first assessment to start tracking exams and tests.</p>
        <button class="primary-button" onclick="window.assessmentsManager?.openAssessmentForm()">
          Add Assessment
        </button>
      </div>
    `;
  }

  updateSubjectFilter() {
    if (!this.elements.filterSubject) return;

    const subjects = [...new Set(this.assessments.map(a => a.subject).filter(Boolean))];
    const currentValue = this.elements.filterSubject.value;

    this.elements.filterSubject.innerHTML = '<option value="">All subjects</option>';
    
    subjects.forEach(subject => {
      const option = document.createElement('option');
      option.value = subject;
      option.textContent = subject;
      this.elements.filterSubject.appendChild(option);
    });

    if (subjects.includes(currentValue)) {
      this.elements.filterSubject.value = currentValue;
    }
  }

  openAssessmentForm(assessment = null) {
    const isEdit = !!assessment;

    if (this.elements.formTitle) {
      const title = this.elements.formTitle.querySelector('h2');
      if (title) title.textContent = isEdit ? 'Edit Assessment' : 'Add Assessment';
    }

    if (isEdit) {
      this.elements.formId.value = assessment.id;
      this.elements.formTitleInput.value = assessment.title;
      this.elements.formSubject.value = assessment.subject || '';
      this.elements.formDate.value = assessment.date;
      this.elements.formTime.value = assessment.time || '';
      this.elements.formResources.value = (assessment.resources || []).join('\n');
    } else {
      this.elements.form.reset();
      this.elements.formId.value = '';
      // Set default date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      this.elements.formDate.value = this.formatDate(tomorrow);
    }

    this.openModal();
  }

  async handleSubmit(e) {
    e.preventDefault();

    const assessmentData = {
      id: this.elements.formId.value || this.generateId(),
      title: this.elements.formTitleInput.value.trim(),
      subject: this.elements.formSubject.value.trim(),
      date: this.elements.formDate.value,
      time: this.elements.formTime.value,
      resources: this.elements.formResources.value
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && this.isValidUrl(line)),
      updatedAt: new Date().toISOString()
    };

    if (!assessmentData.title) {
      this.showToast('Title is required', 'error');
      return;
    }

    if (!assessmentData.date) {
      this.showToast('Date is required', 'error');
      return;
    }

    const success = await this.saveAssessment(assessmentData);

    if (success) {
      this.closeModal();
      this.render();
    }
  }

  async handleDelete(assessment) {
    if (!confirm(`Delete "${assessment.title}"?`)) return;

    const success = await this.deleteAssessment(assessment.id);
    if (success) {
      this.render();
    }
  }

  openModal() {
    if (this.elements.overlay) {
      this.elements.overlay.removeAttribute('hidden');
      setTimeout(() => this.elements.overlay.classList.add('active'), 10);
    }

    if (this.elements.modal) {
      this.elements.modal.removeAttribute('hidden');
      setTimeout(() => {
        this.elements.modal.classList.add('active');
        this.elements.formTitleInput?.focus();
      }, 10);
    }
  }

  closeModal() {
    if (this.elements.modal) {
      this.elements.modal.classList.remove('active');
    }
    
    if (this.elements.overlay) {
      this.elements.overlay.classList.remove('active');
    }

    setTimeout(() => {
      this.elements.modal?.setAttribute('hidden', '');
      this.elements.overlay?.setAttribute('hidden', '');
    }, 300);
  }

  showLoading() {
    if (this.elements.loading) {
      this.elements.loading.removeAttribute('hidden');
    }
    if (this.elements.list) {
      this.elements.list.innerHTML = '';
    }
  }

  hideLoading() {
    if (this.elements.loading) {
      this.elements.loading.setAttribute('hidden', '');
    }
  }

  showError(message) {
    if (this.elements.error) {
      this.elements.error.textContent = message;
      this.elements.error.removeAttribute('hidden');
    }
    
    if (this.elements.list) {
      this.elements.list.innerHTML = `
        <div class="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="empty-state__icon">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <h3 class="empty-state__title">Unable to load assessments</h3>
          <p class="empty-state__text">${message}</p>
          <button class="primary-button" onclick="location.reload()">Retry</button>
        </div>
      `;
    }
  }

  showToast(message, type = 'success') {
    console.log(`📢 [${type}]`, message);

    const colors = {
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background: ${colors[type] || colors.success};
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      z-index: 9999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // Utility methods
  getDaysUntil(date) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    
    const diff = target - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  formatDate(date) {
    if (typeof date === 'string') return date.split('T')[0];
    return new Date(date).toISOString().split('T')[0];
  }

  formatDisplayDate(date) {
    return new Date(date).toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  }

  formatTime(time) {
    if (!time) return '';
    const [hours, minutes] = time.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  }

  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  truncateUrl(url) {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');
      return domain;
    } catch (_) {
      return url.substring(0, 30) + '...';
    }
  }

  generateId() {
    return `assessment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Auto-initialize
(function() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAssessments);
  } else {
    initAssessments();
  }

  function initAssessments() {
    try {
      window.assessmentsManager = new AssessmentsManager();
    } catch (error) {
      console.error('❌ Failed to initialize Assessments Manager:', error);
    }
  }
})();
