FROM provectuslabs/kafka-ui:latest

# Copy custom CSS
COPY custom-theme.css /app/static/custom-theme.css

# Inject custom CSS into the main HTML
RUN if [ -f /app/static/index.html ]; then \
    sed -i 's|</head>|<link rel="stylesheet" href="/custom-theme.css"></head>|' /app/static/index.html; \
    fi

# Set custom title
ENV DYNAMIC_CONFIG_ENABLED=true
