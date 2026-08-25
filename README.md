# Order Service

Simple Order API — first microservice for the E-Commerce Serverless project.

## Endpoints

- `POST /orders` — create an order → `{ "customer_name": "John", "item": "Laptop", "quantity": 1 }`
- `GET /orders` — list all orders
- `GET /orders/:id` — get one order
- `PATCH /orders/:id/status` — update status → `{ "status": "SHIPPED" }`
- `GET /health` — health check (used by K8s probes)
┌─────────────────────────────────┐         ┌──────────────────────────┐
│   YOUR LAPTOP (Docker Desktop)   │         │      AWS CLOUD           │
│                                   │         │  (real AWS account)      │
│  Kubernetes (kind cluster)       │         │                          │
│  ├── order-service pods          │ ──SQS──▶│  SQS Queue               │
│  ├── postgres pod                │  msg    │       │                  │
│  ├── webapp pods                 │         │       ▼                  │
│  └── Jenkins, SonarQube, etc.    │         │  Lambda Function         │
│                                   │◀────────│  (calls back via ngrok) │
│  ngrok tunnel (exposes laptop     │  HTTP   │                          │
│  to internet so Lambda can        │ PATCH   │                          │
│  reach it)                        │         │                          │
└─────────────────────────────────┘         └──────────────────────────┘
## Local Test (without Docker)

```bash
npm install
# run a local postgres or point DB_HOST to one
npm start
```

## Setup Steps

### 1. Create GitHub repo
Create a new repo called `order-service` on GitHub and push this folder to it.

```bash
cd order-service
git init
git add .
git commit -m "Initial commit - order service"
git remote add origin https://github.com/siddamsettysathish-rgb/order-service.git
git branch -M main
git push -u origin main
```

### 2. Create SonarQube project
- Project key: `order-service`
- Assign the same `webapp-gate` quality gate (or create a new empty one)

### 3. Create Jenkins Pipeline job
- New Item → name `order-service` → Pipeline
- SCM: Git → `https://github.com/siddamsettysathish-rgb/order-service.git`
- Credentials: `Github-Token`
- Branch: `*/main`
- Script Path: `Jenkinsfile`
- Build Triggers → Poll SCM `H/2 * * * *` (or webhook)

### 4. Deploy Postgres first (one-time)
```bash
kubectl apply -f k8s/postgres.yaml
kubectl get pods -n default -w
```

### 5. Apply ArgoCD Application
```bash
kubectl apply -f argocd/application.yaml
```

### 6. Trigger first build
Push a change or click **Build Now** in Jenkins.

### 7. Test the API
```bash
# Create an order
curl -X POST http://localhost:30091/orders \
  -H "Content-Type: application/json" \
  -d '{"customer_name":"John Doe","item":"Laptop","quantity":1}'

# List orders
curl http://localhost:30091/orders

# Get one order
curl http://localhost:30091/orders/1

# Update status
curl -X PATCH http://localhost:30091/orders/1/status \
  -H "Content-Type: application/json" \
  -d '{"status":"SHIPPED"}'
```

## Next Steps (Phase 2)
- Add a Payment Lambda function (AWS SAM) triggered by SQS when an order is created
- Add a Notification Lambda (SES email) when order status changes
- Move Postgres to AWS RDS or migrate schema to DynamoDB
