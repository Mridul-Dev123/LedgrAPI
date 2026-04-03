import Joi from 'joi';

const ALLOWED_USER_ROLES = ['viewer', 'analyst', 'admin'];
const ALLOWED_TRANSACTION_TYPES = ['income', 'expense', 'transfer'];

const validDateMessage = '{{#label}} must be a valid date';

const dateString = Joi.string()
  .trim()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .custom((value, helpers) => {
    const parsedDate = new Date(`${value}T00:00:00.000Z`);

    if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== value) {
      return helpers.error('date.invalid');
    }

    return value;
  }, 'date validation')
  .messages({
    'string.empty': '{{#label}} is required',
    'string.pattern.base': '{{#label}} must be in YYYY-MM-DD format',
    'date.invalid': validDateMessage,
  });

const nonEmptyString = (label, maxLength) =>
  Joi.string()
    .trim()
    .min(1)
    .max(maxLength)
    .required()
    .label(label)
    .messages({
      'string.base': '{{#label}} must be a string',
      'string.empty': '{{#label}} is required',
      'string.min': '{{#label}} is required',
      'string.max': `{{#label}} must be at most ${maxLength} characters long`,
      'any.required': '{{#label}} is required',
    });

const emailString = Joi.string()
  .trim()
  .lowercase()
  .email()
  .max(255)
  .required()
  .label('email')
  .messages({
    'string.base': '{{#label}} must be a string',
    'string.email': '{{#label}} must be a valid email address',
    'string.empty': '{{#label}} is required',
    'string.max': '{{#label}} must be at most 255 characters long',
    'any.required': '{{#label}} is required',
  });

const passwordString = (label) =>
  Joi.string().min(6).max(128).pattern(/\S/).required().label(label).messages({
    'string.base': '{{#label}} must be a string',
    'string.empty': '{{#label}} is required',
    'string.min': '{{#label}} must be at least 6 characters long',
    'string.max': '{{#label}} must be at most 128 characters long',
    'string.pattern.base': '{{#label}} cannot be blank',
    'any.required': '{{#label}} is required',
  });

const optionalString = (label, maxLength) =>
  Joi.string()
    .trim()
    .min(1)
    .max(maxLength)
    .label(label)
    .messages({
      'string.base': '{{#label}} must be a string',
      'string.empty': '{{#label}} cannot be empty',
      'string.min': '{{#label}} cannot be empty',
      'string.max': `{{#label}} must be at most ${maxLength} characters long`,
    });

const positiveInteger = (label) =>
  Joi.number().integer().positive().required().label(label).messages({
    'number.base': '{{#label}} must be a valid positive integer',
    'number.integer': '{{#label}} must be a valid positive integer',
    'number.positive': '{{#label}} must be a valid positive integer',
    'any.required': '{{#label}} is required',
  });

const amountNumber = Joi.number().min(0).precision(2).required().label('amount').messages({
  'number.base': '{{#label}} must be a valid number',
  'number.min': '{{#label}} must be greater than or equal to 0',
  'number.precision': '{{#label}} cannot have more than 2 decimal places',
  'any.required': '{{#label}} is required',
});

const roleString = Joi.string()
  .trim()
  .lowercase()
  .valid(...ALLOWED_USER_ROLES)
  .required()
  .label('role')
  .messages({
    'string.base': '{{#label}} must be a string',
    'any.only': 'role must be one of: viewer, analyst, admin',
    'string.empty': '{{#label}} is required',
    'any.required': '{{#label}} is required',
  });

const transactionTypeString = Joi.string()
  .trim()
  .lowercase()
  .valid(...ALLOWED_TRANSACTION_TYPES)
  .required()
  .label('type')
  .messages({
    'string.base': '{{#label}} must be a string',
    'any.only': 'type must be one of: income, expense, transfer',
    'string.empty': '{{#label}} is required',
    'any.required': '{{#label}} is required',
  });

const optionalTransactionNotes = Joi.alternatives()
  .try(Joi.string().trim().max(1000).allow(''), Joi.valid(null))
  .label('notes')
  .messages({
    'alternatives.match': '{{#label}} must be a string or null',
    'string.base': '{{#label}} must be a string or null',
    'string.max': '{{#label}} must be at most 1000 characters long',
  });

