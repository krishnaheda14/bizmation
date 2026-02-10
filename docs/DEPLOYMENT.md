# Deployment Guide

## Quick Start with Docker Compose

### Prerequisites
- Docker and Docker Compose installed
- Git
- Node.js 18+ (for local development)
- Python 3.10+ (for AI services development)

### 1. Clone Repository
```bash
git clone <repository-url>
cd jewelry-retail-platform
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start All Services
```bash
docker-compose up -d
```

Services will be available at:
- **Web App**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **AI Services**: http://localhost:8000
- **PostgreSQL**: localhost:5432

### 4. Run Database Migrations
```bash
docker exec -it jewelry-backend psql -U jewelry_admin -d jewelry_retail -f /app/scripts/migrate.sql
```

### 5. Access Application
Open http://localhost:5173 in your browser.

---

## Production Deployment Options

### Option 1: AWS ECS (Recommended)

#### Prerequisites
- AWS Account
- AWS CLI configured
- ECR repositories created

#### Steps

1. **Build and Push Docker Images**
```bash
# Login to ECR
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-south-1.amazonaws.com

# Build and tag images
docker build -f infrastructure/docker/backend.Dockerfile -t jewelry-backend .
docker tag jewelry-backend:latest <account-id>.dkr.ecr.ap-south-1.amazonaws.com/jewelry-backend:latest

docker build -f infrastructure/docker/web-app.Dockerfile -t jewelry-web-app .
docker tag jewelry-web-app:latest <account-id>.dkr.ecr.ap-south-1.amazonaws.com/jewelry-web-app:latest

docker build -f infrastructure/docker/ai-services.Dockerfile -t jewelry-ai-services .
docker tag jewelry-ai-services:latest <account-id>.dkr.ecr.ap-south-1.amazonaws.com/jewelry-ai-services:latest

# Push images
docker push <account-id>.dkr.ecr.ap-south-1.amazonaws.com/jewelry-backend:latest
docker push <account-id>.dkr.ecr.ap-south-1.amazonaws.com/jewelry-web-app:latest
docker push <account-id>.dkr.ecr.ap-south-1.amazonaws.com/jewelry-ai-services:latest
```

2. **Create RDS PostgreSQL Instance**
```bash
aws rds create-db-instance \
  --db-instance-identifier jewelry-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username jewelry_admin \
  --master-user-password <secure-password> \
  --allocated-storage 20 \
  --region ap-south-1
```

3. **Create ECS Cluster**
```bash
aws ecs create-cluster --cluster-name jewelry-cluster --region ap-south-1
```

4. **Create Task Definitions**
Create task definition files for each service and register them:
```bash
aws ecs register-task-definition --cli-input-json file://infrastructure/ecs/backend-task.json
aws ecs register-task-definition --cli-input-json file://infrastructure/ecs/web-app-task.json
aws ecs register-task-definition --cli-input-json file://infrastructure/ecs/ai-services-task.json
```

5. **Create Services**
```bash
aws ecs create-service \
  --cluster jewelry-cluster \
  --service-name jewelry-backend \
  --task-definition jewelry-backend \
  --desired-count 2 \
  --launch-type FARGATE
```

6. **Configure Application Load Balancer**
- Create ALB
- Configure target groups
- Set up SSL/TLS certificate
- Configure routing rules

### Option 2: Railway (Fastest)

#### Steps

1. **Install Railway CLI**
```bash
npm install -g @railway/cli
railway login
```

2. **Initialize Project**
```bash
railway init
```

3. **Deploy Services**
```bash
# Deploy backend
cd apps/backend
railway up

# Deploy web app
cd ../web-app
railway up

# Deploy AI services
cd ../../ai-services
railway up
```

4. **Configure Environment Variables**
Use Railway dashboard to set environment variables.

5. **Add PostgreSQL Database**
```bash
railway add postgres
```

### Option 3: DigitalOcean App Platform

1. Connect GitHub repository
2. Configure each service:
   - Backend: Node.js service
   - Web App: Static site
   - AI Services: Python service
3. Add managed PostgreSQL database
4. Deploy

---

## GitHub Actions CI/CD Setup

### Configure Secrets

Go to Repository Settings → Secrets and add:

- `DOCKER_USERNAME`: Docker Hub username
- `DOCKER_PASSWORD`: Docker Hub password or access token
- `AWS_ACCESS_KEY_ID`: AWS access key (if using AWS)
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `DATABASE_URL`: Production database URL

### Workflow

The CI/CD pipeline automatically:
1. Runs linting and tests on every push
2. Builds Docker images on main branch
3. Pushes images to Docker Hub
4. Deploys to staging/production based on branch

---

## Database Backups

### Automated Backups (PostgreSQL)

**AWS RDS**: Enable automated backups in RDS console (enabled by default)

**Manual Backup**:
```bash
# Create backup
docker exec jewelry-postgres pg_dump -U jewelry_admin jewelry_retail > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker exec -i jewelry-postgres psql -U jewelry_admin jewelry_retail < backup.sql
```

### Backup to S3
```bash
# Install AWS CLI in backup script
aws s3 cp backup_$(date +%Y%m%d_%H%M%S).sql s3://jewelry-backups/
```

---

## Monitoring & Logging

### Application Monitoring (Sentry)

1. Sign up for Sentry (free tier available)
2. Add Sentry DSN to .env
3. Errors automatically reported

### Logs

**View logs in Docker**:
```bash
docker-compose logs -f backend
docker-compose logs -f web-app
docker-compose logs -f ai-services
```

**CloudWatch Logs (AWS)**:
Configure ECS task definitions to send logs to CloudWatch.

---

## Scaling

### Horizontal Scaling

**Docker Compose**:
```bash
docker-compose up -d --scale backend=3
```

**AWS ECS**:
```bash
aws ecs update-service --cluster jewelry-cluster --service jewelry-backend --desired-count 5
```

### Auto-scaling (AWS)

Configure ECS service auto-scaling based on:
- CPU utilization
- Memory utilization
- Request count

---

## Security Checklist

- [ ] Change all default passwords
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure firewall rules
- [ ] Enable database encryption
- [ ] Set up VPC (AWS)
- [ ] Configure security groups
- [ ] Enable audit logging
- [ ] Set up intrusion detection
- [ ] Regular security updates
- [ ] Backup encryption

---

## Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Check database is running
docker ps | grep postgres

# Check connection string
echo $DATABASE_URL

# Test connection
docker exec -it jewelry-postgres psql -U jewelry_admin -d jewelry_retail -c "SELECT NOW();"
```

**Services Not Starting**
```bash
# Check logs
docker-compose logs backend

# Rebuild images
docker-compose build --no-cache
docker-compose up -d
```

**Port Conflicts**
```bash
# Check what's using the port
lsof -i :3000

# Change port in docker-compose.yml
```

---

## Performance Optimization

### Backend
- Enable Redis caching
- Use connection pooling
- Optimize database queries
- Enable compression

### Web App
- Enable service worker caching
- Lazy load components
- Optimize images
- Enable CDN

### Database
- Add appropriate indexes
- Regular VACUUM operations
- Configure connection limits
- Enable query caching

---

## Support

For deployment issues:
- Check logs first
- Review environment variables
- Verify network connectivity
- Test database connection

Contact: support@jewelryplatform.com
