/**
 * Smart Mentor Subjects Manager - Fixed Version
 * Handles subjects with proper error handling
 */

class SubjectsManager {
  constructor() {
    this.subjects = [];
    this.tasks = [];
    this.currentView = 'grid';
    this.pendingDelete = null;
    this.initialized = false;
    
    console.log('📚 Subjects Manager starting...');
    this.init();
  }

  async init() {
    try {
      this.cacheElements();
      
      if (!this.elements.container) {
        console.error('❌ Subjects container not found!');
        return;
      }

      this.attachEventListeners();
      await this.loadData();
      this.initialized = true;
      this.render();
      
      console.log('✅ Subjects Manager initialized with', this.subjects.length, 'subjects');
    } catch (error) {
      console.error('❌ Subjects Manager initialization failed:', error);
      this.hideLoading();
      this.showError('Failed to initialize subjects');
    }
  }

  cacheElements() {
    this.elements = {
      container: document.getElementById('subjects-container'),
      emptyState: document.getElementById('subjects-empty'),
      count: document.getElementById('subjects-count'),
      
      // View toggles
      viewGridBtn: document.getElementById('subjects-view-grid'),
      viewListBtn: document.getElementById('subjects-view-list'),
      
      // Action buttons
      addSubjectBtn: document.getElementById('add-subject'),
      emptyCreateBtn: document.getElementById('empty-create-subject'),
      refreshBtn: document.getElementById('refresh-subjects'),
      
      // Modals
      subjectModal: document.getElementById('subject-form-modal'),
      subjectOverlay: document.getElementById('subjects-modal-overlay'),
      subjectForm: document.getElementById('subject-form'),
      subjectId: document.getElementById('subject-id'),
      subjectName: document.getElementById('subject-name'),
      subjectColor: document.getElementById('subject-color'),
      subjectModalTitle: document.getElementById('subject-form-title'),
      
      deleteModal: document.getElementById('subject-delete-modal'),
      deleteName: document.getElementById('subject-delete-name'),
      confirmDeleteBtn: document.getElementById('confirm-delete-subject'),
    };

    console.log('✓ Elements cached:', {
      container: !!this.elements.container,
      emptyState: !!this.elements.emptyState,
      addButton: !!this.elements.addSubjectBtn
    });
  }

