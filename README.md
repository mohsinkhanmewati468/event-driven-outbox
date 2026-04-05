# Event-Driven Outbox (Transactional Outbox Pattern)

## Overview

This project demonstrates a **fault-tolerant microservices architecture** using the **Transactional Outbox Pattern**.

The system guarantees that **every registered user eventually receives a "Welcome Task"**, even if the message broker is temporarily unavailable.

---

## Tech Stack

- **Backend:** Node.js (Express)
- **Database:** MongoDB (Mongoose)
- **Message Broker:** RabbitMQ
- **Infrastructure:** Docker & Docker Compose

---

## Architecture

### Services:

1. **Auth Service (Producer)**
   - Handles user registration
   - Stores events in Outbox (MongoDB)
   - Runs a background relay worker

2. **Todo Service (Consumer)**
   - Listens to user events
   - Creates a default "Welcome to the App" task

---

### Event Flow

```
User Registration
      ↓
MongoDB Transaction (User + Outbox)
      ↓
Relay Worker (reads PENDING events)
      ↓
RabbitMQ Exchange
      ↓
Queue (USER_REGISTERED)
      ↓
Todo Service
      ↓
Welcome Task Created
```

---

## Transactional Outbox Pattern

- User and event are saved **atomically** in MongoDB
- Relay worker publishes events asynchronously
- Events are marked as **SENT only after RabbitMQ ACK**
- Ensures **no message loss**

---

## How to Run (Docker)

### 1. Clone the repository

```
git clone https://github.com/mohsinkhanmewati468/event-driven-outbox.git
cd task-assignment
```

---

### 2. Start services

```
docker-compose up --build
```

---

### 3. Services will be available:

- Auth API: http://localhost:3000
- RabbitMQ UI: http://localhost:15672
  - Username: `guest`
  - Password: `guest`

---

## Testing the Flow

### Normal Flow

1. Register a user:

```
POST http://localhost:3000/register
```

```json
{
  "email": "test@example.com",
  "password": "123456"
}
```

2. Expected result:
   - User is created
   - Outbox event is created → marked as SENT
   - Todo Service creates "Welcome to the App" task

---

### Failure Simulation (RabbitMQ Down)

1. Stop RabbitMQ:

```
docker stop rabbitmq
```

2. Register a user:
   - User is created
   - Outbox entry is created with status **PENDING**
   - No todo created yet

3. Restart RabbitMQ:

```
docker start rabbitmq
```

4. Wait a few seconds (relay worker runs)

5. Expected result:
   - Event is published
   - Outbox status becomes **SENT**
   - Todo is created automatically

---

## Idempotency

The Todo Service ensures no duplicate tasks using:

- MongoDB `upsert`
- Unique condition on `(userId + title)`

---

## Project Structure

```
.
├── auth-service/
│   ├── src/
│   └── Dockerfile
├── todo-service/
│   ├── src/
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## Key Design Decisions

- **Outbox Pattern** → guarantees reliability
- **Confirm Channel (RabbitMQ)** → ensures message delivery
- **Consumer Idempotency** → avoids duplicates
- **Separate Relay Worker** → async processing
- **Dockerized Setup** → reproducible environment

---

## Conclusion

This system ensures:

- No data loss
- Eventual consistency
- Fault tolerance (even if RabbitMQ is down)
- Scalable microservices design

---

## Author

- Name: MOHSIN
- Role: Node.js Developer

---
