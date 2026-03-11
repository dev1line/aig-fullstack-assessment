## AWS CloudFormation Infra for Sentiment App

This folder contains CloudFormation templates and helper scripts to deploy the NestJS backend (ECS Fargate + ALB) and the Next.js frontend (static export, S3 + CloudFront) for this project on AWS.

📐 **Architecture:** See [ARCHITECTURE.md](./ARCHITECTURE.md) for a diagram (Mermaid) and component overview.

### Prerequisites

- AWS account with permissions for VPC, ECS, IAM, CloudFormation, S3, CloudFront, and CloudWatch Logs.
- AWS CLI v2 installed and configured (`aws configure`).
- Docker installed (to build and push the backend container image to ECR).

### Structure

- `templates/network.yaml` – VPC, subnets, routing, NAT gateway.
- `templates/rds.yaml` – RDS PostgreSQL instance + security group (for backend database).
- `templates/ecs-backend.yaml` – ECS Fargate cluster, ALB, service for the NestJS backend.
- `templates/s3-cloudfront-frontend.yaml` – S3 bucket + CloudFront distribution for the Next.js static-export frontend.
- `deploy/deploy-network.sh` – Deploy/update the network stack.
- `deploy/deploy-rds.sh` – Deploy/update the RDS stack.
- `deploy/deploy-backend.sh` – Deploy/update the ECS backend stack.
- `deploy/deploy-frontend-stack.sh` – Deploy/update the S3 + CloudFront stack.
- `deploy/deploy-frontend-assets.sh` – Upload built frontend assets to the S3 bucket.
- `deploy/deploy-all.sh` – **Single script** to deploy the full stack (network → RDS → backend → frontend).

**Config:** Copy `.env.example` to `.env` in this folder and set at least `RDS_MASTER_PASSWORD`. Optionally set `NEXT_PUBLIC_API_URL` (backend ALB URL) for the frontend build. Then run from project root: `./infra-aws/deploy/deploy-all.sh`.

### 1. Deploy network stack

```bash
cd infra-aws
./deploy/deploy-network.sh my-project-network
```

Key outputs:

- `VpcId`
- `PublicSubnetIds`
- `PrivateSubnetIds`

You will use these values when deploying the RDS and backend stacks.

### 2. Deploy RDS (PostgreSQL)

Deploy the database **before** the backend so you can pass the RDS endpoint as `DatabaseUrl`.

```bash
cd infra-aws
./deploy/deploy-rds.sh my-project-rds <VpcId> "<PrivateSubnetIds>" "<MasterUserPassword>"
```

Example (use the same `VpcId` and `PrivateSubnetIds` from the network stack outputs):

```bash
./deploy/deploy-rds.sh my-project-rds vpc-xxxxx "subnet-aaa,subnet-bbb" "YourSecurePassword123"
```

Optional env vars: `VPC_CIDR` (default `10.0.0.0/16`), `DATABASE_NAME` (default `sentiment_reviews`), `MASTER_USERNAME` (default `app`).

After deployment, note the outputs:

- `DbEndpoint` – RDS hostname (e.g. `sentiment-app-postgres.xxxxx.ap-southeast-1.rds.amazonaws.com`)
- `DatabaseName` – database name
- `MasterUsername` – master user

Build **DATABASE_URL** for the backend. **RDS requires SSL:** append `?sslmode=require`.

```text
postgresql://<MasterUsername>:<MasterUserPassword>@<DbEndpoint>:5432/<DatabaseName>?sslmode=require
```

**Get DATABASE_URL via AWS CLI:** Run `./infra-aws/deploy/get-database-url.sh` (requires `infra-aws/.env` with `RDS_MASTER_PASSWORD` and RDS stack deployed). The script adds `?sslmode=require` automatically. Export to shell: `eval $(./infra-aws/deploy/get-database-url.sh)`.

RDS security group allows inbound **5432** from the VPC CIDR, so ECS tasks in the same VPC can connect.

### 3. Build and push backend image

From the project root:

```bash
cd backend
# For ECS Fargate (x86_64), build for linux/amd64 (required when building on Mac M1/M2)
docker build --platform linux/amd64 -t my-backend .
aws ecr create-repository --repository-name my-backend || true
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region)
IMAGE_REPO="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/my-backend"
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$IMAGE_REPO"
docker tag my-backend:latest "$IMAGE_REPO:latest"
docker push "$IMAGE_REPO:latest"
```

Use `IMAGE_REPO:latest` as the `ImageUrl` parameter for the backend stack.

### 4. Deploy backend (ECS Fargate + ALB)

```bash
cd infra-aws
./deploy/deploy-backend.sh \
  my-project-backend \
  <VpcId> \
  "<PrivateSubnetIds_comma_separated>" \
  "<PublicSubnetIds_comma_separated>" \
  "<ImageUrl>" \
  "<DatabaseUrl>" \
  "[CorsAllowedOrigins]"
```

`DatabaseUrl` must be a **PostgreSQL** connection string reachable from ECS (e.g. RDS endpoint in the same VPC). Do not use `localhost` — from inside the task, that refers to the container itself.

**CORS:** To allow the frontend (e.g. CloudFront) to call the backend API, pass the frontend origin as the 7th argument: `https://<DistributionDomainName>`. Example: `https://d123abc.cloudfront.net`. Multiple origins: comma-separated. If omitted, the backend allows all origins (dev-friendly).

After deployment, note the outputs:

- **LoadBalancerDNSName** – ALB URL (HTTP). Direct use from HTTPS pages causes mixed content.
- **ApiDistributionDomainName** – CloudFront domain for the API. Use **https://\<ApiDistributionDomainName\>** as `NEXT_PUBLIC_API_URL` so the frontend (HTTPS) calls the API over HTTPS.

