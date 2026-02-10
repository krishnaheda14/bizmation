# AI Services Dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY ai-services/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY ai-services/ .

# Expose port
EXPOSE 8000

# Set environment
ENV PYTHONUNBUFFERED=1

# Start FastAPI server
CMD ["uvicorn", "image-processing.main:app", "--host", "0.0.0.0", "--port", "8000"]
