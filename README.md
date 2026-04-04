# LedgrAPI

A structured backend API for user management, role-based access control, financial records, and dashboard insights.

## Overview

This project is built to demonstrate:

- User and role management
- Financial transaction CRUD operations
- Dashboard summary and trend APIs
- Backend-level RBAC enforcement
- Input validation and consistent error handling
- PostgreSQL-based persistence

## Tech Stack

- Node.js
- Express.js
- PostgreSQL
- Joi
- JWT
- Swagger / OpenAPI

## Key Features

- JWT access tokens with refresh token rotation
- Role-based access control for `viewer`, `analyst`, and `admin`
- User management with role updates and active/inactive status
- Transaction create, read, update, delete, filtering, and pagination
- Dashboard summary APIs for totals, recent activity, category totals, and trends
- Soft delete for transactions
- Audit logging for transaction changes
- Request validation with Joi
- Rate limiting for API, auth, and mutation routes
- Seed script for demo users and sample financial records

## Architecture

The application follows a layered structure:

1. `routes` define endpoints and attach middleware.
2. `middleware` handles authentication, RBAC, validation, and rate limiting.
3. `controllers` handle request/response flow.
4. `services` contain business logic and database queries.
5. `db` contains migrations and seed utilities.

This structure keeps responsibilities separated and makes the code easier to maintain and extend.

## Roles

- `viewer`: Can access dashboard summary data
- `analyst`: Can view transactions and dashboard insights
- `admin`: Can manage users and perform full transaction mutations

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file using `.env.example` and update the database and JWT values.

Example variables:

```ini
PORT=3000
NODE_ENV=development

DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ledgrapi_db

BCRYPT_SALT_ROUNDS=10
JWT_ACCESS_SECRET=super_secret_access_key_change_me
JWT_REFRESH_SECRET=super_secret_refresh_key_change_me
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

### 3. Run migrations

```bash
npm run migrate
```

### 4. Seed demo data

```bash
npm run seed
```

The seed script is idempotent for the included users and sample transactions, so it can be run multiple times safely.

### 5. Start the server

Development:

```bash
npm run dev
```

Production:

```bash
npm start
```

The API will be available at `http://localhost:3000/api/v1` when `PORT=3000`.

## Available Scripts

- `npm run dev` - start the server with nodemon
- `npm start` - start the server with Node.js
- `npm run migrate` - run SQL migrations
- `npm run seed` - insert demo users and transactions
- `npm test` - run validation and middleware tests
- `npm run lint` - run ESLint

## Demo Seed Credentials

After running `npm run seed`, you can use:

- `admin@ledgr.local` / `Admin123!`
- `analyst@ledgr.local` / `Analyst123!`
- `viewer@ledgr.local` / `Viewer123!`
- `inactive@ledgr.local` / `Inactive123!`

## API Documentation

- Swagger UI: `http://localhost:3000/api-docs`
- OpenAPI JSON: `http://localhost:3000/api-docs.json`
- Health check: `http://localhost:3000/health`

## API Endpoints

### Auth

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/change-password`

### Users

Admin only:

- `GET /api/v1/users`
- `GET /api/v1/users/:userId`
- `POST /api/v1/users`
- `PATCH /api/v1/users/:userId/role`
- `PATCH /api/v1/users/:userId/status`

### Transactions

- `GET /api/v1/transactions`
  Supports: `type`, `category`, `startDate`, `endDate`, `search`, `page`, `limit`
- `GET /api/v1/transactions/:transactionId`
- `POST /api/v1/transactions`
- `PATCH /api/v1/transactions/:transactionId`
- `DELETE /api/v1/transactions/:transactionId`

### Dashboard

- `GET /api/v1/dashboard/summary`
  Supports optional `limit` for recent transactions
- `GET /api/v1/dashboard/insights`
  Supports optional `startDate` and `endDate`

## Validation and Error Handling

- Request bodies, params, and query strings are validated with Joi
- Invalid requests return structured `400` responses
- Auth and permission failures return `401` or `403`
- Not found resources return `404`
- Rate-limited requests return `429`
- Unexpected failures return `500`

## Technical Decisions and Trade-offs

This backend uses Express and PostgreSQL to keep the system lightweight, structured, and practical for a financial API. PostgreSQL was chosen because the data is relational and it handles filtering and aggregation well. Raw SQL was used instead of an ORM to keep database behavior explicit and to have direct control over summary queries, with the trade-off of writing more manual query logic.

The project is organized into routes, middleware, controllers, services, and validators to keep responsibilities clear and the code maintainable. JWT authentication with refresh token rotation was used for secure session handling, while RBAC middleware keeps permissions easy to understand and enforce. Overall, the design prioritizes clarity, security, and realistic backend structure over unnecessary complexity.

## Additional Notes

This project uses PostgreSQL, so a running database and correct environment configuration are required before starting the server. To run the project, install dependencies, configure the `.env` file, run `npm run migrate`, optionally load demo data with `npm run seed`, and then start the server with `npm run dev` or `npm start`. Validation tests and linting can be run with `npm test` and `npm run lint`.

In addition to the core requirements, the project includes refresh token rotation, rate limiting, soft delete for transactions, audit logging, Swagger documentation, and seed data for easier evaluation. If extended further, the next improvements would be broader integration testing, seed reset helpers, and more granular permission controls.

## License

This project is licensed under the MIT License.
