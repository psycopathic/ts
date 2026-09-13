# Backend

Basic TypeScript/Express backend with PostgreSQL support and shared API utilities.

## Run locally

1. Run `npm install` inside `backend/`.
2. Copy `.env.example` to `.env` and update your configuration.
3. Run `npm run dev` for development with automatic restarts.
4. Open `http://localhost:5000/api/health`.

Use `npm run typecheck` to check types, `npm run build` to compile, and `npm start` to run the compiled server.

## Source files

- `src/app.ts`: Express middleware and routes.
- `src/index.ts`: Server startup and graceful shutdown.
- `src/config/env.ts`: Environment loading and validation.
- `src/config/db.ts`: Shared PostgreSQL connection pool.
- `src/utils/logger.ts`: Structured Winston console logger.
- `src/utils/ApiError.ts`: HTTP errors with optional details.
- `src/utils/ApiResponse.ts`: Consistent successful response shape.
- `src/utils/asyncHandler.ts`: Async route error forwarding.
- `src/middleware/errorHandler.ts`: Central JSON error responses.

PostgreSQL connections are created on demand. The health endpoint checks that HTTP is running; it does not check database connectivity. Configure `DATABASE_URL` before using `pool.query()` in database-backed routes.

`jsonwebtoken` and `bcryptjs` are installed for future authentication routes; configure a strong `JWT_SECRET` before adding token signing. Zod is available for request validation and is already used for environment validation.

Requests are limited to 100 per IP per 15 minutes using an in-memory store. Set `CORS_ORIGIN` to your frontend URL. When deploying behind a reverse proxy, configure Express `trust proxy` for your actual proxy topology so rate limiting uses the client IP correctly.
