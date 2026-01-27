# AI Price Prediction System

## System Architecture

```mermaid
graph TB
    subgraph "NestJS Backend"
        Controller[PricePredictionController]
        Service[PricePredictionService]
        Prisma[(Prisma ORM)]
    end

    subgraph "Ollama Server :11434"
        TextModel["llama3.2:3b<br/>Text Analysis"]
        VisionModel["llama3.2-vision<br/>Image + Text Analysis"]
    end

    subgraph "Data Sources"
        DB[(PostgreSQL<br/>Property Images)]
        FS[File System<br/>/public/uploads]
        Client[Client Request<br/>Base64 Images]
    end

    Controller --> Service
    Service --> Prisma
    Prisma --> DB
    Service --> FS
    Client --> Service
    Service --> TextModel
    Service --> VisionModel

    style VisionModel fill:#e3f2fd
    style TextModel fill:#fff3e0
```

---

## Decision Flow

```mermaid
flowchart TD
    A[📥 Incoming Request] --> B{propertyId<br/>provided?}
    
    B -->|Yes| C[🔍 Query DB for<br/>property images]
    B -->|No| D{imageBase64<br/>provided?}
    
    C --> E[📁 Load images<br/>from filesystem]
    D -->|Yes| F[📦 Use provided<br/>base64 images]
    D -->|No| G[📝 Text-only mode]
    
    E --> H{Images<br/>found?}
    H -->|Yes| I[🖼️ Vision Mode]
    H -->|No| G
    F --> I
    
    I --> J[🤖 llama3.2-vision]
    G --> K[🤖 llama3.2:3b]
    
    J --> L{Ollama<br/>available?}
    K --> L
    
    L -->|Yes| M[✅ Parse LLM Response]
    L -->|No| N[⚡ Fallback Formula]
    
    M --> O[📤 Return Estimate]
    N --> O

    style I fill:#e3f2fd,stroke:#1976d2
    style G fill:#fff3e0,stroke:#f57c00
    style N fill:#ffebee,stroke:#c62828
```

---

## Processing Pipeline

```mermaid
sequenceDiagram
    participant C as 📱 Client
    participant S as 🔧 Service
    participant DB as 🗄️ Database
    participant FS as 📁 Files
    participant O as 🤖 Ollama

    C->>S: predict({type, location, area, rooms, propertyId?})
    
    rect rgb(230, 245, 255)
        Note over S,FS: Image Collection Phase
        alt propertyId provided
            S->>DB: Find property images
            DB-->>S: [img1.jpg, img2.jpg]
            S->>FS: Read file contents
            FS-->>S: Base64 encoded images
        else imageBase64 provided
            S->>S: Use provided images
        end
    end

    rect rgb(255, 243, 224)
        Note over S,O: AI Processing Phase
        alt Has images (max 3)
            S->>O: POST /api/generate<br/>model: llama3.2-vision<br/>prompt + images
            Note right of O: Analyzes:<br/>• Property condition<br/>• Interior quality<br/>• Lighting & views
        else No images
            S->>O: POST /api/generate<br/>model: llama3.2:3b<br/>prompt only
        end
        O-->>S: JSON response
    end

    S->>S: Parse & validate response
    S-->>C: {estimatedPrice, confidence, reasoning, source}
```

---

## Model Comparison

```mermaid
graph LR
    subgraph "Text Model: llama3.2:3b"
        T1[Type: APARTMENT]
        T2[Location: NYC]
        T3[Area: 85 sqm]
        T4[Rooms: 2]
        T1 & T2 & T3 & T4 --> TP[📝 Text Prompt]
        TP --> TM[🤖 LLM]
        TM --> TO[💰 $250,000<br/>confidence: medium]
    end

    subgraph "Vision Model: llama3.2-vision"
        V1[📝 Property Details]
        V2[🖼️ Kitchen Photo]
        V3[🖼️ Living Room]
        V4[🖼️ Exterior]
        V1 & V2 & V3 & V4 --> VP[🔮 Vision Prompt]
        VP --> VM[🤖 Vision LLM]
        VM --> VO[💰 $285,000<br/>confidence: high<br/>+"Modern renovated kitchen,<br/>good natural light"]
    end

    style TM fill:#fff3e0
    style VM fill:#e3f2fd
```

---

## Fallback System

```mermaid
flowchart LR
    subgraph "Fallback Formula"
        A[Area: 85 sqm] --> F
        B[Type: APARTMENT] --> F
        C[Rooms: 2] --> F
        D[Floor: 5] --> F
        
        F[Calculate] --> G["basePricePerSqm = 2500<br/>+ rooms × 100<br/>+ floor × 50"]
        G --> H["85 × 2950 = $250,750"]
    end

    style F fill:#ffebee
```

---

## Environment Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_URL` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | `llama3.2:3b` | Text model name |
| `OLLAMA_VISION_MODEL` | `llama3.2-vision` | Vision model name |
