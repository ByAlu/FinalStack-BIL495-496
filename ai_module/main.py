from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, HttpUrl
from typing import Optional, List
import os
import uuid
import json
import random
import logging
import sys

import asyncpg
from contextlib import asynccontextmanager


DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/bline_db")


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
    force=True,
)
logger = logging.getLogger("app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.db = await asyncpg.create_pool(DATABASE_URL)

    async with app.state.db.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS analysis_jobs (
                job_id       TEXT PRIMARY KEY,
                video_url    TEXT NOT NULL,
                frame_index  INTEGER NOT NULL,
                callback_url TEXT NOT NULL,
                status       TEXT NOT NULL DEFAULT 'pending',
                result       JSONB,
                created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)

    logger.info("app started")
    yield
    await app.state.db.close()
    logger.info("app stopped")


app = FastAPI(title="B-Line Detection API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_raw_request_body(request: Request, call_next):
    body = await request.body()
    raw_body = body.decode("utf-8", errors="replace")

    logger.info("Incoming %s %s", request.method, request.url.path)
    logger.info("Raw request body: %s", raw_body)

    async def receive():
        return {"type": "http.request", "body": body, "more_body": False}

    request = Request(request.scope, receive)
    response = await call_next(request)
    return response


class SelectedModules(BaseModel):
    b_lines: bool = False
    rds_score: bool = False


class AnalyzeRequest(BaseModel):
    video_url: HttpUrl
    frame_index: int
    callback_url: HttpUrl
    selected_modules: SelectedModules


class AnalyzeResponse(BaseModel):
    job_id: str


class BoundingBox(BaseModel):
    x: float
    y: float
    width: float
    height: float
    confidence: float


class BLineResult(BaseModel):
    count: int
    bounding_boxes: List[BoundingBox]


class AnalysisResult(BaseModel):
    job_id: str
    status: str
    b_lines: Optional[BLineResult] = None
    rds_score: Optional[int] = None
    error: Optional[str] = None


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error("422 validation error on %s", request.url.path)
    logger.error("Validation details: %s", exc.errors())
    return JSONResponse(status_code=422, content={"detail": exc.errors()})


async def run_analysis(
    job_id: str,
    video_url: str,
    frame_index: int,
    callback_url: str,
    selected_modules: SelectedModules,
):
    db = app.state.db

    try:
        b_line_count = random.randint(0, 4)

        def random_box():
            return BoundingBox(
                x=round(random.uniform(0, 1280), 2),
                y=round(random.uniform(0, 720), 2),
                width=round(random.uniform(10, 200), 2),
                height=round(random.uniform(10, 200), 2),
                confidence=round(random.uniform(0.3, 0.99), 4),
            )

        b_lines_result = None
        if selected_modules.b_lines:
            boxes = [random_box() for _ in range(b_line_count)]
            b_lines_result = BLineResult(count=b_line_count, bounding_boxes=boxes)

        rds_score = None
        if selected_modules.rds_score:
            rds_score = random.randint(0, 3)

        result_payload = AnalysisResult(
            job_id=job_id,
            status="completed",
            b_lines=b_lines_result,
            rds_score=rds_score,
        )

        async with db.acquire() as conn:
            await conn.execute(
                """
                UPDATE analysis_jobs
                SET status = 'completed', result = $1, updated_at = NOW()
                WHERE job_id = $2
                """,
                json.dumps(result_payload.model_dump()),
                job_id,
            )

        logger.info("analysis completed for job_id=%s", job_id)

    except Exception as exc:
        logger.exception("analysis failed for job_id=%s: %s", job_id, exc)


@app.post("/analyze", response_model=AnalyzeResponse, status_code=202)
async def analyze(req: AnalyzeRequest, background_tasks: BackgroundTasks):
    logger.info(
        "Parsed request: video_url=%s frame_index=%s callback_url=%s selected_modules=%s",
        req.video_url,
        req.frame_index,
        req.callback_url,
        req.selected_modules.model_dump(),
    )

    job_id = str(uuid.uuid4())

    async with app.state.db.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO analysis_jobs (job_id, video_url, frame_index, callback_url, status)
            VALUES ($1, $2, $3, $4, 'pending')
            """,
            job_id,
            str(req.video_url),
            req.frame_index,
            str(req.callback_url),
        )

    background_tasks.add_task(
        run_analysis,
        job_id,
        str(req.video_url),
        req.frame_index,
        str(req.callback_url),
        req.selected_modules,
    )

    return AnalyzeResponse(job_id=job_id)


@app.get("/jobs/{job_id}")
async def get_job(job_id: str):
    async with app.state.db.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM analysis_jobs WHERE job_id = $1",
            job_id,
        )

    if not row:
        raise HTTPException(status_code=404, detail="Job not found")

    return dict(row)