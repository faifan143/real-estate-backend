# Dashboard RBAC Guide - Role-Based UI Screens

## Overview

This guide provides a complete breakdown of dashboard panels, screens, and components for each user role. The same dashboard structure is used, but content and features are dynamically shown/hidden based on the user's role (USER or ADMIN).

---

## 🎯 Dashboard Structure

### Main Layout Components

```
┌─────────────────────────────────────────────────────────┐
│                    HEADER / NAVBAR                       │
│  [Logo] [Navigation] [User Menu] [Logout]                │
└─────────────────────────────────────────────────────────┘
┌──────────────┬──────────────────────────────────────────┐
│              │                                          │
│   SIDEBAR    │         MAIN CONTENT AREA                │
│   (Role-     │         (Dynamic Content)                 │
│   Based)     │                                          │
│              │                                          │
│              │                                          │
└──────────────┴──────────────────────────────────────────┘
```

---

## 👤 USER Dashboard

### Navigation Structure

```
Dashboard
├── Home
├── My Properties
│   ├── List View
│   ├── Create Property
│   └── Edit Property
├── Browse Properties
│   ├── All Properties
│   └── Property Details
├── My Requests
│   ├── Pending Requests
│   ├── Approved Requests
│   └── Rejected Requests
└── My Meetings
    ├── Upcoming Meetings
    └── Meeting Details
```

### Screen 1: USER Home Dashboard

**Route:** `/dashboard` or `/home`

**Visible Components:**
- ✅ Welcome message with user name
- ✅ Quick stats cards:
  - Total Properties Owned
  - Active Requests (PENDING + APPROVED)
  - Upcoming Meetings Count
- ✅ Recent Activity Feed:
  - Recent property views
  - Recent requests created
  - Recent meeting notifications
- ✅ Quick Actions:
  - [Create New Property] button
  - [Browse Properties] button
  - [View My Requests] button

**Hidden Components:**
- ❌ Admin Panel
- ❌ Pending Requests Queue
- ❌ All Users List
- ❌ System Statistics

**Code Example:**
```jsx
function UserDashboard() {
  const user = useCurrentUser();
  const stats = useUserStats(user.userId);
  
  return (
    <div className="user-dashboard">
      <h1>Welcome, {user.name}!</h1>
      
      <div className="stats-grid">
        <StatCard title="My Properties" value={stats.propertiesCount} />
        <StatCard title="Active Requests" value={stats.activeRequests} />
        <StatCard title="Upcoming Meetings" value={stats.meetingsCount} />
      </div>
      
      <QuickActions>
        <Button onClick={navigateToCreateProperty}>Create Property</Button>
        <Button onClick={navigateToBrowse}>Browse Properties</Button>
        <Button onClick={navigateToRequests}>My Requests</Button>
      </QuickActions>
      
      <RecentActivity userId={user.userId} />
    </div>
  );
}
```

---

### Screen 2: My Properties - List View

**Route:** `/dashboard/my-properties`

**Visible Components:**
- ✅ Page Header: "My Properties" with [Create New Property] button
- ✅ Properties Table/Grid:
  - Property Image (thumbnail)
  - Property Title
  - Property Type (HOUSE/APARTMENT)
  - Status Badge (ACTIVE/RESERVED/CLOSED)
  - Address/Location
  - Price
  - Created Date
  - Actions Column:
    - [View] button (always visible)
    - [Edit] button (if ACTIVE)
    - [Delete] button (if ACTIVE)
    - [View Requests] button (if has requests)
- ✅ Filters:
  - Filter by Status
  - Search by Title/Address
- ✅ Empty State: "No properties yet. Create your first property!"

**Hidden Components:**
- ❌ Admin-only filters
- ❌ All Users' Properties

**Code Example:**
```jsx
function MyPropertiesList() {
  const user = useCurrentUser();
  const properties = useMyProperties(user.userId);
  
  return (
    <div className="my-properties">
      <PageHeader>
        <h1>My Properties</h1>
        <Button onClick={createProperty}>Create New Property</Button>
      </PageHeader>
      
      <Filters>
        <StatusFilter />
        <SearchInput />
      </Filters>
      
      <PropertiesGrid>
        {properties.map(property => (
          <PropertyCard
            key={property.propertyId}
            property={property}
            actions={
              <>
                <Button onClick={() => viewProperty(property.propertyId)}>View</Button>
                {property.status === 'ACTIVE' && (
                  <>
                    <Button onClick={() => editProperty(property.propertyId)}>Edit</Button>
                    <Button onClick={() => deleteProperty(property.propertyId)}>Delete</Button>
                  </>
                )}
                {property.hasRequests && (
                  <Button onClick={() => viewRequests(property.propertyId)}>View Requests</Button>
                )}
              </>
            }
          />
        ))}
      </PropertiesGrid>
    </div>
  );
}
```

