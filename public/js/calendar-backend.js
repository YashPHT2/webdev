/**
 * Smart Mentor Calendar - Backend Integrated
 * Fetches real data from API endpoints
 */

class SmartCalendar {
  constructor() {
    this.currentView = 'month';
    this.currentDate = new Date();
    this.selectedDate = new Date();
    this.events = [];
    this.filters = { type: 'all', subject: 'all', search: '' };
    this.currentEvent = null;
    this.loading = false;
    
    console.log('📅 Calendar initializing with backend...');
    this.init();
  }

  async init() {
    this.cacheElements();
    
    if (!this.elements.monthGrid) {
      console.error('❌ Calendar container not found!');
      return;
    }

    this.setupColorPresets();
    this.attachEventListeners();
    
    // Load data from backend
    await this.loadFromBackend();
    
    this.render();
    console.log('✅ Calendar initialized with', this.events.length, 'events from backend');
  }

  async loadFromBackend() {
    this.loading = true;
    this.showLoading();

    try {
      // Fetch tasks, timetable, and events in parallel
      const [tasks, timetable, storedEvents] = await Promise.all([
        this.fetchTasks(),
        this.fetchTimetable(),
        this.fetchEvents()
      ]);

      // Convert tasks to events
      const taskEvents = this.convertTasksToEvents(tasks);
      
      // Convert timetable to events
      const timetableEvents = this.convertTimetableToEvents(timetable);
      
      // Merge all events
      this.events = [...taskEvents, ...timetableEvents, ...storedEvents];
      
      console.log('📊 Loaded:', {
        tasks: taskEvents.length,
        timetable: timetableEvents.length,
        custom: storedEvents.length,
        total: this.events.length
      });

    } catch (error) {
      console.error('❌ Failed to load backend data:', error);
      this.showToast('Failed to load calendar data', 'error');
      this.events = [];
    } finally {
      this.loading = false;
      this.hideLoading();
    }
  }

  async fetchTasks() {
    try {
      const response = await fetch('/api/tasks');
      if (!response.ok) throw new Error('Failed to fetch tasks');
      return await response.json();
    } catch (error) {
      console.warn('⚠️ Could not fetch tasks:', error);
      return [];
    }
  }

  async fetchTimetable() {
    try {
      const response = await fetch('/api/timetable');
      if (!response.ok) throw new Error('Failed to fetch timetable');
      return await response.json();
    } catch (error) {
      console.warn('⚠️ Could not fetch timetable:', error);
      return { days: {} };
    }
  }

  async fetchEvents() {
    try {
      const response = await fetch('/api/events');
      if (!response.ok) {
        // Events endpoint might not exist, try localStorage fallback
        const stored = localStorage.getItem('smartMentorCalendarEvents');
        return stored ? JSON.parse(stored) : [];
      }
      return await response.json();
    } catch (error) {
      console.warn('⚠️ Could not fetch events, using localStorage:', error);
      const stored = localStorage.getItem('smartMentorCalendarEvents');
      return stored ? JSON.parse(stored) : [];
    }
  }

  convertTasksToEvents(tasks) {
    if (!Array.isArray(tasks)) return [];

    return tasks.map(task => ({
      id: `task-${task.id}`,
      title: task.title,
      type: 'task',
      subject: task.subject || '',
      date: task.dueDate,
      time: '23:59',
      duration: task.estimatedDuration || 60,
      description: task.description || '',
      location: 'Online',
      allDay: true,
      color: this.getPriorityColor(task.priority),
      isTask: true,
      sourceId: task.id,
      priority: task.priority,
      status: task.status
    }));
  }

