# Backend

This backend is a Spring Boot application and uses Java SDK 21.

## Requirements

- Java SDK 21
- Docker Desktop

## Start PostgreSQL and AI Module with Docker

From the `backend` directory run:

```powershell
docker compose up --build postgres ai-module
```

This starts:

- PostgreSQL on `localhost:5432`
- ai_module on `localhost:8001`

Database settings:

- database: `neoai_db`
- user: `postgres`
- password: `12345`

If you need a fresh local database with the current seed data, run:

```powershell
docker compose down -v
docker compose up --build postgres ai-module
```
## Using Postgre From Docker Terminal
psql -U postgres -d neoai_db

## Run the backend separately

After PostgreSQL is up, start the Spring Boot backend on the host from IntelliJ or with Maven. The AI module container is configured to call back to the host backend via `host.docker.internal`.

If you use IntelliJ:

- set Project SDK to Java 21
- set the run configuration JRE to Java 21
- run com.backend.BackendApplication

If you use Maven(TODO: not sure haven't tried it):

```powershell
mvn spring-boot:run
```

The backend runs on:

- `http://localhost:8080`