---

### Screen 3: Create/Edit Property

**Route:** `/dashboard/my-properties/create` or `/dashboard/my-properties/edit/:id`

**Visible Components:**
- ✅ Form Fields:
  - Title* (required)
  - Type* (required) - Dropdown: HOUSE, APARTMENT
  - Address (optional)
  - Description (optional)
  - Price (optional, defaults to 0)
  - Location (optional)
  - Latitude/Longitude (optional)
  - Area (optional)
  - Rooms (optional)
  - Floor (optional)
- ✅ Image Upload Section:
  - Multiple image upload
  - Image preview
  - Delete image button
- ✅ Status Display (Edit only):
  - Current Status: ACTIVE/RESERVED/CLOSED (read-only)
- ✅ Action Buttons:
  - [Save] button
  - [Cancel] button

**Hidden Components:**
- ❌ Status Change Dropdown (USER cannot change status directly)
- ❌ Admin-only fields

**Code Example:**
```jsx
function PropertyForm({ propertyId, mode = 'create' }) {
  const property = mode === 'edit' ? useProperty(propertyId) : null;
  const [formData, setFormData] = useState(property || {});
  const [images, setImages] = useState([]);
  
  return (
    <Form>
      <FormField label="Title" required>
        <Input value={formData.title} onChange={...} />
      </FormField>
      
      <FormField label="Type" required>
        <Select value={formData.type} options={['HOUSE', 'APARTMENT']} />
      </FormField>
      
      <FormField label="Address">
        <Input value={formData.address} />
      </FormField>
      
      <FormField label="Description">
        <Textarea value={formData.description} />
      </FormField>
      
      <FormField label="Price">
        <Input type="number" value={formData.price} />
      </FormField>
      
      {/* More fields... */}
      
      <ImageUploadSection
        images={images}
        onUpload={handleImageUpload}
        onDelete={handleImageDelete}
      />
      
      {mode === 'edit' && (
        <StatusDisplay status={property.status} />
      )}
      
      <FormActions>
        <Button onClick={handleSave}>Save</Button>
        <Button onClick={handleCancel}>Cancel</Button>
      </FormActions>
    </Form>
  );
}
```

---

### Screen 4: Browse Properties

**Route:** `/dashboard/properties` or `/dashboard/browse`

**Visible Components:**
- ✅ Search Bar:
  - Search by title, address, location
  - Filter by Type (HOUSE/APARTMENT)
  - Filter by Status (ACTIVE only for USER)
  - Sort options (Price, Date, etc.)
- ✅ Properties Grid/List:
  - Property Card with:
    - Image gallery
    - Title
    - Type
    - Location
    - Price
    - Status (ACTIVE/RESERVED/CLOSED)
    - [View Details] button
    - [Request to Buy/Rent] button (if ACTIVE and not owner)
- ✅ Pagination

**Hidden Components:**
- ❌ Edit/Delete buttons (only visible on own properties)
- ❌ Admin filters

**Code Example:**
```jsx
function BrowseProperties() {
  const user = useCurrentUser();
  const properties = useProperties();
  
  return (
    <div className="browse-properties">
      <SearchAndFilters />
      
      <PropertiesGrid>
        {properties.map(property => (
          <PropertyCard
            key={property.propertyId}
            property={property}
            actions={
              <>
                <Button onClick={() => viewDetails(property.propertyId)}>View Details</Button>
                {property.status === 'ACTIVE' && 
                 property.ownerId !== user.userId && (
                  <Button onClick={() => createRequest(property.propertyId)}>
                    Request to {property.type === 'BUY' ? 'Buy' : 'Rent'}
                  </Button>
                )}
              </>
            }
          />
        ))}
      </PropertiesGrid>
    </div>
  );
}
```

---

### Screen 5: Property Details View

**Route:** `/dashboard/properties/:id`

**Visible Components:**
- ✅ Property Header:
  - Image Gallery (carousel)
  - Title
  - Type Badge
  - Status Badge
  - Price
- ✅ Property Information:
  - Address
  - Location
  - Description
  - Area, Rooms, Floor
  - Coordinates (if available)
- ✅ Owner Information (if not owner):
  - Owner name (optional, based on privacy)
