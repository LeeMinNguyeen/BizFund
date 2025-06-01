# BizFund Deployment Guide

This guide explains how to deploy the BizFund application using Docker and Docker Compose.

## Prerequisites

- Docker Engine (version 20.10.0 or higher)
- Docker Compose (version 2.0.0 or higher)
- Git

## Project Structure

```
BizFund/
├── Backend/
│   ├── Dockerfile
│   ├── main.py
│   └── requirements.txt
├── Frontend/
│   └── bizfund/
│       ├── Dockerfile
│       ├── package.json
│       └── src/
└── docker-compose.yml
```

## Local Development Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd BizFund
   ```

2. Start the services using Docker Compose:
   ```bash
   docker-compose up --build
   ```

3. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## Production Deployment

### Environment Variables

Before deploying to production, update the following environment variables:

1. Backend (in docker-compose.yml):
   ```yaml
   environment:
     - CORS_ORIGINS=https://your-domain.com
   ```

2. Frontend (in docker-compose.yml):
   ```yaml
   environment:
     - NEXT_PUBLIC_API_URL=https://api.your-domain.com
   ```

### Deployment Steps

1. Build the Docker images:
   ```bash
   docker-compose build
   ```

2. Push the images to your container registry:
   ```bash
   docker tag bizfund-backend:latest your-registry/bizfund-backend:latest
   docker tag bizfund-frontend:latest your-registry/bizfund-frontend:latest
   docker push your-registry/bizfund-backend:latest
   docker push your-registry/bizfund-frontend:latest
   ```

3. On your production server:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

### SSL/TLS Configuration

For production, set up SSL/TLS certificates using a reverse proxy (e.g., Nginx):

1. Install Nginx:
   ```bash
   apt-get update
   apt-get install nginx
   ```

2. Configure Nginx as a reverse proxy:
   ```nginx
   # /etc/nginx/sites-available/bizfund
   server {
       listen 443 ssl;
       server_name your-domain.com;

       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;

       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }

   server {
       listen 443 ssl;
       server_name api.your-domain.com;

       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;

       location / {
           proxy_pass http://localhost:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

## Monitoring and Maintenance

1. View container logs:
   ```bash
   docker-compose logs -f
   ```

2. Monitor container health:
   ```bash
   docker-compose ps
   ```

3. Update the application:
   ```bash
   git pull
   docker-compose down
   docker-compose up --build -d
   ```

## Backup and Recovery

1. Database backups (if added in the future):
   ```bash
   docker-compose exec db pg_dump -U postgres > backup.sql
   ```

2. Container data:
   ```bash
   docker volume ls
   docker volume backup <volume-name>
   ```

## Troubleshooting

1. If the frontend can't connect to the backend:
   - Check if the backend container is running
   - Verify CORS settings in the backend
   - Check the NEXT_PUBLIC_API_URL environment variable

2. If containers fail to start:
   - Check logs: `docker-compose logs`
   - Verify port availability
   - Check disk space and system resources

3. Common issues:
   - Port conflicts: Change the exposed ports in docker-compose.yml
   - Memory issues: Adjust container memory limits
   - Network issues: Check Docker network settings

## Security Considerations

1. Never commit sensitive data to the repository
2. Use environment variables for secrets
3. Regularly update dependencies
4. Implement rate limiting
5. Use secure headers
6. Monitor for vulnerabilities

## Support

For additional support or to report issues:
1. Check the project's issue tracker
2. Contact the development team
3. Review the documentation 