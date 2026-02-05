    # Tutterfly CRM - API Flow Diagrams

## 🔄 Complete Request Flow

```mermaid
sequenceDiagram
    participant Client as Client Application
    participant API as FastAPI Application
    participant Auth as Authentication Middleware
    participant Perm as Permission Service
    participant Service as Business Service
    participant DB as MongoDB Database
    participant Activity as Activity Logger
    participant Notify as Notification Service

    Client->>API: HTTP Request (with JWT Token)
    API->>Auth: Validate JWT Token
    Auth->>API: User Context
    API->>Perm: Check Permissions
    Perm->>API: Permission Result
    
    alt Permission Granted
        API->>Service: Call Service Method
        Service->>DB: Database Operation
        DB->>Service: Result
        Service->>Activity: Log Activity
        Service->>Notify: Trigger Notifications (async)
        Service->>API: Processed Result
        API->>Client: JSON Response
    else Permission Denied
        API->>Client: 403 Forbidden
    end
```

## 🏗️ Authentication Flow

```mermaid
flowchart TD
    A[User Login Request] --> B{Validate Credentials}
    B -->|Valid| C[Generate JWT Token]
    B -->|Invalid| D[Return 401 Error]
    
    C --> E[Set Token Expiration]
    E --> F[Return Token Response]
    
    F --> G[Client Stores Token]
    G --> H[Subsequent API Calls]
    H --> I[Include JWT in Header]
    I --> J[Validate Token]
    J --> K{Token Valid?}
    K -->|Yes| L[Process Request]
    K -->|No/Expired| M[Return 401 Error]
    M --> N[Refresh Token Flow]
```

## 🏢 Multi-Tenant Data Flow

```mermaid
flowchart LR
    A[Client Request] --> B[Extract Tenant ID]
    B --> C[Validate Tenant Access]
    C --> D[Filter by Tenant ID]
    D --> E[Database Query]
    E --> F[Tenant-Specific Results]
    F --> G[Response to Client]
    
    H[Database] --> I[Tenant Collection]
    I --> J[Tenant A Data]
    I --> K[Tenant B Data]
    I --> L[Tenant C Data]
    
    D --> E
```

## 📊 CRM Entity Relationship Flow

```mermaid
flowchart TD
    subgraph "Lead Management"
        A[Lead Created] --> B[Lead Qualification]
        B --> C{Qualified?}
        C -->|Yes| D[Convert to Opportunity]
        C -->|No| E[Nurture Lead]
        E --> B
    end
    
    subgraph "Opportunity Management"
        D --> F[Opportunity Stages]
        F --> G[Prospecting]
        G --> H[Qualification]
        H --> I[Proposal]
        I --> J[Negotiation]
        J --> K[Closed Won/Lost]
    end
    
    subgraph "Account Management"
        L[Account Created] --> M[Add Contacts]
        M --> N[Track Opportunities]
        N --> O[Manage Relationships]
    end
    
    subgraph "Contact Management"
        P[Contact Created] --> Q[Link to Account]
        Q --> R[Track Interactions]
        R --> S[Update Contact Info]
    end
    
    D --> L
    L --> P
```

## 🔐 Permission Check Flow

```mermaid
flowchart TD
    A[API Request] --> B[Extract User from JWT]
    B --> C[Get User Role]
    C --> D[Get Role Permissions]
    D --> E[Check Required Permission]
    E --> F{Permission Exists?}
    
    F -->|No| G[Return 403 Forbidden]
    F -->|Yes| H{Scope Check}
    
    H -->|Own Data| I[Check Data Ownership]
    H -->|Department| J[Check Department Access]
    H -->|All| K[Allow Access]
    
    I --> L{User Owns Data?}
    J --> M{User in Department?}
    
    L -->|Yes| K
    L -->|No| G
    M -->|Yes| K
    M -->|No| G
    
    K --> N[Process Request]
```

## 📝 Activity Logging Flow

```mermaid
sequenceDiagram
    participant User as User Action
    participant API as API Endpoint
    participant Service as Service Layer
    participant Activity as Activity Logger
    participant DB as Database

    User->>API: Create/Update/Delete Entity
    API->>Service: Call Service Method
    Service->>DB: Perform Operation
    DB->>Service: Operation Result
    Service->>Activity: Log Activity
    Activity->>DB: Save Activity Log
    Service->>API: Return Result
    API->>User: Response
    
    Note over Activity: Activity includes:
    - User ID
    - Action Type
    - Entity Type
    - Entity ID
    - Timestamp
    - Changes Made
```

## 📧 Email Notification Flow

```mermaid
flowchart TD
    A[Trigger Event] --> B[Check Notification Rules]
    B --> C{Notification Required?}
    
    C -->|No| D[End Flow]
    C -->|Yes| E[Select Email Template]
    E --> F[Prepare Template Data]
    F --> G[Render Email Content]
    G --> H[Queue Email]
    H --> I[Email Service]
    I --> J[Send Email]
    J --> K{Send Success?}
    K -->|Yes| L[Log Success]
    K -->|No| M[Log Error]
    M --> N[Retry Logic]
    N --> I
```