- ✅ Action Buttons (conditional):
  - [Edit] button (if owner)
  - [Delete] button (if owner and ACTIVE)
  - [Request to Buy] button (if not owner and ACTIVE)
  - [Request to Rent] button (if not owner and ACTIVE)
- ✅ Related Requests (if owner):
  - List of requests for this property
  - Request status badges

**Hidden Components:**
- ❌ Admin actions (unless user is admin)

**Code Example:**
```jsx
function PropertyDetails({ propertyId }) {
  const user = useCurrentUser();
  const property = useProperty(propertyId);
  const isOwner = property.ownerId === user.userId;
  
  return (
    <div className="property-details">
      <ImageGallery images={property.images} />
      
      <PropertyHeader>
        <h1>{property.title}</h1>
        <StatusBadge status={property.status} />
        <PriceDisplay price={property.price} />
      </PropertyHeader>
      
      <PropertyInfo property={property} />
      
      {!isOwner && property.status === 'ACTIVE' && (
        <ActionButtons>
          <Button onClick={() => createRequest(propertyId, 'BUY')}>Request to Buy</Button>
          <Button onClick={() => createRequest(propertyId, 'RENT')}>Request to Rent</Button>
        </ActionButtons>
      )}
      
      {isOwner && (
        <ActionButtons>
          <Button onClick={() => editProperty(propertyId)}>Edit</Button>
          {property.status === 'ACTIVE' && (
            <Button onClick={() => deleteProperty(propertyId)}>Delete</Button>
          )}
        </ActionButtons>
      )}
      
      {isOwner && <PropertyRequests propertyId={propertyId} />}
    </div>
  );
}
```

---

### Screen 6: My Requests

**Route:** `/dashboard/my-requests`

**Visible Components:**
- ✅ Tabs/Filter:
  - All Requests
  - Pending
  - Approved
  - Rejected
- ✅ Requests List:
  - Property Image (thumbnail)
  - Property Title
  - Request Type (BUY/RENT)
  - Status Badge (PENDING/APPROVED/REJECTED)
  - Created Date
  - Decision Date (if approved/rejected)
  - [View Details] button
  - [View Property] button
  - [View Meeting] button (if APPROVED)
- ✅ Empty States:
  - "No requests yet" (if no requests)
  - "No pending requests" (if filtered by status)

**Hidden Components:**
- ❌ All Users' Requests
- ❌ Admin approval actions

**Code Example:**
```jsx
function MyRequests() {
  const user = useCurrentUser();
  const [filter, setFilter] = useState('ALL');
  const requests = useMyRequests(user.userId, filter);
  
  return (
    <div className="my-requests">
      <PageHeader>
        <h1>My Requests</h1>
      </PageHeader>
      
      <Tabs>
        <Tab active={filter === 'ALL'} onClick={() => setFilter('ALL')}>All</Tab>
        <Tab active={filter === 'PENDING'} onClick={() => setFilter('PENDING')}>Pending</Tab>
        <Tab active={filter === 'APPROVED'} onClick={() => setFilter('APPROVED')}>Approved</Tab>
        <Tab active={filter === 'REJECTED'} onClick={() => setFilter('REJECTED')}>Rejected</Tab>
      </Tabs>
      
      <RequestsList>
        {requests.map(request => (
          <RequestCard
            key={request.requestId}
            request={request}
            actions={
              <>
                <Button onClick={() => viewRequest(request.requestId)}>View Details</Button>
                <Button onClick={() => viewProperty(request.propertyId)}>View Property</Button>
                {request.status === 'APPROVED' && (
                  <Button onClick={() => viewMeeting(request.meetingId)}>View Meeting</Button>
                )}
              </>
            }
          />
        ))}
      </RequestsList>
    </div>
  );
}
```

---

### Screen 7: Request Details

**Route:** `/dashboard/requests/:id`

**Visible Components:**
- ✅ Request Information:
  - Request ID
  - Type (BUY/RENT)
  - Status Badge
  - Created Date
  - Decision Date (if decided)
- ✅ Property Information:
  - Property Card (linked)
  - Property details
- ✅ Status Messages:
  - PENDING: "Your request is pending admin approval"
  - APPROVED: "Your request has been approved! Meeting scheduled."
  - REJECTED: "Your request has been rejected"
- ✅ Meeting Information (if APPROVED):
  - Meeting Date/Time
  - Meeting Location (coordinates)
  - Map view (if coordinates available)
  - [View Full Meeting Details] button

**Hidden Components:**
- ❌ Admin approval actions
- ❌ Rejection reason (if not provided)

