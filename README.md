# Personalized Email Campaign API

An API service for sending customized emails based on user behavior tracking.

## Features

- 📊 **User Behavior Tracking**: Track user interactions with your application
- 📧 **Email Customization**: Create email templates with dynamic content
- 🔄 **Campaign Management**: Set up and manage email campaigns
- 📅 **Scheduling**: Schedule emails based on user actions or time intervals
- 📊 **Analytics**: Track open rates, click-through rates, and conversions

## Technology Stack

- **Backend**: Node.js, Express
- **Database**: MongoDB
- **Email Service**: Nodemailer with SMTP support
- **Authentication**: JWT (JSON Web Tokens)
- **Documentation**: Swagger/OpenAPI

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- SMTP Server access (or use a service like SendGrid, Mailgun, etc.)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Latex999/personalized-email-campaign-api.git
   cd personalized-email-campaign-api
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` with your specific configurations.

4. Start the development server:
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3000`.

## API Documentation

Once the server is running, you can access the Swagger documentation at:
`http://localhost:3000/api-docs`

## Configuration

The `.env` file contains all necessary configurations:

```
# Server
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/email-campaign-api

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# SMTP
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_password
EMAIL_FROM=your_email@example.com
```

## Using the API

### Authentication

All API endpoints (except registration and login) require authentication using JWT token.

```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Creating Email Templates

You can create reusable email templates with variable placeholders:

```json
POST /api/templates
{
  "name": "Welcome Email",
  "subject": "Welcome to {{company_name}}!",
  "body": "Hello {{user_name}},\n\nWelcome to {{company_name}}. We're glad you've joined us!"
}
```

### Tracking User Behavior

Track user actions to trigger personalized emails:

```json
POST /api/events
{
  "userId": "user_id",
  "eventType": "product_viewed",
  "metadata": {
    "productId": "product_123",
    "productName": "Example Product"
  }
}
```

### Creating Campaigns

Set up campaigns that trigger emails based on user behavior:

```json
POST /api/campaigns
{
  "name": "Product View Follow-up",
  "templateId": "template_id",
  "triggerEvent": "product_viewed",
  "delay": 3600,  // seconds
  "conditions": {
    "metadata.productId": { "exists": true }
  }
}
```

## License

MIT