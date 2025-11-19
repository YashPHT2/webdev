const express = require('express');
const router = express.Router();
const studyPlanController = require('../controllers/studyPlanController');

// Compute an on-the-fly study plan derived from tasks JSON
router.get('/', studyPlanController.computeStudyPlan);

module.exports = router;
