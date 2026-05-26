const normalizeText = (value, maxLength) => {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    return '';
  }

  return normalized.slice(0, maxLength);
};

const toContactRequestDto = (payload = {}) => {
  return {
    firstName: normalizeText(payload.firstName, 100),
    lastName: normalizeText(payload.lastName, 100),
    email: normalizeText(payload.email, 255).toLowerCase(),
    country: normalizeText(payload.country, 100),
    subject: normalizeText(payload.subject, 200),
    message: normalizeText(payload.message, 2000)
  };
};

module.exports = {
  toContactRequestDto
};
