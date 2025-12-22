# RBAC API Guide for Frontend Team

## Overview

This guide provides everything the frontend team needs to integrate with the Real-Estate Backend API, including authentication, authorization, endpoint access, and error handling.

---

## 🔑 Authentication

### Getting an Access Token

#### Register New User
```http
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "userId": "1",
  "role": "USER"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "role": "USER"
}
```

### Using the Access Token

**Store the token** after login:
```javascript
const response = await fetch('/auth/login', { ... });
const { accessToken, role } = await response.json();
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('userRole', role);
```

**Include token in all authenticated requests:**
```javascript
const token = localStorage.getItem('accessToken');
fetch('/api/properties', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### Get Current User
```http
GET /auth/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "userId": "1",
  "role": "USER"
}
```

---

## 👥 User Roles

| Role | Description | Access Level |
|------|-------------|-------------|
| **USER** | Regular user | Can create properties, make requests, view own data |
| **ADMIN** | Administrator | Full access to all endpoints + admin functions |

---

## 📋 Endpoint Access Matrix

### Public Endpoints (No Authentication Required)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/register` | POST | Register new user |
| `/auth/login` | POST | Login and get token |

### Authenticated Endpoints (Require Valid Token)

| Endpoint | Method | USER | ADMIN | Additional Rules |
|----------|--------|------|-------|------------------|
| `/auth/me` | GET | ✅ | ✅ | None |
| `/properties` | GET | ✅ | ✅ | List all properties |
| `/properties/:id` | GET | ✅ | ✅ | View property details |
| `/properties` | POST | ✅ | ❌ | Create property |
| `/properties/:id` | PATCH | ✅* | ✅ | *Only own properties |
| `/properties/:id` | DELETE | ✅* | ✅ | *Only own ACTIVE properties |
| `/properties/:id/images` | POST | ✅* | ✅ | *Only own properties |
| `/properties/:id/images/:imageId` | DELETE | ✅* | ✅ | *Only own properties |
| `/properties/:propertyId/requests` | POST | ✅ | ❌ | Property must be ACTIVE, not own |
| `/me/requests` | GET | ✅ | ❌ | View own requests |
| `/requests/:id` | GET | ✅* | ✅ | *Requester or property owner |
| `/me/meetings` | GET | ✅ | ❌ | View own meetings |
| `/meetings/:id` | GET | ✅* | ✅ | *Buyer or seller |
| `/admin/requests` | GET | ❌ | ✅ | View pending requests |
| `/admin/requests/:id/approve` | POST | ❌ | ✅ | Approve request |
| `/admin/requests/:id/reject` | POST | ❌ | ✅ | Reject request |
| `/admin/meetings` | GET | ❌ | ✅ | ⚠️ Not yet implemented |

---

## 🔐 Authorization Rules

### Owner-Based Access

**USER can only modify their own resources:**
- Update/Delete own properties
- Upload/Delete images for own properties

**ADMIN can modify any resource:**
- Update/Delete any property
- Upload/Delete images for any property

### Business Rules

**Create Request:**
- Property must be `ACTIVE`
- Cannot request own property
- Cannot have duplicate active request (PENDING or APPROVED)

**Delete Property:**
- Property must be `ACTIVE`
- Only owner or ADMIN can delete

---

## 📡 API Endpoints Reference

### Authentication Endpoints

#### Register
```javascript
const register = async (name, email, password) => {
  const response = await fetch('http://localhost:3000/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password })
  });
  return response.json();
};
```

#### Login
```javascript
const login = async (email, password) => {
  const response = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('userRole', data.role);
  return data;
};
```