**Code Example:**
```jsx
function RequestDetails({ requestId }) {
  const request = useRequest(requestId);
  const property = useProperty(request.propertyId);
  
  return (
    <div className="request-details">
      <RequestHeader>
        <StatusBadge status={request.status} />
        <RequestInfo request={request} />
      </RequestHeader>
      
      <PropertyCard property={property} />
      
      <StatusMessage status={request.status} />
      
      {request.status === 'APPROVED' && (
        <MeetingInfo meetingId={request.meetingId} />
      )}
    </div>
  );
}
```

---

### Screen 8: My Meetings

**Route:** `/dashboard/my-meetings`

**Visible Components:**
- ✅ Meetings List:
  - Property Image
  - Property Title
  - Meeting Date/Time
  - Meeting Location
  - Role Badge (BUYER/SELLER)
  - Status Badge (SCHEDULED)
  - [View Details] button
  - [View Property] button
- ✅ Filters:
  - Upcoming Meetings
  - Past Meetings
- ✅ Empty State: "No meetings scheduled"

**Hidden Components:**
- ❌ All Users' Meetings
- ❌ Admin management actions

**Code Example:**
```jsx
function MyMeetings() {
  const user = useCurrentUser();
  const meetings = useMyMeetings(user.userId);
  
  return (
    <div className="my-meetings">
      <PageHeader>
        <h1>My Meetings</h1>
      </PageHeader>
      
      <MeetingsList>
        {meetings.map(meeting => (
          <MeetingCard
            key={meeting.meetingId}
            meeting={meeting}
            role={meeting.roleInMeeting}
            actions={
              <>
                <Button onClick={() => viewMeeting(meeting.meetingId)}>View Details</Button>
                <Button onClick={() => viewProperty(meeting.propertyId)}>View Property</Button>
              </>
            }
          />
        ))}
      </MeetingsList>
    </div>
  );
}
```

---

### Screen 9: Meeting Details

**Route:** `/dashboard/meetings/:id`

**Visible Components:**
- ✅ Meeting Header:
  - Meeting ID
  - Status Badge (SCHEDULED)
  - Role Badge (BUYER/SELLER)
- ✅ Property Information:
  - Property Card (linked)
- ✅ Meeting Information:
  - Scheduled Date/Time
  - Location Coordinates
  - Map View (embedded map)
  - Address (if available)
- ✅ Participant Information:
  - Buyer Name
  - Seller Name
  - Contact Information (if available)
- ✅ Action Buttons:
  - [View Property] button
  - [Get Directions] button (opens map app)

**Hidden Components:**
- ❌ Admin management actions
- ❌ Edit/Cancel meeting (not implemented)

**Code Example:**
```jsx
function MeetingDetails({ meetingId }) {
  const user = useCurrentUser();
  const meeting = useMeeting(meetingId);
  const property = useProperty(meeting.propertyId);
  
  return (
    <div className="meeting-details">
      <MeetingHeader>
        <StatusBadge status={meeting.status} />
        <RoleBadge role={meeting.roleInMeeting} />
      </MeetingHeader>
      
      <PropertyCard property={property} />
      
      <MeetingInfo>
        <DateTimeDisplay date={meeting.scheduledAt} />
        <LocationDisplay 
          latitude={meeting.latitude} 
          longitude={meeting.longitude} 
        />
        <MapView 
          lat={meeting.latitude} 
          lng={meeting.longitude} 
        />
      </MeetingInfo>
      
      <Participants>
        <ParticipantCard user={meeting.buyer} role="Buyer" />
        <ParticipantCard user={meeting.seller} role="Seller" />
      </Participants>
      
      <ActionButtons>
        <Button onClick={() => viewProperty(meeting.propertyId)}>View Property</Button>
        <Button onClick={() => openDirections(meeting.latitude, meeting.longitude)}>
          Get Directions
        </Button>
      </ActionButtons>
    </div>
  );
}
```

---

## 👨‍💼 ADMIN Dashboard

### Navigation Structure

```
Dashboard
├── Home
├── Pending Requests
│   ├── Request Queue
│   ├── Approve Request
│   └── Reject Request
├── All Requests
│   ├── Filter by Status
│   └── Request Details
├── All Properties
│   ├── List View
│   └── Property Details
├── All Meetings
│   ├── List View
│   └── Meeting Details
└── System (Optional - Future)
```

---

### Screen 1: ADMIN Home Dashboard

**Route:** `/dashboard` or `/admin/dashboard`

**Visible Components:**
- ✅ Welcome message: "Admin Dashboard"
- ✅ Admin Stats Cards:
  - Total Pending Requests
  - Total Properties
  - Total Active Users
  - Total Meetings Scheduled
