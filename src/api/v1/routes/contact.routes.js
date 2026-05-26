const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contact.controller');
const { submitContactValidator } = require('../validators/contact.validator');
const { validate } = require('../../../middleware/validation.middleware');

// Public contact form endpoints with aliases for backward compatibility.
router.post('/contact', submitContactValidator, validate, contactController.submit);
router.post('/contact-us', submitContactValidator, validate, contactController.submit);
router.post('/contactus', submitContactValidator, validate, contactController.submit);

module.exports = router;
