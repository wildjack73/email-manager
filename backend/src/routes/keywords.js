const express = require('express');
const router = express.Router();
const Keyword = require('../models/Keyword');
const { requireAuth } = require('../middleware/auth');

// Get all banned keywords
router.get('/', requireAuth, async (req, res) => {
    try {
        const keywords = await Keyword.getAll();
        res.json(keywords);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add a banned keyword
router.post('/', requireAuth, async (req, res) => {
    try {
        const { keyword, case_sensitive } = req.body;

        if (!keyword) {
            return res.status(400).json({ error: 'Keyword is required' });
        }

        // Check if already exists
        const exists = await Keyword.exists(keyword);
        if (exists) {
            return res.status(400).json({ error: 'Keyword already exists' });
        }

        const newKeyword = await Keyword.add(keyword, case_sensitive || false);
        res.json({ success: true, keyword: newKeyword });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a banned keyword
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        await Keyword.delete(id);
        res.json({ success: true, message: 'Keyword removed' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
