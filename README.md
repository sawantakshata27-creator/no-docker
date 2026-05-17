# Supabase Auth Application

A full-stack application with **Supabase Authentication** and **Google OAuth** integration.

## 🚀 Features

- ✅ **Supabase Authentication** with Google OAuth
- ✅ **Protected Routes** on frontend and backend
- ✅ **JWT Token Verification** on backend
- ✅ **User Management** with MongoDB
- ✅ **Beautiful UI** with Tailwind CSS
- ✅ **Real-time Status Checks** with protected API endpoints

## 🏗️ Tech Stack

### Frontend
- React 19
- React Router v7
- Supabase JS Client
- Axios for API calls
- Tailwind CSS for styling

### Backend
- FastAPI (Python)
- MongoDB with Motor (async driver)
- JWT token verification
- Supabase Auth integration

## 📦 Prerequisites

- Node.js & Yarn
- Python 3.11+
- MongoDB
- Supabase Project
- Google OAuth Credentials (configured in Supabase)

## 🔧 Environment Variables

### Frontend (.env)
```env
REACT_APP_BACKEND_URL=https://your-app.preview.emergentagent.com
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Backend (.env)
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
CORS_ORIGINS=*
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_JWT_SECRET=your-supabase-jwt-secret
```

## 🚀 Getting Started

### 1. Install Dependencies

**Frontend:**
```bash
cd frontend
yarn install
```

**Backend:**
```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Enable Google OAuth:
   - Go to **Authentication → Providers → Google**
   - Add your Google OAuth credentials
3. Get your credentials:
   - **Project URL**: Settings → API → Project URL
   - **Anon Key**: Settings → API → Project API keys → anon public
   - **JWT Secret**: Settings → API → JWT Settings → JWT Secret

### 3. Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URIs from Supabase dashboard
4. Add the credentials to Supabase (step 2 above)

### 4. Run the Application

**Start Backend:**
```bash
cd backend
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

**Start Frontend:**
```bash
cd frontend
yarn start
```

**Start MongoDB:**
```bash
mongod
```

Or use supervisor to run all services:
```bash
sudo supervisorctl restart all
```

## 📚 API Endpoints

### Public Endpoints
- `GET /api/` - Hello World
- `GET /api/health` - Health check

### Protected Endpoints (Require Authentication)
- `GET /api/auth/me` - Get current user info
- `GET /api/status` - Get user's status checks
- `POST /api/status` - Create new status check

## 🔐 Authentication Flow

1. User clicks "Continue with Google" on login page
2. Redirected to Google OAuth consent screen
3. After approval, Supabase handles the callback
4. User redirected to dashboard with active session
5. Frontend automatically includes JWT token in API requests
6. Backend verifies token and processes requests

## 🗄️ Database Schema

### Users Collection
```json
{
  "user_id": "string (UUID from Supabase)",
  "email": "string",
  "full_name": "string",
  "avatar_url": "string",
  "created_at": "datetime"
}
```

### Status Checks Collection
```json
{
  "id": "string (UUID)",
  "client_name": "string",
  "timestamp": "datetime",
  "user_id": "string (references users.user_id)"
}
```

## 🧪 Testing

1. Visit the login page
2. Click "Continue with Google"
3. Sign in with your Google account
4. Access the protected dashboard
5. Create status checks using the "Create Status Check" button
6. Verify data is saved and retrieved correctly

## 📁 Project Structure

```
/app/
├── backend/
│   ├── server.py           # FastAPI application
│   ├── requirements.txt    # Python dependencies
│   └── .env               # Backend environment variables
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   │   └── ProtectedRoute.js
│   │   ├── contexts/      # React contexts
│   │   │   └── AuthContext.js
│   │   ├── lib/          # Utilities
│   │   │   ├── supabaseClient.js
│   │   │   └── apiClient.js
│   │   ├── pages/        # Page components
│   │   │   ├── Login.js
│   │   │   └── Dashboard.js
│   │   ├── App.js        # Main app component
│   │   └── index.js      # Entry point
│   ├── package.json      # Node dependencies
│   └── .env             # Frontend environment variables
└── README.md            # This file
```

## 🔒 Security Features

- ✅ JWT token verification on backend
- ✅ Protected routes on frontend
- ✅ HTTP-only cookies (when needed)
- ✅ CORS configuration
- ✅ Token expiration handling
- ✅ Automatic token refresh via Supabase
- ✅ Custom user_id (avoiding MongoDB _id serialization issues)

## 🚨 Important Notes

1. **MongoDB _id Field**: All queries use `{"_id": 0}` projection to exclude MongoDB's internal _id
2. **Custom user_id**: Application uses custom UUID-based user_id field
3. **CORS**: Configured to allow credentials from frontend
4. **Token Storage**: Supabase handles token storage automatically
5. **API Prefix**: All API routes must include `/api` prefix for proper routing

## 📝 License

MIT License - feel free to use this project for learning and development.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📞 Support

For issues or questions, please open an issue on GitHub.

---

Built with ❤️ using Supabase, React, FastAPI, and MongoDB
