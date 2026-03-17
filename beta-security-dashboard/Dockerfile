# Stage 1: Build the React application
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies
# Using npm ci for a more reliable/faster install in CI/Docker
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build the application
COPY . .
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:stable-alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy build files from stage 1 to nginx web root
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 for the browser
EXPOSE 80

# Copy start script
COPY env.sh /env.sh
RUN chmod +x /env.sh

# Start Nginx
CMD ["/env.sh", "nginx", "-g", "daemon off;"]
