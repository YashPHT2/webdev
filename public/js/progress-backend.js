/**
 * Smart Mentor Progress Tracker - Backend Integrated
 * Visualizes academic progress with Chart.js
 */

class ProgressTracker {
  constructor() {
    this.currentView = 'weekly';
    this.tasks = [];
    this.analytics = null;
    this.charts = {};
    
    console.log('📊 Progress Tracker initializing...');
    this.init();
  }

  async init() {
    this.cacheElements();
    
    if (!this.elements.canvas) {
      console.error('❌ Progress canvas not found!');
      return;
    }

    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
      console.error('❌ Chart.js not loaded! Add: <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>');
      this.showError('Chart.js library not found');
      return;
    }

    this.attachEventListeners();
    await this.loadData();
    this.render();
    
    console.log('✅ Progress Tracker initialized');
  }

  cacheElements() {
    this.elements = {
      canvas: document.getElementById('progressGraphCanvas'),
      viewButtons: document.querySelectorAll('.progress-view-toggle__button'),
      summaryItems: document.querySelectorAll('.progress-summary__value'),
      
      // Summary specific elements
      completedValue: document.querySelector('.progress-summary__item:nth-child(1) .progress-summary__value'),
      inProgressValue: document.querySelector('.progress-summary__item:nth-child(2) .progress-summary__value'),
      avgScoreValue: document.querySelector('.progress-summary__item:nth-child(3) .progress-summary__value'),
    };
  }

  attachEventListeners() {
    this.elements.viewButtons?.forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        this.switchView(view);
      });
    });

    // Refresh on window resize
    window.addEventListener('resize', () => {
      if (this.charts.progress) {
        this.charts.progress.resize();
      }
    });
  }

  async loadData() {
    this.showLoading();

    try {
      // Fetch tasks and analytics in parallel
      const [tasks, analytics] = await Promise.all([
        this.fetchTasks(),
        this.fetchAnalytics()
      ]);

      this.tasks = tasks;
      this.analytics = analytics;
      
      console.log('📊 Loaded data:', {
        tasks: this.tasks.length,
        analytics: !!this.analytics
      });

    } catch (error) {
      console.error('❌ Failed to load progress data:', error);
      this.showError('Failed to load progress data');
    } finally {
      this.hideLoading();
    }
  }

  async fetchTasks() {
    try {
      const response = await fetch('/api/tasks');
      if (!response.ok) throw new Error('Failed to fetch tasks');
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.warn('⚠️ Could not fetch tasks:', error);
      return [];
    }
  }

  async fetchAnalytics() {
    try {
      const response = await fetch('/api/analytics');
      if (!response.ok) {
        // Generate analytics from tasks if endpoint doesn't exist
        return this.generateAnalyticsFromTasks();
      }
      return await response.json();
    } catch (error) {
      console.warn('⚠️ Could not fetch analytics, generating from tasks:', error);
      return this.generateAnalyticsFromTasks();
    }
  }

  generateAnalyticsFromTasks() {
    // Generate analytics data from tasks
    const now = new Date();
    const analytics = {
      trend: {
        weekly: [],
        monthly: [],
        yearly: []
      },
      completion: {
        total: this.tasks.length,
        completed: this.tasks.filter(t => t.status === 'completed' || t.progress === 100).length,
        inProgress: this.tasks.filter(t => t.status === 'in_progress' || (t.progress > 0 && t.progress < 100)).length,
        pending: this.tasks.filter(t => t.status === 'pending' || t.progress === 0).length
      },
      averageScore: this.calculateAverageScore(),
      subjectBreakdown: this.getSubjectBreakdown()
    };

    // Generate weekly trend (last 7 days)
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const completed = this.getTasksCompletedOnDate(date);
      analytics.trend.weekly.push(completed);
    }

    // Generate monthly trend (last 30 days)
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const completed = this.getTasksCompletedOnDate(date);
      analytics.trend.monthly.push(completed);
    }

    // Generate yearly trend (last 12 months)
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      const completed = this.getTasksCompletedInMonth(date);
      analytics.trend.yearly.push(completed);
    }

    return analytics;
  }

  getTasksCompletedOnDate(date) {
    // Count tasks completed on specific date
    const dateStr = date.toISOString().split('T')[0];
    return this.tasks.filter(t => {
      const updatedDate = t.updatedAt ? new Date(t.updatedAt).toISOString().split('T')[0] : null;
      return updatedDate === dateStr && (t.status === 'completed' || t.progress === 100);
    }).length;
  }

  getTasksCompletedInMonth(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    return this.tasks.filter(t => {
      if (!t.updatedAt || t.status !== 'completed') return false;
      const updated = new Date(t.updatedAt);
      return updated.getFullYear() === year && updated.getMonth() === month;
    }).length;
  }

  calculateAverageScore() {
    if (this.tasks.length === 0) return 0;
    
    const totalProgress = this.tasks.reduce((sum, task) => {
      return sum + (task.progress || 0);
    }, 0);
    
    return Math.round(totalProgress / this.tasks.length);
  }

  getSubjectBreakdown() {
    const breakdown = {};
    
    this.tasks.forEach(task => {
      const subject = task.subject || 'Uncategorized';
      if (!breakdown[subject]) {
        breakdown[subject] = {
          total: 0,
          completed: 0,
          progress: 0
        };
      }
      
      breakdown[subject].total++;
      if (task.status === 'completed' || task.progress === 100) {
        breakdown[subject].completed++;
      }
      breakdown[subject].progress += task.progress || 0;
    });

    // Calculate average progress per subject
    Object.keys(breakdown).forEach(subject => {
      breakdown[subject].averageProgress = Math.round(
        breakdown[subject].progress / breakdown[subject].total
      );
    });

    return breakdown;
  }

  render() {
    this.updateSummary();
    this.renderChart();
  }

  updateSummary() {
    if (!this.analytics) return;

    const completion = this.analytics.completion;
    
    if (this.elements.completedValue) {
      this.elements.completedValue.textContent = completion.completed;
    }
    
    if (this.elements.inProgressValue) {
      this.elements.inProgressValue.textContent = completion.inProgress;
    }
    
    if (this.elements.avgScoreValue) {
      this.elements.avgScoreValue.textContent = `${this.analytics.averageScore}%`;
    }
  }

  renderChart() {
    if (!this.elements.canvas || !this.analytics) return;

    const ctx = this.elements.canvas.getContext('2d');
    
    // Destroy existing chart
    if (this.charts.progress) {
      this.charts.progress.destroy();
    }

    const chartData = this.getChartData();
    
    this.charts.progress = new Chart(ctx, {
      type: 'line',
      data: {
        labels: chartData.labels,
        datasets: [{
          label: 'Tasks Completed',
          data: chartData.data,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: 'rgb(59, 130, 246)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            cornerRadius: 8,
            titleFont: {
              size: 14,
              weight: 'bold'
            },
            bodyFont: {
              size: 13
            },
            callbacks: {
              label: (context) => {
                return `Completed: ${context.parsed.y} tasks`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              font: {
                size: 12
              },
              color: '#64748b'
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              font: {
                size: 12
              },
              color: '#64748b',
              stepSize: 1
            }
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        }
      }
    });

    console.log('✅ Chart rendered with', chartData.data.length, 'data points');
  }

  getChartData() {
    const viewData = {
      weekly: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        data: this.analytics.trend.weekly
      },
      monthly: {
        labels: this.generateDayLabels(30),
        data: this.analytics.trend.monthly
      },
      yearly: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        data: this.analytics.trend.yearly
      }
    };

    return viewData[this.currentView];
  }

  generateDayLabels(days) {
    const labels = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      labels.push(date.getDate());
    }
    
    return labels;
  }

  switchView(view) {
    this.currentView = view;
    
    // Update button states
    this.elements.viewButtons?.forEach(btn => {
      const isActive = btn.dataset.view === view;
      btn.classList.toggle('progress-view-toggle__button--active', isActive);
      btn.setAttribute('aria-pressed', isActive);
    });

    // Re-render chart
    this.renderChart();
  }

  showLoading() {
    if (this.elements.canvas) {
      const container = this.elements.canvas.parentElement;
      container.innerHTML = '<div class="loading-spinner">Loading progress data...</div>';
    }
  }

  hideLoading() {
    // Will be replaced by render()
  }

  showError(message) {
    if (this.elements.canvas) {
      const container = this.elements.canvas.parentElement;
      container.innerHTML = `
        <div class="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="empty-state__icon">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <h3 class="empty-state__title">Unable to load progress data</h3>
          <p class="empty-state__text">${message}</p>
          <button class="primary-button" onclick="location.reload()">Retry</button>
        </div>
      `;
    }
  }
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.progressTracker = new ProgressTracker();
  });
} else {
  window.progressTracker = new ProgressTracker();
}