  attachEventListeners() {
    // View switching
    this.elements.viewGridBtn?.addEventListener('click', () => this.switchView('grid'));
    this.elements.viewListBtn?.addEventListener('click', () => this.switchView('list'));
    
    // Add subject
    this.elements.addSubjectBtn?.addEventListener('click', () => this.openSubjectForm());
    this.elements.emptyCreateBtn?.addEventListener('click', () => this.openSubjectForm());
    
    // Refresh
    this.elements.refreshBtn?.addEventListener('click', () => this.refresh());
    
    // Form submit
    this.elements.subjectForm?.addEventListener('submit', (e) => this.handleSubjectSave(e));
    
    // Delete confirm
    this.elements.confirmDeleteBtn?.addEventListener('click', () => this.confirmDelete());
    
    // Modal close
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.closeModal(btn.dataset.closeModal);
      });
    });
    
    this.elements.subjectOverlay?.addEventListener('click', () => {
      this.closeModal('subject-form-modal');
    });

    console.log('✓ Event listeners attached');
  }

  async loadData() {
    this.showLoading();

    try {
      console.log('📡 Fetching subjects and tasks...');
      
      // Fetch subjects and tasks in parallel with timeout
      const [subjects, tasks] = await Promise.all([
        this.fetchSubjects(),
        this.fetchTasks()
      ]);

      this.subjects = subjects;
      this.tasks = tasks;
      
      console.log('📊 Loaded:', {
        subjects: this.subjects.length,
        tasks: this.tasks.length
      });

    } catch (error) {
      console.error('❌ Failed to load data:', error);
      
      // Try to load from localStorage as fallback
      this.subjects = this.loadFromLocalStorage();
      this.tasks = [];
      
      console.log('📦 Loaded from localStorage:', this.subjects.length, 'subjects');
      
    } finally {
      this.hideLoading();
    }
  }

  async fetchSubjects() {
    try {
      console.log('→ Fetching /api/subjects');
      const response = await fetch('/api/subjects');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✓ Subjects fetched:', data.length || 0);
      return Array.isArray(data) ? data : [];
      
    } catch (error) {
      console.warn('⚠️ API fetch failed, using localStorage:', error.message);
      return this.loadFromLocalStorage();
    }
  }

  async fetchTasks() {
    try {
      const response = await fetch('/api/tasks');
      if (!response.ok) throw new Error('Failed to fetch tasks');
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.warn('⚠️ Tasks not available:', error.message);
      return [];
    }
  }

  loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem('smartMentorSubjects');
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('📦 Loaded from localStorage:', parsed.length, 'subjects');
        return parsed;
      }
    } catch (error) {
      console.warn('⚠️ localStorage read failed:', error);
    }
    
    // Return demo data if nothing in storage
    return this.createDemoSubjects();
  }

  createDemoSubjects() {
    console.log('✨ Creating demo subjects');
    return [
      {
        id: 'demo-1',
        name: 'Mathematics',
        color: '#3b82f6',
        createdAt: new Date().toISOString()
      },
      {
        id: 'demo-2',
        name: 'Physics',
        color: '#10b981',
        createdAt: new Date().toISOString()
      },
      {
        id: 'demo-3',
        name: 'Chemistry',
        color: '#f59e0b',
        createdAt: new Date().toISOString()
      },
      {
        id: 'demo-4',
        name: 'Biology',
        color: '#84cc16',
        createdAt: new Date().toISOString()
      },
      {
        id: 'demo-5',
        name: 'English',
        color: '#ec4899',
        createdAt: new Date().toISOString()
      }
    ];
  }

  saveToLocalStorage() {
    try {
      localStorage.setItem('smartMentorSubjects', JSON.stringify(this.subjects));
      console.log('💾 Saved to localStorage');
    } catch (error) {
      console.warn('⚠️ localStorage write failed:', error);
    }
  }

  async saveSubject(subject) {
    try {
      const isEdit = !!subject.id && this.subjects.find(s => s.id === subject.id);
      
      console.log(`💾 Saving subject (${isEdit ? 'edit' : 'create'}):`, subject.name);
      
      const response = await fetch(`/api/subjects${isEdit ? `/${subject.id}` : ''}`, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subject)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const saved = await response.json();
      
      if (isEdit) {
        const index = this.subjects.findIndex(s => s.id === subject.id);
        if (index >= 0) this.subjects[index] = saved;
      } else {
        this.subjects.push(saved);
      }

      this.saveToLocalStorage();
      this.showToast(isEdit ? 'Subject updated' : 'Subject created', 'success');
      
      return true;
    } catch (error) {
      console.warn('⚠️ Backend save failed, using localStorage:', error.message);
      
      // Fallback to localStorage
      if (!subject.id) {
        subject.id = this.generateId();
        subject.createdAt = new Date().toISOString();
      }
      subject.updatedAt = new Date().toISOString();
      
      const existingIndex = this.subjects.findIndex(s => s.id === subject.id);
      if (existingIndex >= 0) {
        this.subjects[existingIndex] = subject;
      } else {
        this.subjects.push(subject);
      }
      
      this.saveToLocalStorage();
      this.showToast('Subject saved locally', 'warning');
      
      return true;
    }
  }

  async deleteSubject(subjectId) {
    try {
      console.log('🗑️ Deleting subject:', subjectId);
      
      const response = await fetch(`/api/subjects/${subjectId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      this.subjects = this.subjects.filter(s => s.id !== subjectId);
      this.saveToLocalStorage();
      this.showToast('Subject deleted', 'success');
      
      return true;
    } catch (error) {
      console.warn('⚠️ Backend delete failed, using localStorage:', error.message);
      
      this.subjects = this.subjects.filter(s => s.id !== subjectId);
      this.saveToLocalStorage();
      this.showToast('Subject deleted locally', 'warning');
      
      return true;
    }
  }

  render() {
    if (!this.elements.container) {
      console.error('❌ Cannot render: container not found');
      return;
    }

    console.log('🎨 Rendering', this.subjects.length, 'subjects');

    // Update count
    if (this.elements.count) {
      this.elements.count.textContent = this.subjects.length;
    }

    // Show empty state or subjects
    if (this.subjects.length === 0) {
      this.elements.container.setAttribute('hidden', '');
      if (this.elements.emptyState) {
        this.elements.emptyState.removeAttribute('hidden');
      }
      console.log('📭 Showing empty state');
      return;
    }

    // Show subjects
    if (this.elements.emptyState) {
      this.elements.emptyState.setAttribute('hidden', '');
    }
    this.elements.container.removeAttribute('hidden');

    // Clear and render
    this.elements.container.innerHTML = '';

    this.subjects.forEach(subject => {
      const card = this.createSubjectCard(subject);
      this.elements.container.appendChild(card);
    });

    console.log('✓ Rendered', this.subjects.length, 'subject cards');
  }

  createSubjectCard(subject) {
    const card = document.createElement('div');
    card.className = 'subject-card';
    card.dataset.subjectId = subject.id;

    // Count tasks for this subject
    const taskCount = this.tasks.filter(t => t.subject === subject.name).length;
    const completedTasks = this.tasks.filter(t => 
      t.subject === subject.name && (t.status === 'completed' || t.progress === 100)
    ).length;

    const color = subject.color || '#3b82f6';

    card.innerHTML = `
      <div class="subject-color" style="background: ${color}"></div>
      <div class="subject-content">
        <div class="subject-title">${this.escapeHtml(subject.name)}</div>
        <div class="subject-meta">
          <span class="badge">${taskCount} task${taskCount !== 1 ? 's' : ''}</span>
          ${completedTasks > 0 ? `<span class="badge">${completedTasks} completed</span>` : ''}
        </div>
      </div>
      <div class="subject-actions">
        <button class="icon-button" data-action="edit" data-subject-id="${subject.id}" 
                title="Edit subject" aria-label="Edit ${this.escapeHtml(subject.name)}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="icon-button" data-action="delete" data-subject-id="${subject.id}" 
                title="Delete subject" aria-label="Delete ${this.escapeHtml(subject.name)}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    `;

    // Event listeners
    const editBtn = card.querySelector('[data-action="edit"]');
    const deleteBtn = card.querySelector('[data-action="delete"]');

    editBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openSubjectForm(subject);
    });

    deleteBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openDeleteConfirm(subject);
    });

    return card;
  }

  openSubjectForm(subject = null) {
    console.log('📝 Opening subject form:', subject ? 'edit' : 'create');
    
    const isEdit = !!subject;

    if (this.elements.subjectModalTitle) {
      this.elements.subjectModalTitle.textContent = isEdit ? 'Edit Subject' : 'Add Subject';
    }

    if (isEdit) {
      this.elements.subjectId.value = subject.id;
      this.elements.subjectName.value = subject.name;
      this.elements.subjectColor.value = subject.color || '#3b82f6';
    } else {
      this.elements.subjectForm.reset();
      this.elements.subjectId.value = '';
      this.elements.subjectColor.value = '#3b82f6';
    }

    this.openModal('subject-form-modal');
  }

  async handleSubjectSave(e) {
    e.preventDefault();

    const subjectData = {
      id: this.elements.subjectId.value || this.generateId(),
      name: this.elements.subjectName.value.trim(),
      color: this.elements.subjectColor.value,
      updatedAt: new Date().toISOString()
    };

    if (!subjectData.name) {
      this.showToast('Subject name is required', 'error');
      return;
    }

    // Check for duplicate names (excluding self)
    const duplicate = this.subjects.find(s => 
      s.name.toLowerCase() === subjectData.name.toLowerCase() && 
      s.id !== subjectData.id
    );

    if (duplicate) {
      this.showToast('Subject name already exists', 'error');
      return;
    }

    const success = await this.saveSubject(subjectData);

    if (success) {
      this.closeModal('subject-form-modal');
      this.render();
    }
  }

  openDeleteConfirm(subject) {
    this.pendingDelete = subject;
    
    if (this.elements.deleteName) {
      this.elements.deleteName.textContent = subject.name;
    }

    this.openModal('subject-delete-modal');
  }

  async confirmDelete() {
    if (!this.pendingDelete) return;

    const success = await this.deleteSubject(this.pendingDelete.id);

    if (success) {
      this.closeModal('subject-delete-modal');
      this.pendingDelete = null;
      this.render();
    }
  }

  async refresh() {
    this.showToast('Refreshing...', 'info');
    await this.loadData();
    this.render();
  }

  switchView(view) {
    this.currentView = view;

    // Update buttons
    if (this.elements.viewGridBtn) {
      const isGrid = view === 'grid';
      this.elements.viewGridBtn.classList.toggle('progress-view-toggle__button--active', isGrid);
      this.elements.viewGridBtn.setAttribute('aria-pressed', isGrid);
    }

    if (this.elements.viewListBtn) {
      const isList = view === 'list';
      this.elements.viewListBtn.classList.toggle('progress-view-toggle__button--active', isList);
      this.elements.viewListBtn.setAttribute('aria-pressed', isList);
    }

    // Update container class
    if (this.elements.container) {
      this.elements.container.className = view === 'grid' 
        ? 'subjects-container subjects-container--grid'
        : 'subjects-container subjects-container--list';
    }
  }

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
      console.warn('⚠️ Modal not found:', modalId);
      return;
    }

    if (this.elements.subjectOverlay) {
      this.elements.subjectOverlay.removeAttribute('hidden');
      setTimeout(() => this.elements.subjectOverlay.classList.add('active'), 10);
    }

    modal.removeAttribute('hidden');
    setTimeout(() => {
      modal.classList.add('active');
      const firstInput = modal.querySelector('input:not([type="hidden"])');
      if (firstInput) firstInput.focus();
    }, 10);
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.remove('active');
    if (this.elements.subjectOverlay) {
      this.elements.subjectOverlay.classList.remove('active');
    }

    setTimeout(() => {
      modal.setAttribute('hidden', '');
      if (this.elements.subjectOverlay && !document.querySelector('.modal.active')) {
        this.elements.subjectOverlay.setAttribute('hidden', '');
      }
    }, 300);
  }

  showLoading() {
    if (this.elements.container) {
      this.elements.container.innerHTML = '<div class="loading-spinner">Loading subjects...</div>';
      this.elements.container.removeAttribute('hidden');
    }
    if (this.elements.emptyState) {
      this.elements.emptyState.setAttribute('hidden', '');
    }
  }

  hideLoading() {
    // Will be replaced by render()
  }

  showError(message) {
    if (this.elements.container) {
      this.elements.container.innerHTML = `
        <div class="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="empty-state__icon">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <h3 class="empty-state__title">Unable to load subjects</h3>
          <p class="empty-state__text">${message}</p>
          <button class="primary-button" onclick="window.subjectsManager?.refresh()">Retry</button>
        </div>
      `;
      this.elements.container.removeAttribute('hidden');
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
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  generateId() {
    return `subject-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Auto-initialize with better error handling
(function() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSubjects);
  } else {
    initSubjects();
  }

  function initSubjects() {
    try {
      window.subjectsManager = new SubjectsManager();
    } catch (error) {
      console.error('❌ Failed to initialize Subjects Manager:', error);
    }
  }
})();