- ✅ Pending Requests Queue (Quick View):
  - Top 5 pending requests
  - [View All] button
- ✅ Recent Activity:
  - Recent approvals
  - Recent rejections
  - Recent property creations
- ✅ Quick Actions:
  - [Review Pending Requests] button
  - [View All Properties] button
  - [View All Meetings] button

**Hidden Components:**
- ❌ User-specific stats (My Properties, My Requests)
- ❌ Create Property button (unless admin can create)

**Code Example:**
```jsx
function AdminDashboard() {
  const stats = useAdminStats();
  const pendingRequests = usePendingRequests({ limit: 5 });
  
  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>
      
      <div className="stats-grid">
        <StatCard title="Pending Requests" value={stats.pendingRequests} urgent />
        <StatCard title="Total Properties" value={stats.totalProperties} />
        <StatCard title="Active Users" value={stats.activeUsers} />
        <StatCard title="Scheduled Meetings" value={stats.meetingsCount} />
      </div>
      
      <PendingRequestsQueue requests={pendingRequests} />
      
      <QuickActions>
        <Button onClick={navigateToPendingRequests}>Review Pending Requests</Button>
        <Button onClick={navigateToAllProperties}>View All Properties</Button>
        <Button onClick={navigateToAllMeetings}>View All Meetings</Button>
      </QuickActions>
    </div>
  );
}
```

---

### Screen 2: Pending Requests Queue

**Route:** `/admin/requests/pending` or `/admin/requests?status=PENDING`

**Visible Components:**
- ✅ Page Header: "Pending Requests" with count badge
- ✅ Requests Table/List:
  - Request ID
  - Property Image (thumbnail)
  - Property Title
  - Requester Name
  - Requester Email
  - Request Type (BUY/RENT)
  - Created Date
  - Property Status (must be ACTIVE)
  - Actions:
    - [Approve] button
    - [Reject] button
    - [View Details] button
    - [View Property] button
- ✅ Filters:
  - Filter by Type (BUY/RENT)
  - Sort by Date
- ✅ Empty State: "No pending requests"

**Hidden Components:**
- ❌ User's own requests filter
- ❌ Personal request actions

**Code Example:**
```jsx
function PendingRequestsQueue() {
  const requests = usePendingRequests();
  
  return (
    <div className="pending-requests">
      <PageHeader>
        <h1>Pending Requests</h1>
        <Badge count={requests.length} />
      </PageHeader>
      
      <RequestsTable>
        {requests.map(request => (
          <RequestRow
            key={request.requestId}
            request={request}
            actions={
              <>
                <Button 
                  variant="success" 
                  onClick={() => openApproveModal(request.requestId)}
                >
                  Approve
                </Button>
                <Button 
                  variant="danger" 
                  onClick={() => openRejectModal(request.requestId)}
                >
                  Reject
                </Button>
                <Button onClick={() => viewRequest(request.requestId)}>View Details</Button>
                <Button onClick={() => viewProperty(request.propertyId)}>View Property</Button>
              </>
            }
          />
        ))}
      </RequestsTable>
    </div>
  );
}
```

---

### Screen 3: Approve Request Modal/Form

**Route:** Modal or `/admin/requests/:id/approve`

**Visible Components:**
- ✅ Request Information:
  - Request ID
  - Property Details
  - Requester Information
  - Request Type
- ✅ Meeting Details Form:
  - Scheduled Date/Time* (required)
  - Latitude* (required)
  - Longitude* (required)
  - Map Picker (for selecting location)
- ✅ Warning Messages:
  - "This will reject all other pending requests for this property"
  - "Property status will change to RESERVED"
- ✅ Action Buttons:
  - [Approve & Schedule Meeting] button
  - [Cancel] button

**Hidden Components:**
- ❌ Rejection form
- ❌ User request actions

