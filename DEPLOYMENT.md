# BizFund Deployment Guide

This guide provides comprehensive instructions for deploying the BizFund application in both development and production environments.

## Prerequisites

- Docker Engine (version 24.0.0 or higher)
- Docker Compose V2 (version 2.21.0 or higher)
- Git
- Node.js 20.x (for local development)
- Python 3.12.x (for local development)

## Project Structure

```
BizFund/
├── Backend/
│   ├── Dockerfile
│   ├── main.py
│   ├── unetpp.py
│   ├── requirements.txt
│   └── Model/
├── Frontend/
│   └── bizfund/
│       ├── Dockerfile
│       ├── package.json
│       └── src/
├── docker-compose.yml        # Development
└── docker-compose.prod.yml   # Production
```

## Environment Setup

### Development Environment

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd BizFund
   ```

2. Create environment files:

   `.env.development` for development:
   ```env
   CORS_ORIGINS=http://localhost:3000
   NODE_ENV=development
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

3. Start development services:
   ```bash
   docker compose up --build
   ```

4. Access development endpoints:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### Production Environment

1. Create environment files:

   `.env.production`:
   ```env
   CORS_ORIGINS=https://your-domain.com
   NODE_ENV=production
   NEXT_PUBLIC_API_URL=https://api.your-domain.com
   ```

2. Configure SSL certificates:
   ```bash
   mkdir -p /etc/ssl/bizfund
   # Copy your SSL certificates
   cp your-cert.pem /etc/ssl/bizfund/cert.pem
   cp your-key.pem /etc/ssl/bizfund/key.pem
   ```

## Production Deployment

### Security Considerations

1. SSL/TLS Configuration:
   - Use strong SSL configuration
   - Enable HTTP/2
   - Configure HSTS
   - Enable OCSP stapling

2. Docker Security:
   - Use non-root users (configured in Dockerfiles)
   - Enable Docker content trust
   - Regular security updates
   - Resource limits configuration

3. Application Security:
   - Rate limiting
   - CORS configuration
   - Security headers
   - Regular dependency updates

### Deployment Steps

1. Set up production server:
   ```bash
   # Install required packages
   apt-get update && apt-get install -y \
     docker.io \
     docker-compose-plugin \
     nginx \
     certbot \
     python3-certbot-nginx
   ```

2. Configure Nginx:
   ```nginx
   # /etc/nginx/sites-available/bizfund
   server {
       listen 443 ssl http2;
       server_name your-domain.com;

       ssl_certificate /etc/ssl/bizfund/cert.pem;
       ssl_certificate_key /etc/ssl/bizfund/key.pem;

       # Strong SSL configuration
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
       ssl_prefer_server_ciphers off;

       # HSTS
       add_header Strict-Transport-Security "max-age=63072000" always;

       # Security headers
       add_header X-Frame-Options DENY;
       add_header X-Content-Type-Options nosniff;
       add_header X-XSS-Protection "1; mode=block";
       add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';";

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }

   server {
       listen 443 ssl http2;
       server_name api.your-domain.com;

       # SSL and security configuration same as above

       location / {
           proxy_pass http://localhost:8000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;

           # Rate limiting
           limit_req zone=api burst=10 nodelay;
           limit_req_status 429;
       }
   }
   ```

3. Deploy with Docker Compose:
   ```bash
   # Pull latest changes
   git pull origin main

   # Deploy services
   docker compose -f docker-compose.prod.yml up -d --build
   ```

## Monitoring and Maintenance

### Health Monitoring

1. Container health checks:
   ```bash
   # View container status
   docker compose -f docker-compose.prod.yml ps

   # View container logs
   docker compose -f docker-compose.prod.yml logs -f
   ```

2. Set up monitoring tools:
   - Prometheus for metrics
   - Grafana for visualization
   - ELK Stack for log aggregation

### Resource Monitoring

1. System resources:
   ```bash
   # Monitor container resources
   docker stats

   # Monitor system resources
   htop
   ```

2. Configure resource limits in docker-compose.prod.yml:
   ```yaml
   services:
     backend:
       deploy:
         resources:
           limits:
             cpus: '1.0'
             memory: 1G
           reservations:
             cpus: '0.5'
             memory: 512M
   ```

### Backup Strategy

1. Data backups:
   ```bash
   # Backup analysis history
   docker compose -f docker-compose.prod.yml exec backend \
     cp /app/analysis_history.json /app/backups/

   # Backup ML model files
   docker compose -f docker-compose.prod.yml exec backend \
     tar -czf /app/backups/models.tar.gz /app/Model/
   ```

2. Automated backups:
   ```bash
   # Add to crontab
   0 0 * * * /path/to/backup-script.sh
   ```

### Update Procedure

1. Update application:
   ```bash
   # Pull latest changes
   git pull origin main

   # Update dependencies
   docker compose -f docker-compose.prod.yml build

   # Deploy updates
   docker compose -f docker-compose.prod.yml up -d
   ```

2. Update system packages:
   ```bash
   apt-get update && apt-get upgrade -y
   ```

## Troubleshooting

### Common Issues

1. Container startup failures:
   - Check logs: `docker compose logs <service>`
   - Verify environment variables
   - Check disk space and permissions

2. Performance issues:
   - Monitor resource usage
   - Check application logs
   - Review Nginx access logs

3. Network issues:
   - Verify DNS configuration
   - Check firewall rules
   - Validate SSL certificates

### Debug Mode

1. Enable debug logging:
   ```bash
   # Backend
   docker compose exec backend python -m debugpy --listen 0.0.0.0:5678 main.py

   # Frontend
   docker compose exec frontend npm run dev
   ```

## Support and Documentation

- GitHub Issues: Report bugs and feature requests
- Documentation: /docs directory
- Contact: support@bizfund.com

Remember to regularly:
- Update dependencies
- Monitor security advisories
- Perform system updates
- Review logs for unusual activity
- Test backup restoration
- Validate SSL certificates
- Review access logs 