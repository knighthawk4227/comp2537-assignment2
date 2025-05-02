const express = require('express');
const router = express.Router();
const user = require('../models/user');

router.post('/user', async (req, res) => {
    try {
        const newUser = await user.create(req.body);
        res.json(newUser);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});


module.exports = router;
