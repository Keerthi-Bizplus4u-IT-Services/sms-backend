const { randomUUID } = require('crypto');
const logger = require('../../../utils/logger');
const { toContactRequestDto } = require('../dto/contact-request.dto');

class ContactService {
  async submit(payload = {}, context = {}) {
    const contactRequest = toContactRequestDto(payload);
    const submissionId = randomUUID();

    logger.info('Contact form submitted', {
      submissionId,
      firstName: contactRequest.firstName,
      lastName: contactRequest.lastName,
      email: contactRequest.email,
      country: contactRequest.country || null,
      subject: contactRequest.subject,
      url: context.url,
      ip: context.ip,
      userAgent: context.userAgent
    });

    return {
      submissionId,
      submittedAt: new Date().toISOString()
    };
  }
}

module.exports = new ContactService();
