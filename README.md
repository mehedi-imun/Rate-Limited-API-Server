# Rate Limited API Server

Express.js API with authentication and rate limiting.

## Rate Limits

| User Type | Requests/Hour |
|-----------|---------------|
| Guest     | 3             |
| Free      | 10            |
| Premium   | 50            |

## Demo Users

- **alice** / pass123 (Free)
- **bob** / secret456 (Premium)

## Setup

```bash
npm install express body-parser
npx ts-node server.ts
```

Server runs at `http://localhost:5000`

## API Endpoints

### 1. Login
`POST /api/login`

```json
{
  "username": "alice",
  "password": "pass123"
}
```

### 2. Chat (Rate Limited)
`POST /api/chat`

Header: `Authorization: <token>`

### 3. Status
`GET /api/status`

Header: `Authorization: <token>`

## Postman Examples

### Login Request
```
POST http://localhost:5000/api/login
Content-Type: application/json

Body (raw JSON):
{
  "username": "alice",
  "password": "pass123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "abc123...",
  "user_type": "free"
}
```

### Chat Request
```
POST http://localhost:5000/api/chat
Authorization: abc123...
```

**Response:**
```json
{
  "success": true,
  "message": "This is a fake AI response.",
  "remaining_requests": 9
}
```

### Status Request
```
GET http://localhost:5000/api/status
Authorization: abc123...
```

**Response:**
```json
{
  "success": true,
  "remaining_requests": 9
}
```

### Rate Limit Exceeded
```json
{
  "success": false,
  "error": "Too many requests. free users can make 10 requests per hour.",
  "remaining_requests": 0
}
```

## Notes

- In-memory storage (resets on restart)
- Rate limits reset after 1 hour
- Guest users tracked by IP