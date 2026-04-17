from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from typing import Optional, List
import httpx
import tempfile
import os
import uuid
import json
from urllib.parse import urlparse, urlunparse

import asyncpg
import cv2

from visualize_predictions import YOLOBackend

from contextlib import asynccontextmanager

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:12345@postgres:5432/neoai_db"
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    retries = 10
    delay = 2

    for attempt in range(retries):
        try:
            print(f"[DB] Connecting... attempt {attempt+1}")
            app.state.db = await asyncpg.create_pool(DATABASE_URL)

            async with app.state.db.acquire() as conn:
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS analysis_jobs (
                        job_id       TEXT PRIMARY KEY,
                        image_url    TEXT,
                        video_url    TEXT NOT NULL,
                        frame_index  INTEGER NOT NULL,
                        callback_url TEXT NOT NULL,
                        status       TEXT NOT NULL DEFAULT 'pending',
                        result       JSONB,
                        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    )
                """)
            print("DB connection established")
            break

        except Exception as e:
            print(f"[DB] Failed: {e}")
            if attempt == retries - 1:
                raise
            await asyncio.sleep(delay)

    yield

    await app.state.db.close()

app = FastAPI(title="B-Line Detection API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "best.pt")
CONF_THRESHOLD = 0.25
predictor = YOLOBackend(MODEL_PATH)

#CALLBACK_HOST_OVERRIDE = os.getenv("CALLBACK_HOST_OVERRIDE", "").strip()


# ── SCHEMAS ──────────────────────────────────────────────────────────────────

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
    status: str                         # "completed" | "failed"
    b_lines: Optional[BLineResult] = None
    rds_score: Optional[int] = None
    error: Optional[str] = None

# ── HELPERS ───────────────────────────────────────────────────────────────────

async def download_to_tempfile(url: str, suffix: str) -> str:
    async with httpx.AsyncClient() as client:
        r = await client.get(url, timeout=30)
        r.raise_for_status()
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    tmp.write(r.content)
    tmp.close()
    return tmp.name

def extract_video_frame(video_path: str, frame_index: int) -> str:
    capture = cv2.VideoCapture(video_path)
    if not capture.isOpened():
        capture.release()
        raise ValueError("Video could not be opened")

    try:
        total_frames = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        if frame_index < 0:
            raise ValueError("frame_index must be >= 0")
        if total_frames > 0 and frame_index >= total_frames:
            raise ValueError(f"frame_index {frame_index} is out of range for video with {total_frames} frames")

        capture.set(cv2.CAP_PROP_POS_FRAMES, frame_index)
        ok, frame = capture.read()
        if not ok or frame is None:
            raise ValueError(f"Frame {frame_index} could not be read from video")

        frame_file = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg")
        frame_file.close()
        if not cv2.imwrite(frame_file.name, frame):
            raise ValueError("Extracted frame could not be saved")
        return frame_file.name
    finally:
        capture.release()

def boxes_to_schema(boxes: list) -> List[BoundingBox]:
    result = []
    for box in boxes:
        if int(box[0]) != 0:
            continue
        result.append(BoundingBox(
            x=box[1],
            y=box[2],
            width=box[3],
            height=box[4],
            confidence=round(box[5], 4) if len(box) > 5 else 0.0
        ))
    return result

def compute_rds_score(b_line_count: int) -> int:
    if b_line_count == 0:
        return 0
    elif b_line_count <= 2:
        return 1
    elif b_line_count <= 5:
        return 2
    else:
        return 3

def resolve_callback_url(callback_url: str) -> str:
    if not CALLBACK_HOST_OVERRIDE:
        return callback_url

    parsed = urlparse(callback_url)
    if parsed.hostname not in {"localhost", "127.0.0.1"}:
        return callback_url

    netloc = CALLBACK_HOST_OVERRIDE
    if parsed.port:
        netloc = f"{CALLBACK_HOST_OVERRIDE}:{parsed.port}"

    return urlunparse(parsed._replace(netloc=netloc))

# ── BACKGROUND TASK ───────────────────────────────────────────────────────────

async def run_analysis(job_id: str, video_url: str, frame_index: int, callback_url: str, selected_modules: SelectedModules):
    db = app.state.db
    result_payload: AnalysisResult

    try:
        video_path = await download_to_tempfile(video_url, ".mp4")
        try:
            frame_path = extract_video_frame(video_path, frame_index)
            try:
                boxes = predictor.predict(frame_path, CONF_THRESHOLD)
            finally:
                if os.path.exists(frame_path):
                    os.unlink(frame_path)
        finally:
            if os.path.exists(video_path):
                os.unlink(video_path)

        b_line_count = sum(1 for b in boxes if int(b[0]) == 0)

        b_lines_result = None
        if selected_modules.b_lines:
            b_lines_result = BLineResult(
                count=b_line_count,
                bounding_boxes=boxes_to_schema(boxes)
            )

        rds_score = compute_rds_score(b_line_count) if selected_modules.rds_score else None

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
                SET status = 'completed',
                    result = $1,
                    updated_at = NOW()
                WHERE job_id = $2
                """,
                json.dumps(result_payload.model_dump()),
                job_id,
            )

    except Exception as exc:
        result_payload = AnalysisResult(
            job_id=job_id,
            status="failed",
            error=str(exc),
        )
        async with db.acquire() as conn:
            await conn.execute(
                """
                UPDATE analysis_jobs
                SET status = 'failed',
                    result = $1,
                    updated_at = NOW()
                WHERE job_id = $2
                """,
                json.dumps(result_payload.model_dump()),
                job_id,
            )

    try:
        resolved_callback_url = resolve_callback_url(callback_url)
        async with httpx.AsyncClient() as client:
            await client.post(
                resolved_callback_url,
                json=result_payload.model_dump(),
                timeout=15,
            )
    except Exception as cb_exc:
        print(f"[WARN] Callback failed for job {job_id}: {cb_exc}")


# ── ENDPOINT ──────────────────────────────────────────────────────────────────

@app.post("/analyze", response_model=AnalyzeResponse, status_code=202)
async def analyze(req: AnalyzeRequest, background_tasks: BackgroundTasks):
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


# ── OPTINAL: Querying Job Status  ──────────────────────────────────────────

@app.get("/jobs/{job_id}")
async def get_job(job_id: str):
    async with app.state.db.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT job_id, status, result, created_at, updated_at FROM analysis_jobs WHERE job_id = $1",
            job_id,
        )
    if not row:
        raise HTTPException(status_code=404, detail="Job bulunamadı")
    return dict(row)
