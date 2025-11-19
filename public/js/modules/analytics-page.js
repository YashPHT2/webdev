/**
 * Smart Mentor Analytics Dashboard
 * Visualizes task performance and trends
 */

class AnalyticsDashboard {
  constructor() {
    this.tasks = [];
    this.subjects = [];
    this.currentPeriod = 'day';
    this.charts = {};
    
    console.log('📊 Analytics Dashboard initializing...');
    this.init();
  }

  async init() {
    try {
      // Wait for Chart.js to load
      await this.waitForChartJS();
      
      this.cacheElements();
      
      if (!this.elements.trendChart) {
        console.error('❌ Chart elements not found!');
        return;
      }

      this.attachEventListeners();
      await this.loadData();
      this.render();
      
      console.log('✅ Analytics Dashboard initialized');
    } catch (error) {
      console.error('❌ Analytics initialization failed:', error);
      this.showError('Failed to initialize analytics');
    }
  }

  async waitForChartJS() {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50;
      
      const checkChart = setInterval(() => {
        attempts++;
        
        if (typeof Chart !== 'undefined') {
          clearInterval(checkChart);
          console.log('✓ Chart.js loaded');
          resolve();
        } else if (attempts >= maxAttempts) {
          clearInterval(checkChart);
          reject(new Error('Chart.js failed to load'));
        }
      }, 100);
    });
  }

  cacheElements() {
    this.elements = {
      // KPI elements
      kpiTotal: document.getElementById('kpi-total'),
      kpiCompleted: document.getElementById('kpi-completed'),
      kpiRate: document.getElementById('kpi-rate'),
      kpiSubjects: document.getElementById('kpi-subjects'),
      kpiRateDonut: document.querySelector('[data-kpi="rate"] .kpi-donut'),
      
      // Period toggle
      periodButtons: document.querySelectorAll('[data-period]'),
      
      // Charts
      trendChart: document.getElementById('trendChart'),
      trendLoading: document.getElementById('trend-loading'),
      trendEmpty: document.getElementById('trend-empty'),
      
      subjectDoughnut: document.getElementById('subjectDoughnut'),
      subjectLoading: document.getElementById('subject-loading'),
      subjectEmpty: document.getElementById('subject-empty'),
      
      hoursBar: document.getElementById('hoursBar'),
      hoursLoading: document.getElementById('hours-loading'),
      hoursEmpty: document.getElementById('hours-empty'),
    };

    console.log('✓ Elements cached');
  }

  attachEventListeners() {
    // Period toggle
    this.elements.periodButtons?.forEach(btn => {
      btn.addEventListener('click', () => {
        const period = btn.dataset.period;
        this.switchPeriod(period);
      });
    });

    console.log('✓ Event listeners attached');
  }

  async loadData() {
    this.showLoading();

    try {
      console.log('📡 Fetching analytics data...');
      
      const [tasks, subjects] = await Promise.all([
        this.fetchTasks(),
        this.fetchSubjects()
      ]);

      this.tasks = tasks;
      this.subjects = subjects;
      
      console.log('✓ Loaded:', {
        tasks: this.tasks.length,
        subjects: this.subjects.length
      });

    } catch (error) {
      console.error('❌ Failed to load data:', error);
      this.showError('Failed to load analytics data');
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
      return this.loadTasksFromLocalStorage();
    }
  }

  async fetchSubjects() {
    try {
      const response = await fetch('/api/subjects');
      if (!response.ok) throw new Error('Failed to fetch subjects');
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.warn('⚠️ Could not fetch subjects:', error);
      return [];
    }
  }

  loadTasksFromLocalStorage() {
    try {
      const stored = localStorage.getItem('smartMentorTasks');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      return [];
    }
  }

  render() {
    this.updateKPIs();
    this.renderTrendChart();
    this.renderSubjectDoughnut();
    this.renderHoursBar();
  }

  updateKPIs() {
    // Total tasks
    const total = this.tasks.length;
    if (this.elements.kpiTotal) {
      this.elements.kpiTotal.textContent = total;
    }

    // Completed tasks
    const completed = this.tasks.filter(t => 
      t.status === 'completed' || t.progress === 100
    ).length;
    if (this.elements.kpiCompleted) {
      this.elements.kpiCompleted.textContent = completed;
    }

    // Completion rate
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    if (this.elements.kpiRate) {
      this.elements.kpiRate.textContent = `${rate}%`;
    }
    if (this.elements.kpiRateDonut) {
      this.elements.kpiRateDonut.style.setProperty('--kpi-progress', `${rate}%`);
    }

    // Subjects count
    const uniqueSubjects = new Set(
      this.tasks.map(t => t.subject).filter(Boolean)
    ).size;
    if (this.elements.kpiSubjects) {
      this.elements.kpiSubjects.textContent = uniqueSubjects;
    }

    console.log('✓ KPIs updated:', { total, completed, rate, uniqueSubjects });
  }

  renderTrendChart() {
    if (!this.elements.trendChart) return;

    const data = this.getTrendData();

    if (data.labels.length === 0 || data.values.every(v => v === 0)) {
      this.showEmptyState('trend');
      return;
    }

    this.hideEmptyState('trend');

    // Destroy existing chart
    if (this.charts.trend) {
      this.charts.trend.destroy();
    }

    const ctx = this.elements.trendChart.getContext('2d');

    this.charts.trend = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'Tasks Due',
          data: data.values,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointHoverRadius: 8,
          pointBackgroundColor: 'rgb(59, 130, 246)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: 20
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              padding: 20,
              font: {
                size: 14,
                weight: 'bold'
              },
              color: '#64748b',
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 16,
            cornerRadius: 8,
            titleFont: {
              size: 16,
              weight: 'bold'
            },
            bodyFont: {
              size: 14
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
                size: 13
              },
              color: '#64748b',
              padding: 10
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)',
              lineWidth: 1
            },
            ticks: {
              font: {
                size: 13
              },
              color: '#64748b',
              stepSize: 1,
              padding: 10
            }
          }
        }
      }
    });

    this.elements.trendChart.style.display = 'block';
    console.log('✓ Trend chart rendered with larger size');
  }

  getTrendData() {
    const now = new Date();
    const labels = [];
    const values = [];

    if (this.currentPeriod === 'day') {
      // Last 24 hours
      for (let i = 23; i >= 0; i--) {
        const hour = new Date(now);
        hour.setHours(hour.getHours() - i);
        labels.push(hour.getHours() + ':00');
        
        const count = this.tasks.filter(t => {
          if (!t.dueDate) return false;
          const dueDate = new Date(t.dueDate);
          return dueDate.getDate() === hour.getDate() &&
                 dueDate.getMonth() === hour.getMonth() &&
                 dueDate.getFullYear() === hour.getFullYear();
        }).length;
        values.push(count);
      }
    } else if (this.currentPeriod === 'week') {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const day = new Date(now);
        day.setDate(day.getDate() - i);
        labels.push(day.toLocaleDateString('en-US', { weekday: 'short' }));
        
        const count = this.tasks.filter(t => {
          if (!t.dueDate) return false;
          const dueDate = new Date(t.dueDate);
          return dueDate.toDateString() === day.toDateString();
        }).length;
        values.push(count);
      }
    } else {
      // Last 30 days
      for (let i = 29; i >= 0; i--) {
        const day = new Date(now);
        day.setDate(day.getDate() - i);
        labels.push(day.getDate().toString());
        
        const count = this.tasks.filter(t => {
          if (!t.dueDate) return false;
          const dueDate = new Date(t.dueDate);
          return dueDate.toDateString() === day.toDateString();
        }).length;
        values.push(count);
      }
    }

    return { labels, values };
  }

  renderSubjectDoughnut() {
    if (!this.elements.subjectDoughnut) return;

    const data = this.getSubjectData();

    if (data.labels.length === 0) {
      this.showEmptyState('subject');
      return;
    }

    this.hideEmptyState('subject');

    // Destroy existing chart
    if (this.charts.subject) {
      this.charts.subject.destroy();
    }

    const ctx = this.elements.subjectDoughnut.getContext('2d');

    this.charts.subject = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.labels,
        datasets: [{
          data: data.values,
          backgroundColor: [
            'rgb(59, 130, 246)',
            'rgb(16, 185, 129)',
            'rgb(245, 158, 11)',
            'rgb(239, 68, 68)',
            'rgb(139, 92, 246)',
            'rgb(236, 72, 153)',
            'rgb(132, 204, 22)',
            'rgb(6, 182, 212)'
          ],
          borderWidth: 3,
          borderColor: '#fff',
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: 20
        },
        plugins: {
          legend: {
            position: 'right',
            labels: {
              padding: 20,
              font: {
                size: 14
              },
              color: '#64748b',
              usePointStyle: true,
              pointStyle: 'circle',
              boxWidth: 12,
              boxHeight: 12
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 16,
            cornerRadius: 8,
            titleFont: {
              size: 16,
              weight: 'bold'
            },
            bodyFont: {
              size: 14
            },
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${value} tasks (${percentage}%)`;
              }
            }
          }
        }
      }
    });

    this.elements.subjectDoughnut.style.display = 'block';
    console.log('✓ Subject doughnut rendered with larger size');
  }

  getSubjectData() {
    const subjectCounts = {};

    this.tasks.forEach(task => {
      const subject = task.subject || 'Uncategorized';
      subjectCounts[subject] = (subjectCounts[subject] || 0) + 1;
    });

    const entries = Object.entries(subjectCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8); // Top 8 subjects

    return {
      labels: entries.map(e => e[0]),
      values: entries.map(e => e[1])
    };
  }

  renderHoursBar() {
    if (!this.elements.hoursBar) return;

    const data = this.getHoursData();

    if (data.labels.length === 0) {
      this.showEmptyState('hours');
      return;
    }

    this.hideEmptyState('hours');

    // Destroy existing chart
    if (this.charts.hours) {
      this.charts.hours.destroy();
    }

    const ctx = this.elements.hoursBar.getContext('2d');

    this.charts.hours = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'Estimated Hours',
          data: data.estimated,
          backgroundColor: 'rgba(59, 130, 246, 0.7)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 2,
          borderRadius: 8,
          barThickness: 40
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: 20
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              padding: 20,
              font: {
                size: 14,
                weight: 'bold'
              },
              color: '#64748b',
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 16,
            cornerRadius: 8,
            titleFont: {
              size: 16,
              weight: 'bold'
            },
            bodyFont: {
              size: 14
            },
            callbacks: {
              label: (context) => {
                return `${context.dataset.label}: ${context.parsed.y.toFixed(1)} hours`;
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
                size: 13
              },
              color: '#64748b',
              padding: 10
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)',
              lineWidth: 1
            },
            ticks: {
              font: {
                size: 13
              },
              color: '#64748b',
              padding: 10,
              callback: (value) => value + 'h'
            }
          }
        }
      }
    });

    this.elements.hoursBar.style.display = 'block';
    console.log('✓ Hours bar chart rendered with larger size');
  }

  getHoursData() {
    const subjectHours = {};

    this.tasks.forEach(task => {
      const subject = task.subject || 'Uncategorized';
      const hours = (task.estimatedDuration || 0) / 60; // Convert minutes to hours
      
      if (!subjectHours[subject]) {
        subjectHours[subject] = { estimated: 0 };
      }
      subjectHours[subject].estimated += hours;
    });

    const entries = Object.entries(subjectHours)
      .sort((a, b) => b[1].estimated - a[1].estimated)
      .slice(0, 8); // Top 8 subjects

    return {
      labels: entries.map(e => e[0]),
      estimated: entries.map(e => e[1].estimated)
    };
  }

  switchPeriod(period) {
    this.currentPeriod = period;

    // Update button states
    this.elements.periodButtons?.forEach(btn => {
      const isActive = btn.dataset.period === period;
      btn.classList.toggle('progress-view-toggle__button--active', isActive);
      btn.setAttribute('aria-pressed', isActive);
    });

    // Re-render trend chart
    this.renderTrendChart();
  }

  showEmptyState(chartType) {
    const emptyElements = {
      trend: this.elements.trendEmpty,
      subject: this.elements.subjectEmpty,
      hours: this.elements.hoursEmpty
    };

    const chartElements = {
      trend: this.elements.trendChart,
      subject: this.elements.subjectDoughnut,
      hours: this.elements.hoursBar
    };

    const empty = emptyElements[chartType];
    const chart = chartElements[chartType];

    if (empty) empty.style.display = 'flex';
    if (chart) chart.style.display = 'none';
  }

  hideEmptyState(chartType) {
    const emptyElements = {
      trend: this.elements.trendEmpty,
      subject: this.elements.subjectEmpty,
      hours: this.elements.hoursEmpty
    };

    const empty = emptyElements[chartType];
    if (empty) empty.style.display = 'none';
  }

  showLoading() {
    if (this.elements.trendLoading) this.elements.trendLoading.style.display = 'block';
    if (this.elements.subjectLoading) this.elements.subjectLoading.style.display = 'block';
    if (this.elements.hoursLoading) this.elements.hoursLoading.style.display = 'block';
  }

  hideLoading() {
    if (this.elements.trendLoading) this.elements.trendLoading.style.display = 'none';
    if (this.elements.subjectLoading) this.elements.subjectLoading.style.display = 'none';
    if (this.elements.hoursLoading) this.elements.hoursLoading.style.display = 'none';
  }

  showError(message) {
    console.error('❌', message);
    alert(message); // Simple error display
  }
}

// Auto-initialize when Chart.js and DOM are ready
(function() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAnalytics);
  } else {
    initAnalytics();
  }

  function initAnalytics() {
    try {
      window.analyticsDashboard = new AnalyticsDashboard();
    } catch (error) {
      console.error('❌ Failed to initialize Analytics Dashboard:', error);
    }
  }
})();
