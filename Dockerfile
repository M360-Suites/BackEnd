FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache dumb-init
COPY package*.json ./
RUN npm ci

# Copy application code
COPY . .

# Production stage
FROM node:20-alpine
WORKDIR /app

# Install Certbot, Nginx, and dependencies
RUN apk add --no-cache \
    certbot \
    docker \
    nginx \
    openssl \
    python3 \
    py3-pip \
    py3-setuptools \
    && pip3 install --break-system-packages certbot-nginx

# Copy application files
COPY --from=builder /usr/bin/dumb-init /usr/bin/dumb-init
COPY --from=builder /app ./

# Copy pre-provided certificates from build arguments (optional)
ARG CERTIFICATE
ARG PRIVATE_KEY
ENV CERTIFICATE=$CERTIFICATE
ENV PRIVATE_KEY=$PRIVATE_KEY


# Copy configuration files
COPY nginx.conf /etc/nginx/nginx.conf
COPY entrypoint.sh /entrypoint.sh

# Set permissions
RUN chmod +x /entrypoint.sh

# Non-root user for security
USER root

# Expose ports
EXPOSE 8080 443 6000

# Entrypoint
ENTRYPOINT ["/entrypoint.sh"]