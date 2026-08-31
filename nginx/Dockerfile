FROM nginx:1.25-alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our custom config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create directories for SSL certs (mounted at runtime)
RUN mkdir -p /etc/letsencrypt

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
