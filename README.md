# LedgrAPI

A robust, secure, and highly-structured backend API for managing financial records, user roles, and generating aggregated dashboard insights.

## 🚀 Key Features

- **Advanced Authentication**: Implements a highly secure, hybrid auth system using short-lived JWT Access Tokens and rotatable, database-backed Refresh Tokens stored in `HttpOnly` cookies to mitigate XSS attacks.
- **Role-Based Access Control (RBAC)**: Strict separation of privileges across three tiers:
  - `Viewer`: Read-only access to dashboard summaries.
  - `Analyst`: Read access to dashboard insights and transaction lists.
  - `Admin`: Full mutation access (Create, Update, Delete) for users and transactions.
- **Financial Records Management**: Full CRUD support for income, expenses, and transfers with dynamic filtering and search capabilities.
- **Data Integrity & Audit Logging**: 
  - Uses **Soft Deletes** (`is_deleted = TRUE`) instead of hard deletions to preserve historical records.
  - Database transactions (`BEGIN`/`COMMIT`/`ROLLBACK`) ensure atomic operations.
  - Tracks all mutations in an `audit_logs` table.
- **Robust Validation Layer**: Centralized input validation using `Joi` intercepting bad requests before they reach the controller layer.
- **Dashboard Aggregations**: Advanced PostgreSQL aggregations (`DATE_TRUNC`, `FILTER`) to efficiently serve monthly/weekly trends and category breakdowns.

---

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (via `pg-pool`)
- **Validation**: Joi
- **Security**: `bcryptjs` (Password Hashing), `jsonwebtoken` (Auth)
- **Documentation**: Swagger / OpenAPI (via inline JSDoc comments)

---

## 🏗️ Architecture & Design Decisions

This application strictly adheres to a **Layered Architecture** to separate concerns and ensure maintainability:

1. **Routes (`/routes`)**: Defines API endpoints, attaches middleware (Auth, RBAC, Rate Limiting), and points to controllers.
2. **Validators (`/validators` & `/middleware/validate.js`)**: Uses Joi schemas to strictly validate incoming `body`, `query`, and `params`. Invalid requests are rejected with a clean `400 Bad Request` before controller execution.
3. **Controllers (`/controllers`)**: Minimal pass-through functions. They extract validated data from the request, pass it to the service layer, and format the HTTP response.
4. **Services (`/services`)**: Contains all core business logic and direct database interactions. 

### Security Highlights
- **SQL Injection Prevention**: 100% usage of parameterized queries (`$1, $2`) via the `pg` library.
- **XSS Mitigation**: Refresh tokens are exclusively handled via `HttpOnly`, `Secure`, `SameSite=Strict` cookies.
- **Refresh Token Rotation**: Every time a refresh token is used, the session is invalidated and a new token is issued, minimizing the attack window for stolen tokens.
- **Instant Revocation**: Password changes or admin role demotions increment a `token_version` on the user record, instantly invalidating all active sessions and floating access tokens.

---

## 🚦 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- PostgreSQL (v14 or higher recommended)

### 1. Clone the repository
```bash
git clone <repository-url>
cd LedgrAPI
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory based on the provided `.env.example`:

```bash
cp .env.example .env
```

Update the `.env` file with your local PostgreSQL credentials and secure JWT secrets.

### 4. Database Setup
Create a new PostgreSQL database and run the initialization script to generate the required tables:

```bash
# Assuming you have psql installed
psql -U postgres -d <your_database_name> -f init.sql
```
*(Note: Ensure you have created the `init.sql` file containing your schema)*

### 5. Start the Application

**Development Mode (with auto-reload):**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

The API will be available at `http://localhost:3000/api/v1`.

---

## 📄 Environment Variables (`.env.example`)

```ini
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration (PostgreSQL)
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ledgrapi_db

# Security / Authentication
BCRYPT_SALT_ROUNDS=10

# JWT Secrets (Use strong, random strings in production)
JWT_ACCESS_SECRET=super_secret_access_key_change_me
JWT_REFRESH_SECRET=super_secret_refresh_key_change_me

# Token Lifespans
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

---

## 📚 API Endpoints Overview

### Authentication (`/api/v1/auth`)
- `POST /register` - Register a new user
- `POST /login` - Authenticate and receive tokens
- `POST /refresh` - Get a new access token via HttpOnly cookie
- `POST /logout` - Revoke current session
- `GET /me` - Get current user profile
- `POST /change-password` - Update user password

### Users (`/api/v1/users`) - *Requires Admin*
- `GET /` - List all users
- `GET /:userId` - Get user by ID
- `POST /` - Create a new user with specific role
- `PATCH /:userId/role` - Update a user's role
- `PATCH /:userId/status` - Activate/Deactivate a user

### Transactions (`/api/v1/transactions`)
- `GET /` - List transactions (Filters: `type`, `category`, `startDate`, `endDate`, `search`) *(Requires Analyst/Admin)*
- `GET /:transactionId` - Get transaction by ID *(Requires Analyst/Admin)*
- `POST /` - Create a transaction *(Requires Admin)*
- `PATCH /:transactionId` - Update a transaction *(Requires Admin)*
- `DELETE /:transactionId` - Soft delete a transaction *(Requires Admin)*

### Dashboard (`/api/v1/dashboard`)
- `GET /summary` - Get high-level totals (Income, Expense, Net Balance) *(Requires Viewer/Analyst/Admin)*
- `GET /insights` - Get category breakdowns and monthly/weekly trends *(Requires Analyst/Admin)*

---

## 🛡️ License
This project is licensed under the MIT License.