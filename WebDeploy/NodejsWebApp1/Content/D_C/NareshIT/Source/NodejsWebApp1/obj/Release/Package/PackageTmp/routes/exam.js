const express = require('express');
const router = express.Router();
const Question = require('../models/Question'); // Assuming you have a Question model

router.get('/questions', async (req, res) => {
    try {
        const questions = await Question.find();

        if (!questions || questions.length === 0) {
            return res.status(404).json({ message: 'No questions found.' });
        }

        res.render('examPage', { questions }); // Render the 'examPage' with questions
    } catch (error) {
        console.error('Error fetching questions:', error.message);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
