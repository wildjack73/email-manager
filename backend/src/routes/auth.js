const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();

// Simple in-memory user check (can be extended to database)
const ADMIN_USERNAME = process.env.DASHBOARD_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.DASHBOARD_PASSWORD || 'changeme';

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            req.session.authenticated = true;
            req.session.username = username;
            res.json({ success: true, message: 'Logged in successfully' });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: 'Logged out successfully' });
});

// Verify session
router.get('/verify', (req, res) => {
    if (req.session && req.session.authenticated) {
        res.json({ authenticated: true, username: req.session.username });
    } else {
        res.json({ authenticated: false });
    }
});

module.exports = router;
