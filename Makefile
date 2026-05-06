.PHONY: run-postgres stop-postgres run-backend run-frontend run-lightdash activate-pgvector install-frontend build-frontend clear

ifneq (,$(wildcard ./.env))
    include .env
    export
endif

export DB_USER DB_PASS DB_NAME DB_HOST DB_PORT API_PORT FRONTEND_PORT FRONTEND_URL DATABASE_URL GCP_KEY_PATH GCP_PROJECT_ID BQ_DATASET_ID EMBEDDING_MODEL_NAME GENERATIVE_MODEL_NAME

NETWORK_NAME = agents_network
DB_CONTAINER = pgvector
DB_IMAGE = pgvector/pgvector:pg16
DB_PORT_HOST = 5432
LIGHTDASH_CONTAINER = lightdash
BACKEND_CONTAINER = backend
FRONTEND_CONTAINER = frontend

clean:
	rm -rf .venv/
	find . -type d -name ".mypy_cache" -exec rm -rf {} +
	find . -type d -name "__pycache__" -exec rm -rf {} +
	rm -f data/*.pkl
	rm -f backend/.coverage
	rm -rf backend/.venv
	rm -rf backend/.pytest_cache/
	rm -rf backend/*.egg-info/
	rm -rf backend/build/
	rm -rf backend/htmlcov/
	rm -rf frontend/coverage/
	rm -rf frontend/dist/
	rm -rf frontend/node_modules/

install-frontend:
	cd frontend && npm install

build-frontend:
	cd frontend && VITE_API_URL=http://localhost:$${API_PORT} npm run build

run-frontend:
	cd frontend && VITE_API_URL=http://localhost:$${API_PORT} npm run dev -- --port $${FRONTEND_PORT}

create-network:
	docker network inspect $(NETWORK_NAME) >/dev/null 2>&1 || docker network create $(NETWORK_NAME)

run-postgres: create-network
	docker run -d --name $(DB_CONTAINER) --network $(NETWORK_NAME) \
		-p $${DB_PORT}:5432 \
		-e POSTGRES_USER=$${DB_USER} \
		-e POSTGRES_PASSWORD=$${DB_PASS} \
		-e POSTGRES_DB=$${DB_NAME} \
		-v $(CURDIR)/dbt-project/schema.sql:/docker-entrypoint-initdb.d/schema.sql \
		--health-cmd="pg_isready -d $${DB_NAME} -U $${DB_USER}" \
		--health-interval=10s \
		--health-timeout=5s \
		--health-retries=5 \
		$(DB_IMAGE)

activate-pgvector:
	sleep 2 && docker exec -it $(DB_CONTAINER) psql -U $${DB_USER} -d $${DB_NAME} \
	-c "CREATE EXTENSION IF NOT EXISTS vector;"

stop-postgres:
	docker stop $(DB_CONTAINER) && docker rm $(DB_CONTAINER)

run-backend: run-postgres activate-pgvector
	cd backend && \
	DATABASE_URL=postgresql://$${DB_USER}:$${DB_PASS}@$${DB_HOST}:$${DB_PORT}/$${DB_NAME} \
	uv run uvicorn main:app --host 0.0.0.0 --port $${API_PORT} --reload

run-lightdash: create-network
	docker run -d --name $(LIGHTDASH_CONTAINER) --network $(NETWORK_NAME) \
		--platform linux/amd64 \
		-p 8080:8080 \
		-v $(CURDIR)/dbt-project/dbt_profiles.yml:/root/.dbt/dbt_profiles.yml \
		-v $(CURDIR)/dbt-project/dbt_project.yml:/usr/app/dbt/dbt_project.yml \
		-v $(CURDIR)/dbt-project/models/:/usr/app/dbt/models/ \
		-e PGHOST=$(DB_CONTAINER) \
		-e PGPORT=5432 \
		-e PGDATABASE=$${DB_NAME} \
		-e PGUSER=$${DB_USER} \
		-e PGPASSWORD=$${DB_PASS} \
		-e SECURE_COOKIES=false \
		-e TRUST_PROXY=false \
		-e "LIGHTDASH_SECRET=not very secret" \
		-e PORT=8080 \
		-e "LIGHTDASH_INSTALL_TYPE=docker_image" \
		-e ALLOW_MULTIPLE_ORGS=false \
		-e LIGHTDASH_QUERY_MAX_LIMIT=500 \
		-e "LIGHTDASH_MAX_PAYLOAD=5mb" \
		-e HEADLESS_BROWSER_HOST=headless-browser \
		-e HEADLESS_BROWSER_PORT=3000 \
		-e SCHEDULER_ENABLED=true \
		-e GROUPS_ENABLED=false \
		--restart on-failure \
		lightdash/lightdash:latest

stop-lightdash:
	docker stop $(LIGHTDASH_CONTAINER) && docker rm $(LIGHTDASH_CONTAINER)