## 📁 File Upload Flow

```mermaid
sequenceDiagram
    participant Client as Client
    participant API as File API
    participant Storage as File Service
    participant DB as Database
    participant Activity as Activity Logger

    Client->>API: Upload File Request
    API->>Storage: Validate File
    Storage->>API: Validation Result
    
    alt Valid File
        API->>Storage: Store File
        Storage->>API: File Metadata
        API->>DB: Save File Record
        DB->>API: File ID
        API->>Activity: Log Upload
        API->>Client: File ID Response
    else Invalid File
        API->>Client: Validation Error
    end
```

## 📊 Dashboard Data Flow

```mermaid
flowchart TD
    A[Dashboard Request] --> B[Get User Context]
    B --> C[Get Tenant Data]
    C --> D[Apply Filters]
    D --> E[Aggregate Data]
    E --> F[Calculate Metrics]
    F --> G[Format Response]
    G --> H[Return Dashboard Data]
    
    subgraph "Data Sources"
        I[Accounts]
        J[Contacts]
        K[Leads]
        L[Opportunities]
        M[Activities]
    end
    
    C --> I
    C --> J
    C --> K
    C --> L
    C --> M
    
    I --> D
    J --> D
    K --> D
    L --> D
    M --> D
```

## 🔄 Background Task Flow

```mermaid
flowchart TD
    A[Trigger Event] --> B[Create Background Task]
    B --> C[Add to Task Queue]
    C --> D[Task Worker]
    D --> E[Process Task]
    E --> F{Task Type?}
    
    F -->|Email| G[Send Email]
    F -->|Notification| H[Send Notification]
    F -->|Webhook| I[Call Webhook]
    F -->|Report| J[Generate Report]
    
    G --> K[Log Result]
    H --> K
    I --> K
    J --> K
    
    K --> L{Success?}
    L -->|Yes| M[Mark Complete]
    L -->|No| N[Retry/Mark Failed]
```

## 🔍 Search and Filter Flow

```mermaid
flowchart TD
    A[Search Request] --> B[Parse Search Parameters]
    B --> C[Build Query]
    C --> D[Apply Tenant Filter]
    D --> E[Apply Permission Filter]
    E --> F[Apply Search Filters]
    F --> G[Apply Sorting]
    G --> H[Apply Pagination]
    H --> I[Execute Database Query]
    I --> J[Format Results]
    J --> K[Return Paginated Response]
    
    subgraph "Filter Types"
        L[Text Search]
        M[Date Range]
        N[Status Filter]
        O[Owner Filter]
        P[Custom Fields]
    end
    
    F --> L
    F --> M
    F --> N
    F --> O
    F --> P
```

## 🚀 Error Handling Flow

```mermaid
flowchart TD
    A[API Request] --> B[Process Request]
    B --> C{Error Occurred?}
    
    C -->|No| D[Return Success Response]
    C -->|Yes| E[Identify Error Type]
    
    E --> F{Error Category}
    F -->|Validation| G[400 Bad Request]
    F -->|Authentication| H[401 Unauthorized]
    F -->|Authorization| I[403 Forbidden]
    F -->|Not Found| J[404 Not Found]
    F -->|Server Error| K[500 Internal Error]
    
    G --> L[Log Validation Error]
    H --> M[Log Auth Error]
    I --> N[Log Permission Error]
    J --> O[Log Not Found]
    K --> P[Log Server Error]
    
    L --> Q[Format Error Response]
    M --> Q
    N --> Q
    O --> Q
    P --> Q
    
    Q --> R[Return Error Response]
```

## 📈 Performance Monitoring Flow

```mermaid
sequenceDiagram
    participant Client as Client Request
    participant API as API Endpoint
    participant Monitor as Performance Monitor
    participant DB as Database
    participant Cache as Redis Cache

    Client->>API: Request
    API->>Monitor: Start Timer
    API->>Cache: Check Cache
    alt Cache Hit
        Cache->>API: Cached Data
        API->>Monitor: Log Cache Hit
    else Cache Miss
        API->>DB: Query Database
        DB->>API: Data
        API->>Cache: Store in Cache
        API->>Monitor: Log Cache Miss
    end
    API->>Monitor: End Timer
    Monitor->>Monitor: Calculate Metrics
    API->>Client: Response
    Monitor->>Monitor: Store Performance Data
```

---

## 📋 Summary

These flow diagrams illustrate the complete request lifecycle in the Tutterfly CRM system, showing how different components interact to provide a secure, scalable, and efficient CRM solution. The diagrams cover authentication, authorization, data flow, error handling, and various business processes that make up the comprehensive CRM functionality.
