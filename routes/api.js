
const express = require('express');
const { handleAddLead } = require('../controllers/api');

const router = express.Router();

// Route to handle adding a lead
router.post('/add-lead', handleAddLead);

module.exports = router;
