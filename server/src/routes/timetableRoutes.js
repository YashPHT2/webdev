const express = require('express');
const router = express.Router();
const timetableController = require('../controllers/timetableController');

router.get('/', timetableController.getTimetable);
router.post('/', timetableController.createBlock);
router.put('/:id', timetableController.updateBlock);
router.delete('/:id', timetableController.deleteBlock);

module.exports = router;