  convertTimetableToEvents(timetable) {
    const events = [];
    const days = timetable.days || {};
    const weekStart = new Date(timetable.weekStart || new Date());

    const dayMap = {
      'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
      'thursday': 4, 'friday': 5, 'saturday': 6
    };

    // Generate events for the next 4 weeks
    for (let week = 0; week < 4; week++) {
      Object.entries(days).forEach(([dayName, blocks]) => {
        if (!Array.isArray(blocks)) return;

        const dayOffset = dayMap[dayName.toLowerCase()];
        if (dayOffset === undefined) return;

        const eventDate = new Date(weekStart);
        eventDate.setDate(eventDate.getDate() + dayOffset + (week * 7));

        blocks.forEach((block, index) => {
          events.push({
            id: `timetable-${dayName}-${index}-week${week}`,
            title: block.subject,
            type: 'class',
            subject: block.subject,
            date: this.formatDateForInput(eventDate),
            time: block.time,
            duration: block.durationMinutes || 60,
            description: `Regular class session`,
            location: block.room || '',
            allDay: false,
            color: this.getSubjectColor(block.subject),
            isTimetable: true,
            recurring: true
          });
        });
      });
    }

    return events;
  }

  getPriorityColor(priority) {
    const colors = {
      'high': '#ef4444',
      'medium': '#f59e0b',
      'low': '#10b981'
    };
    return colors[(priority || '').toLowerCase()] || '#3b82f6';
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
    
    const key = (subject || '').toLowerCase();
    return colors[key] || '#6366f1';
  }

  async saveEvent(event) {
    // Only save custom events (not tasks or timetable items)
    if (event.isTask || event.isTimetable) {
      this.showToast('Cannot modify synced events', 'warning');
      return false;
    }

    try {
      // Save to backend if endpoint exists
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      });

      if (!response.ok) throw new Error('Failed to save event');

      // Also save to localStorage as backup
      this.saveToLocalStorage();
      
