const mongoose = require('mongoose');

const timetableBlockSchema = new mongoose.Schema({
    day: {
        type: String,
        required: true,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
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
        required: true
    },
    location: {
        type: String,
        default: ''
    },
    notes: {
        type: String,
        default: ''
    },
    color: {
        type: String,
        default: '#2563eb'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('TimetableBlock', timetableBlockSchema);
