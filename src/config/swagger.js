import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'LedgrAPI',
    version: '1.0.0',
    description: 'API documentation for the LedgrAPI financial management system.',
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    parameters: {
      StartDate: {
        name: 'startDate',
        in: 'query',
        description: 'Filter by start date (YYYY-MM-DD)',
        schema: { type: 'string', format: 'date' },
      },
      EndDate: {
        name: 'endDate',
        in: 'query',
        description: 'Filter by end date (YYYY-MM-DD)',
        schema: { type: 'string', format: 'date' },
      },
      TransactionId: {
        name: 'transactionId',
        in: 'path',
        required: true,
        schema: { type: 'integer' },
      },
      UserId: {
        name: 'userId',
        in: 'path',
        required: true,
        schema: { type: 'integer' },
      },
    },
    responses: {
      BadRequest: { description: 'Bad Request - Invalid input data' },
      Unauthorized: { description: 'Unauthorized - Missing or invalid token' },
      Forbidden: { description: 'Forbidden - Insufficient permissions' },
      NotFound: { description: 'Not Found - Resource does not exist' },
      Conflict: { description: 'Conflict - Resource already exists' },
      TooManyRequests: { description: 'Too Many Requests - Rate limit exceeded' },
      InternalServerError: { description: 'Internal Server Error' },
    },
    schemas: {
      SuccessEnvelope: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'integer', example: 200 },
          message: { type: 'string', example: 'Operation successful' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['viewer', 'analyst', 'admin'] },
          isActive: { type: 'boolean' },
        },
      },
      Transaction: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          amount: { type: 'number' },
          type: { type: 'string', enum: ['income', 'expense', 'transfer'] },
          category: { type: 'string' },
          date: { type: 'string', format: 'date' },
          notes: { type: 'string', nullable: true },
          createdBy: { type: 'integer' },
          createdByName: { type: 'string' },
        },
      },
      AuthResponseData: {
        type: 'object',
        properties: {
          user: { $ref: '#/components/schemas/User' },
          accessToken: { type: 'string' },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
      ChangePasswordRequest: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string' },
          newPassword: { type: 'string', minLength: 6 },
        },
      },
      CreateUserRequest: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          role: { type: 'string', enum: ['viewer', 'analyst', 'admin'], default: 'viewer' },
          isActive: { type: 'boolean', default: true },
        },
      },
      UpdateUserRoleRequest: {
        type: 'object',
        required: ['role'],
        properties: {
          role: { type: 'string', enum: ['viewer', 'analyst', 'admin'] },
        },
      },
      UpdateUserStatusRequest: {
        type: 'object',
        required: ['isActive'],
        properties: {
          isActive: { type: 'boolean' },
        },
      },
      CreateTransactionRequest: {
        type: 'object',
        required: ['amount', 'type', 'category', 'date'],
        properties: {
          amount: { type: 'number', minimum: 0 },
          type: { type: 'string', enum: ['income', 'expense', 'transfer'] },
          category: { type: 'string' },
          date: { type: 'string', format: 'date' },
          notes: { type: 'string', nullable: true },
        },
      },
      UpdateTransactionRequest: {
        type: 'object',
        properties: {
          amount: { type: 'number', minimum: 0 },
          type: { type: 'string', enum: ['income', 'expense', 'transfer'] },
          category: { type: 'string' },
          date: { type: 'string', format: 'date' },
          notes: { type: 'string', nullable: true },
        },
      },
      DashboardSummary: {
        type: 'object',
        properties: {
          total_transactions: { type: 'integer' },
          income_transactions: { type: 'integer' },
          expense_transactions: { type: 'integer' },
          transfer_transactions: { type: 'integer' },
          total_income: { type: 'number' },
          total_expense: { type: 'number' },
          total_transfer_amount: { type: 'number' },
          netBalance: { type: 'number' },
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
              startDate: { type: 'string', format: 'date', nullable: true },
              endDate: { type: 'string', format: 'date', nullable: true },
            },
          },
          categoryBreakdown: { type: 'array', items: { type: 'object' } },
          monthlyTrend: { type: 'array', items: { type: 'object' } },
          weeklyTrend: { type: 'array', items: { type: 'object' } },
        },
      },
    },
  },
};

const options = {
  swaggerDefinition,
  // Paths to files containing OpenAPI definitions
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

export const setupSwagger = (app) => {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  console.log('📄 Swagger documentation available at /api/docs');
};
