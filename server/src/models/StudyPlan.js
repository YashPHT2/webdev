const mongoose = require('mongoose');

const studySessionSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  topic: {
    type: String,
    trim: true,
    maxlength: 200
  },
  duration: {
    type: Number,
    required: true,
    min: 0
  },
  completed: {
    type: Boolean,
    default: false
  },
  actualDuration: {
    type: Number,
    min: 0
  },
  notes: {
    type: String,
    maxlength: 1000
  }
});

const studyPlanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'completed', 'paused', 'cancelled'],
    default: 'draft'
  },
  subjects: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    hoursPerWeek: {
      type: Number,
      required: true,
      min: 0
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    }
  }],
  sessions: [studySessionSchema],
  goals: [{
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },
    targetDate: {
      type: Date
    },
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: {
      type: Date
    }
  }],
  preferences: {
    preferredStudyTimes: [{
      type: String
    }],
    sessionDuration: {
      type: Number,
      default: 60,
      min: 15,
      max: 240
    },
    breakDuration: {
      type: Number,
      default: 10,
      min: 5,
      max: 30
    }
  },
  progress: {
    totalPlannedHours: {
      type: Number,
      default: 0
    },
    totalCompletedHours: {
      type: Number,
      default: 0
    },
    completionPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  }
}, {
  timestamps: true
});

studyPlanSchema.index({ userId: 1, status: 1 });
studyPlanSchema.index({ userId: 1, startDate: 1 });

studyPlanSchema.methods.calculateProgress = function() {
  const completedSessions = this.sessions.filter(s => s.completed);
  const totalPlannedHours = this.sessions.reduce((sum, s) => sum + s.duration, 0) / 60;
  const totalCompletedHours = completedSessions.reduce((sum, s) => sum + (s.actualDuration || s.duration), 0) / 60;
  
  this.progress.totalPlannedHours = totalPlannedHours;
  this.progress.totalCompletedHours = totalCompletedHours;
  this.progress.completionPercentage = totalPlannedHours > 0 
    ? Math.round((totalCompletedHours / totalPlannedHours) * 100) 
    : 0;
  
  return this.progress;
};

module.exports = mongoose.model('StudyPlan', studyPlanSchema);
