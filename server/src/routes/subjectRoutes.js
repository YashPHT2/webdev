const express = require('express');
const router = express.Router();
const subjectsController = require('../controllers/subjectsController');

router.get('/', subjectsController.getAll);
router.get('/:id', subjectsController.getById);
router.post('/', subjectsController.create);
router.put('/:id', subjectsController.update);
router.delete('/:id', subjectsController.remove);

module.exports = router;