#### Get Current User
```javascript
const getCurrentUser = async () => {
  const token = localStorage.getItem('accessToken');
  const response = await fetch('http://localhost:3000/auth/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

### Properties Endpoints

#### List Properties
```javascript
const getProperties = async () => {
  const token = localStorage.getItem('accessToken');
  const response = await fetch('http://localhost:3000/properties', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

**Response:**
```json
[
  {
    "propertyId": "1",
    "title": "Beautiful House",
    "type": "HOUSE",
    "status": "ACTIVE"
  }
]
```

#### Get Property Details
```javascript
const getProperty = async (propertyId) => {
  const token = localStorage.getItem('accessToken');
  const response = await fetch(`http://localhost:3000/properties/${propertyId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

**Response:**
```json
{
  "propertyId": "1",
  "ownerId": "2",
  "title": "Beautiful House",
  "type": "HOUSE",
  "address": "123 Main St",
  "description": "A beautiful house...",
  "price": 250000,
  "location": "New York",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "area": 1500,
  "rooms": 3,
  "floor": 2,
  "status": "ACTIVE",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "images": [
    {
      "imageId": "1",
      "fileName": "image.jpg",
      "url": "http://localhost:3000/uploads/image.jpg"
    }
  ]
}
```

#### Create Property
```javascript
const createProperty = async (propertyData) => {
  const token = localStorage.getItem('accessToken');
  const response = await fetch('http://localhost:3000/properties', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(propertyData)
  });
  return response.json();
};

// Usage
createProperty({
  title: "My Property",
  type: "APARTMENT",
  address: "123 Main St",
  description: "Nice apartment",
  price: 150000,
  location: "New York",
  latitude: 40.7128,
  longitude: -74.0060,
  area: 800,
  rooms: 2,
  floor: 5
});
```

**Required fields:** `title`, `type`  
**Optional fields:** `address`, `description`, `price`, `location`, `latitude`, `longitude`, `area`, `rooms`, `floor`

#### Update Property
```javascript
const updateProperty = async (propertyId, updates) => {
  const token = localStorage.getItem('accessToken');
  const response = await fetch(`http://localhost:3000/properties/${propertyId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });
  return response.json();
};
```

**Note:** USER can only update own properties. ADMIN can update any property.

#### Delete Property
```javascript
const deleteProperty = async (propertyId) => {
  const token = localStorage.getItem('accessToken');
  const response = await fetch(`http://localhost:3000/properties/${propertyId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

**Note:** Only ACTIVE properties can be deleted. USER can only delete own properties.

### Property Images Endpoints

#### Upload Image
```javascript
const uploadPropertyImage = async (propertyId, imageFile) => {
  const token = localStorage.getItem('accessToken');
  const formData = new FormData();
  formData.append('image', imageFile);
  
  const response = await fetch(`http://localhost:3000/properties/${propertyId}/images`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  return response.json();
};
```

**Response:**
```json
{
  "imageId": "1",
  "fileName": "abc123.jpg",
  "url": "http://localhost:3000/uploads/abc123.jpg"
}
```

**File Requirements:**
- Max size: 5MB
- Allowed formats: jpg, jpeg, png, gif

#### Delete Image
```javascript
const deletePropertyImage = async (propertyId, imageId) => {
  const token = localStorage.getItem('accessToken');
  const response = await fetch(`http://localhost:3000/properties/${propertyId}/images/${imageId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

### Transaction Requests Endpoints

#### Create Request
```javascript
const createRequest = async (propertyId, type) => {
  const token = localStorage.getItem('accessToken');
  const response = await fetch(`http://localhost:3000/properties/${propertyId}/requests`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ type }) // 'BUY' or 'RENT'
  });
  return response.json();
};
```

**Response:**
```json
{
  "requestId": "1",
  "status": "PENDING"
}
```

**Rules:**
- Property must be `ACTIVE`
- Cannot request own property
- Cannot have duplicate active request

#### Get My Requests
```javascript
const getMyRequests = async () => {
  const token = localStorage.getItem('accessToken');
  const response = await fetch('http://localhost:3000/me/requests', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

**Response:**
```json
[
  {
    "requestId": "1",
    "propertyId": "5",
    "type": "BUY",
    "status": "PENDING",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### Get Request Details
```javascript
const getRequest = async (requestId) => {
  const token = localStorage.getItem('accessToken');
  const response = await fetch(`http://localhost:3000/requests/${requestId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

**Response:**
```json
{
  "requestId": "1",
  "propertyId": "5",
  "requesterId": "2",
  "type": "BUY",
  "status": "APPROVED",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "decisionAt": "2024-01-02T00:00:00.000Z"
}
```

**Note:** USER can only view own requests or requests for own properties.

### Admin Endpoints

#### Get Pending Requests
```javascript
const getPendingRequests = async () => {
  const token = localStorage.getItem('accessToken');
  const response = await fetch('http://localhost:3000/admin/requests?status=PENDING', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

**Response:**
```json
[
  {
    "requestId": "1",
    "propertyId": "5",
    "requesterId": "2",
    "type": "BUY",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### Approve Request
```javascript
const approveRequest = async (requestId, meetingData) => {
  const token = localStorage.getItem('accessToken');
  const response = await fetch(`http://localhost:3000/admin/requests/${requestId}/approve`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(meetingData)
  });
  return response.json();
};

// Usage
approveRequest(1, {
  scheduledAt: "2024-01-15T10:00:00.000Z",
  latitude: 40.7128,
  longitude: -74.0060
});
```

**Response:**
```json
{
  "requestId": "1",
  "newStatus": "APPROVED",
  "meetingId": "1"
}
```

#### Reject Request
```javascript
const rejectRequest = async (requestId, reason) => {
  const token = localStorage.getItem('accessToken');
  const response = await fetch(`http://localhost:3000/admin/requests/${requestId}/reject`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ reason }) // Optional
  });
  return response.json();
};
```

**Response:**
```json
{
  "requestId": "1",
  "newStatus": "REJECTED"
}
```

### Meetings Endpoints

#### Get My Meetings
```javascript
const getMyMeetings = async () => {
  const token = localStorage.getItem('accessToken');
  const response = await fetch('http://localhost:3000/me/meetings', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

**Response:**
```json
[
  {
    "meetingId": "1",
    "propertyId": "5",
    "scheduledAt": "2024-01-15T10:00:00.000Z",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "roleInMeeting": "BUYER"
  }
]
```

#### Get Meeting Details
```javascript
const getMeeting = async (meetingId) => {
  const token = localStorage.getItem('accessToken');
  const response = await fetch(`http://localhost:3000/meetings/${meetingId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

**Response:**
```json
{
  "meetingId": "1",
  "propertyId": "5",
  "buyerId": "2",
  "sellerId": "3",
  "scheduledAt": "2024-01-15T10:00:00.000Z",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "status": "SCHEDULED"
}
```

---

## ⚠️ Error Handling

### Error Response Format
All errors follow this format:
```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Error type"
}
```

### Common Error Codes

| Status Code | Meaning | When It Occurs |
|-------------|---------|----------------|
| **400** | Bad Request | Invalid input, business rule violation |
| **401** | Unauthorized | Missing/invalid token, expired token |
| **403** | Forbidden | Insufficient permissions, wrong role |
| **404** | Not Found | Resource doesn't exist |
| **409** | Conflict | Duplicate request, already approved |

### Error Handling Example
```javascript
const handleApiCall = async (url, options) => {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const error = await response.json();
      
      switch (response.status) {
        case 401:
          // Token expired or invalid
          localStorage.removeItem('accessToken');
          window.location.href = '/login';
          break;
        case 403:
          // Insufficient permissions
          alert('You do not have permission to perform this action');
          break;
        case 404:
          // Resource not found
          alert('Resource not found');
          break;
        case 409:
          // Conflict (e.g., duplicate request)
          alert(error.message);
          break;
        default:
          alert(error.message || 'An error occurred');
      }
      
      throw new Error(error.message);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};
```

---

## 🎯 Role-Based UI Guidelines

### Show/Hide Features Based on Role

```javascript
const userRole = localStorage.getItem('userRole');

// Show admin panel only for ADMIN
if (userRole === 'ADMIN') {
  // Show admin dashboard, pending requests, etc.
}

// Show property creation only for USER
if (userRole === 'USER') {
  // Show "Create Property" button
}
```

### Show/Hide Actions Based on Ownership

```javascript
const isOwner = (property, currentUserId) => {
  return property.ownerId === currentUserId.toString();
};

// In component
{isOwner(property, currentUser.userId) && (
  <button onClick={handleEdit}>Edit</button>
)}
```

### Conditional Rendering Examples

```javascript
// Show edit/delete only for owner or admin
{(isOwner(property, user.userId) || user.role === 'ADMIN') && (
  <div>
    <button onClick={handleEdit}>Edit</button>
    {property.status === 'ACTIVE' && (
      <button onClick={handleDelete}>Delete</button>
    )}
  </div>
)}

// Show request button only if not owner and property is ACTIVE
{!isOwner(property, user.userId) && property.status === 'ACTIVE' && (
  <button onClick={handleRequest}>Request to Buy/Rent</button>
)}

// Show admin actions only for ADMIN
{user.role === 'ADMIN' && (
  <AdminPanel />
)}
```

---

## 🔧 Helper Functions

### API Client Setup
```javascript
class ApiClient {
  constructor(baseURL = 'http://localhost:3000') {
    this.baseURL = baseURL;
  }

  getToken() {
    return localStorage.getItem('accessToken');
  }

  getHeaders(includeContentType = true) {
    const headers = {
      'Authorization': `Bearer ${this.getToken()}`
    };
    if (includeContentType) {
      headers['Content-Type'] = 'application/json';
    }
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Request failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  patch(endpoint, data) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  uploadFile(endpoint, file) {
    const formData = new FormData();
    formData.append('image', file);
    
    return this.request(endpoint, {
      method: 'POST',
      headers: this.getHeaders(false), // Don't set Content-Type for FormData
      body: formData
    });
  }
}

// Usage
const api = new ApiClient();

// Get properties
const properties = await api.get('/properties');

// Create property
const newProperty = await api.post('/properties', {
  title: 'My Property',
  type: 'APARTMENT'
});

// Upload image
const image = await api.uploadFile('/properties/1/images', file);
```

---

## 📝 Status Enums

### Property Status
```javascript
const PropertyStatus = {
  ACTIVE: 'ACTIVE',    // Available for requests
  RESERVED: 'RESERVED', // Has approved request
  CLOSED: 'CLOSED'     // Transaction completed
};
```

### Request Status
```javascript
const RequestStatus = {
  PENDING: 'PENDING',   // Awaiting admin decision
  APPROVED: 'APPROVED', // Approved, meeting scheduled
  REJECTED: 'REJECTED'  // Rejected by admin
};
```

### Transaction Type
```javascript
const TransactionType = {
  BUY: 'BUY',
  RENT: 'RENT'
};
```

---

## 🚀 Quick Start Example

```javascript
// 1. Register/Login
const { accessToken, role } = await login('user@example.com', 'password');
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('userRole', role);

// 2. Get current user
const user = await getCurrentUser();

// 3. List properties
const properties = await getProperties();

// 4. Create property (USER only)
if (role === 'USER') {
  const property = await createProperty({
    title: 'My Property',
    type: 'APARTMENT',
    price: 150000
  });
}

// 5. Upload image
const image = await uploadPropertyImage(property.propertyId, imageFile);

// 6. Create request
const request = await createRequest(property.propertyId, 'BUY');

// 7. Check request status
const myRequests = await getMyRequests();
```

---

## 📞 Base URL Configuration

**Development:**
```
http://localhost:3000
```

**Production:**
```
https://api.yourdomain.com
```

**Environment Variable:**
```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
```

---

## ✅ Checklist for Frontend Integration

- [ ] Implement login/register flow
- [ ] Store access token securely (localStorage/sessionStorage)
- [ ] Add token to all authenticated requests
- [ ] Handle 401 errors (redirect to login)
- [ ] Implement role-based UI rendering
- [ ] Check ownership before showing edit/delete buttons
- [ ] Handle all error status codes (400, 401, 403, 404, 409)
- [ ] Validate business rules before API calls (e.g., property status)
- [ ] Implement file upload for property images
- [ ] Handle token expiration
- [ ] Show appropriate error messages to users

---

## 🆘 Support

For API issues or questions, contact the backend team or refer to the backend API documentation.

**Common Issues:**
- **401 Unauthorized:** Token expired or missing → Re-login
- **403 Forbidden:** User doesn't have permission → Check role/ownership
- **409 Conflict:** Business rule violation → Check property status, duplicate requests

