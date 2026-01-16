# API Specification
## TBI Marian Alumni Tracer System

This document outlines the recommended REST API endpoints for the TBI Marian system backend.

---

## Base URL
```
Development: http://localhost:3000/api
Production: https://api.marian-tbi.edu/api
```

---

## Authentication

### POST /auth/login
Login to the system

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "user_id": 1,
      "username": "admin",
      "email": "admin@marian.edu",
      "full_name": "System Administrator",
      "role": "admin"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### POST /auth/logout
Logout from the system

**Headers:** `Authorization: Bearer {token}`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### GET /auth/me
Get current user information

**Headers:** `Authorization: Bearer {token}`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user_id": 1,
    "username": "admin",
    "email": "admin@marian.edu",
    "full_name": "System Administrator",
    "role": "admin"
  }
}
```

---

## Alumni Management

### GET /alumni
Get list of alumni with filtering and pagination

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 10)
- `search` - Search by name, email
- `college_id` - Filter by college
- `program_id` - Filter by program
- `status` - Filter by contact status (Contacted/Pending)
- `batch_year` - Filter by graduation year
- `graduated_from` - Date range start (YYYY-MM-DD)
- `graduated_to` - Date range end (YYYY-MM-DD)
- `is_archived` (default: false)

**Example:**
```
GET /alumni?page=1&limit=20&status=Contacted&college_id=3
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "alumni": [
      {
        "alumni_id": 111,
        "alumni_code": "111",
        "first_name": "Maria",
        "last_name": "Santos",
        "full_name": "Maria Santos",
        "college_name": "College of Business",
        "program_name": "Bachelor of Science in Business Administration - Marketing",
        "email": "maria@example.com",
        "contact_number": "+63 912 345 6789",
        "date_graduated": "2023-05-15",
        "batch_year": 2023,
        "current_occupation": "Marketing Manager",
        "current_company": "Tech Corp",
        "contact_status": "Contacted",
        "is_archived": false,
        "created_at": "2026-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "total_pages": 8
    }
  }
}
```

### GET /alumni/:id
Get single alumni details

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "alumni_id": 111,
    "alumni_code": "111",
    "first_name": "Maria",
    "last_name": "Santos",
    "middle_name": "",
    "suffix": "",
    "college_id": 1,
    "college_name": "College of Business",
    "program_id": 1,
    "program_name": "Bachelor of Science in Business Administration - Marketing",
    "email": "maria@example.com",
    "contact_number": "+63 912 345 6789",
    "date_graduated": "2023-05-15",
    "batch_year": 2023,
    "current_occupation": "Marketing Manager",
    "current_company": "Tech Corp",
    "contact_status": "Contacted",
    "is_archived": false
  }
}
```

### POST /alumni
Create new alumni record

**Request:**
```json
{
  "alumni_code": "114",
  "first_name": "Juan",
  "last_name": "Dela Cruz",
  "middle_name": "Garcia",
  "college_id": 3,
  "program_id": 7,
  "email": "juan@example.com",
  "contact_number": "+63 945 678 9012",
  "date_graduated": "2024-04-15",
  "current_occupation": "Web Developer",
  "current_company": "StartupHub",
  "contact_status": "Pending"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Alumni created successfully",
  "data": {
    "alumni_id": 114,
    "alumni_code": "114"
  }
}
```

### PUT /alumni/:id
Update alumni record

**Request:** Same as POST, all fields optional

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Alumni updated successfully",
  "data": {
    "alumni_id": 114
  }
}
```

### DELETE /alumni/:id
Archive alumni (soft delete)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Alumni archived successfully"
}
```

### POST /alumni/restore/:id
Restore archived alumni

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Alumni restored successfully"
}
```

### POST /alumni/import
Bulk import alumni from CSV

**Request:** `multipart/form-data`
```
file: [CSV file]
```

**CSV Format:**
```csv
alumni_code,first_name,last_name,college_code,program_code,email,contact_number,date_graduated,occupation,company,status
115,Pedro,Martinez,CIT,BSCS,pedro@example.com,+63 956 789 0123,2023-06-15,Backend Developer,TechStart,Pending
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Import completed",
  "data": {
    "total_records": 100,
    "successful_records": 95,
    "failed_records": 5,
    "errors": [
      {
        "row": 15,
        "error": "Email already exists"
      }
    ]
  }
}
```

### GET /alumni/export
Export alumni to CSV

**Query Parameters:** Same as GET /alumni

**Response:** CSV file download

---

## Events Management

### GET /events
Get list of events

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 10)
- `is_archived` (default: false)
- `from_date` - Filter events from date
- `to_date` - Filter events to date

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "event_id": 1,
        "title": "Alumni Homecoming 2026",
        "description": "Annual homecoming event",
        "event_date": "2026-03-15",
        "event_time": "14:00:00",
        "location": "Main Campus Auditorium",
        "attendee_count": 45,
        "is_archived": false,
        "created_at": "2026-01-10T08:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "total_pages": 3
    }
  }
}
```

### GET /events/:id
Get single event details with attendees

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "event_id": 1,
    "title": "Alumni Homecoming 2026",
    "description": "Annual homecoming event",
    "event_date": "2026-03-15",
    "event_time": "14:00:00",
    "location": "Main Campus Auditorium",
    "is_archived": false,
    "attendees": [
      {
        "alumni_id": 111,
        "alumni_code": "111",
        "name": "Maria Santos",
        "email": "maria@example.com",
        "invitation_status": "confirmed",
        "attended": false
      }
    ]
  }
}
```

### POST /events
Create new event

**Request:**
```json
{
  "title": "Career Fair 2026",
  "description": "Annual career fair for alumni",
  "event_date": "2026-04-20",
  "event_time": "09:00:00",
  "location": "University Gymnasium",
  "attendee_ids": [111, 113]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Event created successfully",
  "data": {
    "event_id": 2
  }
}
```

### PUT /events/:id
Update event

**Request:** Same as POST, all fields optional

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Event updated successfully"
}
```

