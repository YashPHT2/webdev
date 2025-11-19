const datastore = require('../datastore');

function priorityValue(p) {
  switch ((p || '').toLowerCase()) {
    case 'low': return 1;
    case 'medium': return 2;
    case 'high': return 3;
    case 'urgent': return 4;
    default: return 2;
  }
}

function daysUntil(dateStr) {
  if (!dateStr) return Infinity;
  const now = Date.now();
  const ts = new Date(dateStr).getTime();
  if (isNaN(ts)) return Infinity;
  return Math.ceil((ts - now) / (24 * 60 * 60 * 1000));
}

const studyPlanController = {
  getAllStudyPlans: async (req, res) => {
    try {
      const studyPlans = [
        {
          id: '1',
          title: 'Final Exam Preparation',
          description: 'Study plan for upcoming final exams',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'active',
          subjects: [
            { name: 'Mathematics', hoursPerWeek: 5, priority: 'high' },
            { name: 'Biology', hoursPerWeek: 4, priority: 'medium' }
          ],
          progress: {
            totalPlannedHours: 36,
            totalCompletedHours: 12,
            completionPercentage: 33
          }
        }
      ];

      res.json({
        success: true,
        message: 'Study plans retrieved successfully (placeholder data)',
        data: studyPlans,
        count: studyPlans.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error retrieving study plans',
        error: error.message
      });
    }
  },

  getStudyPlanById: async (req, res) => {
    try {
      const { id } = req.params;

      res.json({
        success: true,
        message: 'Study plan retrieved successfully (placeholder data)',
        data: {
          id,
          title: 'Sample Study Plan',
          description: 'This is a placeholder study plan',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'active',
          subjects: [],
          sessions: [],
          progress: {
            totalPlannedHours: 0,
            totalCompletedHours: 0,
            completionPercentage: 0
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error retrieving study plan',
        error: error.message
      });
    }
  },

  createStudyPlan: async (req, res) => {
    try {
      const studyPlanData = req.body;

      res.status(201).json({
        success: true,
        message: 'Study plan created successfully (placeholder)',
        data: {
          id: Date.now().toString(),
          ...studyPlanData,
          status: 'draft',
          createdAt: new Date()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating study plan',
        error: error.message
      });
    }
  },

  updateStudyPlan: async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      res.json({
        success: true,
        message: 'Study plan updated successfully (placeholder)',
        data: {
          id,
          ...updates,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating study plan',
        error: error.message
      });
    }
  },

  deleteStudyPlan: async (req, res) => {
    try {
      const { id } = req.params;

      res.json({
        success: true,
        message: 'Study plan deleted successfully (placeholder)',
        data: { id }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting study plan',
        error: error.message
      });
    }
  },

  addStudySession: async (req, res) => {
    try {
      const { id } = req.params;
      const sessionData = req.body;

      res.status(201).json({
        success: true,
        message: 'Study session added successfully (placeholder)',
        data: {
          studyPlanId: id,
          session: {
            id: Date.now().toString(),
            ...sessionData,
            completed: false
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error adding study session',
        error: error.message
      });
    }
  },

  computeStudyPlan: async (req, res) => {
    try {
      const tasks = (datastore.get('tasks') || []).filter(t => t.status !== 'completed');
      const dailyCapacityHours = Math.max(1, parseFloat(req.query.dailyHours || '4'));
      const windowDays = Math.max(1, parseInt(req.query.windowDays || '7', 10));

      const scored = tasks.map(t => {
        const estHours = (typeof t.estimatedDuration === 'number' ? t.estimatedDuration : 60) / 60; // default 1 hour
        const pScore = priorityValue(t.priority) / 4; // 0..1
        const d = daysUntil(t.dueDate);
        const uScore = isFinite(d) ? 1 / (Math.max(d, 0) + 1) : 0.2; // 0..1
        const score = 0.6 * pScore + 0.4 * uScore;
        return {
          id: t.id,
          title: t.title,
          subject: t.subject || null,
          dueDate: t.dueDate || null,
          priority: t.priority || 'Medium',
          estimatedHours: +estHours.toFixed(2),
          score: +score.toFixed(4)
        };
      }).sort((a, b) => b.score - a.score);

      // Build daily schedule by distributing remaining hours greedily
      const remaining = scored.map(s => ({ ...s, hoursRemaining: s.estimatedHours }));
      const dailySchedule = [];
      for (let d = 0; d < windowDays; d++) {
        let capacity = dailyCapacityHours;
        const dayDate = new Date(Date.now() + d * 24 * 60 * 60 * 1000);
        const entries = [];
        for (const item of remaining) {
          if (capacity <= 0) break;
          if (item.hoursRemaining <= 0) continue;
          const chunk = Math.min(item.hoursRemaining, Math.min(capacity, 2));
          if (chunk <= 0) continue;
          entries.push({ taskId: item.id, title: item.title, hours: +chunk.toFixed(2) });
          item.hoursRemaining = +(item.hoursRemaining - chunk).toFixed(2);
          capacity = +(capacity - chunk).toFixed(2);
        }
        dailySchedule.push({ date: dayDate.toISOString(), items: entries });
      }

      res.json({
        success: true,
        message: 'Study plan generated successfully',
        data: {
          planGeneratedAt: new Date().toISOString(),
          windowDays,
          dailyCapacityHours,
          recommendedOrder: scored.map((s, idx) => ({ order: idx + 1, ...s })),
          dailySchedule
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error generating study plan', error: error.message });
    }
  }
};

module.exports = studyPlanController;
