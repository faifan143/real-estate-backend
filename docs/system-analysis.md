# Real Estate Backend - System Analysis

## System Overview

```mermaid
graph TB
    subgraph "Client Layer"
        Mobile[Mobile App]
        Web[Web App]
    end

    subgraph "API Layer"
        API[NestJS Backend<br/>Port 3000]
    end

    subgraph "AI Layer"
        Ollama[Ollama LLM<br/>Port 11434]
    end

    subgraph "Data Layer"
        DB[(PostgreSQL)]
        FS[File Storage<br/>/public/uploads]
    end

    Mobile --> API
    Web --> API
    API --> DB
    API --> FS
    API --> Ollama
```

---

## Module Architecture

```mermaid
graph LR
    subgraph "Core Modules"
        App[AppModule]
        Prisma[PrismaModule]
    end

    subgraph "Feature Modules"
        Auth[AuthModule]
        Props[PropertiesModule]
        Imgs[PropertyImagesModule]
        Reqs[RequestsModule]
        Admin[AdminRequestsModule]
        Meet[MeetingsModule]
        Price[PricePredictionModule]
        Health[HealthModule]
    end

    App --> Prisma
    App --> Auth
    App --> Props
    App --> Imgs
    App --> Reqs
    App --> Admin
    App --> Meet
    App --> Price
    App --> Health

    Props -.-> Prisma
    Auth -.-> Prisma
    Price -.-> Prisma
```

---

## Entity Relationship Diagram

```mermaid
erDiagram
    USER ||--o{ PROPERTY : owns
    USER ||--o{ TRANSACTION_REQUEST : creates
    USER ||--o{ MEETING : "buyer_in"
    USER ||--o{ MEETING : "seller_in"
    
    PROPERTY ||--o{ PROPERTY_IMAGE : has
    PROPERTY ||--o{ TRANSACTION_REQUEST : receives
    PROPERTY ||--o{ MEETING : location_for
    
    TRANSACTION_REQUEST ||--o| MEETING : schedules

    USER {
        int id PK
        string email UK
        string password
        string firstName
        string lastName
        string phone
        enum role "USER|ADMIN"
    }

    PROPERTY {
        int id PK
        string title
        string type
        string description
        string address
        float price
        string location
        float latitude
        float longitude
        float area
        int rooms
        int floor
        enum status "ACTIVE|RESERVED|CLOSED"
        int ownerId FK
    }

    PROPERTY_IMAGE {
        int id PK
        int propertyId FK
        string fileName
    }

    TRANSACTION_REQUEST {
        int id PK
        int propertyId FK
        int requesterId FK
        enum type "BUY|RENT"
        enum status "PENDING|APPROVED|REJECTED"
        datetime decisionAt
    }

    MEETING {
        int id PK
        int propertyId FK
        int transactionRequestId FK
        int buyerId FK
        int sellerId FK
        datetime scheduledAt
        float latitude
        float longitude
        enum status "SCHEDULED"
    }
```

---

## Authentication Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant A as AuthController
    participant S as AuthService
    participant DB as Database
    participant J as JwtService

    Note over C,J: Registration
    C->>A: POST /auth/register
    A->>S: register(dto)
    S->>DB: Check email exists
    DB-->>S: Not found
    S->>S: Hash password (bcrypt)
    S->>DB: Create user
    DB-->>S: User created
    S-->>C: {userId, role}

    Note over C,J: Login
    C->>A: POST /auth/login
    A->>S: login(dto)
    S->>DB: Find user by email
    DB-->>S: User data
    S->>S: Verify password
    S->>J: Generate JWT
    J-->>S: Token
    S-->>C: {accessToken, role}

    Note over C,J: Protected Request
    C->>A: GET /auth/me [Bearer Token]
    A->>A: JwtAuthGuard validates
    A->>S: getMe(userId)
    S->>DB: Fetch user
    S-->>C: User profile
```

---

## Property Lifecycle

```mermaid
stateDiagram-v2
    [*] --> ACTIVE: Property Created
    
    ACTIVE --> ACTIVE: Update Details
    ACTIVE --> ACTIVE: Add/Remove Images
    ACTIVE --> RESERVED: Request Approved
    ACTIVE --> [*]: Deleted by Owner
    
    RESERVED --> CLOSED: Transaction Complete
    RESERVED --> ACTIVE: Deal Cancelled
    
    CLOSED --> [*]: Archived
    
    note right of ACTIVE: Available for requests
    note right of RESERVED: Meeting scheduled
    note right of CLOSED: Transaction done
