# Test Credentials for Supabase Auth

## Authentication Method
- **Type**: Google OAuth via Supabase
- **No password-based credentials** - Authentication is handled entirely through Google OAuth

## Google OAuth Test Accounts
To test the application, use any Google account that has been authorized in the Google Cloud Console OAuth consent screen.

### Authorized Domain
- Supabase handles the OAuth flow
- Users authenticate with their Google accounts
- User data is stored in MongoDB after successful authentication

## Testing the Application

### 1. Login Flow
1. Visit the application at: https://supabase-auth-hub.preview.emergentagent.com/login
2. Click "Continue with Google"
3. Authenticate with your Google account
4. You'll be redirected to the dashboard

### 2. User Data Storage
After successful login:
- User information is stored in MongoDB `users` collection
- Fields stored: `user_id`, `email`, `full_name`, `avatar_url`, `created_at`
- Custom `user_id` field is used (not MongoDB's `_id`)

### 3. Protected API Endpoints
All API calls to protected endpoints require a valid Supabase JWT token:
- GET `/api/auth/me` - Get current user information
- GET `/api/status` - Get status checks for current user
- POST `/api/status` - Create a new status check

## MongoDB Collections

### Users Collection
```json
{
  "user_id": "uuid-from-supabase",
  "email": "user@example.com",
  "full_name": "User Name",
  "avatar_url": "https://...",
  "created_at": "2024-01-01T00:00:00Z"
}
```

### Status Checks Collection
```json
{
  "id": "uuid",
  "client_name": "Client Name",
  "timestamp": "2024-01-01T00:00:00Z",
  "user_id": "uuid-from-supabase"
}
```

## Important Notes
- All MongoDB queries exclude the `_id` field using `{"_id": 0}` projection
- Custom `user_id` field is used for user identification
- JWT tokens are verified on the backend using the Supabase JWT secret
- CORS is configured to allow credentials from the frontend