#### ECS task exit code 255

If the task exits with code 255, check **CloudWatch Logs**:

- Log group: `/ecs/sentiment-app-backend`
- Look for messages like `prisma migrate deploy failed` or connection errors.

**Common cause:** `DATABASE_URL` is unreachable (e.g. still set to `localhost` or a URL not reachable from the ECS VPC). Deploy the RDS stack (step 2) and use the RDS endpoint as `DatabaseUrl`.

#### Task failed ELB health checks

If tasks stop with "failed ELB health checks", the container may not be responding to `GET /health` in time. The entrypoint runs `ensure-db-grants` and `prisma migrate deploy` before starting the app, which can take 30–60+ seconds. The template sets **HealthCheckGracePeriodSeconds: 120** on the ECS service (so the first 2 minutes of unhealthy results are ignored) and a more lenient target group health check (**UnhealthyThresholdCount: 5**, **HealthCheckTimeoutSeconds: 10**). If you updated resources manually, apply the same via CLI:

```bash
# Target group: allow more failures before marking unhealthy
aws elbv2 modify-target-group --target-group-arn <TG_ARN> \
  --health-check-interval-seconds 30 --health-check-timeout-seconds 10 \
  --healthy-threshold-count 2 --unhealthy-threshold-count 5
# Service: ignore unhealthy for first 2 minutes after task start
aws ecs update-service --cluster sentiment-app-cluster --service sentiment-app-backend-svc --health-check-grace-period-seconds 120
```

Ensure the backend exposes **GET /health** (see `backend/src/health/`).

#### "User was denied access on the database"

If the Nest app starts but API calls fail with `User was denied access on the database 'sentiment_reviews'`, the DB user may lack CONNECT/schema privileges. The backend image includes a startup script that runs **ensure-db-grants** (connects to `postgres` and the target DB to apply `GRANT CONNECT`, `GRANT ALL ON SCHEMA public`, etc.). Rebuild and redeploy the backend so the new entrypoint runs; if the error persists, connect to RDS (e.g. RDS Query Editor or psql from a bastion) as the master user and run:

```sql
GRANT CONNECT ON DATABASE sentiment_reviews TO app;
GRANT ALL PRIVILEGES ON DATABASE sentiment_reviews TO app;
\c sentiment_reviews
GRANT ALL ON SCHEMA public TO app;
GRANT ALL ON ALL TABLES IN SCHEMA public TO app;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO app;
```

#### CORS and mixed content (HTTPS frontend + HTTP API)

If the frontend is served over **HTTPS** (e.g. `https://d3b1w3vpdvmn7d.cloudfront.net`) and the API is **HTTP** (e.g. `http://...elb.amazonaws.com`), the browser may block requests (mixed content) or CORS can fail. Fix by exposing the API over **HTTPS** too.

The backend stack template includes a **CloudFront distribution** in front of the ALB. After deployment, use the stack output **ApiDistributionDomainName** (or **ApiUrl**) and set the frontend to call the API via HTTPS:

- `NEXT_PUBLIC_API_URL=https://<ApiDistributionDomainName>`

Then rebuild and re-upload the frontend. Both frontend and API are then HTTPS; CORS with `ALLOWED_ORIGINS` set to the frontend origin continues to work.

If the backend stack was deployed before this CloudFront was added, update the stack once (same `deploy-backend.sh` parameters) to create the distribution. Then set `NEXT_PUBLIC_API_URL` to `https://<ApiDistributionDomainName>` and redeploy the frontend.

#### CORS: allow frontend origin

1. **Backend:** Set **CorsAllowedOrigins** to the frontend origin (e.g. `https://<frontend-distribution>.cloudfront.net`). Example:

   ```bash
   ./deploy/deploy-backend.sh ... "https://d123abc.cloudfront.net"
   ```

2. **API CloudFront:** If the API is behind CloudFront (HTTPS), add a **response headers policy** so CloudFront injects CORS headers even when the origin is slow or missing them. Example (replace distribution id and frontend origin):

   ```bash
   # Create policy
   aws cloudfront create-response-headers-policy --response-headers-policy-config '{
     "Name": "api-cors",
     "CorsConfig": {
       "AccessControlAllowOrigins": { "Quantity": 1, "Items": ["https://d3b1w3vpdvmn7d.cloudfront.net"] },
       "AccessControlAllowHeaders": { "Quantity": 2, "Items": ["Content-Type", "Authorization"] },
       "AccessControlAllowMethods": { "Quantity": 7, "Items": ["GET", "HEAD", "OPTIONS", "PUT", "PATCH", "POST", "DELETE"] },
       "AccessControlAllowCredentials": false,
       "OriginOverride": true
     }
   }'
   # Attach to distribution: get config, set DefaultCacheBehavior.ResponseHeadersPolicyId to the policy id, update-distribution
   ```

   `deploy-all.sh` sets backend CORS automatically after deploying the frontend.

### 5. Deploy frontend (S3 + CloudFront)

1. Build frontend (Next.js static export → `out/`):

```bash
cd frontend
npm install
npm run build
```

2. Deploy S3 + CloudFront stack:

```bash
cd ../infra-aws
./deploy/deploy-frontend-stack.sh my-project-frontend
```

Note the outputs:

- `BucketName`
- `DistributionDomainName`

3. Upload built assets (default expects `FRONTEND_DIR=frontend/out` or set it for CI artifact path):

```bash
./deploy/deploy-frontend-assets.sh <BucketName>
```

Then access the app via `https://<DistributionDomainName>`.

