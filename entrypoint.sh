#!/bin/sh
set -e

CERT_DIR="/etc/letsencrypt/live/$DOMAIN"

# Validate domain and email
if [ -z "$DOMAIN" ]; then
    echo "Error: DOMAIN environment variable is not set"
    exit 1
fi

if [ -z "$CERTBOT_EMAIL" ]; then
    echo "Error: CERTBOT_EMAIL environment variable is not set"
    exit 1
fi

# Check if certificates exist in the folder
if [ -f "$CERT_DIR/fullchain.pem" ] && [ -f "$CERT_DIR/privkey.pem" ]; then
    echo "Certificates found in $CERT_DIR, using them."
elif [ -n "$CERTIFICATE" ] && [ -n "$PRIVATE_KEY" ]; then
    echo "No certificates found in folder. Using pre-stored certificates from environment variables."
    mkdir -p "$CERT_DIR"
    # Ensure proper file permissions
    echo "$CERTIFICATE" > "$CERT_DIR/fullchain.pem"
    echo "$PRIVATE_KEY" > "$CERT_DIR/privkey.pem"
    chmod 600 "$CERT_DIR/fullchain.pem" "$CERT_DIR/privkey.pem"
else
    echo "No certificates found. Obtaining Let's Encrypt certificate for $DOMAIN."
    # Add staging flag for testing to avoid rate limits
    certbot certonly \
        --standalone \
        -d "$DOMAIN" \
        --non-interactive \
        --agree-tos \
        -m "$CERTBOT_EMAIL"
fi

# Backup original Nginx configuration
cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak

# Update Nginx configuration with the certificates
sed -i "s|ssl_certificate .*|ssl_certificate $CERT_DIR/fullchain.pem;|g" /etc/nginx/nginx.conf
sed -i "s|ssl_certificate_key .*|ssl_certificate_key $CERT_DIR/privkey.pem;|g" /etc/nginx/nginx.conf

# Set up certificate renewal cron job
(crontab -l 2>/dev/null; echo "0 0,12 * * * certbot renew --post-hook 'nginx -s reload'") | crontab -

# Validate Nginx configuration before starting
nginx -t

# Start Nginx
nginx

# Start Node.js application
exec node dist/app.js