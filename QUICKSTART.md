# Assessli - Quick Start Guide

Get the Assessli Smart Academic Mentor up and running in minutes!

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas account)
- A modern web browser

## Quick Setup (Development)

### 1. Install Backend Dependencies

```bash
cd server
npm install
```

### 2. Configure Environment

```bash
cd server
cp .env.example .env
```

The default `.env` works for local development:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/assessli
CORS_ORIGIN=http://localhost:8000
```

### 3. Start MongoDB

**Local MongoDB:**
```bash
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows
net start MongoDB
```

**MongoDB Atlas:**
- Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- Get your connection string
- Update `MONGODB_URI` in `.env`

### 4. Start the Backend Server

```bash
cd server
npm run dev
```

You should see:
```
Server is running on port 5000
Environment: development
API endpoints available at http://localhost:5000/api
```

### 5. Start the Frontend

Open a new terminal:

```bash
# From project root
python3 -m http.server 8000
```

Or simply open `index.html` in your browser.

### 6. Access the Application

Open your browser and navigate to:
- **Frontend**: http://localhost:8000
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/api/health

## Verify Installation

Test the API endpoints:

```bash
# Health check
curl http://localhost:5000/api/health

# Get tasks
curl http://localhost:5000/api/tasks

# Get motivational message
curl http://localhost:5000/api/motivation/message

# Send chat message
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello"}'
```

## Project Structure Overview

```
assessli/
├── server/              # Backend (Node.js/Express/MongoDB)
│   ├── src/
│   │   ├── models/      # Database schemas
│   │   ├── routes/      # API routes
│   │   ├── controllers/ # Business logic
│   │   └── server.js    # Entry point
│   └── package.json
├── index.html           # Frontend dashboard
├── styles.css           # Styling
└── script.js            # Frontend logic
```

## Available API Endpoints

### Tasks
- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Chat
- `POST /api/chat` - Send message
- `POST /api/chat/session` - Create session
- `GET /api/chat/history/:sessionId` - Get history

### Study Plans
- `GET /api/study-plans` - Get all plans
- `POST /api/study-plans` - Create plan
- `POST /api/study-plans/:id/sessions` - Add session

### Motivation
- `GET /api/motivation/message` - Get message
- `GET /api/motivation/quote` - Get quote
- `GET /api/motivation/tip` - Get study tip

## Common Issues

### Port Already in Use

```bash
# Find process using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>
```

### MongoDB Connection Error

1. Ensure MongoDB is running:
   ```bash
   # Check if MongoDB is running
   ps aux | grep mongod
   ```

2. Check connection string in `.env`

3. For MongoDB Atlas, verify:
   - IP whitelist includes your IP
   - Username/password are correct
   - Database name matches

### Module Not Found

```bash
cd server
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

1. **Explore the frontend**: Open http://localhost:8000 and interact with the chatbot
2. **Test API endpoints**: Use Postman, curl, or Thunder Client
3. **Read documentation**:
   - [Backend README](server/README.md) - Detailed backend documentation
   - [Main README](README.md) - Full project documentation
4. **Customize**: Modify schemas, add authentication, integrate AI services

## Development Tips

- **Hot-reload**: Use `npm run dev` in the server directory for automatic restarts
- **Logging**: Check console output for request logs and errors
- **Database**: Use MongoDB Compass or mongosh to inspect data
- **Frontend**: Browser DevTools for debugging client-side code

## Need Help?

- Check [server/README.md](server/README.md) for detailed backend documentation
- Review [README.md](README.md) for frontend and API integration details
- Ensure all prerequisites are installed and services are running

---

**Happy Coding! 🚀**
