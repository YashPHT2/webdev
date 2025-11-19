#!/bin/bash
# Test script for Assessli Backend API

BASE_URL="http://localhost:5000"
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

say_ok() { echo -e "${GREEN}✓ $1${NC}"; }
say_err() { echo -e "${RED}✗ $1${NC}"; }

echo "======================================"
echo "Assessli Backend API Test Suite"
echo "======================================"
echo ""

# Test root endpoint
echo "Testing: GET /"
RESPONSE=$(curl -s "$BASE_URL/")
if echo "$RESPONSE" | grep -q "success"; then
    say_ok "Root endpoint working"
else
    say_err "Root endpoint failed"
fi
echo ""

# Test health endpoint
echo "Testing: GET /api/health"
RESPONSE=$(curl -s "$BASE_URL/api/health")
if echo "$RESPONSE" | grep -q "Server is running"; then
    say_ok "Health endpoint working"
else
    say_err "Health endpoint failed"
fi
echo ""

# Test subjects endpoint
echo "Testing: GET /api/subjects"
RESPONSE=$(curl -s "$BASE_URL/api/subjects")
if echo "$RESPONSE" | grep -q "Subjects retrieved successfully"; then
    say_ok "Subjects endpoint working"
else
    say_err "Subjects endpoint failed"
fi
echo ""

# Test tasks endpoint
echo "Testing: GET /api/tasks"
RESPONSE=$(curl -s "$BASE_URL/api/tasks")
if echo "$RESPONSE" | grep -q "Tasks retrieved successfully"; then
    say_ok "Tasks endpoint working"
else
    say_err "Tasks endpoint failed"
fi
echo ""

# Test create task and verify store mutation
echo "Testing: POST /api/tasks (create)"
NEW_TASK_PAYLOAD='{"title":"API Test Task","description":"Created by test suite","subject":"Mathematics","dueDate":"2025-12-31T00:00:00.000Z","priority":"High","estimatedDuration":45}'
RESPONSE=$(curl -s -X POST "$BASE_URL/api/tasks" -H "Content-Type: application/json" -d "$NEW_TASK_PAYLOAD")
if echo "$RESPONSE" | grep -q "Task created successfully"; then
    say_ok "Task creation working"
else
    say_err "Task creation failed"; exit 1
fi
NEW_TASK_ID=$(echo "$RESPONSE" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -n1)

# Verify task exists in list
echo "Testing: GET /api/tasks contains new task"
LIST=$(curl -s "$BASE_URL/api/tasks")
if echo "$LIST" | grep -q "API Test Task"; then
    say_ok "Task persisted to JSON store"
else
    say_err "New task not found in list"; exit 1
fi
echo ""

# Test analytics endpoint
echo "Testing: GET /api/analytics"
RESPONSE=$(curl -s "$BASE_URL/api/analytics")
if echo "$RESPONSE" | grep -q "Analytics computed successfully"; then
    say_ok "Analytics endpoint working"
else
    say_err "Analytics endpoint failed"
fi
echo ""

# Test timetable upsert and fetch
echo "Testing: PUT /api/timetable (upsert)"
TT_PAYLOAD='{"days":{"monday":[{"time":"08:00","subject":"Biology","room":"R1","durationMinutes":30}]}}'
RESPONSE=$(curl -s -X PUT "$BASE_URL/api/timetable" -H "Content-Type: application/json" -d "$TT_PAYLOAD")
if echo "$RESPONSE" | grep -q "Timetable saved successfully"; then
    say_ok "Timetable upsert working"
else
    say_err "Timetable upsert failed"
fi

# Verify timetable reflects changes
RESPONSE=$(curl -s "$BASE_URL/api/timetable")
if echo "$RESPONSE" | grep -q "Biology"; then
    say_ok "Timetable returns fresh data"
else
    say_err "Timetable did not update"
fi
echo ""

# Test events CRUD
echo "Testing: POST /api/events (create)"
NEXT_DAY=$(date -u -d "+1 day" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v+1d +%Y-%m-%dT%H:%M:%SZ)
EVENT_PAYLOAD="{\"title\":\"API Test Event\",\"date\":\"$NEXT_DAY\",\"subject\":\"Mathematics\",\"type\":\"exam\"}"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/events" -H "Content-Type: application/json" -d "$EVENT_PAYLOAD")
if echo "$RESPONSE" | grep -q "Event created successfully"; then
    say_ok "Event creation working"
else
    say_err "Event creation failed"
fi
EVENT_ID=$(echo "$RESPONSE" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -n1)

# Verify events list shows the new event
RESPONSE=$(curl -s "$BASE_URL/api/events")
if echo "$RESPONSE" | grep -q "API Test Event"; then
    say_ok "Events list shows new event"
else
    say_err "Events list missing new event"
fi

# Delete created task and event
echo "Testing: DELETE /api/tasks/:id"
DEL_RES=$(curl -s -X DELETE "$BASE_URL/api/tasks/$NEW_TASK_ID")
if echo "$DEL_RES" | grep -q "Task deleted successfully"; then
    say_ok "Task deletion working"
else
    say_err "Task deletion failed"
fi

echo "Testing: DELETE /api/events/:id"
DEL_RES=$(curl -s -X DELETE "$BASE_URL/api/events/$EVENT_ID")
if echo "$DEL_RES" | grep -q "Event deleted successfully"; then
    say_ok "Event deletion working"
else
    say_err "Event deletion failed"
fi
echo ""

# Test chat endpoint
echo "Testing: POST /api/chat"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/chat" \
    -H "Content-Type: application/json" \
    -d '{"message":"Hello"}')
if echo "$RESPONSE" | grep -q "Smart Academic Mentor"; then
    say_ok "Chat endpoint working"
else
    say_err "Chat endpoint failed"
fi
echo ""

# Test study plans endpoint (placeholder)
echo "Testing: GET /api/study-plans"
RESPONSE=$(curl -s "$BASE_URL/api/study-plans")
if echo "$RESPONSE" | grep -q "Study plans retrieved successfully"; then
    say_ok "Study plans endpoint working"
else
    say_err "Study plans endpoint failed"
fi
echo ""

# Test computed study plan endpoint
echo "Testing: GET /api/study-plan"
RESPONSE=$(curl -s "$BASE_URL/api/study-plan")
if echo "$RESPONSE" | grep -q "Study plan generated successfully"; then
    say_ok "Computed study plan endpoint working"
else
    say_err "Computed study plan endpoint failed"
fi
echo ""

# Test motivation endpoints
echo "Testing: GET /api/motivation/message"
RESPONSE=$(curl -s "$BASE_URL/api/motivation/message")
if echo "$RESPONSE" | grep -q "Motivational message retrieved successfully"; then
    say_ok "Motivation endpoint working"
else
    say_err "Motivation endpoint failed"
fi

echo "Testing: GET /api/motivation/quote"
RESPONSE=$(curl -s "$BASE_URL/api/motivation/quote")
if echo "$RESPONSE" | grep -q "Daily quote retrieved successfully"; then
    say_ok "Motivation quote endpoint working"
else
    say_err "Motivation quote endpoint failed"
fi

echo "Testing: GET /api/motivation/tip"
RESPONSE=$(curl -s "$BASE_URL/api/motivation/tip")
if echo "$RESPONSE" | grep -q "Study tip retrieved successfully"; then
    say_ok "Motivation tip endpoint working"
else
    say_err "Motivation tip endpoint failed"
fi
echo ""

echo "======================================"
echo "Test Suite Complete"
echo "======================================"
