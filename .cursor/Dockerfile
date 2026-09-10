FROM mcr.microsoft.com/dotnet/sdk:9.0-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git \
        curl \
        ca-certificates \
        gnupg \
        sudo \
        postgresql \
        postgresql-contrib \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Cloud Agent runs commands as ubuntu; ensure the user exists with sudo access.
RUN if ! id ubuntu >/dev/null 2>&1; then \
        useradd -m -s /bin/bash ubuntu; \
    fi \
    && echo 'ubuntu ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers

USER ubuntu