```

---

## Transaction Request Flow

```mermaid
sequenceDiagram
    participant U as User
    participant RC as RequestsController
    participant RS as RequestsService
    participant AC as AdminController
    participant AS as AdminService
    participant DB as Database

    Note over U,DB: User Creates Request
    U->>RC: POST /properties/:id/requests
    RC->>RS: create(propertyId, userId, dto)
    RS->>DB: Verify property ACTIVE
    RS->>DB: Check no existing request
    RS->>DB: Create request (PENDING)
    RS-->>U: {requestId, status: PENDING}

    Note over U,DB: Admin Reviews
    U->>AC: GET /admin/requests
    AC->>AS: findPending()
    AS->>DB: Find PENDING requests
    AS-->>U: List of pending requests

    alt Approve
        U->>AC: POST /admin/requests/:id/approve
        AC->>AS: approve(id, meetingDto)
        AS->>DB: Transaction start
        AS->>DB: Update request → APPROVED
        AS->>DB: Reject other pending requests
        AS->>DB: Update property → RESERVED
        AS->>DB: Create meeting
        AS->>DB: Transaction commit
        AS-->>U: {requestId, meetingId}
    else Reject
        U->>AC: POST /admin/requests/:id/reject
        AC->>AS: reject(id)
        AS->>DB: Update request → REJECTED
        AS-->>U: {requestId, newStatus}
    end
```

---

## Price Prediction Flow

```mermaid
flowchart TD
    A[POST /properties/predict-price] --> B{Request has propertyId?}
    
    B -->|Yes| C[Fetch property images from DB]
    B -->|No| D{Request has imageBase64?}
    
    C --> E[Collect up to 3 images]
    D -->|Yes| E
    D -->|No| F[Use Text-Only Model]
    
    E --> G{Images collected?}
    G -->|Yes| H[Use Vision Model: llama3.2-vision]
    G -->|No| F
    
    H --> I[Build Vision Prompt]
    F --> J[Build Text Prompt]
    
    I --> K[Call Ollama API]
    J --> K
    
    K --> L{Ollama Available?}
    L -->|No| M[Fallback: Rule-based Formula]
    L -->|Yes| N[Parse LLM Response]
    
    M --> O[Return Estimate]
    N --> O

    style H fill:#e1f5fe
    style F fill:#fff3e0
    style M fill:#ffebee
```

---

## Price Prediction - Detailed Sequence

```mermaid
sequenceDiagram
    participant C as Client
    participant PC as PredictionController
    participant PS as PredictionService
    participant DB as Prisma
    participant FS as FileSystem
    participant O as Ollama

    C->>PC: POST /properties/predict-price
    PC->>PS: predictPrice(dto)
    
    alt Has propertyId
        PS->>DB: getPropertyImages(id)
        DB-->>PS: Image filenames
        PS->>FS: Read image files
        FS-->>PS: Base64 images
    end

    alt Has imageBase64
        PS->>PS: Use provided images
    end

    alt Images available
        PS->>O: POST /api/generate (vision model)
        Note right of O: Model: llama3.2-vision<br/>Prompt + Images
    else No images
        PS->>O: POST /api/generate (text model)
        Note right of O: Model: llama3.2:3b<br/>Prompt only
    end

    alt Ollama responds
        O-->>PS: JSON response
        PS->>PS: Parse price estimate
        PS-->>C: {estimatedPrice, confidence, reasoning, source: "llm-vision"}
    else Ollama unavailable
        PS->>PS: Calculate fallback
        PS-->>C: {estimatedPrice, source: "fallback"}
    end
```

---

## API Endpoints Overview

```mermaid
graph LR
    subgraph "Public"
        R1[POST /auth/register]
        R2[POST /auth/login]
        R3[GET /health]
    end

    subgraph "User Protected"
        R4[GET /auth/me]
        R5[PATCH /auth/profile]
        R6[GET /properties]
        R7[POST /properties]
        R8[GET /properties/:id]
        R9[POST /properties/:id/requests]
        R10[GET /me/requests]
        R11[GET /me/meetings]
        R12[POST /properties/predict-price]
    end

    subgraph "Admin Only"
        R13[GET /admin/requests]
        R14[POST /admin/requests/:id/approve]
        R15[POST /admin/requests/:id/reject]
    end
```

---

## Complete User Journey

```mermaid
journey
    title Real Estate Transaction Journey
    section Registration
      Register account: 5: User
      Login: 5: User
    section Property Listing
      Create property: 4: Seller
      Upload images: 4: Seller
      Property goes ACTIVE: 5: System
    section Discovery
      Browse properties: 5: Buyer
      Get price prediction: 4: Buyer
      View property details: 5: Buyer
    section Transaction
      Submit buy/rent request: 4: Buyer
      Review request: 3: Admin
      Approve and schedule meeting: 4: Admin
      Property becomes RESERVED: 5: System
    section Meeting
      View meeting details: 5: Buyer, Seller
      Attend meeting: 4: Buyer, Seller
      Complete transaction: 5: System
```

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Runtime** | Node.js | JavaScript runtime |
| **Framework** | NestJS 10.3 | Backend framework |
| **ORM** | Prisma 6.0 | Database access |
| **Database** | PostgreSQL | Data persistence |
| **Auth** | JWT + Passport | Authentication |
| **Validation** | class-validator | DTO validation |
| **File Upload** | Multer | Image handling |
| **AI/LLM** | Ollama | Price prediction |
| **Container** | Docker | Deployment |
