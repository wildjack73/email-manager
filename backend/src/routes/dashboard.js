const express = require('express');
const router = express.Router();
const ProcessedEmail = require('../models/ProcessedEmail');
const { manualRun } = require('../services/scheduler');
const { requireAuth } = require('../middleware/auth');

// Get dashboard statistics
router.get('/stats', requireAuth, async (req, res) => {
    try {
        // Disable caching to ensure fresh data
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');

        const stats = await ProcessedEmail.getStats();
        res.json(stats);
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get recent activity (last 7 days)
router.get('/activity', requireAuth, async (req, res) => {
    try {
        // Disable caching to ensure fresh data
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');

        const days = parseInt(req.query.days) || 7;
        const activity = await ProcessedEmail.getRecentActivity(days);
        res.json(activity);
    } catch (error) {
        console.error('Activity error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get recent processed emails
router.get('/recent', requireAuth, async (req, res) => {
    try {
        // Disable caching to ensure fresh data
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');

        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const emails = await ProcessedEmail.getAll(limit, offset);
        res.json(emails);
    } catch (error) {
        console.error('Recent emails error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Manually trigger classification
router.post('/manual-run', requireAuth, async (req, res) => {
    try {
        // Trigger asynchronously
        manualRun().catch(err => console.error('Manual run error:', err));
        res.json({ success: true, message: 'Classification started' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
