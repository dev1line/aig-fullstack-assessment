# Customer Review Sentiment Analyzer — Project Results

## Overview

This project delivers a **customer review sentiment analysis** fullstack application: a web UI to submit reviews, a backend API that classifies sentiment (Positive / Negative / Neutral) with confidence scores, and persistence in PostgreSQL. The system is deployed on **AWS** with the frontend served as a **static site from S3 and CloudFront** and the backend running on **ECS Fargate** behind an Application Load Balancer and a CloudFront distribution for HTTPS.

---

## What Was Delivered

### Backend (NestJS + Prisma + PostgreSQL)

- **POST /analyze** — Submits review text; returns sentiment, confidence, and score breakdown; stores the result in the database.
- **GET /reviews** — Returns all analyzed reviews (ordered by creation time).
- **GET /health** — Lightweight health check for the load balancer.
- Sentiment logic uses the **natural** library (Bayes classifier) trained on `datasets/data.csv` and knowledge cases; results are saved via Prisma to **PostgreSQL** (RDS on AWS).
- Deployed as a Docker container on **ECS Fargate**, with RDS in private subnets and API exposed via **ALB + CloudFront** (HTTPS).

### Frontend (Next.js)

- **Analyze** — Form to enter review text (max 500 characters); calls `POST /analyze` and shows sentiment, confidence, and scores.
- **Reviews** — List of all stored reviews with sentiment and metadata.
- Simple tab navigation between Analyze and Reviews.
- Built as a **static export** (`next build` with `output: 'export'`) and deployed to **S3**, served through **CloudFront** with a viewer-request function to map `/reviews` to `reviews.html`.

### Infrastructure (AWS)

- **Network** — VPC, public/private subnets, NAT gateway.
- **RDS** — PostgreSQL instance for the backend database.
- **ECS** — Fargate service for the backend container; ALB for HTTP; CloudFront in front of the ALB for HTTPS and CORS.
- **S3 + CloudFront** — Frontend bucket and distribution; CloudFront function for `/reviews` routing.
- Deployment is automated via **CloudFormation** and shell scripts (`deploy-all.sh` and related scripts in `infra-aws/deploy/`).

---

## Why Next.js Static Export on S3 + CloudFront?

This project is a **proof-of-concept (POC) / demo**. The frontend is a **static web app**: no server-side rendering (SSR) or API routes at runtime, no dynamic backend logic in the Next.js process. Given that, we chose:

1. **Next.js static export** — `output: 'export'` produces a set of static files (HTML, JS, CSS). All pages (e.g. `/`, `/reviews`) are pre-rendered at build time. The app then runs entirely in the browser and talks to the separate backend API over HTTPS.

2. **Hosting on S3 + CloudFront** — Static files are uploaded to S3 and served by CloudFront. This is a standard, simple, and cost-effective way to host a static site on AWS:
   - **Simplicity** — No need to run a Node server for the frontend; no EC2 or ECS for the UI.
   - **Low cost** — S3 and CloudFront are cheap for a demo/POC traffic level.
   - **Fast and global** — CloudFront caches assets at the edge.
   - **HTTPS** — CloudFront provides TLS and a single domain for the UI, which avoids mixed-content issues when calling the API (also behind CloudFront).

3. **Fit for a “static web” POC** — For this demo we do not need:
   - SSR or ISR.
   - Next.js API routes (the API is a separate NestJS service).
   - Per-request server logic or auth in the frontend process.  
   So a static export plus a CDN is the simplest and most appropriate option.

For a production system with SEO, personalization, or server-side logic, you might add SSR, move to a different hosting model (e.g. Vercel, or ECS for Next.js), or introduce a BFF; for this POC, a static Next.js build on S3/CloudFront keeps the demo simple and focused on the sentiment API and UI.

---

## How to Run and Deploy

- **Local** — Backend: `cd backend && npm run start:dev` (with PostgreSQL, e.g. via Docker). Frontend: `cd frontend && npm run dev`. Configure `NEXT_PUBLIC_API_URL` and `DATABASE_URL` as needed.
- **AWS** — From the project root, configure `infra-aws/.env` (at least `RDS_MASTER_PASSWORD`) and run `./infra-aws/deploy/deploy-all.sh` to deploy network, RDS, backend (build + push image, ECS stack), and frontend (build, S3 + CloudFront, asset upload). See `infra-aws/README.md` for step-by-step and troubleshooting.

---

## Summary

The project delivers a working sentiment analysis demo: a static Next.js frontend on S3/CloudFront and a NestJS API on ECS with PostgreSQL on RDS. Choosing **Next.js static export on S3 + CloudFront** is intentional for this POC: the app is a simple static web front end, and this setup keeps the architecture straightforward, cheap, and easy to deploy and explain.