### DELETE /events/:id
Archive event

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Event archived successfully"
}
```

### POST /events/:id/attendees
Add attendees to event

**Request:**
```json
{
  "alumni_ids": [112, 114, 115]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Attendees added successfully",
  "data": {
    "added_count": 3
  }
}
```

### DELETE /events/:event_id/attendees/:alumni_id
Remove attendee from event

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Attendee removed successfully"
}
```

### PUT /events/:event_id/attendees/:alumni_id
Update attendee status

**Request:**
```json
{
  "invitation_status": "confirmed",
  "attended": true,
  "notes": "Arrived on time"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Attendee status updated"
}
```

---

## Colleges & Programs

### GET /colleges
Get all colleges

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "college_id": 1,
      "college_name": "College of Business",
      "college_code": "COB",
      "description": "Business and Management programs",
      "is_active": true
    }
  ]
}
```

### GET /programs
Get all programs

**Query Parameters:**
- `college_id` - Filter by college

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "program_id": 1,
      "college_id": 1,
      "program_name": "Bachelor of Science in Business Administration - Marketing",
      "program_code": "BSBA-MKT",
      "college_name": "College of Business",
      "is_active": true
    }
  ]
}
```

---

## Statistics & Reports

### GET /statistics/overview
Get overall system statistics

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "total_alumni": 500,
    "contacted_alumni": 350,
    "pending_alumni": 150,
    "total_events": 25,
    "upcoming_events": 5,
    "total_colleges": 5,
    "total_programs": 13
  }
}
```

### GET /statistics/alumni
Get alumni statistics

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "by_college": [
      {
        "college_name": "College of Information Technology",
        "count": 150
      }
    ],
    "by_batch_year": [
      {
        "batch_year": 2023,
        "count": 120
      }
    ],
    "by_status": {
      "Contacted": 350,
      "Pending": 150
    }
  }
}
```

### GET /statistics/events
Get event statistics

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "total_events": 25,
    "upcoming_events": 5,
    "past_events": 20,
    "average_attendance": 45,
    "events_by_month": [
      {
        "month": "2026-01",
        "count": 3
      }
    ]
  }
}
```

---

## Activity Logs

### GET /logs
Get activity logs (admin only)

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 50)
- `user_id` - Filter by user
- `action_type` - Filter by action
- `entity_type` - Filter by entity

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "log_id": 1,
        "user_name": "admin",
        "action_type": "create",
        "entity_type": "alumni",
        "entity_id": 114,
        "description": "Alumni created: Juan Dela Cruz",
        "ip_address": "192.168.1.100",
        "created_at": "2026-01-16T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1500,
      "total_pages": 30
    }
  }
}
```

---

## Error Responses

All endpoints may return these error responses:

### 400 Bad Request
```json
{
  "success": false,
  "error": "Validation error",
  "details": {
    "email": "Invalid email format",
    "date_graduated": "Date must be in the past"
  }
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Alumni not found"
}
```

### 409 Conflict
```json
{
  "success": false,
  "error": "Email already exists"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

---

## Backend Technologies Recommendations

### Node.js + Express
```javascript
// Example route structure
const express = require('express');
const router = express.Router();

// Middleware
const auth = require('./middleware/auth');
const validate = require('./middleware/validate');

// Routes
router.post('/alumni', auth, validate.alumni, alumniController.create);
router.get('/alumni', auth, alumniController.list);
router.get('/alumni/:id', auth, alumniController.getById);
router.put('/alumni/:id', auth, validate.alumni, alumniController.update);
router.delete('/alumni/:id', auth, alumniController.archive);

module.exports = router;
```

### Python + Flask/FastAPI
```python
from flask import Flask, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

@app.route('/api/alumni', methods=['GET'])
@jwt_required()
def get_alumni():
    # Implementation
    return jsonify(success=True, data=alumni_list)

@app.route('/api/alumni', methods=['POST'])
@jwt_required()
def create_alumni():
    data = request.get_json()
    # Validation and creation
    return jsonify(success=True, message='Alumni created'), 201
```

### PHP + Laravel
```php
Route::middleware('auth:api')->group(function () {
    Route::get('/alumni', [AlumniController::class, 'index']);
    Route::post('/alumni', [AlumniController::class, 'store']);
    Route::get('/alumni/{id}', [AlumniController::class, 'show']);
    Route::put('/alumni/{id}', [AlumniController::class, 'update']);
    Route::delete('/alumni/{id}', [AlumniController::class, 'destroy']);
});
```

---

## Security Considerations

1. **Authentication:** Use JWT tokens with expiration
2. **Password Hashing:** Use bcrypt with salt rounds >= 10
3. **Input Validation:** Validate all inputs server-side
4. **SQL Injection:** Use parameterized queries/ORMs
5. **CORS:** Configure proper CORS headers
6. **Rate Limiting:** Implement rate limiting for API endpoints
7. **HTTPS:** Use HTTPS in production
8. **Environment Variables:** Store sensitive data in .env files

---

*API Version: 1.0*
*Last Updated: January 16, 2026*