**Code Example:**
```jsx
function ApproveRequestModal({ requestId, onClose }) {
  const request = useRequest(requestId);
  const [meetingData, setMeetingData] = useState({
    scheduledAt: '',
    latitude: null,
    longitude: null
  });
  
  return (
    <Modal title="Approve Request" onClose={onClose}>
      <RequestInfo request={request} />
      
      <WarningMessage>
        This will automatically reject all other pending requests for this property
        and change the property status to RESERVED.
      </WarningMessage>
      
      <MeetingForm>
        <FormField label="Scheduled Date/Time" required>
          <DateTimePicker 
            value={meetingData.scheduledAt}
            onChange={(date) => setMeetingData({ ...meetingData, scheduledAt: date })}
          />
        </FormField>
        
        <FormField label="Meeting Location" required>
          <MapPicker
            latitude={meetingData.latitude}
            longitude={meetingData.longitude}
            onLocationSelect={(lat, lng) => setMeetingData({ 
              ...meetingData, 
              latitude: lat, 
              longitude: lng 
            })}
          />
        </FormField>
        
        <FormField label="Latitude" required>
          <Input 
            type="number" 
            value={meetingData.latitude}
            onChange={(e) => setMeetingData({ ...meetingData, latitude: parseFloat(e.target.value) })}
          />
        </FormField>
        
        <FormField label="Longitude" required>
          <Input 
            type="number" 
            value={meetingData.longitude}
            onChange={(e) => setMeetingData({ ...meetingData, longitude: parseFloat(e.target.value) })}
          />
        </FormField>
      </MeetingForm>
      
      <ModalActions>
        <Button variant="success" onClick={() => handleApprove(meetingData)}>
          Approve & Schedule Meeting
        </Button>
        <Button onClick={onClose}>Cancel</Button>
      </ModalActions>
    </Modal>
  );
}
```

---

### Screen 4: Reject Request Modal/Form

**Route:** Modal or `/admin/requests/:id/reject`

**Visible Components:**
- ✅ Request Information:
  - Request ID
  - Property Details
  - Requester Information
- ✅ Rejection Form:
  - Reason (optional text field)
  - Confirmation checkbox: "I confirm I want to reject this request"
- ✅ Action Buttons:
  - [Reject Request] button (danger style)
  - [Cancel] button

**Hidden Components:**
- ❌ Approval form
- ❌ Meeting scheduling

**Code Example:**
```jsx
function RejectRequestModal({ requestId, onClose }) {
  const request = useRequest(requestId);
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  
  return (
    <Modal title="Reject Request" onClose={onClose}>
      <RequestInfo request={request} />
      
      <RejectionForm>
        <FormField label="Rejection Reason (Optional)">
          <Textarea 
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter reason for rejection..."
          />
        </FormField>
        
        <Checkbox 
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        >
          I confirm I want to reject this request
        </Checkbox>
      </RejectionForm>
      
      <ModalActions>
        <Button 
          variant="danger" 
          onClick={() => handleReject(reason)}
          disabled={!confirmed}
        >
          Reject Request
        </Button>
        <Button onClick={onClose}>Cancel</Button>
      </ModalActions>
    </Modal>
  );
}
```

---

### Screen 5: All Requests (Admin View)

**Route:** `/admin/requests` or `/admin/requests/all`

**Visible Components:**
- ✅ Page Header: "All Requests"
- ✅ Filters:
  - Filter by Status (ALL/PENDING/APPROVED/REJECTED)
  - Filter by Type (BUY/RENT)
  - Search by Property Title
  - Search by Requester Email
- ✅ Requests Table:
  - Request ID
  - Property Image
  - Property Title
  - Requester Name
  - Requester Email
  - Type (BUY/RENT)
  - Status Badge
  - Created Date
  - Decision Date
  - Actions:
    - [View Details] button
    - [Approve] button (if PENDING)
    - [Reject] button (if PENDING)
    - [View Property] button
    - [View Meeting] button (if APPROVED)
- ✅ Statistics:
  - Total Requests
  - By Status breakdown
  - By Type breakdown

**Hidden Components:**
- ❌ "My Requests" filter
- ❌ Personal request actions

**Code Example:**
```jsx
function AllRequestsAdmin() {
  const [filters, setFilters] = useState({ status: 'ALL', type: 'ALL' });
  const requests = useAllRequests(filters);
  const stats = useRequestStats();
  
  return (
    <div className="all-requests-admin">
      <PageHeader>
        <h1>All Requests</h1>
      </PageHeader>
      
      <StatsBar stats={stats} />
      
      <Filters>
        <StatusFilter value={filters.status} onChange={...} />
        <TypeFilter value={filters.type} onChange={...} />
        <SearchInput placeholder="Search by property or requester..." />
      </Filters>
      
      <RequestsTable>
        {requests.map(request => (
          <RequestRow
            key={request.requestId}
            request={request}
            showRequesterInfo
            actions={
              <>
                {request.status === 'PENDING' && (
                  <>
                    <Button onClick={() => approveRequest(request.requestId)}>Approve</Button>
                    <Button onClick={() => rejectRequest(request.requestId)}>Reject</Button>
                  </>
                )}
                <Button onClick={() => viewRequest(request.requestId)}>View Details</Button>
                <Button onClick={() => viewProperty(request.propertyId)}>View Property</Button>
                {request.status === 'APPROVED' && (
                  <Button onClick={() => viewMeeting(request.meetingId)}>View Meeting</Button>
                )}
              </>
            }
          />
        ))}
      </RequestsTable>
    </div>
  );
}
```

