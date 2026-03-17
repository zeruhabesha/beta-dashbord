# Security Dashboard - Docker Deployment

This guide provides instructions for building and running the Security Dashboard in a containerized environment.

## Prerequisites
- Docker and Docker Compose installed
- OpenSearch running (accessible on the same network)

## Build the Image
Navigate to the `beta-security-dashboard` directory and run:

```bash
docker build -t beta-security-dashboard:latest .
```

## Running the Container

### 1. Manual Run
To run the container and link it to your existing OpenSearch network (default is usually `opensearch-standalone_opensearch-net`):

```bash
docker run -d \
  --name security-dashboard \
  --network opensearch-standalone_opensearch-net \
  -p 8080:80 \
  beta-security-dashboard:latest
```

### 2. Integration with Docker Compose
You can add the dashboard to your existing `docker-compose.yml`:

```yaml
  security-dashboard:
    build: ./beta-security-dashboard
    ports:
      - "8080:80"
    networks:
      - opensearch-net
    depends_on:
      - opensearch
```

## Pushing to a Registry (Getting a shareable link)

To get a public link for your image (e.g., on Docker Hub):

1. **Log in to Docker Hub**:
   ```bash
   docker login
   ```

2. **Tag your image**:
   Replace `USERNAME` with your Docker Hub username:
   ```bash
   docker tag beta-security-dashboard:latest USERNAME/beta-security-dashboard:latest
   ```

3. **Push the image**:
   ```bash
   docker push USERNAME/beta-security-dashboard:latest
   ```

After pushing, your "link" will be: `https://hub.docker.com/r/USERNAME/beta-security-dashboard`

## Configuration Notes
...
