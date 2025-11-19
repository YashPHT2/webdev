const motivationController = {
  getMotivationalMessage: async (req, res) => {
    try {
      const motivationalMessages = [
        'You\'re making great progress! Keep up the excellent work!',
        'Every study session brings you closer to your goals!',
        'Believe in yourself - you\'re capable of amazing things!',
        'Small steps every day lead to big achievements!',
        'Your dedication to learning is truly inspiring!',
        'Success is the sum of small efforts repeated day in and day out.',
        'The expert in anything was once a beginner. Keep going!',
        'You\'re building the future you want, one task at a time!'
      ];

      const randomMessage = motivationalMessages[
        Math.floor(Math.random() * motivationalMessages.length)
      ];

      res.json({
        success: true,
        message: 'Motivational message retrieved successfully',
        data: {
          message: randomMessage,
          timestamp: new Date()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error retrieving motivational message',
        error: error.message
      });
    }
  },

  getDailyQuote: async (req, res) => {
    try {
      const quotes = [
        {
          text: 'Education is the most powerful weapon which you can use to change the world.',
          author: 'Nelson Mandela'
        },
        {
          text: 'The beautiful thing about learning is that no one can take it away from you.',
          author: 'B.B. King'
        },
        {
          text: 'Live as if you were to die tomorrow. Learn as if you were to live forever.',
          author: 'Mahatma Gandhi'
        },
        {
          text: 'The capacity to learn is a gift; the ability to learn is a skill; the willingness to learn is a choice.',
          author: 'Brian Herbert'
        }
      ];

      const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

      res.json({
        success: true,
        message: 'Daily quote retrieved successfully',
        data: {
          ...randomQuote,
          timestamp: new Date()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error retrieving daily quote',
        error: error.message
      });
    }
  },

  getStudyTip: async (req, res) => {
    try {
      const studyTips = [
        {
          title: 'Use the Pomodoro Technique',
          description: 'Study for 25 minutes, then take a 5-minute break. This helps maintain focus and prevents burnout.'
        },
        {
          title: 'Create a Dedicated Study Space',
          description: 'Having a specific area for studying helps your brain associate that space with focus and productivity.'
        },
        {
          title: 'Practice Active Recall',
          description: 'Test yourself regularly instead of just re-reading notes. This strengthens memory retention.'
        },
        {
          title: 'Take Care of Your Health',
          description: 'Get enough sleep, eat well, and exercise regularly. A healthy body supports a healthy mind.'
        },
        {
          title: 'Use Multiple Learning Methods',
          description: 'Combine reading, writing, visual aids, and teaching others to reinforce your understanding.'
        }
      ];

      const randomTip = studyTips[Math.floor(Math.random() * studyTips.length)];

      res.json({
        success: true,
        message: 'Study tip retrieved successfully',
        data: {
          ...randomTip,
          timestamp: new Date()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error retrieving study tip',
        error: error.message
      });
    }
  }
};

module.exports = motivationController;
