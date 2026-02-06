.PHONY: dev prod install clean kill

# Variables
VENV = .venv
PYTHON = $(VENV)/bin/python
PIP = $(VENV)/bin/pip
UVICORN = $(VENV)/bin/uvicorn

# Create virtual environment
$(VENV)/bin/activate:
	@echo "Creating virtual environment..."
	python3 -m venv $(VENV)
	@echo "Virtual environment created."

# Install dependencies and system requirements
install: $(VENV)/bin/activate
	@echo "Checking for system dependencies (ffmpeg)..."
	@if command -v brew >/dev/null 2>&1; then \
		command -v ffmpeg >/dev/null 2>&1 || brew install ffmpeg; \
	elif command -v apt-get >/dev/null 2>&1; then \
		command -v ffmpeg >/dev/null 2>&1 || (sudo apt-get update && sudo apt-get install -y ffmpeg); \
	fi
	@echo "Installing Python dependencies..."
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements.txt
	@echo "Installation complete."

# Development mode: port 8001, .env.dev, hot-reload
dev: install
	@echo "Setting up development environment (.env.dev)..."
	@if [ -f .env.dev ]; then cp .env.dev .env; fi
	@echo "Starting HKS Media Server in development mode on port 8001..."
	$(UVICORN) main:app --host 0.0.0.0 --port 8001 --reload

# Production mode: port 8000, .env.prod, foreground with Ngrok
prod: install
	@echo "Setting up production environment (.env.prod)..."
	@if [ -f .env.prod ]; then cp .env.prod .env; fi
	@echo "Starting HKS Media Server and Ngrok tunnel..."
	@trap 'kill 0' EXIT; \
	$(UVICORN) main:app --host 0.0.0.0 --port 8000 & \
	ngrok http 8000

# Kill any processes on ports 8000 and 8001
kill:
	@echo "Killing processes on ports 8000 and 8001..."
	-lsof -t -i:8000 | xargs kill -9 2>/dev/null || true
	-lsof -t -i:8001 | xargs kill -9 2>/dev/null || true
	-pm2 delete all 2>/dev/null || true
	@echo "✅ Ports cleared."

# Clean up temporary files and caches
clean:
	rm -rf temp_videos/*
	find . -type d -name "__pycache__" -exec rm -rf {} +
	@echo "Cleanup complete."