---

### Screen 6: All Properties (Admin View)

**Route:** `/admin/properties` or `/admin/properties/all`

**Visible Components:**
- ✅ Page Header: "All Properties"
- ✅ Filters:
  - Filter by Status (ALL/ACTIVE/RESERVED/CLOSED)
  - Filter by Type (HOUSE/APARTMENT)
  - Search by Title/Address
  - Filter by Owner
- ✅ Properties Table/Grid:
  - Property Image
  - Title
  - Type
  - Status Badge
  - Owner Name
  - Owner Email
  - Price
  - Created Date
  - Actions:
    - [View] button
    - [Edit] button (admin can edit any)
    - [Delete] button (admin can delete any ACTIVE)
    - [View Requests] button
- ✅ Statistics:
  - Total Properties
  - By Status breakdown
  - By Type breakdown

**Hidden Components:**
- ❌ "My Properties" filter
- ❌ Create Property button (unless admin can create)

**Code Example:**
```jsx
function AllPropertiesAdmin() {
  const [filters, setFilters] = useState({ status: 'ALL', type: 'ALL' });
  const properties = useAllProperties(filters);
  const stats = usePropertyStats();
  
  return (
    <div className="all-properties-admin">
      <PageHeader>
        <h1>All Properties</h1>
      </PageHeader>
      
      <StatsBar stats={stats} />
      
      <Filters>
        <StatusFilter value={filters.status} />
        <TypeFilter value={filters.type} />
        <OwnerFilter />
        <SearchInput />
      </Filters>
      
      <PropertiesTable>
        {properties.map(property => (
          <PropertyRow
            key={property.propertyId}
            property={property}
            showOwnerInfo
            actions={
              <>
                <Button onClick={() => viewProperty(property.propertyId)}>View</Button>
                <Button onClick={() => editProperty(property.propertyId)}>Edit</Button>
                {property.status === 'ACTIVE' && (
                  <Button onClick={() => deleteProperty(property.propertyId)}>Delete</Button>
                )}
                <Button onClick={() => viewRequests(property.propertyId)}>View Requests</Button>
              </>
            }
          />
        ))}
      </PropertiesTable>
    </div>
  );
}
```

---

### Screen 7: All Meetings (Admin View)

**Route:** `/admin/meetings` or `/admin/meetings/all`

**Visible Components:**
- ✅ Page Header: "All Meetings"
- ✅ Filters:
  - Filter by Status (SCHEDULED)
  - Filter by Date Range
  - Search by Property Title
  - Search by Participant Name
- ✅ Meetings Table/List:
  - Meeting ID
  - Property Image
  - Property Title
  - Buyer Name
  - Buyer Email
  - Seller Name
  - Seller Email
  - Scheduled Date/Time
  - Location (coordinates)
  - Status Badge
  - Actions:
    - [View Details] button
    - [View Property] button
- ✅ Statistics:
  - Total Meetings
  - Upcoming Meetings
  - Meetings by Month

**Hidden Components:**
- ❌ "My Meetings" filter
- ❌ Personal meeting actions

**Code Example:**
```jsx
function AllMeetingsAdmin() {
  const [filters, setFilters] = useState({});
  const meetings = useAllMeetings(filters);
  const stats = useMeetingStats();
  
  return (
    <div className="all-meetings-admin">
      <PageHeader>
        <h1>All Meetings</h1>
      </PageHeader>
      
      <StatsBar stats={stats} />
      
      <Filters>
        <DateRangeFilter />
        <SearchInput placeholder="Search by property or participant..." />
      </Filters>
      
      <MeetingsTable>
        {meetings.map(meeting => (
          <MeetingRow
            key={meeting.meetingId}
            meeting={meeting}
            showParticipants
            actions={
              <>
                <Button onClick={() => viewMeeting(meeting.meetingId)}>View Details</Button>
                <Button onClick={() => viewProperty(meeting.propertyId)}>View Property</Button>
              </>
            }
          />
        ))}
      </MeetingsTable>
    </div>
  );
}
```

---

## 🔄 Shared Components

### Header/Navbar

