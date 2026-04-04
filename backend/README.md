# Backend

This backend is a Spring Boot application and uses Java SDK 21.

## Requirements

- Java SDK 21
- Docker Desktop

## Start PostgreSQL with Docker

From the `backend` directory run:

```powershell
docker compose up -d
```

This starts PostgreSQL with:

- database: `neoai_db`
- user: `postgres`
- password: `12345`

If you need a fresh local database with the current seed data, run:

```powershell
docker compose down -v
docker compose up -d
```

## Run the backend

After PostgreSQL is up, start the Spring Boot application from IntelliJ or with Maven.

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
