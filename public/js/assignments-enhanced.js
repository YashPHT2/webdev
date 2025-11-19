// Enhanced Assignments Page - Add to your script.js or create assignments.js

(function() {
    'use strict';

    // Extend SmartMentorChatbot prototype with enhanced assignment features
    if (typeof SmartMentorChatbot !== 'undefined') {
        const originalRenderTasks = SmartMentorChatbot.prototype.renderTasks;
        
        SmartMentorChatbot.prototype.renderTasks = function() {
            // Sort tasks by date first, then priority
            this.tasks.sort((a, b) => {
                // First, sort by completion status
                if (a.completed !== b.completed) {
                    return a.completed ? 1 : -1;
                }
                
                // Then by due date (tasks without dates go last)
                const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                
                if (dateA !== dateB) {
                    return dateA - dateB;
                }
                
                // Finally by priority
                const priorityOrder = { high: 0, medium: 1, low: 2 };
                const priorityA = priorityOrder[a.priority] ?? 1;
                const priorityB = priorityOrder[b.priority] ?? 1;
                
                return priorityA - priorityB;
            });
            
            // Call original render
            originalRenderTasks.call(this);
            
            // Enhance the layout
            this.enhanceAssignmentsLayout();
        };
        
        SmartMentorChatbot.prototype.enhanceAssignmentsLayout = function() {
            const cardContent = document.querySelector('.dashboard-card--tasks .dashboard-card__content');
            if (!cardContent) return;
            
            // Check if already enhanced
            if (cardContent.querySelector('.task-stats-panel')) return;
            
            // Wrap existing content
            const taskListContainer = document.createElement('div');
            taskListContainer.className = 'task-list-section';
            
            // Move existing elements to container
            while (cardContent.firstChild) {
                taskListContainer.appendChild(cardContent.firstChild);
            }
            
            // Create stats panel
            const statsPanel = this.createStatsPanel();
            
            // Add both sections
            cardContent.appendChild(taskListContainer);
            cardContent.appendChild(statsPanel);
            
            // Update stats
            this.updateStatsPanel();
        };
        
        SmartMentorChatbot.prototype.createStatsPanel = function() {
            const panel = document.createElement('div');
            panel.className = 'task-stats-panel';
            panel.innerHTML = `
                <!-- Overview Stats -->
                <div class="stats-card">
                    <div class="stats-card__header">
                        <h3 class="stats-card__title">Overview</h3>
                        <svg class="stats-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 11l3 3L22 4"></path>
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                        </svg>
                    </div>
                    <div class="overview-stats">
                        <div class="stat-item">
                            <span class="stat-item__value" id="stat-total">0</span>
                            <span class="stat-item__label">Total</span>
                        </div>
                        <div class="stat-item stat-item--success">
                            <span class="stat-item__value" id="stat-completed">0</span>
                            <span class="stat-item__label">Completed</span>
                        </div>
                        <div class="stat-item stat-item--warning">
                            <span class="stat-item__value" id="stat-pending">0</span>
                            <span class="stat-item__label">Pending</span>
                        </div>
                        <div class="stat-item stat-item--danger">
                            <span class="stat-item__value" id="stat-overdue">0</span>
                            <span class="stat-item__label">Overdue</span>
                        </div>
                    </div>
                </div>

                <!-- Completion Progress -->
                <div class="stats-card">
                    <div class="stats-card__header">
                        <h3 class="stats-card__title">Completion Rate</h3>
                        <svg class="stats-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M12 6v6l4 2"></path>
                        </svg>
                    </div>
                    <div class="completion-ring">
                        <div class="progress-ring">
                            <svg viewBox="0 0 120 120">
                                <circle class="progress-ring__circle-bg" cx="60" cy="60" r="54"></circle>
                                <circle class="progress-ring__circle-progress" id="progress-circle" cx="60" cy="60" r="54"></circle>
                            </svg>
                            <div class="progress-ring__text">
                                <span class="progress-ring__value" id="completion-percentage">0%</span>
                                <span class="progress-ring__label">Complete</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Priority Breakdown -->
                <div class="stats-card">
                    <div class="stats-card__header">
                        <h3 class="stats-card__title">By Priority</h3>
                        <svg class="stats-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                            <path d="M2 17l10 5 10-5"></path>
                            <path d="M2 12l10 5 10-5"></path>
                        </svg>
                    </div>
                    <div class="priority-list">
                        <div class="priority-item">
                            <div class="priority-item__left">
                                <div class="priority-item__indicator priority-item__indicator--high"></div>
                                <span class="priority-item__label">High Priority</span>
                            </div>
                            <span class="priority-item__count" id="priority-high-count">0</span>
                        </div>
                        <div class="priority-item">
                            <div class="priority-item__left">
                                <div class="priority-item__indicator priority-item__indicator--medium"></div>
                                <span class="priority-item__label">Medium Priority</span>
                            </div>
                            <span class="priority-item__count" id="priority-medium-count">0</span>
                        </div>
                        <div class="priority-item">
                            <div class="priority-item__left">
                                <div class="priority-item__indicator priority-item__indicator--low"></div>
                                <span class="priority-item__label">Low Priority</span>
                            </div>
                            <span class="priority-item__count" id="priority-low-count">0</span>
                        </div>
                    </div>
                </div>

                <!-- Upcoming Deadlines -->
                <div class="stats-card">
                    <div class="stats-card__header">
                        <h3 class="stats-card__title">Upcoming Deadlines</h3>
                        <svg class="stats-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                    </div>
                    <div class="upcoming-list" id="upcoming-deadlines"></div>
                </div>

                <!-- Quick Actions -->
                <div class="stats-card quick-actions-card">
                    <div class="stats-card__header">
                        <h3 class="stats-card__title">Quick Actions</h3>
                    </div>
                    <button class="quick-action-btn" id="quick-add-task">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Add New Task
                    </button>
                    <button class="quick-action-btn" id="quick-filter-today">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        Show Due Today
                    </button>
                    <button class="quick-action-btn" id="quick-filter-high">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                            <path d="M2 17l10 5 10-5"></path>
                        </svg>
                        High Priority Only
                    </button>
                </div>
            `;
            
            // Attach event listeners
            setTimeout(() => {
                const quickAddBtn = document.getElementById('quick-add-task');
                if (quickAddBtn) {
                    quickAddBtn.addEventListener('click', () => this.openTaskForm());
                }
                
                const quickTodayBtn = document.getElementById('quick-filter-today');
                if (quickTodayBtn) {
                    quickTodayBtn.addEventListener('click', () => this.filterTasksByToday());
                }
                
                const quickHighBtn = document.getElementById('quick-filter-high');
                if (quickHighBtn) {
                    quickHighBtn.addEventListener('click', () => this.filterTasksByPriority('high'));
                }
            }, 100);
            
            return panel;
        };
        
        SmartMentorChatbot.prototype.updateStatsPanel = function() {
            const total = this.tasks.length;
            const completed = this.tasks.filter(t => t.completed).length;
            const pending = total - completed;
            const overdue = this.tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < new Date()).length;
            
            // Update overview stats
            this.animateNumber('stat-total', total);
            this.animateNumber('stat-completed', completed);
            this.animateNumber('stat-pending', pending);
            this.animateNumber('stat-overdue', overdue);
            
            // Update completion percentage
            const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
            const percentageEl = document.getElementById('completion-percentage');
            if (percentageEl) {
                percentageEl.textContent = percentage + '%';
            }
            
            // Update progress ring
            const circle = document.getElementById('progress-circle');
            if (circle) {
                const circumference = 2 * Math.PI * 54;
                const offset = circumference - (percentage / 100) * circumference;
                circle.style.strokeDashoffset = offset;
            }
            
            // Update priority counts
            const highCount = this.tasks.filter(t => !t.completed && t.priority === 'high').length;
            const mediumCount = this.tasks.filter(t => !t.completed && t.priority === 'medium').length;
            const lowCount = this.tasks.filter(t => !t.completed && t.priority === 'low').length;
            
            this.animateNumber('priority-high-count', highCount);
            this.animateNumber('priority-medium-count', mediumCount);
            this.animateNumber('priority-low-count', lowCount);
            
            // Update upcoming deadlines
            this.updateUpcomingDeadlines();
        };
        
        SmartMentorChatbot.prototype.updateUpcomingDeadlines = function() {
            const container = document.getElementById('upcoming-deadlines');
            if (!container) return;
            
            const upcoming = this.tasks
                .filter(t => !t.completed && t.dueDate)
                .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                .slice(0, 5);
            
            if (upcoming.length === 0) {
                container.innerHTML = '<div class="upcoming-item"><div class="upcoming-item__title" style="text-align: center; color: var(--text-secondary);">No upcoming deadlines</div></div>';
                return;
            }
            
            container.innerHTML = upcoming.map(task => {
                const dueDate = new Date(task.dueDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const taskDate = new Date(dueDate);
                taskDate.setHours(0, 0, 0, 0);
                
                const isOverdue = taskDate < today;
                const isToday = taskDate.getTime() === today.getTime();
                
                const className = isOverdue ? 'upcoming-item--overdue' : (isToday ? 'upcoming-item--today' : '');
                const dateText = isOverdue ? 'Overdue' : (isToday ? 'Due Today' : this.formatDate(task.dueDate));
                
                return `
                    <div class="upcoming-item ${className}" data-task-id="${task.id}">
                        <div class="upcoming-item__title">${this.escapeHtml(task.title)}</div>
                        <div class="upcoming-item__meta">
                            <span class="upcoming-item__date">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                                ${dateText}
                            </span>
                            <span>•</span>
                            <span>${task.subject || 'General'}</span>
                        </div>
                    </div>
                `;
            }).join('');
            
            // Add click handlers
            container.querySelectorAll('.upcoming-item').forEach(item => {
                item.addEventListener('click', () => {
                    const taskId = item.dataset.taskId;
                    if (taskId) this.openTaskDetail(taskId);
                });
            });
        };
        
        SmartMentorChatbot.prototype.animateNumber = function(elementId, targetValue) {
            const element = document.getElementById(elementId);
            if (!element) return;
            
            const startValue = parseInt(element.textContent) || 0;
            const duration = 600;
            const startTime = performance.now();
            
            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                const easeOutQuart = 1 - Math.pow(1 - progress, 4);
                const currentValue = Math.round(startValue + (targetValue - startValue) * easeOutQuart);
                
                element.textContent = currentValue;
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };
            
            requestAnimationFrame(animate);
        };
        
        SmartMentorChatbot.prototype.filterTasksByToday = function() {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const todayTasks = this.tasks.filter(t => {
                if (!t.dueDate) return false;
                const taskDate = new Date(t.dueDate);
                taskDate.setHours(0, 0, 0, 0);
                return taskDate.getTime() === today.getTime();
            });
            
            this.renderFilteredTasks(todayTasks, 'Due Today');
        };
        
        SmartMentorChatbot.prototype.filterTasksByPriority = function(priority) {
            const filtered = this.tasks.filter(t => t.priority === priority && !t.completed);
            this.renderFilteredTasks(filtered, `${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority`);
        };
        
        SmartMentorChatbot.prototype.renderFilteredTasks = function(tasks, filterLabel) {
            const listEl = this.elements.taskList;
            if (!listEl) return;
            
            listEl.innerHTML = `
                <div style="padding: 1rem; background: var(--primary-soft-bg); border-radius: var(--radius-md); margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between;">
                    <span style="font-weight: 600; color: var(--primary-color);">
                        Filtered: ${filterLabel} (${tasks.length})
                    </span>
                    <button class="secondary-button" id="clear-filter" style="padding: 0.5rem 1rem;">
                        Clear Filter
                    </button>
                </div>
            `;
            
            if (tasks.length === 0) {
                listEl.innerHTML += `
                    <div class="empty-state">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <h3>No tasks found</h3>
                        <p>No tasks match this filter.</p>
                    </div>
                `;
            } else {
                tasks.forEach(task => {
                    const taskEl = this.createTaskElement(task);
                    taskEl.addEventListener('click', (e) => {
                        if (!e.target.closest('.assignment-item__checkbox')) {
                            this.openTaskDetail(task.id);
                        }
                    });
                    listEl.appendChild(taskEl);
                });
            }
            
            // Attach clear filter handler
            const clearBtn = document.getElementById('clear-filter');
            if (clearBtn) {
                clearBtn.addEventListener('click', () => this.renderTasks());
            }
        };
        
        SmartMentorChatbot.prototype.escapeHtml = function(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };
    }
    
    // Initialize enhancements when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initEnhancements);
    } else {
        initEnhancements();
    }
    
    function initEnhancements() {
        // Wait for SmartMentor instance
        const checkInterval = setInterval(() => {
            if (window.smartMentor && window.smartMentor.tasks) {
                clearInterval(checkInterval);
                
                // Trigger initial render with enhancements
                if (typeof window.smartMentor.renderTasks === 'function') {
                    window.smartMentor.renderTasks();
                }
                
                // Add click animation to task items
                document.addEventListener('click', (e) => {
                    const taskItem = e.target.closest('.assignment-item');
                    if (taskItem && !e.target.closest('.assignment-item__checkbox')) {
                        taskItem.style.transform = 'scale(0.98)';
                        setTimeout(() => {
                            taskItem.style.transform = '';
                        }, 150);
                    }
                });
                
                // Add hover effect to stats cards
                document.addEventListener('mouseover', (e) => {
                    const statCard = e.target.closest('.stats-card');
                    if (statCard) {
                        statCard.style.borderColor = 'var(--primary-color)';
                    }
                });
                
                document.addEventListener('mouseout', (e) => {
                    const statCard = e.target.closest('.stats-card');
                    if (statCard) {
                        statCard.style.borderColor = 'var(--border-color)';
                    }
                });
            }
        }, 100);
        
        // Cleanup after 5 seconds
        setTimeout(() => clearInterval(checkInterval), 5000);
    }
    
})();
