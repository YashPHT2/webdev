# Assessli Backend Server

Node.js/Express backend server with MongoDB for the Assessli Smart Academic Mentor application.

## Features

- RESTful API architecture
- MongoDB integration with Mongoose ODM
- CORS enabled for frontend integration
- Environment-based configuration
- Comprehensive error handling
- Request logging middleware
- Modular route structure

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Environment**: dotenv for configuration
- **Development**: Nodemon for hot-reloading

## Project Structure

```
server/
├── src/
│   ├── config/
│   │   └── database.js          # MongoDB connection configuration
│   ├── models/
│   │   ├── User.js              # User schema with preferences and stats
│   │   ├── Task.js              # Task schema with urgency, difficulty, status
│   │   ├── StudyPlan.js         # Study plan with sessions and goals
│   │   └── ChatHistory.js       # Chat conversation history
│   ├── controllers/
│   │   ├── taskController.js    # Task management logic
│   │   ├── chatController.js    # Chat API logic
│   │   ├── studyPlanController.js  # Study plan management
│   │   └── motivationController.js # Motivational content
│   ├── routes/
│   │   ├── taskRoutes.js
│   │   ├── chatRoutes.js
│   │   ├── studyPlanRoutes.js
│   │   └── motivationRoutes.js
│   ├── middleware/
│   │   ├── errorHandler.js      # Global error handling
│   │   └── requestLogger.js     # HTTP request logging
│   └── server.js                # Application entry point
├── .env.example                 # Environment variables template
├── package.json
└── README.md
```

## Installation

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher) - Local installation or MongoDB Atlas account
- npm or yarn package manager

### Setup Steps

1. **Navigate to the server directory:**
   ```bash
   cd server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```

4. **Edit the `.env` file with your configuration:**
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/assessli
   CORS_ORIGIN=http://localhost:8000
   ```

### MongoDB Setup

#### Option 1: Local MongoDB

1. Install MongoDB Community Edition:
   - **macOS**: `brew install mongodb-community`
   - **Ubuntu**: Follow [official guide](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/)
   - **Windows**: Download from [MongoDB website](https://www.mongodb.com/try/download/community)

2. Start MongoDB service:
   ```bash
   # macOS
   brew services start mongodb-community
   
   # Ubuntu
   sudo systemctl start mongod
   
   # Windows
   net start MongoDB
   ```

3. Verify MongoDB is running:
   ```bash
   mongosh
   ```

#### Option 2: MongoDB Atlas (Cloud)

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Set up database user credentials
4. Whitelist your IP address (or use 0.0.0.0/0 for development)
5. Get your connection string and update `.env`:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/assessli?retryWrites=true&w=majority
   ```

## Running the Server

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on the configured port (default: 5000).

## API Endpoints

### Health Check
- `GET /` - API information
- `GET /api/health` - Server health status

### Tasks
- `GET /api/tasks` - Get all tasks
- `GET /api/tasks/:id` - Get task by ID
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

**Task Schema Fields:**
- `title`, `description`, `subject`, `dueDate`
- `priority`: Low, Medium, High, Urgent
- `urgency`: low, medium, high, critical
- `difficulty`: easy, moderate, challenging, difficult
- `status`: pending, in-progress, completed, overdue, cancelled
- `estimatedDuration`, `actualDuration`, `tags`, `notes`

### Chat
- `POST /api/chat` - Send chat message
- `POST /api/chat/session` - Create new chat session
- `GET /api/chat/history/:sessionId` - Get chat history
- `DELETE /api/chat/history/:sessionId` - Delete chat history

### Study Plans
- `GET /api/study-plans` - Get all study plans
- `GET /api/study-plans/:id` - Get study plan by ID
- `POST /api/study-plans` - Create new study plan
- `PUT /api/study-plans/:id` - Update study plan
- `DELETE /api/study-plans/:id` - Delete study plan
- `POST /api/study-plans/:id/sessions` - Add study session

### Motivation
- `GET /api/motivation/message` - Get random motivational message
- `GET /api/motivation/quote` - Get daily quote
- `GET /api/motivation/tip` - Get study tip

## Database Models

### User Model
- Authentication and profile information
- User preferences (theme, notifications)
- Statistics (tasks completed, study hours, streak)

### Task Model
- Comprehensive task management
- Multiple priority and difficulty levels
- Status tracking with timestamps
- Support for tags and notes

### StudyPlan Model
- Multi-subject study planning
- Study sessions with time tracking
- Goals and milestones
- Progress calculation methods

### ChatHistory Model
- Conversation history with role-based messages
- Context preservation for multi-step flows
- Metadata support for AI integration
- Session management

## Testing the API

### Using cURL

```bash
# Health check
curl http://localhost:5000/api/health

# Get all tasks
curl http://localhost:5000/api/tasks

# Create a task
curl -X POST http://localhost:5000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Study Math",
    "description": "Complete chapter 5",
    "subject": "Mathematics",
    "dueDate": "2024-12-31",
    "priority": "High"
  }'

# Get motivational message
curl http://localhost:5000/api/motivation/message
```

### Using Postman or Thunder Client

Import the following base URL: `http://localhost:5000/api`

## Development Notes

### Current Implementation Status

The current implementation provides:
- ✅ Complete folder structure
- ✅ All required dependencies
- ✅ MongoDB connection helper
- ✅ Comprehensive Mongoose schemas
- ✅ Route scaffolds with placeholder responses
- ✅ Error handling and logging middleware

### Next Steps for Production

1. **Authentication & Authorization**
   - Implement JWT-based authentication
   - Add user registration and login endpoints
   - Protect routes with auth middleware

2. **Real Database Operations**
   - Replace placeholder responses with actual database queries
   - Implement data validation
   - Add pagination and filtering

3. **AI Integration**
   - Integrate with AI service (OpenAI, etc.)
   - Implement intelligent chat responses
   - Add task and study plan recommendations

4. **Testing**
   - Add unit tests (Jest, Mocha)
   - Integration tests for API endpoints
   - Database testing with test fixtures

5. **Security**
   - Input validation and sanitization
   - Rate limiting
   - HTTPS configuration
   - Security headers (helmet.js)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `NODE_ENV` | Environment mode | development |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/assessli |
| `CORS_ORIGIN` | Allowed CORS origin | http://localhost:8000 |

## Troubleshooting

### MongoDB Connection Issues

1. **Connection Refused**: Ensure MongoDB is running
2. **Authentication Failed**: Check username/password in connection string
3. **Network Error**: Verify IP whitelist in MongoDB Atlas

### Port Already in Use

```bash
# Find process using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>
```

### Module Not Found Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Contributing

When adding new features:
1. Follow the existing folder structure
2. Create models in `/models`
3. Create controllers in `/controllers`
4. Create routes in `/routes`
5. Update this README with new endpoints

## License

MIT
