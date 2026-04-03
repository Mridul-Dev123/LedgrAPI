import { ApiError } from '../utils/index.js';

const REQUEST_PART_LABELS = {
  body: 'request body',
  params: 'request parameters',
  query: 'query parameters',
};

const VALIDATION_ORDER = ['params', 'query', 'body'];

const getTopLevelValidationMessage = (detail, requestPart) => {
  if (detail.type === 'any.required') {
    return `${REQUEST_PART_LABELS[requestPart]} is required`;
  }

  if (detail.type === 'object.base') {
    return `${REQUEST_PART_LABELS[requestPart]} must be a JSON object`;
  }

  return detail.message.replaceAll('"', '');
};

const formatValidationErrors = (details, requestPart) =>
  details.map((detail) => ({
    field: detail.path.length ? detail.path.join('.') : requestPart,
    message: detail.path.length
      ? detail.message.replaceAll('"', '')
      : getTopLevelValidationMessage(detail, requestPart),
    code: detail.type,
  }));

const validate = (schemaMap) => (req, _res, next) => {
  for (const requestPart of VALIDATION_ORDER) {
    const schema = schemaMap[requestPart];

    if (!schema) {
      continue;
    }

    const { error, value } = schema.validate(req[requestPart], {
      abortEarly: false,
      convert: true,
      errors: {
        wrap: {
          label: false,
        },
      },
    });

    if (error) {
      return next(
        new ApiError(
          400,
          `Invalid ${REQUEST_PART_LABELS[requestPart]}`,
          formatValidationErrors(error.details, requestPart)
        )
      );
    }

    req[requestPart] = value;
  }

  return next();
};

export default validate;
