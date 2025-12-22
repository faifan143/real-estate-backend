# Environment Variables

This document describes all environment variables used by the application.

## Required Variables

### DATABASE_URL
- **Description**: PostgreSQL database connection string
- **Default**: `postgresql://postgres:postgres@db:5432/realestate` (for docker-compose)
- **Example**: `postgresql://user:password@localhost:5432/realestate`

### JWT_SECRET
- **Description**: Secret key for JWT token signing (IMPORTANT: Change in production!)
- **Default**: `your-secret-key-change-in-production`
- **Example**: Generate a strong random string: `openssl rand -base64 32`

## Optional Variables

### PORT
- **Description**: Port number for the server
- **Default**: `3000`

### HOST
- **Description**: Host address to bind the server
- **Default**: `0.0.0.0`

### BASE_URL
- **Description**: Base URL for generating image URLs
- **Default**: `http://localhost:3000`
- **Example**: `https://yourdomain.com` (for production)

### ADMIN_EMAIL
- **Description**: Email for the admin user (used during seeding)
- **Default**: `admin@example.com`

### ADMIN_PASSWORD
- **Description**: Password for the admin user (used during seeding)
- **Default**: `admin123`

## Using with Docker Compose

Create a `.env` file in the project root with your values:

```bash
# .env
JWT_SECRET=your-strong-secret-key-here
BASE_URL=http://your-server-ip:3000
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your-secure-password
```

The docker-compose.yml will automatically load these values.

