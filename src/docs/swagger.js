import path from 'node:path';
import { fileURLToPath } from 'node:url';

import swaggerJsdoc from 'swagger-jsdoc';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFilePath);
const publicBaseUrl = process.env.PUBLIC_BASE_URL || '';

const swaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'Ledgr API',
    version: '1.0.0',
    description:
      'REST API for authentication, user administration, transaction management, and dashboard analytics.',
  },
  servers: [
    {
      url: publicBaseUrl || '/',
      description: publicBaseUrl ? 'Public deployment server' : 'Current server origin',
    },
  ],
  tags: [
    { name: 'Health', description: 'API health checks' },
    { name: 'Auth', description: 'Authentication and session endpoints' },
    { name: 'Users', description: 'Admin user management endpoints' },
    { name: 'Transactions', description: 'Transaction endpoints' },
    { name: 'Dashboard', description: 'Dashboard analytics endpoints' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    parameters: {
      StartDate: {
        name: 'startDate',
        in: 'query',
        description: 'Inclusive start date in YYYY-MM-DD format.',
        schema: { type: 'string', format: 'date', example: '2026-01-01' },
      },
      EndDate: {
        name: 'endDate',
        in: 'query',
        description: 'Inclusive end date in YYYY-MM-DD format.',
        schema: { type: 'string', format: 'date', example: '2026-03-31' },
      },
      UserId: {
        name: 'userId',
        in: 'path',
        required: true,
        description: 'Numeric user identifier.',
        schema: { type: 'integer', minimum: 1, example: 3 },
      },
      TransactionId: {
        name: 'transactionId',
        in: 'path',
        required: true,
        description: 'Numeric transaction identifier.',
        schema: { type: 'integer', minimum: 1, example: 42 },
      },
    },
    schemas: {
      ErrorDetail: {
        type: 'object',
        properties: {
          field: { type: 'string', example: 'email' },
          message: { type: 'string', example: 'email must be a valid email address' },
          code: { type: 'string', example: 'string.email' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'integer', example: 400 },
          message: { type: 'string', example: 'Invalid request body' },
          errors: {
            type: 'array',
            items: { $ref: '#/components/schemas/ErrorDetail' },
          },
        },
      },
      SuccessEnvelope: {
        type: 'object',
        properties: {
          statusCode: { type: 'integer', example: 200 },
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Success' },
          data: { nullable: true },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Mridul Sharma' },
          email: { type: 'string', format: 'email', example: 'mridul@example.com' },
          role: {
            type: 'string',
            enum: ['viewer', 'analyst', 'admin'],
            example: 'admin',
          },
          isActive: { type: 'boolean', example: true },
        },
      },
      AuthResponseData: {
        type: 'object',
        properties: {
          user: { $ref: '#/components/schemas/User' },
          accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', example: 'Mridul Sharma' },
          email: { type: 'string', format: 'email', example: 'mridul@example.com' },
          password: {
            type: 'string',
            format: 'password',
            minLength: 6,
            example: 'SecurePass123',
          },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'mridul@example.com' },
          password: { type: 'string', format: 'password', example: 'SecurePass123' },
        },
      },
      ChangePasswordRequest: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string', format: 'password', example: 'SecurePass123' },
          newPassword: { type: 'string', format: 'password', example: 'NewSecurePass456' },
        },
      },
      CreateUserRequest: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', example: 'Finance Analyst' },
          email: { type: 'string', format: 'email', example: 'analyst@example.com' },
          password: {
            type: 'string',
            format: 'password',
            minLength: 6,
            example: 'SecurePass123',
          },
          role: {
            type: 'string',
            enum: ['viewer', 'analyst', 'admin'],
            example: 'analyst',
          },
          isActive: { type: 'boolean', example: true },
        },
      },
      UpdateUserRoleRequest: {
        type: 'object',
        required: ['role'],
        properties: {
          role: {
            type: 'string',
            enum: ['viewer', 'analyst', 'admin'],
            example: 'viewer',
          },
        },
      },
      UpdateUserStatusRequest: {
        type: 'object',
        required: ['isActive'],
        properties: {
          isActive: { type: 'boolean', example: false },
        },
      },
      Transaction: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 42 },
          amount: { type: 'number', format: 'float', example: 2450.75 },
          type: {
            type: 'string',
            enum: ['income', 'expense', 'transfer'],
            example: 'income',
          },
          category: { type: 'string', example: 'Salary' },
          date: { type: 'string', format: 'date', example: '2026-03-15' },
          notes: { type: 'string', nullable: true, example: 'March salary credited' },
          createdBy: { type: 'integer', example: 1 },
          createdByName: { type: 'string', nullable: true, example: 'Admin User' },
        },
      },
      CreateTransactionRequest: {
        type: 'object',
        required: ['amount', 'type', 'category', 'date'],
        properties: {
          amount: { type: 'number', format: 'float', minimum: 0, example: 2450.75 },
          type: {
            type: 'string',
            enum: ['income', 'expense', 'transfer'],
            example: 'income',
          },
          category: { type: 'string', example: 'Salary' },
          date: { type: 'string', format: 'date', example: '2026-03-15' },
          notes: { type: 'string', nullable: true, example: 'March salary credited' },
        },
      },
      UpdateTransactionRequest: {
        type: 'object',
        properties: {
          amount: { type: 'number', format: 'float', minimum: 0, example: 120.5 },
          type: {
            type: 'string',
            enum: ['income', 'expense', 'transfer'],
            example: 'expense',
          },
          category: { type: 'string', example: 'Groceries' },
          date: { type: 'string', format: 'date', example: '2026-03-22' },
          notes: { type: 'string', nullable: true, example: 'Updated note' },
        },
      },
      CategoryBreakdownItem: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['income', 'expense', 'transfer'], example: 'expense' },
          category: { type: 'string', example: 'Rent' },
          transaction_count: { type: 'integer', example: 2 },
          total_amount: { type: 'number', format: 'float', example: 15000 },
        },
      },
      MonthlyTrendItem: {
        type: 'object',
        properties: {
          month: { type: 'string', format: 'date', example: '2026-03-01' },
          type: { type: 'string', enum: ['income', 'expense', 'transfer'], example: 'income' },
          transaction_count: { type: 'integer', example: 3 },
          total_amount: { type: 'number', format: 'float', example: 60000 },
        },
      },
      WeeklyTrendItem: {
        type: 'object',
        properties: {
          week_start: { type: 'string', format: 'date', example: '2026-03-16' },
          type: { type: 'string', enum: ['income', 'expense', 'transfer'], example: 'expense' },
          transaction_count: { type: 'integer', example: 4 },
          total_amount: { type: 'number', format: 'float', example: 5400.5 },
        },
      },
      DashboardSummary: {
        type: 'object',
        properties: {
          total_transactions: { type: 'integer', example: 18 },
          income_transactions: { type: 'integer', example: 7 },
          expense_transactions: { type: 'integer', example: 9 },
          transfer_transactions: { type: 'integer', example: 2 },
          total_income: { type: 'number', format: 'float', example: 125000 },
          total_expense: { type: 'number', format: 'float', example: 45200.75 },
          total_transfer_amount: { type: 'number', format: 'float', example: 14000 },
          netBalance: { type: 'number', format: 'float', example: 79799.25 },
          recentTransactions: {
            type: 'array',
            items: { $ref: '#/components/schemas/Transaction' },
          },
        },
      },
      DashboardInsights: {
        type: 'object',
        properties: {
          filters: {
            type: 'object',
            properties: {
              startDate: { type: 'string', format: 'date', nullable: true, example: '2026-01-01' },
              endDate: { type: 'string', format: 'date', nullable: true, example: '2026-03-31' },
            },
          },
          categoryBreakdown: {
            type: 'array',
            items: { $ref: '#/components/schemas/CategoryBreakdownItem' },
          },
          monthlyTrend: {
            type: 'array',
            items: { $ref: '#/components/schemas/MonthlyTrendItem' },
          },
          weeklyTrend: {
            type: 'array',
            items: { $ref: '#/components/schemas/WeeklyTrendItem' },
          },
        },
      },
    },
    responses: {
      BadRequest: {
        description: 'Invalid request payload, parameters, or query values.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
      Unauthorized: {
        description: 'Authentication is required or the token is invalid.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
      Forbidden: {
        description: 'Authenticated user does not have permission for this resource.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
      NotFound: {
        description: 'Requested resource was not found.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
      Conflict: {
        description: 'Request conflicts with existing data or business rules.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
      TooManyRequests: {
        description: 'Rate limit exceeded for this client.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
      InternalServerError: {
        description: 'Unexpected server error.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
    },
  },
};

const swaggerSpec = swaggerJsdoc({
  definition: swaggerDefinition,
  apis: [
    path.resolve(currentDirectory, '../app.js'),
    path.resolve(currentDirectory, '../routes/*.js'),
  ],
});

export default swaggerSpec;
