const datastore = require('../datastore');

function toNumber(val, def = 0) {
  return typeof val === 'number' && !isNaN(val) ? val : def;
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatHourLabel(i) { return `${String(i).padStart(2, '0')}:00`; }
function formatDayLabel(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const analyticsController = {
  getAnalytics: async (req, res) => {
    try {
      const now = new Date();
      const tasks = datastore.get('tasks') || [];
      const subjects = datastore.get('subjects') || [];
      const events = datastore.get('events') || [];

      const totals = {
        totalTasks: tasks.length,
        completedTasks: tasks.filter(t => t.status === 'completed').length,
        inProgressTasks: tasks.filter(t => t.status === 'in-progress').length,
        pendingTasks: tasks.filter(t => !t.status || t.status === 'pending').length
      };
      const completionRate = totals.totalTasks ? +(totals.completedTasks / totals.totalTasks * 100).toFixed(2) : 0;

      const perSubject = {};
      for (const t of tasks) {
        const key = t.subject || 'Uncategorized';
        if (!perSubject[key]) {
          perSubject[key] = { tasks: 0, completed: 0, estimatedMinutes: 0, actualMinutes: 0 };
        }
        perSubject[key].tasks += 1;
        if (t.status === 'completed') perSubject[key].completed += 1;
        perSubject[key].estimatedMinutes += toNumber(t.estimatedDuration, 0);
        perSubject[key].actualMinutes += toNumber(t.actualDuration, 0);
      }

      const upcomingTasks = tasks
        .filter(t => t.dueDate && !isNaN(Date.parse(t.dueDate)))
        .map(t => ({
          id: t.id,
          title: t.title,
          subject: t.subject || null,
          dueDate: t.dueDate,
          daysUntilDue: Math.ceil((new Date(t.dueDate).getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
        }))
        .filter(x => x.daysUntilDue >= -1) // include overdue by 1 day
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 5);

      // Time series (for day/week/month) based on dueDate counts
      const period = String(req.query.period || '').toLowerCase();
      const effectivePeriod = ['day', 'week', 'month'].includes(period) ? period : 'week';

      function buildSeries(p) {
        const nowLocal = new Date();
        if (p === 'day') {
          const labels = Array.from({ length: 24 }, (_, i) => formatHourLabel(i));
          const counts = Array(24).fill(0);
          for (const t of tasks) {
            if (!t.dueDate) continue;
            const d = new Date(t.dueDate);
            if (d > nowLocal || startOfDay(d).getTime() !== startOfDay(nowLocal).getTime()) continue;
            const h = d.getHours();
            counts[clamp(h, 0, 23)] += 1;
          }
          return { labels, values: counts, granularity: 'hour' };
        }
        const days = p === 'week' ? 7 : 30;
        const labels = [];
        const values = [];
        for (let i = days - 1; i >= 0; i--) {
          const day = new Date(nowLocal);
          day.setDate(day.getDate() - i);
          labels.push(formatDayLabel(day));
          const start = startOfDay(day).getTime();
          const end = start + 24 * 60 * 60 * 1000;
          const count = tasks.filter(t => t.dueDate && !isNaN(Date.parse(t.dueDate))).reduce((acc, t) => {
            const dd = new Date(t.dueDate).getTime();
            return acc + (dd >= start && dd < end ? 1 : 0);
          }, 0);
          values.push(count);
        }
        return { labels, values, granularity: 'day' };
      }

      const timeSeries = buildSeries(effectivePeriod);

      // Legacy trend structure for compatibility (weekly, monthly, yearly)
      function buildWeekly() { return buildSeries('week').values; }
      function buildMonthly() { return buildSeries('month').values; }
      function buildYearly() {
        // monthly buckets by month for current year
        const year = now.getFullYear();
        const arr = Array(12).fill(0);
        for (const t of tasks) {
          if (!t.dueDate) continue;
          const d = new Date(t.dueDate);
          if (d.getFullYear() !== year) continue;
          arr[clamp(d.getMonth(), 0, 11)] += 1;
        }
        return arr;
      }

      // Hours by subject (estimated vs actual) in hours
      const subjectsArray = Object.entries(perSubject).map(([name, s]) => ({
        subject: name,
        estimatedHours: +(toNumber(s.estimatedMinutes, 0) / 60).toFixed(2),
        actualHours: +(toNumber(s.actualMinutes, 0) / 60).toFixed(2),
        tasks: s.tasks,
        completed: s.completed
      }));
      subjectsArray.sort((a, b) => b.estimatedHours - a.estimatedHours);

      const response = {
        success: true,
        message: 'Analytics computed successfully',
        data: {
          generatedAt: now.toISOString(),
          totals: { ...totals, completionRate },
          perSubject,
          subjects: subjectsArray,
          subjectsCount: subjects.length,
          events: { totalEvents: events.length },
          upcomingDeadlines: upcomingTasks,
          period: effectivePeriod,
          timeSeries,
          trend: {
            weekly: buildWeekly(),
            monthly: buildMonthly(),
            yearly: buildYearly()
          }
        }
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error computing analytics', error: error.message });
    }
  }
};

module.exports = analyticsController;
