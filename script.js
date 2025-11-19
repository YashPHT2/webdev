class SmartMentorChatbot {
    constructor() {
        this.conversationState = {
            isOpen: false,
            messages: [],
            currentStep: null,
            taskData: {},
            conversationHistory: []
        };
        
        this.tasks = [];
        this.priorityOrder = { high: 0, medium: 1, low: 2 };
        this.currentTaskId = null;
        this.activeModal = null;
        this.isFetchingTasks = false;
        this.lastTaskFetchError = null;
        this.apiEndpoints = {
            tasks: '/api/tasks',
            task: (id) => `/api/tasks/${encodeURIComponent(id)}`,
            taskPriority: (id) => `/api/tasks/${encodeURIComponent(id)}/priority`,
            timetable: '/api/timetable',
            analytics: '/api/analytics'
        };
        this.motivationalMessages = [
            "You're doing great! Keep up the momentum! 🚀",
            "Every small step counts toward your goals! 💪",
            "Consistency is key to success! 🎯",
            "Believe in yourself - you've got this! ⭐",
            "Your effort today shapes your success tomorrow! 🌟",
            "Stay focused and watch yourself grow! 🌱",
            "Progress, not perfection! 👏"
        ];

        this.analytics = null;
        this.charts = {};
        this.calendarState = { currentDate: new Date(), selectedDate: new Date(), eventsByDate: {} };
        this.timetable = null;
        this.timetableFilters = { day: 'all', subject: '' };
        this.rowDensity = (localStorage.getItem('timetableDensity') || 'expanded');
        if (!['compact','expanded'].includes(this.rowDensity)) this.rowDensity = 'expanded';
        this.timetableLoading = false;
        this.prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        this.boundHandleViewportChange = this.handleViewportChange.bind(this);
        this.boundHandleDocumentClick = this.handleDocumentClick.bind(this);
        
        this.init();
    }
    
    init() {
        this.cacheElements();
        this.initChatClient();
        this.attachEventListeners();
        this.handleViewportChange();
        this.loadFromStorage();
        this.displayWelcomeMessage();
        this.updateMotivationalMessage();
        this.renderTasks();
        const fetchTasksPromise = this.fetchTasks();
        if (fetchTasksPromise && typeof fetchTasksPromise.then === 'function') {
            fetchTasksPromise.then(() => {
                this.initProgressChart();
                this.initAnalyticsAndCharts();
            }).catch(() => this.initAnalyticsAndCharts());
        } else {
            setTimeout(() => {
                this.initProgressChart();
                this.initAnalyticsAndCharts();
            }, 300);
        }
        this.fetchTimetable();
        this.setupCalendar();
        this.setupProgressToggleIndicator();
    }
    
    cacheElements() {
        this.elements = {
            chatbotTrigger: document.getElementById('chatbot-trigger'),
            sidebar: document.getElementById('sidebar'),
            sidebarToggle: document.getElementById('sidebar-toggle'),
            chatbotModal: document.getElementById('chatbot-modal'),
            chatbotOverlay: document.getElementById('chatbot-overlay'),
            closeChatbot: document.getElementById('close-chatbot'),
            chatbotMessages: document.getElementById('chatbot-messages'),
            chatbotForm: document.getElementById('chatbot-form'),
            chatbotInput: document.getElementById('chatbot-input'),
            sendButton: document.getElementById('send-button'),
            taskList: document.getElementById('task-list'),
            priorityTaskList: document.getElementById('priority-task-list'),
            refreshTasks: document.getElementById('refresh-tasks'),
            addTaskButton: document.getElementById('add-task'),
            themeToggle: document.getElementById('theme-toggle'),
            startChatEmpty: document.getElementById('start-chat-empty'),
            motivationalMessage: document.getElementById('motivational-message'),
            quickActions: document.querySelectorAll('.quick-action-button'),
            chatNotification: document.getElementById('chat-notification'),
            taskModalOverlay: document.getElementById('task-modal-overlay'),
            taskFormModal: document.getElementById('task-form-modal'),
            taskDetailModal: document.getElementById('task-detail-modal'),
            taskDetailTitle: document.getElementById('task-detail-title'),
            taskDetailSubtitle: document.getElementById('task-detail-subtitle'),
            taskDetailPriorityBadge: document.getElementById('task-detail-priority'),
            taskDetailProgressBar: document.getElementById('task-detail-progress-bar'),
            taskDetailProgressValue: document.getElementById('task-detail-progress-value'),
            taskDetailName: document.getElementById('task-detail-name'),
            taskDetailDescription: document.getElementById('task-detail-description'),
            taskDetailSubject: document.getElementById('task-detail-subject'),
            taskDetailDueDate: document.getElementById('task-detail-due-date'),
            taskDetailUpdated: document.getElementById('task-detail-updated'),
            deleteConfirmModal: document.getElementById('delete-confirm-modal'),
            priorityOverrideModal: document.getElementById('priority-override-modal'),
            taskForm: document.getElementById('task-form'),
            taskFormTitle: document.getElementById('task-form-title'),
            taskFormId: document.getElementById('task-form-id'),
            taskFormTitleInput: document.getElementById('task-form-title-input'),
            taskFormDescription: document.getElementById('task-form-description'),
            taskFormSubject: document.getElementById('task-form-subject'),
            taskFormDueDate: document.getElementById('task-form-due-date'),
            taskFormPriority: document.getElementById('task-form-priority'),
            taskFormProgress: document.getElementById('task-form-progress'),
            taskFormProgressValue: document.getElementById('task-form-progress-value'),
            taskFormSubmit: document.getElementById('task-form-submit'),
            editTaskAction: document.getElementById('edit-task-action'),
            deleteTaskAction: document.getElementById('delete-task-action'),
            overridePriorityAction: document.getElementById('override-priority-action'),
            confirmDeleteTask: document.getElementById('confirm-delete-task'),
            priorityOverrideForm: document.getElementById('priority-override-form'),
            priorityOverrideTaskId: document.getElementById('priority-override-task-id'),
            priorityOverrideSelect: document.getElementById('priority-override-select'),
            priorityOverrideReason: document.getElementById('priority-override-reason'),
            // New data-driven UI elements
            timeChartCanvas: document.getElementById('timeChartCanvas'),
            progressGraphCanvas: document.getElementById('progressGraphCanvas'),
            progressViewButtons: document.querySelectorAll('.progress-view-toggle__button'),
            calendarDaysContainer: document.querySelector('[data-calendar-days]'),
            calendarMonthLabel: document.querySelector('[data-current-month]'),
            calendarNavButtons: document.querySelectorAll('[data-calendar-nav]'),
            calendarEventsList: document.getElementById('upcoming-events-list') || document.querySelector('[data-calendar-events] .calendar-events__list'),
            // Timetable editor elements
            timetableGrid: document.getElementById('timetable-grid'),
            timetableSchedule: document.querySelector('[data-timetable-container] .timetable__schedule'),
            timetableEditButton: document.querySelector('[data-action="edit-timetable"]'),
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
            blockDeleteModal: document.getElementById('timetable-delete-modal'),
            confirmDeleteBlock: document.getElementById('confirm-delete-block'),
            // misc
            chatbotFab: document.getElementById('chatbot-fab'),
            resetChat: document.getElementById('reset-chat'),
            chatAnnouncer: document.getElementById('chat-aria-live'),
            navAiMentor: document.getElementById('nav-ai-mentor'),
            addTaskFab: document.getElementById('add-task-fab'),
            dayDetailModal: document.getElementById('day-detail-modal'),
            dayDetailDate: document.getElementById('day-detail-date'),
            bulkSelectAll: document.getElementById('bulk-select-all'),
            bulkComplete: document.getElementById('bulk-complete'),
            toastContainer: document.getElementById('toast-container'),
            // Timetable v2 controls
            timetableDayFilter: document.getElementById('timetable-day-filter'),
            timetableSubjectFilter: document.getElementById('timetable-subject-filter'),
            timetableClearFilters: document.getElementById('timetable-clear-filters'),
            timetableDensityButtons: document.querySelectorAll('#timetable-density-toggle .progress-view-toggle__button'),
            addBlockGlobal: document.getElementById('add-block-global')
        };
    }
    
    initChatClient() {
        if (!window.ChatbotClient) {
            this.chat = null;
            return;
        }
        const self = this;
        this.chat = new window.ChatbotClient({
            endpoint: '/api/chat',
            storageKey: 'smartMentorConversation',
            maxHistory: 20,
            onStreamStart() {
                self.showTypingIndicator();
                self.beginStreamingBotMessage();
            },
            onStreamDelta(delta, aggregate) {
                self.updateStreamingBotMessage(aggregate);
            },
            onStreamComplete(fullText, meta) {
                self.hideTypingIndicator();
                self.finishStreamingBotMessage(fullText, meta);
                if (meta && meta.suggestions && Array.isArray(meta.suggestions) && meta.suggestions.length) {
                    self.addActionButtons(meta.suggestions.map(text => ({ text })));
                }
            },
            onIntent(intent, payload, resources) {
                self.handleIntent(intent, payload, resources);
            },
            onError(err) {
                console.error('Chat error:', err);
                self.hideTypingIndicator();
                self.addMessage('bot', "I'm having trouble connecting right now. Let's try again in a moment.");
            }
        });
    }
    
    attachEventListeners() {
        if (this.elements.chatbotTrigger) {
            this.elements.chatbotTrigger.addEventListener('click', () => this.openChatbot());
        }
        if (this.elements.chatbotFab) {
            this.elements.chatbotFab.addEventListener('click', () => this.openChatbot());
        }
        if (this.elements.resetChat) {
            this.elements.resetChat.addEventListener('click', () => this.resetConversation());
        }
        if (this.elements.sidebarToggle) {
            this.elements.sidebarToggle.addEventListener('click', () => this.toggleSidebarVisibility());
        }
        if (this.elements.sidebar) {
            const sidebarLinks = this.elements.sidebar.querySelectorAll('.sidebar__nav-link');
            sidebarLinks.forEach(link => {
                link.addEventListener('click', () => {
                    if (this.isMobile()) {
                        this.closeSidebar();
                    }
                });
            });
        }
        window.addEventListener('resize', this.boundHandleViewportChange);
        document.addEventListener('click', this.boundHandleDocumentClick);
        if (this.elements.closeChatbot) {
            this.elements.closeChatbot.addEventListener('click', () => this.closeChatbot());
        }
        if (this.elements.chatbotOverlay) {
            this.elements.chatbotOverlay.addEventListener('click', () => this.closeChatbot());
        }
        if (this.elements.chatbotForm) {
            this.elements.chatbotForm.addEventListener('submit', (e) => this.handleSubmit(e));
        }
        if (this.elements.chatbotInput) {
            this.elements.chatbotInput.addEventListener('input', () => this.handleInputChange());
            this.elements.chatbotInput.addEventListener('keydown', (e) => this.handleKeydown(e));
        }
        if (this.elements.refreshTasks) {
            this.elements.refreshTasks.addEventListener('click', () => this.refreshTasks());
        }
        if (this.elements.themeToggle) {
            this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        if (this.elements.addTaskButton) {
            this.elements.addTaskButton.addEventListener('click', () => this.openTaskForm());
        }
        if (this.elements.addTaskFab) {
            this.elements.addTaskFab.addEventListener('click', () => this.openTaskForm());
        }
        if (this.elements.navAiMentor) {
            this.elements.navAiMentor.addEventListener('click', (e) => { e.preventDefault(); this.openChatbot(); });
        }
        if (this.elements.taskForm) {
            this.elements.taskForm.addEventListener('submit', (e) => this.handleTaskFormSubmit(e));
            this.elements.taskForm.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    this.elements.taskForm.dispatchEvent(new Event('submit'));
                }
            });
        }
        if (this.elements.bulkSelectAll && this.elements.taskList) {
            this.elements.bulkSelectAll.addEventListener('change', () => {
                const checked = this.elements.bulkSelectAll.checked;
                this.elements.taskList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                    cb.checked = checked;
                    cb.dispatchEvent(new Event('change'));
                });
                if (this.elements.bulkComplete) this.elements.bulkComplete.disabled = !checked;
            });
        }
        if (this.elements.bulkComplete) {
            this.elements.bulkComplete.addEventListener('click', () => {
                console.log('Bulk complete clicked (stub)');
            });
        }
        if (this.elements.taskFormProgress) {
            this.elements.taskFormProgress.addEventListener('input', () => this.updateTaskFormProgressValue());
        }
        if (this.elements.taskModalOverlay) {
            this.elements.taskModalOverlay.addEventListener('click', () => this.closeModal());
        }
        if (this.elements.confirmDeleteTask) {
            this.elements.confirmDeleteTask.addEventListener('click', () => this.confirmDeleteTask());
        }
        if (this.elements.priorityOverrideForm) {
            this.elements.priorityOverrideForm.addEventListener('submit', (e) => this.handlePriorityOverrideSubmit(e));
        }
        if (this.elements.editTaskAction) {
            this.elements.editTaskAction.addEventListener('click', () => {
                if (this.currentTaskId) {
                    this.openTaskForm(this.currentTaskId);
                }
            });
        }
        if (this.elements.deleteTaskAction) {
            this.elements.deleteTaskAction.addEventListener('click', () => {
                if (this.currentTaskId) {
                    this.openDeleteConfirm(this.currentTaskId);
                }
            });
        }
        if (this.elements.overridePriorityAction) {
            this.elements.overridePriorityAction.addEventListener('click', () => {
                if (this.currentTaskId) {
                    this.openPriorityOverride(this.currentTaskId);
                }
            });
        }
        
        if (this.elements.startChatEmpty) {
            this.elements.startChatEmpty.addEventListener('click', () => this.openChatbot());
        }
        
        if (this.elements.quickActions) {
            this.elements.quickActions.forEach(button => {
                button.addEventListener('click', () => {
                    const action = button.getAttribute('data-action');
                    this.handleQuickAction(action);
                });
            });
        }
        
        const modalCloseButtons = document.querySelectorAll('[data-close-modal], .modal-close');
        modalCloseButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                const target = event.currentTarget.getAttribute('data-close-modal');
                if (target) {
                    this.closeModal(target);
                } else {
                    this.closeModal();
                }
            });
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.activeModal) {
                    this.closeModal();
                } else if (this.conversationState.isOpen) {
                    this.closeChatbot();
                } else if (this.isSidebarOpen()) {
                    this.closeSidebar();
                }
            }
        });

        if (this.elements.timetableEditButton) {
            this.elements.timetableEditButton.addEventListener('click', () => this.openTimetableEditor());
        }
        if (this.elements.timetableEditorForm) {
            this.elements.timetableEditorForm.addEventListener('submit', (e) => this.handleTimetableSave(e));
        }
        if (this.elements.progressViewButtons && this.elements.progressViewButtons.forEach) {
            this.elements.progressViewButtons.forEach(btn => {
                btn.addEventListener('click', () => this.handleProgressViewToggle(btn));
            });
        }
        if (this.elements.calendarNavButtons && this.elements.calendarNavButtons.forEach) {
            this.elements.calendarNavButtons.forEach(btn => {
                btn.addEventListener('click', () => this.handleCalendarNavClick(btn.getAttribute('data-calendar-nav')));
            });
        }

        // Timetable editor events
        if (this.elements.blockForm) {
            this.elements.blockForm.addEventListener('submit', (e) => this.handleTimetableBlockSave(e));
        }
        if (this.elements.confirmDeleteBlock) {
            this.elements.confirmDeleteBlock.addEventListener('click', () => this.confirmDeleteBlockAction());
        }
        if (this.elements.timetableGrid) {
            this.elements.timetableGrid.addEventListener('keydown', (e) => this.handleTimetableKeydown(e));
            this.elements.timetableGrid.addEventListener('click', (e) => this.handleTimetableClick(e));
            this.elements.timetableGrid.setAttribute('data-density', this.rowDensity);
        }

        if (this.elements.timetableDayFilter) {
            this.elements.timetableDayFilter.addEventListener('change', () => {
                this.timetableFilters.day = this.elements.timetableDayFilter.value;
                this.renderTimetable();
            });
        }
        if (this.elements.timetableSubjectFilter) {
            this.elements.timetableSubjectFilter.addEventListener('input', () => {
                this.timetableFilters.subject = (this.elements.timetableSubjectFilter.value || '').toLowerCase();
                this.renderTimetable();
            });
        }
        if (this.elements.timetableClearFilters) {
            this.elements.timetableClearFilters.addEventListener('click', () => {
                this.timetableFilters = { day: 'all', subject: '' };
                if (this.elements.timetableDayFilter) this.elements.timetableDayFilter.value = 'all';
                if (this.elements.timetableSubjectFilter) this.elements.timetableSubjectFilter.value = '';
                this.renderTimetable();
            });
        }
        if (this.elements.timetableDensityButtons && this.elements.timetableDensityButtons.forEach) {
            this.elements.timetableDensityButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const density = btn.getAttribute('data-density') || 'expanded';
                    this.setDensity(density);
                });
            });
            this.updateDensityToggleUI();
        }
        if (this.elements.addBlockGlobal) {
            this.elements.addBlockGlobal.addEventListener('click', () => {
                const day = (this.timetableFilters.day && this.timetableFilters.day !== 'all') ? this.timetableFilters.day : this.getTodayKey();
                this.openBlockForm(day);
            });
        }

        // KPI drilldown hooks (stub)
        try {
            document.querySelectorAll('.kpi-card').forEach(card => {
                card.addEventListener('click', () => {
                    const key = card.getAttribute('data-kpi') || 'kpi';
                    console.log('KPI drilldown clicked:', key);
                });
            });
        } catch (_) {}

        // Enable swipe-to-complete on mobile (progressive enhancement)
        if (this.isMobile()) {
            this.enableSwipeToComplete(this.elements.priorityTaskList);
            this.enableSwipeToComplete(this.elements.taskList);
        }
    }
    
    openChatbot() {
        this.conversationState.isOpen = true;
        this._restoreFocusTo = document.activeElement;
        this.elements.chatbotModal.removeAttribute('hidden');
        this.elements.chatbotOverlay.removeAttribute('hidden');
        
        setTimeout(() => {
            this.elements.chatbotModal.classList.add('active');
            this.elements.chatbotOverlay.classList.add('active');
            this.elements.chatbotInput.focus();
            this.setupChatFocusTrap();
        }, 10);
        
        this.elements.chatNotification.classList.remove('active');
        this.scrollToBottom();
    }
    
    closeChatbot() {
        this.conversationState.isOpen = false;
        this.teardownChatFocusTrap();
        this.elements.chatbotModal.classList.remove('active');
        this.elements.chatbotOverlay.classList.remove('active');
        
        setTimeout(() => {
            this.elements.chatbotModal.setAttribute('hidden', '');
            this.elements.chatbotOverlay.setAttribute('hidden', '');
            const restoreTo = this._restoreFocusTo || this.elements.chatbotTrigger || this.elements.chatbotFab;
            if (restoreTo && typeof restoreTo.focus === 'function') restoreTo.focus();
        }, 350);
    }
    
    handleInputChange() {
        const value = this.elements.chatbotInput.value.trim();
        this.elements.sendButton.disabled = !value;
        
        this.elements.chatbotInput.style.height = 'auto';
        this.elements.chatbotInput.style.height = Math.min(this.elements.chatbotInput.scrollHeight, 120) + 'px';
    }
    
    handleKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!this.elements.sendButton.disabled) {
                this.elements.chatbotForm.dispatchEvent(new Event('submit'));
            }
        }
    }
    
    async handleSubmit(e) {
        e.preventDefault();
        
        const message = this.elements.chatbotInput.value.trim();
        if (!message) return;
        
        this.addMessage('user', message);
        this.elements.chatbotInput.value = '';
        this.elements.sendButton.disabled = true;
        this.elements.chatbotInput.style.height = 'auto';
        
        if (this.chat) {
            try {
                await this.chat.sendMessage(message);
            } catch (error) {
                console.error('Error communicating with chatbot:', error);
                this.hideTypingIndicator();
                this.addMessage('bot', "I'm having trouble connecting right now. Let me help you offline with common tasks!");
                this.offerOfflineOptions();
            }
        } else {
            // Fallback to legacy API flow
            this.showTypingIndicator();
            try {
                await this.sendToAPI(message);
            } catch (error) {
                console.error('Error communicating with chatbot:', error);
                this.hideTypingIndicator();
                this.addMessage('bot', "I'm having trouble connecting right now. Let me help you offline with common tasks!");
                this.offerOfflineOptions();
            }
        }
    }
    
    async sendToAPI(message) {
        this.conversationState.conversationHistory.push({
            role: 'user',
            content: message
        });
        
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    sessionId: this.chat?.state?.sessionId || undefined
                })
            });
            
            if (!response.ok) {
                throw new Error('API request failed');
            }
            
            const raw = await response.json();
            const payload = raw?.data || raw || {};
            const { reply, intent, resources } = payload;
            
            setTimeout(() => {
                this.hideTypingIndicator();
                if (reply) this.addMessage('bot', reply);
                if (resources) this.applyResources(resources);
                if (intent && intent !== 'none') this.handleIntent(intent, payload.payload || {}, resources || {});
            }, 300 + Math.random() * 600);
            
        } catch (error) {
            this.hideTypingIndicator();
            this.handleOfflineMode(message);
        }
    }
    
    handleOfflineMode(message) {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('task') || lowerMessage.includes('create') || lowerMessage.includes('add')) {
            this.startTaskCreation();
        } else if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
            this.addMessage('bot', "I'm your Smart Academic Mentor! I can help you:");
            this.addActionButtons([
                { text: 'Create study tasks', action: 'create-task' },
                { text: 'Plan your study schedule', action: 'study-plan' },
                { text: 'Get study tips', action: 'study-tips' }
            ]);
        } else if (lowerMessage.includes('plan') || lowerMessage.includes('schedule')) {
            this.addMessage('bot', "Let's create a study plan! First, what subject are you focusing on?");
            this.conversationState.currentStep = 'awaiting_subject';
        } else {
            this.addMessage('bot', "I'd love to help you with that! Could you tell me more about what you'd like to accomplish?");
            this.offerOfflineOptions();
        }
    }
    
    startTaskCreation() {
        this.conversationState.currentStep = 'task_creation_subject';
        this.conversationState.taskData = {};
        this.addMessage('bot', "Great! Let's create a new study task. What subject is this for?");
    }
    
    offerOfflineOptions() {
        setTimeout(() => {
            this.addActionButtons([
                { text: 'Create a task', action: 'create-task' },
                { text: 'Get help', action: 'help' }
            ]);
        }, 300);
    }
    
    processAPIResponse(data) {
        if (data.message) {
            this.addMessage('bot', data.message);
            this.conversationState.conversationHistory.push({
                role: 'assistant',
                content: data.message
            });
        }
        
        if (data.currentStep) {
            this.conversationState.currentStep = data.currentStep;
        }
        
        if (data.taskData) {
            this.conversationState.taskData = { ...this.conversationState.taskData, ...data.taskData };
        }
        
        if (data.actions && data.actions.length > 0) {
            this.addActionButtons(data.actions);
        }
        
        if (data.taskCreated) {
            this.handleTaskCreated(data.task);
        }
        
        if (data.motivational) {
            setTimeout(() => {
                this.updateMotivationalMessage(data.motivational);
            }, 1000);
        }
    }
    
    handleQuickAction(action) {
        switch (action) {
            case 'create-task':
                this.addMessage('user', 'I want to create a new task');
                this.showTypingIndicator();
                setTimeout(() => {
                    this.hideTypingIndicator();
                    this.startTaskCreation();
                }, 800);
                break;
            case 'study-plan':
                this.addMessage('user', 'Help me create a study plan');
                this.showTypingIndicator();
                setTimeout(() => {
                    this.hideTypingIndicator();
                    this.addMessage('bot', "Perfect! Let's build a study plan together. What's your main goal or upcoming exam?");
                    this.conversationState.currentStep = 'study_plan_goal';
                }, 800);
                break;
            case 'help':
                this.addMessage('user', 'What can you help me with?');
                this.showTypingIndicator();
                setTimeout(() => {
                    this.hideTypingIndicator();
                    this.addMessage('bot', "I'm here to help you succeed! I can assist you with:");
                    setTimeout(() => {
                        this.addMessage('bot', "📚 Creating and organizing study tasks\n📅 Planning your study schedule\n🎯 Setting achievable goals\n💡 Providing study tips and motivation\n✅ Tracking your progress");
                    }, 300);
                }, 800);
                break;
        }
    }
    
    addMessage(sender, text, options = {}) {
        const message = {
            id: Date.now() + Math.random(),
            sender,
            text,
            timestamp: new Date(),
            ...options
        };
        
        this.conversationState.messages.push(message);
        this.renderMessage(message);
        this.saveToStorage();
    }
    
    renderMessage(message) {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${message.sender}`;
        messageEl.setAttribute('role', 'article');
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = message.sender === 'bot' ? 
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>' :
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
        
        const content = document.createElement('div');
        content.className = 'message-content';
        
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        bubble.textContent = message.text;
        
        const time = document.createElement('div');
        time.className = 'message-time';
        time.textContent = this.formatTime(message.timestamp);
        
        content.appendChild(bubble);
        content.appendChild(time);
        messageEl.appendChild(avatar);
        messageEl.appendChild(content);
        
        this.elements.chatbotMessages.appendChild(messageEl);
        this.scrollToBottom();
    }
    
    addActionButtons(actions) {
        const messageEl = document.createElement('div');
        messageEl.className = 'message bot';
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>';
        
        const content = document.createElement('div');
        content.className = 'message-content';
        
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'action-buttons';
        
        actions.forEach(actionData => {
            const button = document.createElement('button');
            button.className = 'action-button';
            button.textContent = actionData.text;
            button.addEventListener('click', () => {
                this.addMessage('user', actionData.text);
                actionsContainer.remove();
                
                if (actionData.action) {
                    this.showTypingIndicator();
                    setTimeout(() => {
                        this.hideTypingIndicator();
                        this.handleActionClick(actionData.action, actionData.data);
                    }, 800);
                }
            });
            actionsContainer.appendChild(button);
        });
        
        content.appendChild(actionsContainer);
        messageEl.appendChild(avatar);
        messageEl.appendChild(content);
        
        this.elements.chatbotMessages.appendChild(messageEl);
        this.scrollToBottom();
    }
    
    handleActionClick(action, data) {
        switch (action) {
            case 'create-task':
                this.startTaskCreation();
                break;
            case 'study-plan':
                this.addMessage('bot', "Great! Let's create a study plan. What subject would you like to focus on?");
                this.conversationState.currentStep = 'study_plan_subject';
                break;
            case 'study-tips':
                this.addMessage('bot', "Here are some effective study tips:\n\n1. Use the Pomodoro Technique: Study for 25 minutes, then take a 5-minute break\n2. Active recall: Test yourself instead of just re-reading\n3. Space out your learning over time\n4. Teach the material to someone else\n5. Stay organized with a study schedule");
                break;
            default:
                if (data) {
                    this.handleCustomAction(action, data);
                }
        }
    }
    
    handleCustomAction(action, data) {
        console.log('Custom action:', action, data);
    }
    
    showTypingIndicator() {
        if (document.querySelector('.typing-indicator')) return;
        
        const typingEl = document.createElement('div');
        typingEl.className = 'typing-indicator';
        typingEl.innerHTML = `
            <div class="message-avatar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                </svg>
            </div>
            <div class="typing-dots">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        
        this.elements.chatbotMessages.appendChild(typingEl);
        this.scrollToBottom();
    }
    
    hideTypingIndicator() {
        const typingEl = document.querySelector('.typing-indicator');
        if (typingEl) {
            typingEl.remove();
        }
    }

    beginStreamingBotMessage() {
        if (this.streamingMessage?.el && this.streamingMessage.el.isConnected) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'message bot';
        wrapper.setAttribute('role', 'article');
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>';
        const content = document.createElement('div');
        content.className = 'message-content';
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        bubble.textContent = '';
        const time = document.createElement('div');
        time.className = 'message-time';
        time.textContent = '...';
        content.appendChild(bubble);
        content.appendChild(time);
        wrapper.appendChild(avatar);
        wrapper.appendChild(content);
        this.elements.chatbotMessages.appendChild(wrapper);
        this.streamingMessage = { el: wrapper, bubbleEl: bubble, timeEl: time, text: '' };
        if (this.elements.chatAnnouncer) {
            this.elements.chatAnnouncer.textContent = 'Assistant is typing';
        }
        this.scrollToBottom();
    }

    updateStreamingBotMessage(text) {
        if (!this.streamingMessage || !this.streamingMessage.bubbleEl) {
            this.beginStreamingBotMessage();
        }
        this.streamingMessage.text = text;
        this.streamingMessage.bubbleEl.textContent = text;
        if (this.elements.chatAnnouncer) {
            try { this.elements.chatAnnouncer.textContent = text.slice(-120); } catch (_) {}
        }
        this.scrollToBottom();
    }

    finishStreamingBotMessage(fullText, meta = {}) {
        if (!this.streamingMessage || !this.streamingMessage.bubbleEl) {
            this.beginStreamingBotMessage();
        }
        this.streamingMessage.bubbleEl.textContent = fullText;
        this.streamingMessage.timeEl.textContent = this.formatTime(new Date());
        // persist message to history
        this.conversationState.messages.push({ id: Date.now() + Math.random(), sender: 'bot', text: fullText, timestamp: new Date() });
        this.saveToStorage();
        // handle intent/resources
        if (meta && meta.resources) {
            this.applyResources(meta.resources);
        }
        if (meta && meta.intent && meta.intent !== 'none') {
            // Announce intent and also dispatch a custom event for external listeners
            window.dispatchEvent(new CustomEvent('chatbot:intent', { detail: { intent: meta.intent, payload: meta.payload || {}, resources: meta.resources || {} } }));
            // Simple auto-action: refresh tasks for relevant intents
            if (meta.intent === 'create_task' || meta.intent === 'update_task' || meta.intent === 'complete_task') {
                this.refreshTasks();
            }
        }
        // clear streaming message state
        this.streamingMessage = null;
    }

    handleIntent(intent, payload = {}, resources = {}) {
        // Handle common intents by updating UI/state
        switch (intent) {
            case 'create_task':
            case 'update_task':
            case 'complete_task':
                this.applyResources(resources);
                this.renderTasks();
                break;
            case 'create_subject':
                // No-op in UI for now; could update subject pickers
                break;
            default:
                break;
        }
    }

    applyResources(resources = {}) {
        if (resources && Array.isArray(resources.tasks)) {
            this.tasks = resources.tasks.map(t => this.normalizeTask(t)).filter(Boolean);
            this.saveToStorage();
            this.renderTasks();
        }
        // Future: subjects/events integration
    }

    async resetConversation() {
        try {
            if (this.chat && this.chat.reset) {
                await this.chat.reset();
            }
        } catch (_) {}
        // Clear UI
        this.conversationState.messages = [];
        if (this.elements.chatbotMessages) {
            this.elements.chatbotMessages.innerHTML = '';
        }
        this.saveToStorage();
        this.displayWelcomeMessage();
        if (this.elements.chatAnnouncer) {
            this.elements.chatAnnouncer.textContent = 'Conversation reset';
        }
    }
    
    handleTaskCreated(task) {
        this.hideTypingIndicator();
        
        const confirmationEl = document.createElement('div');
        confirmationEl.className = 'message bot';
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>';
        
        const content = document.createElement('div');
        content.className = 'message-content';
        
        const confirmation = document.createElement('div');
        confirmation.className = 'confirmation-message';
        confirmation.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span>Task created successfully!</span>
        `;
        
        content.appendChild(confirmation);
        confirmationEl.appendChild(avatar);
        confirmationEl.appendChild(content);
        
        this.elements.chatbotMessages.appendChild(confirmationEl);
        
        this.tasks.push(task);
        this.saveToStorage();
        this.renderTasks();
        this.updateMotivationalMessage("Great job! You're building good study habits! 🎉");
        
        this.conversationState.currentStep = null;
        this.conversationState.taskData = {};
        
        setTimeout(() => {
            this.addMessage('bot', "Is there anything else I can help you with?");
        }, 1000);
        
        this.scrollToBottom();
    }
    
    displayWelcomeMessage() {
        if (this.conversationState.messages.length === 0) {
            const welcomeMessages = [
                "Hi! I'm your Smart Academic Mentor. I'm here to help you stay organized and motivated with your studies! 👋",
                "You can ask me to create study tasks, plan your schedule, or just chat about your academic goals. How can I help you today?"
            ];
            
            welcomeMessages.forEach((msg, index) => {
                setTimeout(() => {
                    this.addMessage('bot', msg);
                }, index * 1000);
            });
        }
    }

    renderTasks() {
        this.renderPriorityTasks(); // This now renders into the "Assignment Tracker"
        
        const listEl = this.elements.taskList;
        if (!listEl) return;

        const errorBanner = this.lastTaskFetchError ? `<div class="inline-error" role="alert">Unable to refresh tasks. You're viewing cached data. <button class="link-button" id="retry-fetch-tasks">Retry</button></div>` : '';
        
        if (this.tasks.length === 0) {
            listEl.innerHTML = errorBanner + `
                <div class="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
                    <h3>No tasks yet</h3>
                    <p>Chat with your AI mentor to create personalized study tasks!</p>
                    <button class="primary-button" id="start-chat-empty">Start Chatting</button>
                </div>
            `;
            const retry = document.getElementById('retry-fetch-tasks');
            if (retry) retry.addEventListener('click', () => this.refreshTasks());
            const startButton = document.getElementById('start-chat-empty');
            if (startButton) startButton.addEventListener('click', () => this.openChatbot());
            return;
        }

        listEl.innerHTML = errorBanner;
        const retryBtn = document.getElementById('retry-fetch-tasks');
        if (retryBtn) retryBtn.addEventListener('click', () => this.refreshTasks());

        let tasks = this.getSortedTasks();
        const params = new URLSearchParams(window.location.search || '');
        const filterSubject = (params.get('subject') || '').toLowerCase();
        if (filterSubject) {
            tasks = tasks.filter(t => (t.subject || '').toLowerCase() === filterSubject);
        }
        
        tasks.forEach((task) => {
            const taskEl = this.createTaskElement(task); // Use a helper function for clarity
            taskEl.addEventListener('click', (e) => {
                if (!e.target.closest('.assignment-item__checkbox')) {
                    this.openTaskDetail(task.id);
                }
            });
            taskEl.addEventListener('keydown', (e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('.assignment-item__checkbox')) {
                    e.preventDefault();
                    this.openTaskDetail(task.id);
                }
            });
            listEl.appendChild(taskEl);
        });
    }
    
    toggleTask(taskId, isCompleted) {
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return;
        
        this.tasks[taskIndex].completed = isCompleted;
        this.tasks[taskIndex].updatedAt = new Date().toISOString();
        this.saveToStorage();
        this.renderTasks(); // Re-render both lists to maintain consistency
        
        if (isCompleted) {
            const completedMessages = [
                "Awesome! Task completed! 🎉",
                "Great work! Keep it up! ⭐",
                "Well done! You're making progress! 👏"
            ];
            this.updateMotivationalMessage(completedMessages[Math.floor(Math.random() * completedMessages.length)]);
        }
    }
    
    getSortedTasks() {
        return [...this.tasks].sort((a, b) => {
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            const priorityDifference = this.getPriorityWeight(a) - this.getPriorityWeight(b);
            if (priorityDifference !== 0) {
                return priorityDifference;
            }
            const dueDateDifference = this.compareDueDates(a, b);
            if (dueDateDifference !== 0) {
                return dueDateDifference;
            }
            return new Date(b.updatedAt) - new Date(a.updatedAt);
        });
    }
    
    createPriorityBadge(task) {
        const level = (task.priority || 'medium').toLowerCase();
        const badge = document.createElement('span');
        badge.className = `assignment-item__priority assignment-item__priority--${level}`;
        badge.dataset.priorityIndicator = '';
        badge.textContent = level;
        return badge;
    }
    
    async refreshTasks() {
        const button = this.elements.refreshTasks;
        const svg = button?.querySelector('svg');
        
        if (svg) {
            svg.style.animation = 'spin 0.5s ease-in-out';
        }
        
        await this.fetchTasks();
        
        if (svg) {
            setTimeout(() => {
                svg.style.animation = '';
            }, 500);
        }
    }
    
    updateMotivationalMessage(message = null) {
        if (!this.elements.motivationalMessage) return;
        if (message) {
            this.elements.motivationalMessage.textContent = message;
        } else {
            const randomMessage = this.motivationalMessages[Math.floor(Math.random() * this.motivationalMessages.length)];
            this.elements.motivationalMessage.textContent = randomMessage;
        }
        
        this.elements.motivationalMessage.style.animation = 'fadeIn 0.5s ease-in';
        this.elements.motivationalMessage.addEventListener('animationend', () => {
            this.elements.motivationalMessage.style.animation = '';
        }, { once: true });
    }
    
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }

    getTodayKey() {
        const map = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
        const d = new Date().getDay();
        return map[d] || 'monday';
    }

    setDensity(density) {
        const val = (density === 'compact') ? 'compact' : 'expanded';
        this.rowDensity = val;
        try { localStorage.setItem('timetableDensity', val); } catch(_) {}
        if (this.elements.timetableGrid) this.elements.timetableGrid.setAttribute('data-density', val);
        this.updateDensityToggleUI();
        this.renderTimetable();
    }

    updateDensityToggleUI() {
        try {
            if (!this.elements.timetableDensityButtons || !this.elements.timetableDensityButtons.forEach) return;
            this.elements.timetableDensityButtons.forEach(btn => {
                const val = btn.getAttribute('data-density');
                const isActive = val === this.rowDensity;
                btn.classList.toggle('progress-view-toggle__button--active', isActive);
                btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            });
        } catch (_) {}
    }

    toggleSidebarVisibility() {
        const shouldOpen = !document.body.classList.contains('sidebar-open');
        document.body.classList.toggle('sidebar-open', shouldOpen);
        if (this.elements.sidebarToggle) {
            this.elements.sidebarToggle.setAttribute('aria-expanded', String(shouldOpen));
        }
    }

    openSidebar() {
        document.body.classList.add('sidebar-open');
        if (this.elements.sidebarToggle) {
            this.elements.sidebarToggle.setAttribute('aria-expanded', 'true');
        }
    }

    closeSidebar() {
        document.body.classList.remove('sidebar-open');
        if (this.elements.sidebarToggle) {
            this.elements.sidebarToggle.setAttribute('aria-expanded', 'false');
        }
    }

    isSidebarOpen() {
        return document.body.classList.contains('sidebar-open');
    }

    isMobile() {
        return window.matchMedia('(max-width: 768px)').matches;
    }

    isTabletOrSmaller() {
        return window.matchMedia('(max-width: 1024px)').matches;
    }

    handleViewportChange() {
        // This logic is now mostly handled by CSS, but we keep it for JS-driven edge cases
        if (!this.isTabletOrSmaller()) {
            this.closeSidebar(); // Ensure sidebar is closed if viewport becomes large
        }
    }

    handleDocumentClick(event) {
        if (!this.isSidebarOpen() || !this.isTabletOrSmaller()) return;

        const sidebar = this.elements.sidebar;
        const toggle = this.elements.sidebarToggle;
        if (sidebar && !sidebar.contains(event.target) && toggle && !toggle.contains(event.target)) {
            this.closeSidebar();
        }
    }

    setupChatFocusTrap() {
        const modal = this.elements.chatbotModal;
        if (!modal) return;
        const selectors = [
            'a[href]','area[href]','input:not([disabled])','select:not([disabled])','textarea:not([disabled])',
            'button:not([disabled])','iframe','[tabindex]:not([tabindex="-1"])','[contentEditable=true]'
        ];
        const getFocusable = () => Array.from(modal.querySelectorAll(selectors.join(','))).filter(el => el.offsetParent !== null || el === document.activeElement);
        this._chatTrapHandler = (e) => {
            if (e.key !== 'Tab') return;
            const focusables = getFocusable();
            if (!focusables.length) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first || !modal.contains(document.activeElement)) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (document.activeElement === last || !modal.contains(document.activeElement)) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };
        this._chatFocusinHandler = (e) => {
            if (!modal.contains(e.target)) {
                this.elements.chatbotInput && this.elements.chatbotInput.focus();
            }
        };
        document.addEventListener('keydown', this._chatTrapHandler);
        document.addEventListener('focusin', this._chatFocusinHandler);
    }

    teardownChatFocusTrap() {
        if (this._chatTrapHandler) {
            document.removeEventListener('keydown', this._chatTrapHandler);
            this._chatTrapHandler = null;
        }
        if (this._chatFocusinHandler) {
            document.removeEventListener('focusin', this._chatFocusinHandler);
            this._chatFocusinHandler = null;
        }
    }

    setupModalFocusTrap(modal) {
        this.teardownModalFocusTrap();
        if (!modal) return;
        const selectors = [
            'a[href]','area[href]','input:not([disabled])','select:not([disabled])','textarea:not([disabled])',
            'button:not([disabled])','iframe','[tabindex]:not([tabindex="-1"])','[contentEditable=true]'
        ];
        const getFocusable = () => Array.from(modal.querySelectorAll(selectors.join(','))).filter(el => el.offsetParent !== null || el === document.activeElement);
        this._modalTrapHandler = (e) => {
            if (e.key !== 'Tab') return;
            const focusables = getFocusable();
            if (!focusables.length) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first || !modal.contains(document.activeElement)) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (document.activeElement === last || !modal.contains(document.activeElement)) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };
        this._modalFocusinHandler = (e) => {
            if (!modal.contains(e.target)) {
                const focusables = getFocusable();
                if (focusables.length) focusables[0].focus();
            }
        };
        document.addEventListener('keydown', this._modalTrapHandler);
        document.addEventListener('focusin', this._modalFocusinHandler);
    }

    teardownModalFocusTrap() {
        if (this._modalTrapHandler) {
            document.removeEventListener('keydown', this._modalTrapHandler);
            this._modalTrapHandler = null;
        }
        if (this._modalFocusinHandler) {
            document.removeEventListener('focusin', this._modalFocusinHandler);
            this._modalFocusinHandler = null;
        }
    }

    enableSwipeToComplete(container) {
        if (!container) return;
        let startX = 0; let active = null;
        container.addEventListener('touchstart', (e) => {
            const item = e.target.closest('.assignment-item');
            if (!item) return;
            active = item; startX = e.touches[0].clientX;
        }, { passive: true });
        container.addEventListener('touchmove', (e) => {
            if (!active) return;
            const dx = e.touches[0].clientX - startX;
            if (dx > 0) {
                active.style.transform = `translateX(${Math.min(dx, 80)}px)`;
                active.style.transition = 'none';
            }
        }, { passive: true });
        const end = () => {
            if (!active) return;
            const tr = parseFloat((active.style.transform || '').replace(/[^0-9.-]/g, '')) || 0;
            active.style.transition = '';
            if (tr > 60) {
                const cb = active.querySelector('input[type="checkbox"]');
                if (cb) { cb.checked = true; cb.dispatchEvent(new Event('change')); }
                active.style.transform = 'translateX(0)';
            } else {
                active.style.transform = 'translateX(0)';
            }
            active = null;
        };
        container.addEventListener('touchend', end);
        container.addEventListener('touchcancel', end);
    }
    
    scrollToBottom() {
        setTimeout(() => {
            if(this.elements.chatbotMessages) {
                this.elements.chatbotMessages.scrollTop = this.elements.chatbotMessages.scrollHeight;
            }
        }, 100);
    }
    
    formatTime(date) {
        const now = new Date();
        const messageDate = new Date(date);
        const diffInMs = now - messageDate;
        const diffInMins = Math.floor(diffInMs / 60000);
        
        if (diffInMins < 1) return 'Just now';
        if (diffInMins < 60) return `${diffInMins}m ago`;
        
        const hours = messageDate.getHours();
        const minutes = messageDate.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        const displayMinutes = minutes < 10 ? '0' + minutes : minutes;
        
        return `${displayHours}:${displayMinutes} ${ampm}`;
    }
    
    saveToStorage() {
        try {
            const msgs = Array.isArray(this.conversationState.messages) ? this.conversationState.messages.slice(-20) : [];
            localStorage.setItem('smartMentorMessages', JSON.stringify(msgs));
            localStorage.setItem('smartMentorTasks', JSON.stringify(this.tasks));
        } catch (error) {
            console.error('Error saving to storage:', error);
        }
    }
    
    loadFromStorage() {
        try {
            const savedMessages = localStorage.getItem('smartMentorMessages');
            const savedTasks = localStorage.getItem('smartMentorTasks');
            const savedTheme = localStorage.getItem('theme');
            
            if (savedMessages) {
                this.conversationState.messages = JSON.parse(savedMessages);
                this.conversationState.messages.forEach(msg => this.renderMessage(msg));
            }
            
            if (savedTasks) {
                this.tasks = JSON.parse(savedTasks);
            }
            
            if (savedTheme) {
                document.documentElement.setAttribute('data-theme', savedTheme);
            }
        } catch (error) {
            console.error('Error loading from storage:', error);
        }
    }
    
    async fetchTasks() {
        if (this.isFetchingTasks) return;
        this.isFetchingTasks = true;
        
        try {
            let tasks = null;
            if (window.api && window.api.getTasks) {
                const payload = await window.api.getTasks();
                tasks = Array.isArray(payload) ? payload : (payload?.data || payload?.tasks || []);
            } else {
                 // Simulate fetching for demo purposes if API module is not present
                tasks = JSON.parse(localStorage.getItem('smartMentorTasks')) || [];
            }
            if (Array.isArray(tasks)) {
                this.tasks = tasks.map(task => this.normalizeTask(task)).filter(Boolean);
                this.saveToStorage();
            }
            this.lastTaskFetchError = null;
        } catch (error) {
            console.warn('Task API unavailable, using stored data:', error);
            this.lastTaskFetchError = error.message;
        } finally {
            this.isFetchingTasks = false;
            this.renderTasks();
        }
    }
    
    normalizeTask(task) {
        if (!task) return null;
        const normalized = {
            id: task.id || task.taskId || task._id || this.generateTaskId(),
            title: task.title || 'Untitled Task',
            description: task.description || '',
            subject: task.subject || '',
            dueDate: task.dueDate || '',
            progress: this.clamp(task.progress || (task.completed ? 100 : 0), 0, 100),
            completed: Boolean(task.completed || (task.progress && task.progress >= 100)),
            createdAt: task.createdAt || new Date().toISOString(),
            updatedAt: task.updatedAt || new Date().toISOString()
        };
        normalized.priority = this.getPriorityLevelFromTask(task);
        return normalized;
    }
    
    generateTaskId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
    }
    
    openTaskForm(taskId = null) {
        this.currentTaskId = taskId;
        
        if (taskId) {
            const task = this.tasks.find(t => t.id === taskId);
            if (task) {
                this.elements.taskFormTitle.textContent = 'Edit Task';
                this.elements.taskFormId.value = task.id;
                this.elements.taskFormTitleInput.value = task.title;
                this.elements.taskFormDescription.value = task.description || '';
                this.elements.taskFormSubject.value = task.subject || '';
                this.elements.taskFormDueDate.value = task.dueDate ? task.dueDate.split('T')[0] : '';
                this.elements.taskFormPriority.value = task.priority;
                this.elements.taskFormProgress.value = task.progress || 0;
                this.updateTaskFormProgressValue();
                this.elements.taskFormSubmit.textContent = 'Update Task';
            }
        } else {
            this.elements.taskFormTitle.textContent = 'Add Task';
            this.elements.taskFormId.value = '';
            this.elements.taskForm.reset();
            this.elements.taskFormPriority.value = 'medium';
            this.elements.taskFormProgress.value = 0;
            this.updateTaskFormProgressValue();
            this.elements.taskFormSubmit.textContent = 'Save Task';
        }
        
        this.openModal('task-form-modal');
    }
    
    updateTaskFormProgressValue() {
        if (this.elements.taskFormProgress && this.elements.taskFormProgressValue) {
            this.elements.taskFormProgressValue.textContent = this.elements.taskFormProgress.value + '%';
        }
    }
    
    async handleTaskFormSubmit(e) {
        e.preventDefault();
        
        const taskId = this.elements.taskFormId.value;
        const taskData = {
            title: this.elements.taskFormTitleInput.value.trim(),
            description: this.elements.taskFormDescription.value.trim(),
            subject: this.elements.taskFormSubject.value.trim(),
            dueDate: this.elements.taskFormDueDate.value,
            priority: this.elements.taskFormPriority.value.toLowerCase(),
            progress: parseInt(this.elements.taskFormProgress.value),
            completed: false,
            updatedAt: new Date().toISOString()
        };
        
        if (taskId) {
            await this.updateTask(taskId, taskData);
        } else {
            await this.createTask(taskData);
        }
        
        this.closeModal('task-form-modal');
        this.renderTasks();
    }
    
    async createTask(taskData) {
        const task = this.normalizeTask({
            ...taskData,
            createdAt: new Date().toISOString()
        });
        
        this.tasks.push(task);
        this.saveToStorage();
        this.updateMotivationalMessage("Great! Task created successfully! 🎉");
        this.initAnalyticsAndCharts();
        this.buildEventsFromData();
    }
    
    async updateTask(taskId, taskData) {
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return;
        
        const updatedTask = this.normalizeTask({
            ...this.tasks[taskIndex],
            ...taskData
        });
        
        this.tasks[taskIndex] = updatedTask;
        this.saveToStorage();
        this.updateMotivationalMessage("Task updated successfully! ✅");
        this.initAnalyticsAndCharts();
        this.buildEventsFromData();
    }
    
    openTaskDetail(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        this.currentTaskId = taskId;
        
        if (this.elements.taskDetailTitle) this.elements.taskDetailTitle.textContent = 'Task Details';
        if (this.elements.taskDetailSubtitle) this.elements.taskDetailSubtitle.textContent = task.subject || 'General';
        if (this.elements.taskDetailName) this.elements.taskDetailName.textContent = task.title;
        if (this.elements.taskDetailDescription) this.elements.taskDetailDescription.textContent = task.description || 'No description provided.';
        if (this.elements.taskDetailSubject) this.elements.taskDetailSubject.textContent = task.subject || '—';
        if (this.elements.taskDetailDueDate) this.elements.taskDetailDueDate.textContent = task.dueDate ? this.formatDate(task.dueDate) : '—';
        if (this.elements.taskDetailUpdated) this.elements.taskDetailUpdated.textContent = task.updatedAt ? this.formatDateTime(task.updatedAt) : '—';
        if (this.elements.taskDetailPriorityBadge) {
            this.elements.taskDetailPriorityBadge.textContent = task.priority;
            this.elements.taskDetailPriorityBadge.className = 'priority-badge ' + task.priority;
        }
        
        const progress = task.progress || 0;
        if (this.elements.taskDetailProgressBar) this.elements.taskDetailProgressBar.style.width = progress + '%';
        if (this.elements.taskDetailProgressValue) this.elements.taskDetailProgressValue.textContent = progress + '%';
        
        this.openModal('task-detail-modal');
    }
    
    openDeleteConfirm(taskId) {
        this.currentTaskId = taskId;
        this.closeModal('task-detail-modal');
        this.openModal('delete-confirm-modal');
    }
    
    async confirmDeleteTask() {
        if (!this.currentTaskId) return;
        
        const taskIndex = this.tasks.findIndex(t => t.id === this.currentTaskId);
        if (taskIndex === -1) return;
        
        this.tasks.splice(taskIndex, 1);
        this.saveToStorage();
        this.renderTasks();
        this.closeModal('delete-confirm-modal');
        this.currentTaskId = null;
        this.updateMotivationalMessage("Task deleted.");
        this.initAnalyticsAndCharts();
        this.buildEventsFromData();
    }
    
    openPriorityOverride(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        this.currentTaskId = taskId;
        this.elements.priorityOverrideTaskId.value = taskId;
        this.elements.priorityOverrideSelect.value = task.priority;
        this.elements.priorityOverrideReason.value = '';
        
        this.closeModal('task-detail-modal');
        this.openModal('priority-override-modal');
    }
    
    async handlePriorityOverrideSubmit(e) {
        e.preventDefault();
        
        const taskId = this.elements.priorityOverrideTaskId.value;
        const newPriority = this.elements.priorityOverrideSelect.value.toLowerCase();
        
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return;
        
        this.tasks[taskIndex].priority = newPriority;
        this.tasks[taskIndex].updatedAt = new Date().toISOString();
        
        this.saveToStorage();
        this.renderTasks();
        this.closeModal('priority-override-modal');
        this.updateMotivationalMessage("Priority updated! 🎯");
    }
    
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        this.activeModal = modalId;
        this._restoreFocusEl = document.activeElement;
        
        if (this.elements.taskModalOverlay) {
            this.elements.taskModalOverlay.removeAttribute('hidden');
            requestAnimationFrame(() => this.elements.taskModalOverlay.classList.add('active'));
        }
        modal.removeAttribute('hidden');
        this.setupModalFocusTrap(modal);
        requestAnimationFrame(() => {
            modal.classList.add('active');
            const firstFocusable = modal.querySelector('input, select, textarea, button, [tabindex]:not([tabindex="-1"])');
            if (firstFocusable) firstFocusable.focus();
        });
    }
    
    closeModal(modalId = null) {
        const targetModalId = modalId || this.activeModal;
        if (!targetModalId) return;
        
        const modal = document.getElementById(targetModalId);
        if (!modal) return;
        
        if (this.elements.taskModalOverlay) {
            this.elements.taskModalOverlay.classList.remove('active');
        }
        modal.classList.remove('active');
        
        setTimeout(() => {
            if (this.elements.taskModalOverlay && !document.querySelector('.modal.active')) {
                this.elements.taskModalOverlay.setAttribute('hidden', '');
            }
            modal.setAttribute('hidden', '');
            this.activeModal = null;
            this.teardownModalFocusTrap();
            if (this._restoreFocusEl && typeof this._restoreFocusEl.focus === 'function') {
                this._restoreFocusEl.focus();
            }
            this._restoreFocusEl = null;
        }, 250);
    }
    
    renderPriorityTasks() {
        const container = this.elements.priorityTaskList;
        if (!container) return;

        const priorityTasks = this.tasks
            .filter(task => !task.completed)
            .sort((a, b) => {
                if (this.priorityOrder[a.priority] !== this.priorityOrder[b.priority]) {
                    return this.priorityOrder[a.priority] - this.priorityOrder[b.priority];
                }
                return new Date(a.dueDate || 0) - new Date(b.dueDate || 0);
            })
            .slice(0, 3);
        
        container.innerHTML = '';
        
        if (priorityTasks.length === 0) {
            container.innerHTML = `<div class="empty-state" style="padding: 1rem 0;"><p>No active assignments. Great job!</p></div>`;
            return;
        }
        
        priorityTasks.forEach(task => {
            const taskEl = this.createTaskElement(task);
            container.appendChild(taskEl);
        });
    }

    createTaskElement(task) {
        const el = document.createElement('div');
        el.className = 'assignment-item';
        el.setAttribute('role', 'listitem');
        el.dataset.assignmentId = task.id;

        el.innerHTML = `
            <div class="assignment-item__checkbox">
                <input type="checkbox" id="assignment-${task.id}" class="assignment-item__checkbox-input" data-assignment-checkbox ${task.completed ? 'checked' : ''}>
                <label for="assignment-${task.id}" class="assignment-item__checkbox-label" aria-label="Mark as ${task.completed ? 'incomplete' : 'complete'}"></label>
            </div>
            <div class="assignment-item__content">
                <h3 class="assignment-item__title">${task.title}</h3>
                <p class="assignment-item__meta">
                    <span class="assignment-item__subject">${task.subject || 'General'}</span>
                    ${task.dueDate ? `<span class="assignment-item__separator">•</span><span class="assignment-item__due-date">Due ${this.formatDate(task.dueDate)}</span>` : ''}
                </p>
            </div>
        `;

        const priorityBadge = this.createPriorityBadge(task);
        el.appendChild(priorityBadge);

        const checkbox = el.querySelector('[data-assignment-checkbox]');
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            this.toggleTask(task.id, e.target.checked);
        });
        
        return el;
    }
    
    formatDate(dateString) {
        if (!dateString) return '—';
        const date = new Date(dateString);
        // Add a day to correct for timezone issues with date inputs
        date.setDate(date.getDate() + 1);
        const options = { month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }
    
    formatDateTime(dateString) {
        if (!dateString) return '—';
        const date = new Date(dateString);
        const options = { 
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        };
        return date.toLocaleDateString('en-US', options);
    }
    
    getPriorityLevelFromTask(task) {
        const priority = (task.priority || 'medium').toLowerCase();
        if (['high', 'medium', 'low'].includes(priority)) return priority;
        return 'medium';
    }
    
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
    
    getPriorityWeight(task) {
        return this.priorityOrder[task.priority] ?? 1;
    }
    
    compareDueDates(a, b) {
        const dateA = a.dueDate ? new Date(a.dueDate) : null;
        const dateB = b.dueDate ? new Date(b.dueDate) : null;
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateA - dateB;
    }

    async initAnalyticsAndCharts() {
        try {
            if (window.api && window.api.getAnalytics) {
                this.analytics = await window.api.getAnalytics();
            } else {
                this.analytics = this.deriveAnalyticsFromTasks();
            }
        } catch (e) {
            this.analytics = this.deriveAnalyticsFromTasks();
        }
        this.initCharts();
    }

    deriveAnalyticsFromTasks() {
        // This is a simplified derivation for offline/demo mode
        const completed = this.tasks.filter(t => t.completed).length;
        const inProgress = this.tasks.length - completed;
        const totalScore = this.tasks.reduce((acc, t) => acc + (t.progress || 0), 0);
        const avgScore = this.tasks.length > 0 ? Math.round(totalScore / this.tasks.length) : 0;
        
        document.getElementById('kpi-completed').textContent = completed;
        document.getElementById('kpi-inprogress').textContent = inProgress;
        document.getElementById('kpi-avgscore').textContent = `${avgScore}%`;

        return {
            trend: {
                weekly: Array.from({ length: 7 }, () => 40 + Math.random() * 50),
                monthly: Array.from({ length: 30 }, () => 40 + Math.random() * 50),
                yearly: Array.from({ length: 12 }, () => 40 + Math.random() * 50),
            }
        };
    }

    initProgressChart() {
        const canvas = document.getElementById('progressGraphCanvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart if any
        if (this.charts && this.charts.progress) {
            this.charts.progress.destroy();
        }

        // Get real data from tasks
        const weekData = this.getWeeklyProgressData();
        
        // Create beautiful gradients
        const gradientFill = ctx.createLinearGradient(0, 0, 0, 350);
        gradientFill.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
        gradientFill.addColorStop(0.5, 'rgba(59, 130, 246, 0.15)');
        gradientFill.addColorStop(1, 'rgba(59, 130, 246, 0.01)');

        const gradientStroke = ctx.createLinearGradient(0, 0, 0, 350);
        gradientStroke.addColorStop(0, 'rgb(96, 165, 250)');
        gradientStroke.addColorStop(0.5, 'rgb(59, 130, 246)');
        gradientStroke.addColorStop(1, 'rgb(37, 99, 235)');

        this.charts = this.charts || {};
        this.charts.progress = new Chart(ctx, {
            type: 'line',
            data: {
                labels: weekData.labels,
                datasets: [{
                    label: 'Tasks Completed',
                    data: weekData.completed,
                    backgroundColor: gradientFill,
                    borderColor: gradientStroke,
                    borderWidth: 4,
                    fill: true,
                    tension: 0.45, // Smooth curves
                    pointRadius: 8,
                    pointHoverRadius: 12,
                    pointBackgroundColor: 'rgb(59, 130, 246)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 3,
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgb(59, 130, 246)',
                    pointHoverBorderWidth: 4,
                    pointShadowOffsetX: 0,
                    pointShadowOffsetY: 2,
                    pointShadowBlur: 8,
                    pointShadowColor: 'rgba(59, 130, 246, 0.5)',
                    // Add glow effect
                    shadowOffsetX: 0,
                    shadowOffsetY: 0,
                    shadowBlur: 10,
                    shadowColor: 'rgba(59, 130, 246, 0.5)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 10,
                        right: 10,
                        bottom: 10,
                        left: 5
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        titleColor: '#fff',
                        bodyColor: '#e2e8f0',
                        borderColor: 'rgb(59, 130, 246)',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            label: (context) => `${context.parsed.y} tasks completed`,
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(148, 163, 184, 0.1)',
                            drawBorder: false,
                        },
                        ticks: {
                            color: 'rgba(148, 163, 184, 0.8)',
                            stepSize: 1,
                            padding: 8,
                            font: {
                                size: 11
                            }
                        }
                    },
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: 'rgba(148, 163, 184, 0.8)',
                            padding: 8,
                            font: {
                                size: 11
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index',
                },
                animation: {
                    duration: 1500,
                    easing: 'easeInOutCubic',
                }
            },
            plugins: [{
                // Custom plugin for adding glow effect to points
                beforeDatasetsDraw: function(chart) {
                    const ctx = chart.ctx;
                    chart.data.datasets.forEach(function(dataset, datasetIndex) {
                        const meta = chart.getDatasetMeta(datasetIndex);
                        if (!meta.hidden) {
                            meta.data.forEach(function(element, index) {
                                ctx.save();
                                
                                // Draw glow
                                ctx.shadowColor = 'rgba(59, 130, 246, 0.6)';
                                ctx.shadowBlur = 15;
                                ctx.shadowOffsetX = 0;
                                ctx.shadowOffsetY = 0;
                                
                                // Draw point glow
                                ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
                                ctx.beginPath();
                                ctx.arc(element.x, element.y, 12, 0, 2 * Math.PI);
                                ctx.fill();
                                
                                ctx.restore();
                            });
                        }
                    });
                }
            }]
        });

        // Update summary stats
        this.updateProgressSummary(weekData);
    }

    getWeeklyProgressData() {
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
        
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const labels = [];
        const completed = [];
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            labels.push(days[i]);
            
            // Count completed tasks for this day
            const dayTasks = this.tasks.filter(task => {
                if (!task.dueDate) return false;
                const taskDate = new Date(task.dueDate);
                return taskDate.toDateString() === date.toDateString() && task.completed;
            });
            
            completed.push(dayTasks.length);
        }
        
        return { labels, completed };
    }

    updateProgressSummary(weekData) {
        const totalCompleted = weekData.completed.reduce((sum, val) => sum + val, 0);
        const totalTasks = this.tasks.length;
        const inProgress = this.tasks.filter(t => !t.completed && t.progress > 0).length;
        const avgScore = this.calculateAverageScore();
        
        // Update summary values
        const summaryItems = document.querySelectorAll('.progress-summary__item');
        if (summaryItems[0]) {
            summaryItems[0].querySelector('.progress-summary__value').textContent = totalCompleted;
        }
        if (summaryItems[1]) {
            summaryItems[1].querySelector('.progress-summary__value').textContent = inProgress;
        }
        if (summaryItems[2]) {
            summaryItems[2].querySelector('.progress-summary__value').textContent = avgScore + '%';
        }
    }

    calculateAverageScore() {
        const completedTasks = this.tasks.filter(t => t.completed);
        if (completedTasks.length === 0) return 0;
        
        const totalScore = completedTasks.reduce((sum, task) => {
            // Assume score based on priority and completion
            const priorityScore = { high: 95, medium: 85, low: 75 };
            return sum + (priorityScore[task.priority] || 80);
        }, 0);
        
        return Math.round(totalScore / completedTasks.length);
    }

    initCharts() {
        // This method is now largely redundant as initProgressChart handles the main dashboard chart
        // We can keep it for future chart initializations if needed
        // this.drawLineChart(this.currentProgressView || 'weekly'); 
    }

    animateEntrance(el, options = {}) {
        if (!el) return;
        const reduce = this.prefersReducedMotion;
        if (reduce) { el.style.opacity = ''; el.style.transform = ''; return; }
        const duration = options.duration || 320;
        const fromY = options.fromY == null ? 6 : options.fromY;
        const fromScale = options.fromScale == null ? 0.98 : options.fromScale;
        const start = performance.now();
        el.style.willChange = 'transform, opacity';
        const animate = (t) => {
            const prog = Math.min(1, (t - start) / duration);
            const ease = 1 - Math.pow(1 - prog, 3);
            const y = (1 - ease) * fromY;
            const s = fromScale + (1 - fromScale) * ease;
            el.style.opacity = String(ease);
            el.style.transform = `translateY(${y}px) scale(${s})`;
            if (prog < 1) requestAnimationFrame(animate); else {
                el.style.opacity = '';
                el.style.transform = '';
                el.style.willChange = '';
            }
        };
        requestAnimationFrame(animate);
    }

    setupProgressToggleIndicator() {
        try {
            const container = document.querySelector('.progress-view-toggle');
            if (!container) return;
            if (!container.querySelector('.progress-view-toggle__indicator')) {
                const indicator = document.createElement('div');
                indicator.className = 'progress-view-toggle__indicator';
                container.appendChild(indicator);
            }
            this.updateProgressToggleIndicator();
            window.addEventListener('resize', () => this.updateProgressToggleIndicator());
        } catch (_) {}
    }

    updateProgressToggleIndicator() {
        try {
            const container = document.querySelector('.progress-view-toggle');
            const indicator = container && container.querySelector('.progress-view-toggle__indicator');
            const active = container && container.querySelector('.progress-view-toggle__button--active');
            if (!container || !indicator || !active) return;
            const crect = container.getBoundingClientRect();
            const arect = active.getBoundingClientRect();
            const x = arect.left - crect.left + container.scrollLeft;
            indicator.style.width = `${arect.width}px`;
            indicator.style.transform = `translateX(${Math.round(x)}px)`;
        } catch (_) {}
    }

    createRipple(e, el) {
        try {
            if (!el || this.prefersReducedMotion) return;
            const rect = el.getBoundingClientRect();
            const d = Math.max(rect.width, rect.height) * 2;
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            ripple.style.width = ripple.style.height = `${d}px`;
            const left = (e.clientX - rect.left) - d / 2;
            const top = (e.clientY - rect.top) - d / 2;
            ripple.style.left = `${left}px`;
            ripple.style.top = `${top}px`;
            el.appendChild(ripple);
            ripple.addEventListener('animationend', () => ripple.remove());
        } catch (_) {}
    }

    handleProgressViewToggle(button) {
        if (!button) return;
        const view = button.getAttribute('data-view') || 'weekly';
        document.querySelectorAll('.progress-view-toggle__button').forEach(b => {
            b.classList.remove('progress-view-toggle__button--active');
            b.setAttribute('aria-pressed', 'false');
        });
        button.classList.add('progress-view-toggle__button--active');
        button.setAttribute('aria-pressed', 'true');
        this.currentProgressView = view;
        this.drawLineChart(view);
        this.updateProgressToggleIndicator();
    }

    drawLineChart(view) {
        const canvas = this.elements.progressGraphCanvas;
        if (!canvas || !this.analytics || !window.Chart) return;
        // entrance motion via rAF
        this.animateEntrance(canvas, { duration: 320, fromY: 6, fromScale: 0.98 });
        
        const dataMap = {
            weekly: { data: this.analytics.trend.weekly, labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
            monthly: { data: this.analytics.trend.monthly, labels: Array.from({ length: 30 }, (_, i) => i + 1) },
            yearly: { data: this.analytics.trend.yearly, labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] }
        };

        const { data, labels } = dataMap[view];
        const ctx = canvas.getContext('2d');

        if (this.charts.progressChart) {
            this.charts.progressChart.data.labels = labels;
            this.charts.progressChart.data.datasets[0].data = data;
            this.charts.progressChart.update();
        } else {
            this.charts.progressChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: 'Progress',
                        data,
                        borderColor: 'var(--primary-color)',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, max: 100 } }
                }
            });
        }
    }

    setDensity(density) {
        const val = (density === 'compact') ? 'compact' : 'expanded';
        this.rowDensity = val;
        try { localStorage.setItem('timetableDensity', val); } catch (_) {}
        this.updateDensityToggleUI();
        this.renderTimetable();
    }

    updateDensityToggleUI() {
        const btns = this.elements.timetableDensityButtons || [];
        if (btns && btns.forEach) {
            btns.forEach(btn => {
                const d = btn.getAttribute('data-density') || 'expanded';
                const active = d === this.rowDensity;
                btn.classList.toggle('progress-view-toggle__button--active', active);
                btn.setAttribute('aria-pressed', active ? 'true' : 'false');
            });
        }
    }

    async fetchTimetable() {
        this.timetableLoading = true;
        this.renderTimetable();
        try {
            const data = (window.api && window.api.getTimetable) ? await window.api.getTimetable() : null;
            this.timetable = this.normalizeTimetable(data);
        } catch (_) {
            this.timetable = this.normalizeTimetable(null);
        } finally {
            this.timetableLoading = false;
        }
        this.renderTimetable();
        this.buildEventsFromData();
    }

    renderTimetable() {
        const grid = this.elements.timetableGrid;
        if (!grid) return;
        grid.classList.add('timetable-grid--rows');
        const daysOrder = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
        const dayLabels = { monday:'Monday', tuesday:'Tuesday', wednesday:'Wednesday', thursday:'Thursday', friday:'Friday', saturday:'Saturday', sunday:'Sunday' };
        grid.innerHTML = '';
        if (this.elements.timetableGrid) {
            this.elements.timetableGrid.setAttribute('data-density', this.rowDensity);
        }
        const selectedDay = (this.timetableFilters && this.timetableFilters.day) ? this.timetableFilters.day : 'all';
        const daysToRender = selectedDay === 'all' ? daysOrder : [selectedDay];

        const metrics = this.computeTimelineMetrics();

        if (this.timetableLoading) {
            daysToRender.forEach((day) => {
                const row = document.createElement('section');
                row.className = 'day-row';
                row.dataset.day = day;
                row.setAttribute('role','region');
                row.setAttribute('aria-labelledby', `day-${day}-label`);
                row.innerHTML = `
                    <div class="day-row__header">
                        <span id="day-${day}-label">${dayLabels[day]}</span>
                        <button class="icon-button add-block-button" data-action="add-block" data-day="${day}" aria-label="Add block on ${dayLabels[day]}">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        </button>
                    </div>
                    <div class="day-row__timeline" data-day="${day}">
                        <div class="day-row__track" style="width:${Math.round(metrics.trackWidth)}px"></div>
                    </div>
                `;
                grid.appendChild(row);
            });
            return;
        }

        daysToRender.forEach((day) => {
            const row = document.createElement('section');
            row.className = 'day-row';
            row.dataset.day = day;
            row.setAttribute('role','region');
            row.setAttribute('aria-labelledby', `day-${day}-label`);
            row.innerHTML = `
                <div class="day-row__header">
                    <span id="day-${day}-label">${dayLabels[day]}</span>
                    <button class="icon-button add-block-button" data-action="add-block" data-day="${day}" aria-label="Add block on ${dayLabels[day]}">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </button>
                </div>
                <div class="day-row__timeline" data-day="${day}">
                    <div class="day-row__track" style="width:${Math.round(metrics.trackWidth)}px"></div>
                </div>
            `;
            const track = row.querySelector('.day-row__track');
            let blocks = (this.timetable?.days?.[day] || []).slice();
            blocks.forEach((b, idx) => blocks[idx] = this.ensureBlock(b));
            const subjectQuery = (this.timetableFilters?.subject || '').toLowerCase();
            if (subjectQuery) {
                blocks = blocks.filter(b => (b.subject || '').toLowerCase().includes(subjectQuery));
            }

            blocks.sort((a,b) => this.timeToMinutes(a.start) - this.timeToMinutes(b.start));
            if (!blocks.length) {
                const empty = document.createElement('div');
                empty.className = 'empty-state empty-state--small';
                empty.innerHTML = '<p>No blocks</p>';
                track.appendChild(empty);
            } else {
                blocks.forEach((block) => {
                    const el = this.createTimelineBlockEl(block, day, metrics);
                    track.appendChild(el);
                });
            }

            const timeline = row.querySelector('.day-row__timeline');
            timeline.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
            });
            timeline.addEventListener('drop', (e) => {
                e.preventDefault();
                if (!this.dragState) return;
                const from = this.dragState;
                const toDay = day;
                this.moveBlockToDay(from.blockId, from.day, toDay, null);
                this.clearDragState();
            });

            grid.appendChild(row);
        });
    }

    openTimetableEditor() {
        const today = new Date().getDay(); // 0 Sun ... 6 Sat
        const map = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
        const day = map[today] || 'monday';
        this.openBlockForm(day);
    }

    async handleTimetableSave(e) {
        // legacy no-op
        e && e.preventDefault && e.preventDefault();
    }

    // ------- Timetable Editor helpers -------
    normalizeTimetable(data) {
        const base = data && data.data ? data.data : data;
        const obj = base && typeof base === 'object' ? base : {};
        const days = obj.days && typeof obj.days === 'object' ? obj.days : {};
        const normDays = {};
        const keys = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
        keys.forEach(k => {
            const arr = Array.isArray(days[k]) ? days[k] : [];
            normDays[k] = arr.map(b => this.ensureBlock(b));
        });
        return { version: typeof obj.version === 'number' ? obj.version : 1, weekStart: obj.weekStart || new Date().toISOString(), days: normDays, updatedAt: obj.updatedAt || new Date().toISOString() };
    }

    ensureBlock(b) {
        const id = b && b.id ? b.id : this.generateTaskId();
        let start = b.start || b.time || '09:00';
        let end = b.end;
        if (!end && b.durationMinutes && start) {
            const s = this.timeToMinutes(start);
            end = this.minutesToTime(s + Number(b.durationMinutes));
        }
        if (!end) end = '10:00';
        return {
            id,
            start: this.normalizeTimeStr(start),
            end: this.normalizeTimeStr(end),
            subject: b.subject || 'Untitled',
            location: b.location || b.room || '',
            notes: b.notes || '',
            color: b.color || '#2563eb'
        };
    }

    normalizeTimeStr(t) {
        if (!t || typeof t !== 'string') return '09:00';
        const m = t.match(/^(\d{1,2}):(\d{2})/);
        if (!m) return '09:00';
        let hh = Math.max(0, Math.min(23, parseInt(m[1], 10)));
        let mm = Math.max(0, Math.min(59, parseInt(m[2], 10)));
        return `${hh.toString().padStart(2,'0')}:${mm.toString().padStart(2,'0')}`;
    }

    timeToMinutes(t) {
        if (!t || typeof t !== 'string') return 0;
        const [h, m] = t.split(':').map(n => parseInt(n, 10) || 0);
        return h * 60 + m;
    }

    minutesToTime(mins) {
        let m = Math.max(0, mins|0);
        let h = Math.floor(m / 60) % 24; let mm = m % 60;
        return `${h.toString().padStart(2,'0')}:${mm.toString().padStart(2,'0')}`;
    }

    formatHHMM(t) {
        if (!t) return '—';
        const [h, m] = t.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hh = (h % 12) || 12;
        return `${hh}:${m.toString().padStart(2,'0')} ${ampm}`;
    }

    computeTimelineMetrics() {
        const grid = this.elements.timetableGrid;
        const containerWidth = grid ? grid.clientWidth : 1024;
        const isDesktop = window.innerWidth >= 1024;
        // On desktop, fit to container; on smaller screens, enforce wider track for horizontal scroll
        const trackWidth = Math.max(isDesktop ? containerWidth - 32 : 1440, 720);
        const pxPerMinute = trackWidth / (24 * 60);
        this.pxPerMinute = pxPerMinute;
        this.trackWidth = trackWidth;
        if (!this.snapMinutes || typeof this.snapMinutes !== 'number') this.snapMinutes = 15;
        this.minBlockMinutes = Math.max(this.snapMinutes, 5);
        return { trackWidth, pxPerMinute };
    }

    getTodayKey() {
        const idx = new Date().getDay();
        const map = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
        return map[idx] || 'monday';
    }

    roundToSnap(mins) {
        const snap = this.snapMinutes || 15;
        return Math.round(mins / snap) * snap;
    }

    createTimelineBlockEl(block, day, metrics) {
        const el = document.createElement('div');
        el.className = 'time-block';
        el.setAttribute('tabindex', '0');
        el.dataset.blockId = block.id;
        el.dataset.day = day;

        const color = block.color || '#2563eb';
        const startM = this.timeToMinutes(block.start);
        const endM = this.timeToMinutes(block.end);
        const left = Math.max(0, Math.round(startM * metrics.pxPerMinute));
        const width = Math.max(10, Math.round((endM - startM) * metrics.pxPerMinute));
        el.style.left = `${left}px`;
        el.style.width = `${width}px`;

        const step = (this.snapMinutes || 15) * 60;
        el.innerHTML = `
            <div class="time-block__resize time-block__resize--start" aria-label="Adjust start" role="separator"></div>
            <div class="time-block__color" style="background:${color}"></div>
            <div class="time-block__content">
                <div class="time-block__title" data-inline="subject">${this.escapeHtml(block.subject || 'Untitled')}</div>
                <div class="time-block__meta">
                    <label class="sr-only" for="start-${block.id}">Start time</label>
                    <input id="start-${block.id}" class="time-input time-input--start" type="time" step="${step}" value="${block.start}" aria-label="Start time" />
                    <span aria-hidden="true">–</span>
                    <label class="sr-only" for="end-${block.id}">End time</label>
                    <input id="end-${block.id}" class="time-input time-input--end" type="time" step="${step}" value="${block.end}" aria-label="End time" />
                    ${block.location ? `<span aria-hidden="true">•</span><span class="time-block__location">${this.escapeHtml(block.location)}</span>` : ''}
                </div>
            </div>
            <div class="time-block__actions">
                <button class="icon-button" title="Duplicate" aria-label="Duplicate block" data-action="duplicate-block" data-day="${day}" data-block-id="${block.id}">⧉</button>
                <button class="icon-button" title="Edit" aria-label="Edit block" data-action="edit-block" data-day="${day}" data-block-id="${block.id}">✎</button>
                <button class="icon-button" title="Delete" aria-label="Delete block" data-action="delete-block" data-day="${day}" data-block-id="${block.id}">🗑</button>
            </div>
            <div class="time-block__resize time-block__resize--end" aria-label="Adjust end" role="separator"></div>
        `;

        // Inline subject editing
        const titleEl = el.querySelector('.time-block__title');
        titleEl.addEventListener('dblclick', () => this.startInlineEditTitle(titleEl, day, block.id));

        // Time inputs
        const startInput = el.querySelector('.time-input--start');
        const endInput = el.querySelector('.time-input--end');
        const onChange = () => {
            const newStart = this.normalizeTimeStr(startInput.value);
            const newEnd = this.normalizeTimeStr(endInput.value);
            if (this.timeToMinutes(newEnd) <= this.timeToMinutes(newStart)) {
                this.showToast('End must be after start', 'error');
                startInput.value = block.start; endInput.value = block.end;
                return;
            }
            const apply = (tt) => {
                const arr = tt.days[day] || (tt.days[day] = []);
                const i = arr.findIndex(b => b.id === block.id);
                if (i >= 0) { arr[i].start = newStart; arr[i].end = newEnd; }
            };
            this.saveTimetableOptimistic(apply, 'Updated');
        };
        startInput.addEventListener('change', onChange);
        endInput.addEventListener('change', onChange);

        // Drag to move and resize
        const startHandle = el.querySelector('.time-block__resize--start');
        const endHandle = el.querySelector('.time-block__resize--end');
        startHandle.addEventListener('mousedown', (e) => this.startBlockResize(e, day, block, el, metrics, 'start'));
        endHandle.addEventListener('mousedown', (e) => this.startBlockResize(e, day, block, el, metrics, 'end'));
        el.addEventListener('mousedown', (e) => {
            const t = e.target;
            if (t.closest('.time-block__resize') || t.closest('.time-input') || t.closest('.time-block__actions')) return;
            this.startBlockMoveDrag(e, day, block, el, metrics);
        });

        return el;
    }

    startBlockMoveDrag(e, day, block, el, metrics) {
        if (e.button !== 0) return;
        e.preventDefault();
        const s = this.timeToMinutes(block.start);
        const eMin = this.timeToMinutes(block.end);
        const op = {
            type: 'move', day, blockId: block.id, el,
            originStart: s, originEnd: eMin,
            startClientX: e.clientX, startClientY: e.clientY,
            pxPerMinute: metrics.pxPerMinute, trackWidth: metrics.trackWidth,
            hoverDay: day
        };
        this._activeDrag = op;
        this._onPointerMoveBound = (ev) => this.onTimelinePointerMove(ev);
        this._onPointerUpBound = (ev) => this.onTimelinePointerUp(ev);
        document.addEventListener('mousemove', this._onPointerMoveBound);
        document.addEventListener('mouseup', this._onPointerUpBound);
        document.body.style.userSelect = 'none';
    }

    startBlockResize(e, day, block, el, metrics, edge) {
        if (e.button !== 0) return;
        e.preventDefault();
        const s = this.timeToMinutes(block.start);
        const eMin = this.timeToMinutes(block.end);
        const op = {
            type: edge === 'start' ? 'resize-start' : 'resize-end', day, blockId: block.id, el,
            originStart: s, originEnd: eMin,
            startClientX: e.clientX, startClientY: e.clientY,
            pxPerMinute: metrics.pxPerMinute, trackWidth: metrics.trackWidth,
            hoverDay: day
        };
        this._activeDrag = op;
        this._onPointerMoveBound = (ev) => this.onTimelinePointerMove(ev);
        this._onPointerUpBound = (ev) => this.onTimelinePointerUp(ev);
        document.addEventListener('mousemove', this._onPointerMoveBound);
        document.addEventListener('mouseup', this._onPointerUpBound);
        document.body.style.userSelect = 'none';
    }

    onTimelinePointerMove(ev) {
        const op = this._activeDrag;
        if (!op) return;
        const clientX = ev.clientX != null ? ev.clientX : (ev.touches && ev.touches[0] ? ev.touches[0].clientX : 0);
        const dx = clientX - op.startClientX;
        const deltaMins = this.roundToSnap(dx / (op.pxPerMinute || 1));
        let newStart = op.originStart;
        let newEnd = op.originEnd;
        if (op.type === 'move') {
            newStart = Math.max(0, Math.min(24*60 - this.minBlockMinutes, op.originStart + deltaMins));
            newEnd = Math.max(newStart + this.minBlockMinutes, op.originEnd + deltaMins);
        } else if (op.type === 'resize-start') {
            newStart = Math.max(0, Math.min(op.originEnd - this.minBlockMinutes, op.originStart + deltaMins));
        } else if (op.type === 'resize-end') {
            newEnd = Math.max(op.originStart + this.minBlockMinutes, Math.min(24*60, op.originEnd + deltaMins));
        }
        // Update visual
        const left = Math.round(newStart * (op.pxPerMinute || 1));
        const width = Math.max(10, Math.round((newEnd - newStart) * (op.pxPerMinute || 1)));
        op.el.style.left = `${left}px`;
        op.el.style.width = `${width}px`;

        // Track hovered day
        const target = document.elementFromPoint(ev.clientX, ev.clientY);
        const tl = target && target.closest ? target.closest('.day-row__timeline') : null;
        if (tl && tl.dataset.day) {
            op.hoverDay = tl.dataset.day;
        }
        op.previewStart = newStart; op.previewEnd = newEnd;
    }

    onTimelinePointerUp(_ev) {
        const op = this._activeDrag;
        this._activeDrag = null;
        document.removeEventListener('mousemove', this._onPointerMoveBound);
        document.removeEventListener('mouseup', this._onPointerUpBound);
        document.body.style.userSelect = '';
        if (!op) return;
        const toDay = op.hoverDay || op.day;
        const apply = (tt) => {
            const fromArr = tt.days[op.day] || (tt.days[op.day] = []);
            const idx = fromArr.findIndex(b => b.id === op.blockId);
            if (idx === -1) return;
            const blk = fromArr[idx];
            const start = this.minutesToTime(Math.round(op.previewStart || op.originStart));
            const end = this.minutesToTime(Math.round(op.previewEnd || op.originEnd));
            if (toDay === op.day) {
                fromArr[idx] = { ...blk, start, end };
            } else {
                fromArr.splice(idx, 1);
                const dest = tt.days[toDay] || (tt.days[toDay] = []);
                dest.push({ ...blk, start, end });
            }
        };
        this.saveTimetableOptimistic(apply, 'Updated');
    }

    nudgeBlockTime(day, blockId, deltaMins) {
        const apply = (tt) => {
            const arr = tt.days[day] || (tt.days[day] = []);
            const i = arr.findIndex(b => b.id === blockId);
            if (i === -1) return;
            const s = this.timeToMinutes(arr[i].start);
            const e = this.timeToMinutes(arr[i].end);
            let ns = Math.max(0, Math.min(24*60 - this.minBlockMinutes, s + deltaMins));
            let ne = Math.max(ns + this.minBlockMinutes, e + deltaMins);
            arr[i].start = this.minutesToTime(ns);
            arr[i].end = this.minutesToTime(ne);
        };
        this.saveTimetableOptimistic(apply, 'Updated');
    }

    resizeBlock(day, blockId, deltaEndMins) {
        const apply = (tt) => {
            const arr = tt.days[day] || (tt.days[day] = []);
            const i = arr.findIndex(b => b.id === blockId);
            if (i === -1) return;
            const s = this.timeToMinutes(arr[i].start);
            const e = this.timeToMinutes(arr[i].end);
            let ne = Math.max(s + this.minBlockMinutes, Math.min(24*60, e + deltaEndMins));
            arr[i].end = this.minutesToTime(ne);
        };
        this.saveTimetableOptimistic(apply, 'Updated');
    }

    createTimeBlockEl(block, day, index) {
        const el = document.createElement('div');
        el.className = 'time-block';
        el.setAttribute('role','listitem');
        el.setAttribute('tabindex','0');
        el.setAttribute('draggable','true');
        el.dataset.blockId = block.id;
        el.dataset.day = day;

        const color = block.color || '#2563eb';
        el.innerHTML = `
            <div class="time-block__color" style="background:${color}"></div>
            <div class="time-block__content">
                <div class="time-block__title" data-inline="subject">${this.escapeHtml(block.subject || 'Untitled')}</div>
                <div class="time-block__meta"><span class="time-block__time">${this.formatHHMM(block.start)}–${this.formatHHMM(block.end)}</span>${block.location ? `<span aria-hidden="true">•</span><span class="time-block__location">${this.escapeHtml(block.location)}</span>` : ''}</div>
            </div>
            <div class="time-block__actions">
                <button class="icon-button" title="Move earlier" aria-label="Move earlier" data-action="move-up" data-day="${day}" data-block-id="${block.id}">▲</button>
                <button class="icon-button" title="Move later" aria-label="Move later" data-action="move-down" data-day="${day}" data-block-id="${block.id}">▼</button>
                <button class="icon-button" title="Move to previous day" aria-label="Move to previous day" data-action="move-left" data-day="${day}" data-block-id="${block.id}">◀</button>
                <button class="icon-button" title="Move to next day" aria-label="Move to next day" data-action="move-right" data-day="${day}" data-block-id="${block.id}">▶</button>
                <button class="icon-button" title="Duplicate" aria-label="Duplicate block" data-action="duplicate-block" data-day="${day}" data-block-id="${block.id}">⧉</button>
                <button class="icon-button" title="Edit" aria-label="Edit block" data-action="edit-block" data-day="${day}" data-block-id="${block.id}">✎</button>
                <button class="icon-button" title="Delete" aria-label="Delete block" data-action="delete-block" data-day="${day}" data-block-id="${block.id}">🗑</button>
            </div>
        `;

        // DnD
        el.addEventListener('dragstart', (e) => this.onBlockDragStart(e, day, block.id));
        el.addEventListener('dragend', (e) => this.onBlockDragEnd(e));
        el.addEventListener('dragover', (e) => this.onBlockDragOver(e, el));
        el.addEventListener('dragleave', (e) => this.onBlockDragLeave(e, el));
        el.addEventListener('drop', (e) => this.onBlockDrop(e, day, el));

        // Inline edit subject
        const titleEl = el.querySelector('.time-block__title');
        titleEl.addEventListener('dblclick', () => this.startInlineEditTitle(titleEl, day, block.id));

        return el;
    }

    handleTimetableClick(e) {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const action = btn.getAttribute('data-action');
        const day = btn.getAttribute('data-day');
        const blockId = btn.getAttribute('data-block-id');
        if (action === 'add-block') {
            this.openBlockForm(day);
        } else if (action === 'edit-block' && day && blockId) {
            this.openBlockForm(day, blockId);
        } else if (action === 'delete-block' && day && blockId) {
            this.pendingDelete = { day, blockId };
            this.openModal('timetable-delete-modal');
        } else if (action === 'duplicate-block' && day && blockId) {
            this.duplicateBlock(day, blockId);
        } else if (action && action.startsWith('move') && day && blockId) {
            if (action === 'move-up') this.moveBlockRelative(day, blockId, -1);
            if (action === 'move-down') this.moveBlockRelative(day, blockId, +1);
            if (action === 'move-left') this.moveBlockToAdjacentDay(day, blockId, -1);
            if (action === 'move-right') this.moveBlockToAdjacentDay(day, blockId, +1);
        }
    }

    handleTimetableKeydown(e) {
        const blockEl = e.target.closest('.time-block');
        if (!blockEl) return;
        const day = blockEl.dataset.day; const blockId = blockEl.dataset.blockId;
        if (!day || !blockId) return;
        const snap = this.snapMinutes || 15;

        // Alt + Left/Right move by snap minutes; Alt + Up/Down move between days
        if (e.altKey) {
            if (e.key === 'ArrowLeft') { e.preventDefault(); this.nudgeBlockTime(day, blockId, -snap); return; }
            if (e.key === 'ArrowRight') { e.preventDefault(); this.nudgeBlockTime(day, blockId, +snap); return; }
            if (e.key === 'ArrowUp') { e.preventDefault(); this.moveBlockToAdjacentDay(day, blockId, -1); return; }
            if (e.key === 'ArrowDown') { e.preventDefault(); this.moveBlockToAdjacentDay(day, blockId, +1); return; }
        }
        // Shift + Left/Right to resize duration at end
        if (e.shiftKey) {
            if (e.key === 'ArrowLeft') { e.preventDefault(); this.resizeBlock(day, blockId, -snap); return; }
            if (e.key === 'ArrowRight') { e.preventDefault(); this.resizeBlock(day, blockId, +snap); return; }
        }

        // Enter to edit
        if (e.key === 'Enter') { e.preventDefault(); this.openBlockForm(day, blockId); return; }
        // Delete to delete
        if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); this.pendingDelete = { day, blockId }; this.openModal('timetable-delete-modal'); return; }
        // Ctrl/Cmd + D to duplicate
        if ((e.ctrlKey || e.metaKey) && (String(e.key).toLowerCase() === 'd')) { e.preventDefault(); this.duplicateBlock(day, blockId); return; }
    }

    startInlineEditTitle(titleEl, day, blockId) {
        if (!titleEl || titleEl.isContentEditable) return;
        titleEl.setAttribute('contenteditable','true');
        titleEl.focus();
        const done = () => {
            titleEl.removeAttribute('contenteditable');
            const newTitle = titleEl.textContent.trim() || 'Untitled';
            this.saveTimetableOptimistic((tt) => {
                const arr = tt.days[day] || []; const i = arr.findIndex(b => b.id === blockId); if (i >= 0) arr[i].subject = newTitle;
            }, 'Updated');
        };
        const onKey = (e) => { if (e.key === 'Enter') { e.preventDefault(); titleEl.blur(); } };
        titleEl.addEventListener('blur', done, { once: true });
        titleEl.addEventListener('keydown', onKey, { once: true });
    }

    openBlockForm(day, blockId = null) {
        if (!this.elements.blockModal || !this.elements.blockForm) return;
        const isEdit = !!blockId;
        const block = isEdit ? (this.timetable.days[day] || []).find(b => b.id === blockId) : null;
        if (this.elements.blockFormId) this.elements.blockFormId.value = block ? block.id : '';
        if (this.elements.blockFormDay) this.elements.blockFormDay.value = day;
        if (this.elements.blockFormStart) this.elements.blockFormStart.value = block ? block.start : '09:00';
        if (this.elements.blockFormEnd) this.elements.blockFormEnd.value = block ? block.end : '10:00';
        if (this.elements.blockFormSubject) this.elements.blockFormSubject.value = block ? block.subject : '';
        if (this.elements.blockFormLocation) this.elements.blockFormLocation.value = block ? block.location || '' : '';
        if (this.elements.blockFormNotes) this.elements.blockFormNotes.value = block ? block.notes || '' : '';
        if (this.elements.blockFormColor) this.elements.blockFormColor.value = block ? block.color || '#2563eb' : '#2563eb';
        const titleEl = document.getElementById('timetable-block-title');
        if (titleEl) titleEl.textContent = isEdit ? 'Edit Time Block' : 'Add Time Block';
        this.openModal('timetable-block-modal');
    }

    handleTimetableBlockSave(e) {
        e.preventDefault();
        const day = this.elements.blockFormDay?.value || 'monday';
        const id = this.elements.blockFormId?.value || '';
        const start = this.normalizeTimeStr(this.elements.blockFormStart?.value || '');
        const end = this.normalizeTimeStr(this.elements.blockFormEnd?.value || '');
        const subject = (this.elements.blockFormSubject?.value || '').trim();
        const location = (this.elements.blockFormLocation?.value || '').trim();
        const notes = (this.elements.blockFormNotes?.value || '').trim();
        const color = this.elements.blockFormColor?.value || '#2563eb';

        if (!subject) { this.showToast('Subject is required', 'error'); return; }
        if (this.timeToMinutes(end) <= this.timeToMinutes(start)) { this.showToast('End must be after start', 'error'); return; }

        const apply = (tt) => {
            const arr = tt.days[day] || (tt.days[day] = []);
            if (id) {
                const i = arr.findIndex(b => b.id === id);
                if (i >= 0) {
                    arr[i] = { ...arr[i], start, end, subject, location, notes, color };
                }
            } else {
                const newId = this.generateTaskId();
                arr.push({ id: newId, start, end, subject, location, notes, color });
            }
        };

        this.saveTimetableOptimistic(apply, 'Saved');
        this.closeModal('timetable-block-modal');
    }

    confirmDeleteBlockAction() {
        if (!this.pendingDelete) return;
        const { day, blockId } = this.pendingDelete;
        const apply = (tt) => {
            const arr = tt.days[day] || [];
            const idx = arr.findIndex(b => b.id === blockId);
            if (idx >= 0) arr.splice(idx, 1);
        };
        this.saveTimetableOptimistic(apply, 'Deleted');
        this.closeModal('timetable-delete-modal');
        this.pendingDelete = null;
    }

    duplicateBlock(day, blockId) {
        const apply = (tt) => {
            const arr = tt.days[day] || (tt.days[day] = []);
            const i = arr.findIndex(b => b.id === blockId);
            if (i === -1) return;
            const src = arr[i];
            const clone = { ...src, id: this.generateTaskId(), subject: (src.subject || 'Untitled') + ' (Copy)' };
            arr.splice(i + 1, 0, clone);
        };
        this.saveTimetableOptimistic(apply, 'Duplicated');
    }

    moveBlockRelative(day, blockId, delta) {
        const apply = (tt) => {
            const arr = tt.days[day] || [];
            const i = arr.findIndex(b => b.id === blockId);
            if (i === -1) return;
            const j = Math.max(0, Math.min(arr.length - 1, i + delta));
            if (i === j) return;
            const [blk] = arr.splice(i, 1);
            arr.splice(j, 0, blk);
        };
        this.saveTimetableOptimistic(apply, 'Reordered');
    }

    moveBlockToAdjacentDay(day, blockId, dir) {
        const order = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
        const idx = order.indexOf(day);
        const toIdx = Math.max(0, Math.min(order.length - 1, idx + dir));
        const toDay = order[toIdx];
        this.moveBlockToDay(blockId, day, toDay, null);
    }

    moveBlockToDay(blockId, fromDay, toDay, toIndex = null) {
        if (fromDay === toDay && toIndex == null) {
            // dropping within same day to end
            toIndex = (this.timetable.days[toDay] || []).length - 1;
        }
        const apply = (tt) => {
            const fromArr = tt.days[fromDay] || [];
            const i = fromArr.findIndex(b => b.id === blockId);
            if (i === -1) return;
            const [blk] = fromArr.splice(i, 1);
            const dest = tt.days[toDay] || (tt.days[toDay] = []);
            if (toIndex == null || toIndex < 0 || toIndex > dest.length) dest.push(blk); else dest.splice(toIndex, 0, blk);
        };
        this.saveTimetableOptimistic(apply, 'Moved');
    }

    onBlockDragStart(e, day, blockId) {
        this.dragState = { day, blockId };
        const target = e.currentTarget;
        target.classList.add('dragging');
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', blockId);
        }
    }
    onBlockDragEnd(e) {
        const target = e.currentTarget;
        target.classList.remove('dragging');
        this.clearDragState();
    }
    onBlockDragOver(e, el) {
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        const before = e.clientY < rect.top + rect.height / 2;
        el.classList.toggle('drop-target-before', before);
        el.classList.toggle('drop-target-after', !before);
    }
    onBlockDragLeave(_e, el) {
        el.classList.remove('drop-target-before');
        el.classList.remove('drop-target-after');
    }
    onBlockDrop(e, day, el) {
        e.preventDefault();
        if (!this.dragState) return;
        const before = el.classList.contains('drop-target-before');
        const id = this.dragState.blockId; const fromDay = this.dragState.day;
        const arr = this.timetable.days[day] || [];
        const targetId = el.dataset.blockId;
        const idx = arr.findIndex(b => b.id === targetId);
        const toIndex = Math.max(0, before ? idx : idx + 1);
        this.moveBlockToDay(id, fromDay, day, toIndex);
        this.clearDragState();
        el.classList.remove('drop-target-before');
        el.classList.remove('drop-target-after');
    }
    clearDragState() { this.dragState = null; }

    escapeHtml(s) {
        return (s || '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;' }[c]));
    }

    async saveTimetableOptimistic(applyChange, successMessage = 'Saved') {
        if (!this.timetable) this.timetable = this.normalizeTimetable(null);
        const snapshot = JSON.parse(JSON.stringify(this.timetable));
        try {
            applyChange(this.timetable);
        } catch (_) {}
        this.renderTimetable();
        try {
            const payload = { ...this.timetable };
            const saved = await window.api.saveTimetable(payload);
            this.timetable = this.normalizeTimetable(saved);
            this.showToast(successMessage, 'success');
            if (this._suppressNextUndoToast) {
                this._suppressNextUndoToast = false;
            } else {
                this.showUndoToast('Undo?', snapshot);
            }
        } catch (err) {
            const msg = String(err || '');
            if (msg.includes('HTTP 409')) {
                try {
                    this.showToast('Detected a newer version. Syncing…', 'warning');
                    const latest = await window.api.getTimetable();
                    this.timetable = this.normalizeTimetable(latest);
                    try { applyChange(this.timetable); } catch (_) {}
                    const saved2 = await window.api.saveTimetable(this.timetable);
                    this.timetable = this.normalizeTimetable(saved2);
                    this.showToast(successMessage, 'success');
                    if (this._suppressNextUndoToast) {
                        this._suppressNextUndoToast = false;
                    } else {
                        this.showUndoToast('Undo?', snapshot);
                    }
                } catch (err2) {
                    this.timetable = snapshot;
                    this.renderTimetable();
                    this.showToast('Save failed', 'error');
                }
            } else {
                this.timetable = snapshot;
                this.renderTimetable();
                this.showToast('Save failed', 'error');
            }
        }
    }

    showToast(message, type = 'success') {
        const container = this.elements.toastContainer;
        if (!container) { console.log(`[${type}]`, message); return; }
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.setAttribute('role', 'status');
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => { toast.remove(); }, 3000);
    }

    showUndoToast(message, snapshot) {
        const container = this.elements.toastContainer;
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = 'toast toast--success';
        toast.setAttribute('role', 'status');
        const btnId = 'undo-' + Math.random().toString(36).slice(2);
        toast.innerHTML = `<span>${message}</span> <button id="${btnId}" class="link-button" aria-label="Undo last change">Undo</button>`;
        container.appendChild(toast);
        const btn = document.getElementById(btnId);
        const remove = () => { if (toast && toast.parentNode) toast.parentNode.removeChild(toast); };
        const undo = () => {
            this._suppressNextUndoToast = true;
            this.saveTimetableOptimistic((tt) => {
                tt.days = JSON.parse(JSON.stringify(snapshot.days));
                tt.weekStart = snapshot.weekStart;
            }, 'Undone');
            remove();
        };
        if (btn) btn.addEventListener('click', undo);
        setTimeout(remove, 5000);
    }

    setupCalendar() {
        this.calendarState = { currentDate: new Date(), selectedDate: new Date(), eventsByDate: {} };
        this.generateCalendarDays();
        this.updateCalendarEventsList();
    }

    handleCalendarNavClick(dir) {
        const date = this.calendarState.currentDate || new Date();
        const month = date.getMonth();
        this.calendarState.currentDate = new Date(date.getFullYear(), month + (dir === 'next' ? 1 : -1), 1);
        this.generateCalendarDays();
    }

    selectCalendarDate(date) {
        this.calendarState.selectedDate = date;
        this.generateCalendarDays();
        this.updateCalendarEventsList();
    }

    generateCalendarDays() {
        const container = this.elements.calendarDaysContainer;
        if (!container) return;
        const current = this.calendarState.currentDate || new Date();
        const year = current.getFullYear(); const month = current.getMonth();
        const firstDay = new Date(year, month, 1); const startDay = firstDay.getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const selected = this.calendarState.selectedDate || new Date();
        const labelEl = this.elements.calendarMonthLabel;
        if (labelEl) labelEl.textContent = current.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        container.innerHTML = '';
        const monthName = current.toLocaleDateString('en-US', { month: 'long' });
        
        for (let i = 0; i < startDay; i++) {
            container.insertAdjacentHTML('beforeend', '<div class="calendar__day calendar__day--empty"></div>');
        }
        for (let d = 1; d <= daysInMonth; d++) {
            const dateObj = new Date(year, month, d);
            const key = dateObj.toISOString().slice(0, 10);
            const events = this.calendarState.eventsByDate?.[key] || [];
            
            const cell = document.createElement('button');
            cell.className = 'calendar__day';
            cell.textContent = d;
            const isSelected = dateObj.toDateString() === selected.toDateString();
            if (isSelected) cell.classList.add('calendar__day--selected');
            cell.setAttribute('aria-selected', isSelected ? 'true' : 'false');
            const eventSuffix = events.length ? `, ${events.length} event${events.length > 1 ? 's' : ''}` : '';
            cell.setAttribute('aria-label', `${monthName} ${d}, ${year}${eventSuffix}`);
            if (events.length) cell.classList.add('calendar__day--has-events');

            cell.addEventListener('click', (e) => { 
                this.createRipple(e, cell); 
                this.selectCalendarDate(dateObj); 
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                this.handleCalendarDayClick(dateStr);
            });
            container.appendChild(cell);
        }
    }

    handleCalendarDayClick(dateStr) {
        const date = new Date(dateStr);
        const modal = this.elements.dayDetailModal;
        const dateDisplay = this.elements.dayDetailDate;
        const modalBody = modal.querySelector('.modal-body');
        
        if (!modal || !dateDisplay) return;
        
        // Format date nicely
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateDisplay.textContent = date.toLocaleDateString('en-US', options);
        
        // Get tasks and events for this day
        const dayTasks = this.tasks.filter(task => {
            if (!task.dueDate) return false;
            const taskDate = new Date(task.dueDate);
            return taskDate.toDateString() === date.toDateString();
        });
        
        const dayEvents = this.calendarState.eventsByDate[dateStr] || [];
        
        // Build summary HTML
        let summaryHTML = `
            <div class="day-summary">
                <div class="day-summary__stats">
                    <div class="day-stat">
                        <div class="day-stat__value">${dayTasks.length}</div>
                        <div class="day-stat__label">Tasks</div>
                    </div>
                    <div class="day-stat">
                        <div class="day-stat__value">${dayTasks.filter(t => t.completed).length}</div>
                        <div class="day-stat__label">Completed</div>
                    </div>
                    <div class="day-stat">
                        <div class="day-stat__value">${dayEvents.length}</div>
                        <div class="day-stat__label">Events</div>
                    </div>
                </div>
        `;
        
        if (dayTasks.length > 0) {
            summaryHTML += `
                <div class="day-summary__section">
                    <h4>Tasks for this day:</h4>
                    <ul class="day-tasks-list">
                        ${dayTasks.map(task => `
                            <li class="day-task-item">
                                <input type="checkbox" ${task.completed ? 'checked' : ''} disabled />
                                <span class="${task.completed ? 'completed' : ''}">${task.title}</span>
                                <span class="task-priority priority-${task.priority}">${task.priority}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }
        
        if (dayEvents.length > 0) {
            summaryHTML += `
                <div class="day-summary__section">
                    <h4>Events:</h4>
                    <ul class="day-events-list">
                        ${dayEvents.map(event => `
                            <li class="day-event-item">
                                <span class="event-time">${event.time || 'All day'}</span>
                                <span class="event-title">${event.title}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }
        
        if (dayTasks.length === 0 && dayEvents.length === 0) {
            summaryHTML += `
                <div class="day-summary__empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <p>No tasks or events scheduled for this day</p>
                </div>
            `;
        }
        
        summaryHTML += '</div>';
        
        // Replace modal body content
        const existingSummary = modalBody.querySelector('.day-summary');
        if (existingSummary) {
            existingSummary.remove();
        }
        modalBody.insertAdjacentHTML('afterbegin', summaryHTML);
        
        // Show modal
        this.openModal('day-detail-modal');
    }

    openDayModal(dateObj) {
        // This function is now replaced by handleCalendarDayClick
        // It's kept as a stub or can be removed if no other calls exist
        console.warn('openDayModal is deprecated, use handleCalendarDayClick instead.');
    }

    buildEventsFromData() {
        const byDate = {};
        this.tasks.forEach(t => {
            if (t.dueDate) {
                const key = new Date(t.dueDate).toISOString().slice(0, 10);
                byDate[key] = byDate[key] || [];
                byDate[key].push({ type: 'task', title: t.title, date: new Date(t.dueDate) });
            }
        });
        this.calendarState.eventsByDate = byDate;
    }

    updateCalendarEventsList() {
        const list = this.elements.calendarEventsList;
        if (!list) return;
        list.innerHTML = '';
        const sel = this.calendarState.selectedDate || new Date();
        const key = sel.toISOString().slice(0, 10);
        const evts = this.calendarState.eventsByDate?.[key] || [];
        if (!evts.length) {
            list.innerHTML = `<div class="calendar-event"><div class="calendar-event__content"><span class="calendar-event__title">No events for this day</span></div></div>`;
            return;
        }
        evts.forEach((e) => {
            list.insertAdjacentHTML('beforeend', `
                <div class="calendar-event" role="listitem">
                    <div class="calendar-event__marker" style="background-color:var(--primary-color);"></div>
                    <div class="calendar-event__content">
                        <span class="calendar-event__title">${e.title}</span>
                        <span class="calendar-event__date">${this.formatDate(sel)}</span>
                    </div>
                </div>
            `);
        });
    }
}

const style = document.createElement('style');
style.textContent = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }`;
document.head.appendChild(style);

document.addEventListener('DOMContentLoaded', () => {
    try { document.documentElement.classList.add('js-animate'); requestAnimationFrame(() => { document.documentElement.classList.add('page-ready'); }); } catch (_) {}
    window.smartMentor = new SmartMentorChatbot();
});