**USER View:**
```jsx
<Header>
  <Logo />
  <Navigation>
    <NavLink to="/dashboard">Home</NavLink>
    <NavLink to="/dashboard/my-properties">My Properties</NavLink>
    <NavLink to="/dashboard/properties">Browse</NavLink>
    <NavLink to="/dashboard/my-requests">My Requests</NavLink>
    <NavLink to="/dashboard/my-meetings">My Meetings</NavLink>
  </Navigation>
  <UserMenu>
    <UserAvatar />
    <Dropdown>
      <MenuItem>Profile</MenuItem>
      <MenuItem onClick={logout}>Logout</MenuItem>
    </Dropdown>
  </UserMenu>
</Header>
```

**ADMIN View:**
```jsx
<Header>
  <Logo />
  <Navigation>
    <NavLink to="/admin/dashboard">Dashboard</NavLink>
    <NavLink to="/admin/requests/pending">Pending Requests</NavLink>
    <NavLink to="/admin/requests">All Requests</NavLink>
    <NavLink to="/admin/properties">All Properties</NavLink>
    <NavLink to="/admin/meetings">All Meetings</NavLink>
  </Navigation>
  <UserMenu>
    <AdminBadge />
    <UserAvatar />
    <Dropdown>
      <MenuItem>Profile</MenuItem>
      <MenuItem onClick={logout}>Logout</MenuItem>
    </Dropdown>
  </UserMenu>
</Header>
```

### Sidebar (Optional)

**USER Sidebar:**
- My Properties
- Browse Properties
- My Requests
- My Meetings

**ADMIN Sidebar:**
- Dashboard
- Pending Requests (with badge count)
- All Requests
- All Properties
- All Meetings

---

## 🎨 Component Visibility Matrix

| Component | USER | ADMIN | Notes |
|-----------|------|-------|-------|
| **Navigation** |
| My Properties | ✅ | ❌ | |
| Browse Properties | ✅ | ❌ | Admin uses "All Properties" |
| My Requests | ✅ | ❌ | |
| My Meetings | ✅ | ❌ | |
| Pending Requests | ❌ | ✅ | |
| All Requests | ❌ | ✅ | |
| All Properties | ❌ | ✅ | |
| All Meetings | ❌ | ✅ | |
| **Actions** |
| Create Property | ✅ | ❌* | *Unless admin can create |
| Edit Property | ✅* | ✅ | *Only own properties |
| Delete Property | ✅* | ✅ | *Only own ACTIVE |
| Request to Buy/Rent | ✅ | ❌ | |
| Approve Request | ❌ | ✅ | |
| Reject Request | ❌ | ✅ | |
| **Information** |
| Owner Info | ✅* | ✅ | *Only if not owner |
| Requester Info | ✅* | ✅ | *Only if requester or owner |
| All Users Info | ❌ | ✅ | |
| System Stats | ❌ | ✅ | |

---

## 📱 Responsive Considerations

### Mobile View
- Collapsible sidebar
- Stack cards vertically
- Simplified filters
- Bottom navigation bar (mobile)

### Tablet View
- Sidebar can be toggled
- Grid layout for properties
- Full filter panel

### Desktop View
- Fixed sidebar
- Full table views
- Advanced filters
- Multi-column layouts

---

## 🚀 Implementation Checklist

### USER Dashboard
- [ ] Home dashboard with stats
- [ ] My Properties list and CRUD
- [ ] Browse Properties with search/filters
- [ ] Property details view
- [ ] My Requests list with status filters
- [ ] Request details view
- [ ] My Meetings list
- [ ] Meeting details with map

### ADMIN Dashboard
- [ ] Admin home dashboard
- [ ] Pending Requests queue
- [ ] Approve Request modal/form
- [ ] Reject Request modal/form
- [ ] All Requests view with filters
- [ ] All Properties view with filters
- [ ] All Meetings view with filters

### Shared
- [ ] Header/Navbar with role-based navigation
- [ ] Authentication flow
- [ ] Error handling
- [ ] Loading states
- [ ] Empty states
- [ ] Responsive design

---

## 💡 UI/UX Best Practices

1. **Role Badges:** Clearly show user role (USER/ADMIN) in header
2. **Status Colors:** Use consistent colors for statuses (Green=ACTIVE/APPROVED, Yellow=PENDING, Red=REJECTED/CLOSED)
3. **Permission Feedback:** Show clear messages when user tries to access restricted features
4. **Empty States:** Provide helpful empty state messages with CTAs
5. **Loading States:** Show loading indicators for async operations
6. **Error Messages:** Display user-friendly error messages
7. **Confirmation Dialogs:** Use confirmations for destructive actions
8. **Success Notifications:** Show success messages after actions

---

This guide provides a complete blueprint for implementing role-based dashboards. Each screen is designed to show only the features and information relevant to the user's role, ensuring a clean and secure user experience.

