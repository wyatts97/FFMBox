.PHONY: build up down clean dev logs test

# Build the production image
build:
	docker-compose build --no-cache

# Start the production containers
up:
	docker-compose up -d

# Stop and remove containers, networks
clean:
	docker-compose down -v --remove-orphans

# Full clean (containers, volumes, images)
prune: clean
	docker system prune -a --volumes -f

# Start development environment
dev:
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Show logs
logs:
	docker-compose logs -f

# Run tests
test:
	docker-compose exec ffmbox npm test

# Open a shell in the container
shell:
	docker-compose exec ffmbox sh

# Install client dependencies
install-client:
	cd app/client && npm install

# Install server dependencies
install-server:
	cd app/server && npm install

# Install all dependencies
install: install-client install-server

# Format code
format:
	cd app/client && npm run format
	cd app/server && npm run format

# Lint code
lint:
	cd app/client && npm run lint
	cd app/server && npm run lint

# Check for outdated packages
outdated:
	cd app/client && npm outdated
	cd app/server && npm outdated
