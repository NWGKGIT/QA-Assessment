# Cloud Deployment Plan

## Option 1: VPS deployment

A small Ubuntu VPS can run the existing Docker Compose stack with minimal platform overhead.

### Components

- Ubuntu VPS
- Docker Engine and Docker Compose
- A reverse proxy such as Caddy or Nginx for HTTPS
- A firewall allowing only SSH, HTTP, and HTTPS
- Scheduled backups of the PostgreSQL volume

### Deployment flow

1. CI runs lint, typecheck, build, and unit tests.
2. Build and tag the Docker image with the commit SHA.
3. Copy the Compose files and deployment configuration to the VPS.
4. Store production variables in a protected `.env` file on the VPS.
5. Run database migrations and start the stack with `docker compose up -d --build`.
6. Configure the reverse proxy to forward HTTPS traffic to port `4000`.
7. Verify the API and database health checks.

The PostgreSQL volume must be backed up before migrations or infrastructure changes. A VPS deployment is suitable for a small service, but it has a larger operational burden and a single-server availability risk.

### Rollback

Keep the previous image and Git revision. Stop the API, restore the previous image or revision, and start the API again without deleting the database volume. Restore a database backup only when the migration or data change requires it.

## Option 2: AWS managed deployment

A managed AWS deployment can use ECS Fargate for the API and RDS PostgreSQL for the database.

### Components

- **ECR:** Store versioned Docker images.
- **ECS Fargate:** Run the API container without managing virtual machines.
- **RDS PostgreSQL:** Provide managed storage, backups, and database monitoring.
- **Application Load Balancer:** Provide HTTPS traffic routing and target health checks.
- **Secrets Manager:** Store database credentials and inject them into the ECS task.
- **CloudWatch:** Collect container logs and service metrics.

### Deployment flow

1. CI runs lint, typecheck, build, and unit tests.
2. CI builds the Docker image and tags it with the commit SHA.
3. CI pushes the image to ECR.
4. The ECS task definition is updated to reference the new image.
5. Database migrations run as a controlled release task.
6. ECS starts a new task and waits for the load balancer health check.
7. ECS shifts traffic to the healthy task and retires the previous task.

RDS should remain private, with access restricted to the ECS security group. The database should not run as a container in the production AWS architecture.

### Rollback

Keep the previous ECR image tag and ECS task definition revision. If the new task fails health checks or monitoring shows errors, redeploy the previous task definition. Database migrations require a separate rollback decision because reversing a schema change can risk data loss.

## Security checklist

- Keep the VPS firewall or AWS security groups restrictive.
- Store credentials in a protected VPS file or AWS Secrets Manager, never in Git or the Docker image.
- Use SSH keys on a VPS and IAM roles or OIDC in AWS.
- Enable HTTPS.
- Set alerts for restarts, failed health checks, high CPU or memory, disk usage, and database storage.