      return true;
    } catch (error) {
      console.warn('⚠️ Backend save failed, using localStorage:', error);
      this.saveToLocalStorage();
      return true;
    }
  }

  async deleteEvent(eventId) {
    const event = this.events.find(e => e.id === eventId);
    
    if (!event) return false;

    // Prevent deletion of synced events
    if (event.isTask || event.isTimetable) {
      this.showToast('Cannot delete synced events', 'warning');
      return false;
    }

    try {
      // Delete from backend
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete event');

      // Remove from local array
      this.events = this.events.filter(e => e.id !== eventId);
      this.saveToLocalStorage();
      
      return true;
    } catch (error) {
      console.warn('⚠️ Backend delete failed, using localStorage:', error);
      this.events = this.events.filter(e => e.id !== eventId);
      this.saveToLocalStorage();
      return true;
    }
  }

  saveToLocalStorage() {
    const customEvents = this.events.filter(e => !e.isTask && !e.isTimetable);
    localStorage.setItem('smartMentorCalendarEvents', JSON.stringify(customEvents));
  }

  // Rest of the methods stay the same as before...
  cacheElements() {
    this.elements = {
      monthView: document.getElementById('month-view'),
      weekView: document.getElementById('week-view'),
      agendaView: document.getElementById('agenda-view'),
      monthGrid: document.getElementById('calendar-month-grid'),
      weekDaysContainer: document.getElementById('week-days-container'),
      weekTimeColumn: document.getElementById('week-time-column'),
      agendaList: document.getElementById('calendar-agenda-list'),
      upcomingList: document.getElementById('upcoming-events-list'),
      miniCalendar: document.getElementById('mini-calendar'),
      viewButtons: document.querySelectorAll('.calendar-view-toggle__button'),
      prevBtn: document.getElementById('calendar-prev'),
      nextBtn: document.getElementById('calendar-next'),
      todayBtn: document.getElementById('calendar-today-btn'),
      periodLabel: document.getElementById('current-period-label'),
      upcomingCount: document.getElementById('upcoming-count'),
      typeFilter: document.getElementById('event-type-filter'),
      subjectFilter: document.getElementById('subject-filter'),
      searchInput: document.getElementById('event-search'),
      clearFilters: document.getElementById('clear-filters'),
      eventModal: document.getElementById('event-modal'),
      eventModalOverlay: document.getElementById('event-modal-overlay'),
      eventForm: document.getElementById('event-form'),
      eventDetailModal: document.getElementById('event-detail-modal'),
      eventFormId: document.getElementById('event-form-id'),
      eventTitle: document.getElementById('event-title-input'),
      eventType: document.getElementById('event-type'),
      eventSubject: document.getElementById('event-subject'),
      eventDate: document.getElementById('event-date'),
      eventTime: document.getElementById('event-time'),
      eventDuration: document.getElementById('event-duration'),
      eventDescription: document.getElementById('event-description'),
      eventLocation: document.getElementById('event-location'),
      eventAllDay: document.getElementById('event-all-day'),
      eventColor: document.getElementById('event-color'),
      addEventBtn: document.getElementById('add-event-btn'),
      addEventFab: document.getElementById('add-event-fab'),
      editEventBtn: document.getElementById('edit-event-btn'),
      deleteEventBtn: document.getElementById('delete-event-btn'),
      miniPrevBtn: document.getElementById('mini-calendar-prev'),
      miniNextBtn: document.getElementById('mini-calendar-next'),
    };
  }

  attachEventListeners() {
    this.elements.viewButtons?.forEach(btn => {
      btn.addEventListener('click', () => this.switchView(btn.dataset.view));
    });

    this.elements.prevBtn?.addEventListener('click', () => this.navigate(-1));
    this.elements.nextBtn?.addEventListener('click', () => this.navigate(1));
    this.elements.todayBtn?.addEventListener('click', () => this.goToToday());

    this.elements.miniPrevBtn?.addEventListener('click', () => this.navigateMiniCalendar(-1));
    this.elements.miniNextBtn?.addEventListener('click', () => this.navigateMiniCalendar(1));

    this.elements.addEventBtn?.addEventListener('click', () => this.openEventModal());
    this.elements.addEventFab?.addEventListener('click', () => this.openEventModal());

    this.elements.eventForm?.addEventListener('submit', (e) => this.handleEventSubmit(e));
    this.elements.eventAllDay?.addEventListener('change', (e) => {
      if (this.elements.eventTime) this.elements.eventTime.disabled = e.target.checked;
      if (this.elements.eventDuration) this.elements.eventDuration.disabled = e.target.checked;
    });

    this.elements.editEventBtn?.addEventListener('click', () => this.editCurrentEvent());
    this.elements.deleteEventBtn?.addEventListener('click', () => this.deleteCurrentEvent());

    this.elements.typeFilter?.addEventListener('change', () => {
      this.filters.type = this.elements.typeFilter.value;
      this.render();
    });

    this.elements.subjectFilter?.addEventListener('change', () => {
      this.filters.subject = this.elements.subjectFilter.value;
      this.render();
    });

    this.elements.searchInput?.addEventListener('input', () => {
      this.filters.search = this.elements.searchInput.value.toLowerCase();
      this.render();
    });

    this.elements.clearFilters?.addEventListener('click', () => this.clearFilters());

    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.closeModal(btn.dataset.closeModal);
      });
    });

    this.elements.eventModalOverlay?.addEventListener('click', () => {
      this.closeModal('event-modal');
    });
  }

  setupColorPresets() {
    const colors = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];
    const container = document.getElementById('color-presets');
    if (!container) return;

    container.innerHTML = '';
    colors.forEach(color => {
      const preset = document.createElement('div');
      preset.className = 'color-preset';
      preset.style.backgroundColor = color;
      preset.addEventListener('click', () => {
        this.elements.eventColor.value = color;
        document.querySelectorAll('.color-preset').forEach(p => 
          p.classList.remove('color-preset--selected')
        );
        preset.classList.add('color-preset--selected');
      });
      container.appendChild(preset);
    });
  }

  showLoading() {
    if (this.elements.monthGrid) {
      this.elements.monthGrid.innerHTML = '<div class="loading-spinner">Loading calendar...</div>';
    }
  }

  hideLoading() {
    // Will be replaced by render()
  }

  render() {
    this.updatePeriodLabel();
    
    if (this.currentView === 'month') {
      this.elements.monthView?.classList.add('calendar-view--active');
      this.elements.monthView?.removeAttribute('hidden');
      this.elements.weekView?.classList.remove('calendar-view--active');
      this.elements.weekView?.setAttribute('hidden', '');
      this.elements.agendaView?.classList.remove('calendar-view--active');
      this.elements.agendaView?.setAttribute('hidden', '');
      this.renderMonthView();
    } else if (this.currentView === 'week') {
      this.elements.weekView?.classList.add('calendar-view--active');
      this.elements.weekView?.removeAttribute('hidden');
      this.elements.monthView?.classList.remove('calendar-view--active');
      this.elements.monthView?.setAttribute('hidden', '');
      this.elements.agendaView?.classList.remove('calendar-view--active');
      this.elements.agendaView?.setAttribute('hidden', '');
      this.renderWeekView();
    } else { // agenda view
      this.elements.agendaView?.classList.add('calendar-view--active');
      this.elements.agendaView?.removeAttribute('hidden');
      this.elements.monthView?.classList.remove('calendar-view--active');
      this.elements.monthView?.setAttribute('hidden', '');
      this.elements.weekView?.classList.remove('calendar-view--active');
      this.elements.weekView?.setAttribute('hidden', '');
      this.renderAgendaView();
    }

    this.renderUpcoming();
    this.renderMiniCalendar();
    this.updateSubjectFilter();
  }

  updatePeriodLabel() {
    if (!this.elements.periodLabel) return;
    
    const options = { month: 'long', year: 'numeric' };
    this.elements.periodLabel.textContent = this.currentDate.toLocaleDateString('en-US', options);
  }

  renderMonthView() {
    if (!this.elements.monthGrid) return;

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    this.elements.monthGrid.innerHTML = '';

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      const cell = this.createDayCell(new Date(year, month - 1, day), true);
      this.elements.monthGrid.appendChild(cell);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const cell = this.createDayCell(date, false);
      this.elements.monthGrid.appendChild(cell);
    }

    const remainingCells = 42 - (startDay + daysInMonth);
    for (let day = 1; day <= remainingCells; day++) {
      const cell = this.createDayCell(new Date(year, month + 1, day), true);
      this.elements.monthGrid.appendChild(cell);
    }
  }

  createDayCell(date, isOtherMonth) {
    const cell = document.createElement('button');
    cell.className = 'calendar-day';
    cell.type = 'button';

    const dateKey = this.formatDateKey(date);
    const dayEvents = this.getFilteredEvents().filter(e => 
      this.formatDateKey(new Date(e.date)) === dateKey
    );

    if (isOtherMonth) cell.classList.add('calendar-day--other-month');
    if (this.isToday(date)) cell.classList.add('calendar-day--today');
    if (this.isSameDay(date, this.selectedDate)) cell.classList.add('calendar-day--selected');
    if (dayEvents.length) cell.classList.add('calendar-day--has-events');

    const dayNumber = document.createElement('span');
    dayNumber.className = 'calendar-day__number';
    dayNumber.textContent = date.getDate();
    cell.appendChild(dayNumber);

    if (dayEvents.length > 0) {
      const eventsDiv = document.createElement('div');
      eventsDiv.className = 'calendar-day__events';

      dayEvents.slice(0, 3).forEach(event => {
        const eventEl = document.createElement('div');
        eventEl.className = `calendar-day__event calendar-day__event--${event.type}`;
        eventEl.style.backgroundColor = event.color;
        eventEl.textContent = event.title;
        
        // Add sync indicator for backend events
        if (event.isTask || event.isTimetable) {
          eventEl.classList.add('calendar-day__event--synced');
          eventEl.title = `${event.title} (synced from ${event.isTask ? 'tasks' : 'timetable'})`;
        }
        
        eventEl.addEventListener('click', (e) => {
          e.stopPropagation();
          this.showEventDetail(event);
        });
        eventsDiv.appendChild(eventEl);
      });

      if (dayEvents.length > 3) {
        const more = document.createElement('div');
        more.className = 'calendar-day__more';
        more.textContent = `+${dayEvents.length - 3} more`;
        eventsDiv.appendChild(more);
      }

      cell.appendChild(eventsDiv);
    }

    cell.addEventListener('click', () => {
      this.selectedDate = new Date(date);
      this.render();
    });

    cell.addEventListener('dblclick', () => {
      this.openEventModal({ date });
    });

    return cell;
  }

  // Additional rendering methods (renderWeekView, renderAgendaView, etc.)
  // Copy from previous calendar-standalone.js...

  renderWeekView() {
    if (!this.elements.weekDaysContainer || !this.elements.weekTimeColumn) return;

    this.elements.weekTimeColumn.innerHTML = '';
    for (let hour = 0; hour < 24; hour++) {
      const slot = document.createElement('div');
      slot.className = 'calendar-week__time-slot';
      slot.textContent = this.formatHour(hour);
      this.elements.weekTimeColumn.appendChild(slot);
    }

    const weekStart = this.getWeekStart(this.currentDate);
    this.elements.weekDaysContainer.innerHTML = '';

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      
      const dayCol = document.createElement('div');
      dayCol.className = 'calendar-week__day';

      const header = document.createElement('div');
      header.className = 'calendar-week__day-header';
      if (this.isToday(date)) header.classList.add('calendar-week__day-header--today');
      header.innerHTML = `
        <strong>${date.toLocaleDateString('en-US', { weekday: 'short' })}</strong>
        <span>${date.getDate()}</span>
      `;

      const eventsContainer = document.createElement('div');
      eventsContainer.className = 'calendar-week__events';

      const dateKey = this.formatDateKey(date);
      const dayEvents = this.getFilteredEvents().filter(e => 
        this.formatDateKey(new Date(e.date)) === dateKey && !e.allDay
      );

      dayEvents.forEach(event => {
        const eventEl = this.createWeekEventElement(event);
        eventsContainer.appendChild(eventEl);
      });

      dayCol.appendChild(header);
      dayCol.appendChild(eventsContainer);
      this.elements.weekDaysContainer.appendChild(dayCol);
    }
  }

  createWeekEventElement(event) {
    const el = document.createElement('div');
    el.className = 'calendar-week__event';
    el.style.backgroundColor = event.color;

    const [hours, minutes] = (event.time || '09:00').split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const duration = event.duration || 60;

    el.style.top = `${startMinutes}px`;
    el.style.height = `${Math.max(duration, 30)}px`;

    el.innerHTML = `
      <div class="calendar-week__event-title">${event.title}</div>
      <div class="calendar-week__event-time">${event.time || ''}</div>
    `;

    el.addEventListener('click', () => this.showEventDetail(event));
    return el;
  }

  renderAgendaView() {
    if (!this.elements.agendaList) return;

    const events = this.getFilteredEvents();
    const startDate = new Date(this.currentDate);
    startDate.setDate(1);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const filtered = events.filter(e => {
      const eventDate = new Date(e.date);
      return eventDate >= startDate && eventDate < endDate;
    });

    const grouped = this.groupByDate(filtered);
    const sortedDates = Object.keys(grouped).sort();

    this.elements.agendaList.innerHTML = '';

    if (sortedDates.length === 0) {
      this.elements.agendaList.innerHTML = `
        <div class="empty-state">
          <p>No events this month</p>
        </div>
      `;
      return;
    }

    sortedDates.forEach(dateKey => {
      const date = new Date(dateKey);
      const dayEvents = grouped[dateKey];

      const daySection = document.createElement('div');
      daySection.className = 'calendar-agenda__day';

      const header = document.createElement('h3');
      header.className = 'calendar-agenda__date';
      if (this.isToday(date)) header.classList.add('calendar-agenda__date--today');
      header.textContent = date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      });

      const eventsContainer = document.createElement('div');
      eventsContainer.className = 'calendar-agenda__events';

      dayEvents.forEach(event => {
        const eventEl = document.createElement('div');
        eventEl.className = 'calendar-agenda__event';
        
        const syncBadge = event.isTask || event.isTimetable 
          ? `<span class="sync-badge" title="Synced from ${event.isTask ? 'tasks' : 'timetable'}">🔄</span>` 
          : '';
        
        eventEl.innerHTML = `
          <div class="calendar-agenda__event-time">${event.allDay ? 'All day' : event.time || '—'}</div>
          <div class="calendar-agenda__event-marker" style="background: ${event.color}"></div>
          <div class="calendar-agenda__event-content">
            <div class="calendar-agenda__event-title">${event.title} ${syncBadge}</div>
            <div class="calendar-agenda__event-meta">
              <span class="event-type-badge event-type-badge--${event.type}">${event.type}</span>
              ${event.subject ? `<span>${event.subject}</span>` : ''}
              ${event.location ? `<span>📍 ${event.location}</span>` : ''}
            </div>
          </div>
        `;
        eventEl.addEventListener('click', () => this.showEventDetail(event));
        eventsContainer.appendChild(eventEl);
      });

      daySection.appendChild(header);
      daySection.appendChild(eventsContainer);
      this.elements.agendaList.appendChild(daySection);
    });
  }

  renderUpcoming() {
    if (!this.elements.upcomingList) return;

    const now = new Date();
    const upcoming = this.getFilteredEvents()
      .filter(e => new Date(e.date) >= now)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 10);

    if (this.elements.upcomingCount) {
      this.elements.upcomingCount.textContent = upcoming.length;
    }

    this.elements.upcomingList.innerHTML = '';

    if (upcoming.length === 0) {
      this.elements.upcomingList.innerHTML = `
        <div class="empty-state">
          <p>No upcoming events</p>
        </div>
      `;
      return;
    }

    upcoming.forEach(event => {
      const date = new Date(event.date);
      const el = document.createElement('div');
      el.className = 'upcoming-event';
      
      const syncIndicator = event.isTask || event.isTimetable 
        ? '<span class="sync-indicator" title="Synced">🔄</span>' 
        : '';
      
      el.innerHTML = `
        <div class="upcoming-event__marker" style="background: ${event.color}"></div>
        <div class="upcoming-event__date">
          <div class="upcoming-event__day">${date.getDate()}</div>
          <div class="upcoming-event__month">${date.toLocaleDateString('en-US', { month: 'short' })}</div>
        </div>
        <div class="upcoming-event__content">
          <div class="upcoming-event__title">${event.title} ${syncIndicator}</div>
          <div class="upcoming-event__meta">
            <span class="event-type-badge event-type-badge--${event.type}">${event.type}</span>
            ${event.subject ? `<span>${event.subject}</span>` : ''}
          </div>
        </div>
      `;
      el.addEventListener('click', () => this.showEventDetail(event));
      this.elements.upcomingList.appendChild(el);
    });
  }

  renderMiniCalendar() {
    if (!this.elements.miniCalendar) return;

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    this.elements.miniCalendar.innerHTML = `
      <div class="mini-calendar__weekdays">
        ${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => `<div class="mini-calendar__weekday">${d}</div>`).join('')}
      </div>
      <div class="mini-calendar__grid" id="mini-grid"></div>
    `;

    const grid = document.getElementById('mini-grid');

    for (let i = 0; i < firstDay; i++) {
      grid.appendChild(document.createElement('div'));
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateKey = this.formatDateKey(date);
      const hasEvents = this.events.some(e => this.formatDateKey(new Date(e.date)) === dateKey);

      const cell = document.createElement('button');
      cell.className = 'mini-calendar__day';
      cell.textContent = day;
      cell.type = 'button';

      if (this.isToday(date)) cell.classList.add('mini-calendar__day--today');
      if (this.isSameDay(date, this.selectedDate)) cell.classList.add('mini-calendar__day--selected');
      if (hasEvents) cell.classList.add('mini-calendar__day--has-events');

      cell.addEventListener('click', () => {
        this.selectedDate = new Date(date);
        this.currentDate = new Date(date);
        this.render();
      });

      grid.appendChild(cell);
    }
  }

  // Event Management
  openEventModal(data = {}) {
    const isEdit = !!data.id;

    if (document.getElementById('event-modal-title')) {
      document.getElementById('event-modal-title').textContent = isEdit ? 'Edit Event' : 'Add Event';
    }

    // Prevent editing synced events
    if (isEdit && (data.isTask || data.isTimetable)) {
      this.showToast('Cannot edit synced events', 'warning');
      return;
    }

    if (isEdit) {
      this.elements.eventFormId.value = data.id;
      this.elements.eventTitle.value = data.title;
      this.elements.eventType.value = data.type;
      this.elements.eventSubject.value = data.subject || '';
      this.elements.eventDate.value = this.formatDateForInput(data.date);
      this.elements.eventTime.value = data.time || '';
      this.elements.eventDuration.value = data.duration || '';
      this.elements.eventDescription.value = data.description || '';
      this.elements.eventLocation.value = data.location || '';
      this.elements.eventAllDay.checked = data.allDay || false;
      this.elements.eventColor.value = data.color || '#3b82f6';
    } else {
      this.elements.eventForm.reset();
      this.elements.eventFormId.value = '';
      this.elements.eventDate.value = this.formatDateForInput(data.date || this.selectedDate);
      this.elements.eventColor.value = '#3b82f6';
    }

    this.openModal('event-modal');
  }

  async handleEventSubmit(e) {
    e.preventDefault();

    const eventData = {
      id: this.elements.eventFormId.value || this.generateId(),
      title: this.elements.eventTitle.value,
      type: this.elements.eventType.value,
      subject: this.elements.eventSubject.value,
      date: this.elements.eventDate.value,
      time: this.elements.eventTime.value,
      duration: parseInt(this.elements.eventDuration.value) || 60,
      description: this.elements.eventDescription.value,
      location: this.elements.eventLocation.value,
      allDay: this.elements.eventAllDay.checked,
      color: this.elements.eventColor.value
    };

    const existingIndex = this.events.findIndex(e => e.id === eventData.id);

    if (existingIndex >= 0) {
      this.events[existingIndex] = eventData;
      await this.saveEvent(eventData);
      this.showToast('Event updated successfully');
    } else {
      this.events.push(eventData);
      await this.saveEvent(eventData);
      this.showToast('Event created successfully');
    }

    this.closeModal('event-modal');
    this.render();
  }

  showEventDetail(event) {
    this.currentEvent = event;

    document.getElementById('event-detail-title').textContent = event.title;
    document.getElementById('event-detail-subtitle').textContent = event.type;

    const date = new Date(event.date);
    const timeText = event.allDay 
      ? `All day • ${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`
      : `${event.time} • ${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`;

    document.getElementById('event-detail-time').textContent = timeText;
    
    const typeBadge = document.getElementById('event-detail-type');
    typeBadge.textContent = event.type;
    typeBadge.className = `event-type-badge event-type-badge--${event.type}`;

    // Show sync status
    if (event.isTask || event.isTimetable) {
      const subtitle = document.getElementById('event-detail-subtitle');
      subtitle.textContent += ` (synced from ${event.isTask ? 'tasks' : 'timetable'})`;
    }

    // Disable edit/delete for synced events
    if (this.elements.editEventBtn) {
      this.elements.editEventBtn.disabled = event.isTask || event.isTimetable;
    }
    if (this.elements.deleteEventBtn) {
      this.elements.deleteEventBtn.disabled = event.isTask || event.isTimetable;
    }

    this.toggleSection('event-detail-subject-section', event.subject, 'event-detail-subject');
    this.toggleSection('event-detail-location-section', event.location, 'event-detail-location');
    this.toggleSection('event-detail-description-section', event.description, 'event-detail-description');

    this.openModal('event-detail-modal');
  }

  toggleSection(sectionId, value, valueId) {
    const section = document.getElementById(sectionId);
    if (value) {
      section.style.display = 'block';
      document.getElementById(valueId).textContent = value;
    } else {
      section.style.display = 'none';
    }
  }

  editCurrentEvent() {
    this.closeModal('event-detail-modal');
    this.openEventModal(this.currentEvent);
  }

  async deleteCurrentEvent() {
    if (!this.currentEvent) return;

    if (confirm(`Delete "${this.currentEvent.title}"?`)) {
      const success = await this.deleteEvent(this.currentEvent.id);
      if (success) {
        this.closeModal('event-detail-modal');
        this.render();
        this.showToast('Event deleted');
      }
    }
  }

  // Helper methods
  switchView(view) {
    this.currentView = view;

    this.elements.viewButtons?.forEach(btn => {
      const isActive = btn.dataset.view === view;
      btn.classList.toggle('calendar-view-toggle__button--active', isActive);
      btn.setAttribute('aria-pressed', isActive);
    });

    [this.elements.monthView, this.elements.weekView, this.elements.agendaView].forEach(v => {
      v?.classList.remove('calendar-view--active');
      v?.setAttribute('hidden', '');
    });

    const views = {
      month: this.elements.monthView,
      week: this.elements.weekView,
      agenda: this.elements.agendaView
    };

    views[view]?.classList.add('calendar-view--active');
    views[view]?.removeAttribute('hidden');

    this.render();
  }

  navigate(delta) {
    if (this.currentView === 'month') {
      this.currentDate.setMonth(this.currentDate.getMonth() + delta);
    } else {
      this.currentDate.setDate(this.currentDate.getDate() + (delta * 7));
    }
    this.render();
  }

  goToToday() {
    this.currentDate = new Date();
    this.selectedDate = new Date();
    this.render();
  }

  navigateMiniCalendar(delta) {
    this.currentDate.setMonth(this.currentDate.getMonth() + delta);
    this.renderMiniCalendar();
  }

  updateSubjectFilter() {
    if (!this.elements.subjectFilter) return;

    const subjects = [...new Set(this.events.map(e => e.subject).filter(Boolean))];
    
    const currentValue = this.elements.subjectFilter.value;
    this.elements.subjectFilter.innerHTML = '<option value="all">All Subjects</option>';
    
    subjects.forEach(subject => {
      const option = document.createElement('option');
      option.value = subject;
      option.textContent = subject;
      this.elements.subjectFilter.appendChild(option);
    });

    if (subjects.includes(currentValue)) {
      this.elements.subjectFilter.value = currentValue;
    }
  }

  clearFilters() {
    this.filters = { type: 'all', subject: 'all', search: '' };
    if (this.elements.typeFilter) this.elements.typeFilter.value = 'all';
    if (this.elements.subjectFilter) this.elements.subjectFilter.value = 'all';
    if (this.elements.searchInput) this.elements.searchInput.value = '';
    this.render();
  }

  getFilteredEvents() {
    return this.events.filter(event => {
      if (this.filters.type !== 'all' && event.type !== this.filters.type) return false;
      if (this.filters.subject !== 'all' && event.subject !== this.filters.subject) return false;
      if (this.filters.search) {
        const search = this.filters.search.toLowerCase();
        return event.title.toLowerCase().includes(search) ||
               (event.description && event.description.toLowerCase().includes(search));
      }
      return true;
    });
  }

  groupByDate(events) {
    return events.reduce((groups, event) => {
      const key = this.formatDateKey(new Date(event.date));
      if (!groups[key]) groups[key] = [];
      groups[key].push(event);
      return groups;
    }, {});
  }

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    const overlay = document.getElementById('event-modal-overlay');
    
    if (modal && overlay) {
      modal.removeAttribute('hidden');
      overlay.removeAttribute('hidden');
      setTimeout(() => {
        modal.classList.add('active');
        overlay.classList.add('active');
      }, 10);
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    const overlay = document.getElementById('event-modal-overlay');
    
    if (modal && overlay) {
      modal.classList.remove('active');
      overlay.classList.remove('active');
      setTimeout(() => {
        modal.setAttribute('hidden', '');
        overlay.setAttribute('hidden', '');
      }, 300);
    }
  }

  showToast(message, type = 'success') {
    console.log(`📢 [${type}]`, message);
    
    if (window.smartMentor?.showToast) {
      window.smartMentor.showToast(message, type);
      return;
    }

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    toast.style.cssText = 'position:fixed;bottom:2rem;right:2rem;background:var(--success-color);color:white;padding:1rem 1.5rem;border-radius:8px;z-index:9999;animation:slideIn 0.3s ease';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  generateId() {
    return `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  formatDateKey(date) {
    return date.toISOString().split('T')[0];
  }

  formatDateForInput(date) {
    if (typeof date === 'string') return date.split('T')[0];
    return new Date(date).toISOString().split('T')[0];
  }

  formatHour(hour) {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h = hour % 12 || 12;
    return `${h} ${ampm}`;
  }

  isToday(date) {
    return this.isSameDay(date, new Date());
  }

  isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    return d;
  }
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.smartCalendar = new SmartCalendar();
  });
} else {
  window.smartCalendar = new SmartCalendar();
}
