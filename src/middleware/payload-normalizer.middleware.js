const buildNestedObjectFromDottedKeys = (input = {}) => {
  const output = {};

  Object.entries(input).forEach(([rawKey, rawValue]) => {
    if (!rawKey.includes('.')) {
      output[rawKey] = rawValue;
      return;
    }

    const segments = rawKey.split('.').filter(Boolean);
    let cursor = output;

    segments.forEach((segment, index) => {
      const isLast = index === segments.length - 1;

      if (isLast) {
        cursor[segment] = rawValue;
        return;
      }

      if (!cursor[segment] || typeof cursor[segment] !== 'object' || Array.isArray(cursor[segment])) {
        cursor[segment] = {};
      }

      cursor = cursor[segment];
    });
  });

  return output;
};

const parseIfJsonString = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) {
    return value;
  }

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    return value;
  }
};

const normalizePayload = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  const isMultipart = contentType.toLowerCase().includes('multipart/form-data');

  if (!isMultipart || !req.body || typeof req.body !== 'object') {
    next();
    return;
  }

  const nextBody = buildNestedObjectFromDottedKeys(req.body);

  if (typeof nextBody.payload === 'string') {
    const parsedPayload = parseIfJsonString(nextBody.payload);
    if (parsedPayload && typeof parsedPayload === 'object' && !Array.isArray(parsedPayload)) {
      req.body = parsedPayload;
      next();
      return;
    }
  }

  req.body = {
    ...nextBody,
    person: parseIfJsonString(nextBody.person),
    student: parseIfJsonString(nextBody.student),
    teacher: parseIfJsonString(nextBody.teacher),
    user: parseIfJsonString(nextBody.user)
  };

  next();
};

module.exports = {
  normalizePayload
};
