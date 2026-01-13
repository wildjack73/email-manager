const express = require('express');
const router = express.Router();
const Whitelist = require('../models/Whitelist');
const { requireAuth } = require('../middleware/auth');

// Get all whitelisted domains
router.get('/', requireAuth, async (req, res) => {
    try {
        const domains = await Whitelist.getAll();
        res.json(domains);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add a domain to whitelist
router.post('/', requireAuth, async (req, res) => {
    try {
        const { domain, description } = req.body;

        if (!domain) {
            return res.status(400).json({ error: 'Domain is required' });
        }

        // Check if already exists
        const exists = await Whitelist.exists(domain);
        if (exists) {
            return res.status(400).json({ error: 'Domain already whitelisted' });
        }

        const newDomain = await Whitelist.add(domain, description);
        res.json({ success: true, domain: newDomain });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a domain from whitelist
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        await Whitelist.delete(id);
        res.json({ success: true, message: 'Domain removed from whitelist' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
