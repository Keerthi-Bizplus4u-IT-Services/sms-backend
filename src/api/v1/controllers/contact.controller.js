const contactService = require('../services/contact.service');
const { success } = require('../../../utils/response');
const { asyncHandler } = require('../../../middleware/error.middleware');

class ContactController {
  submit = asyncHandler(async (req, res) => {
    const result = await contactService.submit(req.body, {
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('user-agent') || null
    });

    return success(res, result, 'Your message has been received. We will contact you soon.', 200);
  });
}

module.exports = new ContactController();