const dateRangeQuery = Joi.object({
  startDate: dateString.label('startDate').optional(),
  endDate: dateString.label('endDate').optional(),
})
  .custom((value, helpers) => {
    if (value.startDate && value.endDate && value.startDate > value.endDate) {
      return helpers.error('date.range');
    }

    return value;
  }, 'date range validation')
  .messages({
    'date.range': 'startDate cannot be greater than endDate',
  })
  .required()
  .unknown(false);

const registerUserRequest = {
  body: Joi.object({
    name: nonEmptyString('name', 150),
    email: emailString,
    password: passwordString('password'),
  })
    .required()
    .unknown(false),
};

const loginUserRequest = {
  body: Joi.object({
    email: emailString,
    password: passwordString('password'),
  })
    .required()
    .unknown(false),
};

const changePasswordRequest = {
  body: Joi.object({
    currentPassword: passwordString('currentPassword'),
    newPassword: passwordString('newPassword').invalid(Joi.ref('currentPassword')).messages({
      'any.invalid': 'New password must be different from current password',
    }),
  })
    .required()
    .unknown(false),
};

const listTransactionsRequest = {
  query: Joi.object({
    type: Joi.string()
      .trim()
      .lowercase()
      .valid(...ALLOWED_TRANSACTION_TYPES)
      .label('type')
      .messages({
        'string.base': '{{#label}} must be a string',
        'any.only': 'type must be one of: income, expense, transfer',
      }),
    category: optionalString('category', 100),
    startDate: dateString.label('startDate'),
    endDate: dateString.label('endDate'),
    search: optionalString('search', 250),
  })
    .custom((value, helpers) => {
      if (value.startDate && value.endDate && value.startDate > value.endDate) {
        return helpers.error('date.range');
      }

      return value;
    }, 'date range validation')
    .messages({
      'date.range': 'startDate cannot be greater than endDate',
    })
    .required()
    .unknown(false),
};

const transactionIdParams = {
  params: Joi.object({
    transactionId: positiveInteger('transactionId'),
  })
    .required()
    .unknown(false),
};

const createTransactionRequest = {
  body: Joi.object({
    amount: amountNumber,
    type: transactionTypeString,
    category: nonEmptyString('category', 100),
    date: dateString.label('date').required(),
    notes: optionalTransactionNotes.optional(),
  })
    .required()
    .unknown(false),
};

const updateTransactionRequest = {
  params: transactionIdParams.params,
  body: Joi.object({
    amount: amountNumber.optional(),
    type: transactionTypeString.optional(),
    category: optionalString('category', 100),
    date: dateString.label('date').optional(),
    notes: optionalTransactionNotes.optional(),
  })
    .or('amount', 'type', 'category', 'date', 'notes')
    .messages({
      'object.missing': 'At least one transaction field is required to update',
    })
    .required()
    .unknown(false),
};

const userIdParams = {
  params: Joi.object({
    userId: positiveInteger('userId'),
  })
    .required()
    .unknown(false),
};

const createUserRequest = {
  body: Joi.object({
    name: nonEmptyString('name', 150),
    email: emailString,
    password: passwordString('password'),
    role: roleString.default('viewer'),
    isActive: Joi.boolean().default(true).label('isActive').messages({
      'boolean.base': 'isActive must be a boolean value',
    }),
  })
    .required()
    .unknown(false),
};

const updateUserRoleRequest = {
  params: userIdParams.params,
  body: Joi.object({
    role: roleString,
  })
    .required()
    .unknown(false),
};

const updateUserStatusRequest = {
  params: userIdParams.params,
  body: Joi.object({
    isActive: Joi.boolean().required().label('isActive').messages({
      'boolean.base': 'isActive must be a boolean value',
      'any.required': 'isActive is required',
    }),
  })
    .required()
    .unknown(false),
};

const getDashboardInsightsRequest = {
  query: dateRangeQuery,
};

export {
  changePasswordRequest,
  createTransactionRequest,
  createUserRequest,
  getDashboardInsightsRequest,
  listTransactionsRequest,
  loginUserRequest,
  registerUserRequest,
  transactionIdParams,
  updateTransactionRequest,
  updateUserRoleRequest,
  updateUserStatusRequest,
  userIdParams,
};
