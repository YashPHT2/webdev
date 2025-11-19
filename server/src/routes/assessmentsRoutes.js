const express = require('express');
const router = express.Router();
const assessmentsController = require('../controllers/assessmentsController');

router.get('/', assessmentsController.getAssessments);
router.get('/:id', assessmentsController.getAssessmentById);
router.post('/', assessmentsController.createAssessment);
router.put('/:id', assessmentsController.updateAssessment);
router.delete('/:id', assessmentsController.deleteAssessment);

module.exports = router;
