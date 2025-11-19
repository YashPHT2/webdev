const express = require('express');
const router = express.Router();
const timetableController = require('../controllers/timetableController');

router.get('/', timetableController.getTimetable);
router.put('/', timetableController.upsertTimetable);
router.post('/', timetableController.upsertTimetable);

module.exports = router;
