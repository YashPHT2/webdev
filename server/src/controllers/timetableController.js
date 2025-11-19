const TimetableBlock = require('../models/TimetableBlock');

exports.getTimetable = async (req, res) => {
  try {
    const blocks = await TimetableBlock.find();
    res.json(blocks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createBlock = async (req, res) => {
  console.log('Received createBlock request:', req.body);
  const block = new TimetableBlock({
    day: req.body.day,
    startTime: req.body.startTime,
    endTime: req.body.endTime,
    subject: req.body.subject,
    location: req.body.location,
    notes: req.body.notes,
    color: req.body.color
  });

  try {
    const newBlock = await block.save();
    console.log('Block saved successfully:', newBlock);
    res.status(201).json(newBlock);
  } catch (error) {
    console.error('Error saving block:', error);
    res.status(400).json({ message: error.message });
  }
};

exports.updateBlock = async (req, res) => {
  try {
    const block = await TimetableBlock.findById(req.params.id);
    if (!block) {
      return res.status(404).json({ message: 'Block not found' });
    }

    if (req.body.day) block.day = req.body.day;
    if (req.body.startTime) block.startTime = req.body.startTime;
    if (req.body.endTime) block.endTime = req.body.endTime;
    if (req.body.subject) block.subject = req.body.subject;
    if (req.body.location !== undefined) block.location = req.body.location;
    if (req.body.notes !== undefined) block.notes = req.body.notes;
    if (req.body.color) block.color = req.body.color;

    const updatedBlock = await block.save();
    res.json(updatedBlock);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteBlock = async (req, res) => {
  try {
    const block = await TimetableBlock.findById(req.params.id);
    if (!block) {
      return res.status(404).json({ message: 'Block not found' });
    }
    await block.deleteOne();
    res.json({ message: 'Block deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
