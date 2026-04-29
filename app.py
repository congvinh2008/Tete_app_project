from flask import Flask, render_template, request, jsonify, send_from_directory
import os
import random
import sqlite3
import uuid
from datetime import datetime, timezone

app = Flask(__name__)
UPLOAD_FOLDER = "uploads"
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Dashboard/event storage
DETECTIONS_DIR = os.path.join(app.root_path, "static", "detections")
DETECTIONS_IMG_DIR = os.path.join(DETECTIONS_DIR, "images")
DETECTIONS_VIDEO_DIR = os.path.join(DETECTIONS_DIR, "videos")
DB_PATH = os.path.join(app.root_path, "detections.db")
GAMEMAKER_DIR = os.path.join(app.root_path, "templates", "TeTe_game")

for folder in (DETECTIONS_DIR, DETECTIONS_IMG_DIR, DETECTIONS_VIDEO_DIR):
    os.makedirs(folder, exist_ok=True)


def _db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _init_db():
    with _db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT NOT NULL,
                probability REAL,
                source TEXT,
                created_at TEXT NOT NULL,
                image_path TEXT,
                video_path TEXT
            )
            """
        )


def _utc_now_iso():
    return datetime.now(timezone.utc).isoformat()


def _save_upload(file_storage, folder, ext_fallback):
    if not file_storage:
        return None

    _, ext = os.path.splitext(file_storage.filename or "")
    ext = (ext or ext_fallback).lower()
    filename = f"{uuid.uuid4().hex}{ext}"
    abs_path = os.path.join(folder, filename)
    file_storage.save(abs_path)

    rel = os.path.relpath(abs_path, os.path.join(app.root_path, "static"))
    return rel.replace("\\", "/")


_init_db()

# ===== AI GIẢ LẬP =====
def analyze_audio(file_path):
    # Sau này thay bằng model TensorFlow/PyTorch
    return random.choice(["normal", "danger"])

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/login")
def login():
    return render_template("login.html")

@app.route("/cctv")
def cctv():
    return render_template("camera.html")

@app.route("/map")
def map_view():
    # Default camera location (edit these values to match your real CCTV position)
    camera = {
        "id": "cctv-1",
        "name": "CCTV / AI CAM",
        "lat": 10.8231,   # Ho Chi Minh City (example)
        "lng": 106.6297,  # Ho Chi Minh City (example)
        "url": "/cctv",
        # Same stream used in templates/camera.html
        "stream_url": "http://192.168.1.3:8080/video",
    }
    return render_template("map.html", camera=camera)

@app.route("/register")
def goRegister():
    return render_template("register.html")

@app.route("/game")
def game():
    return render_template("TeTe_game/index.html")

@app.route("/about")
def about():
    return render_template("about.html")


@app.route("/html5game/<path:filename>")
def gamemaker_html5game(filename):
    return send_from_directory(os.path.join(GAMEMAKER_DIR, "html5game"), filename)


@app.route("/TeTe_game/<path:filename>")
def gamemaker_root_files(filename):
    return send_from_directory(GAMEMAKER_DIR, filename)


@app.route("/api/events", methods=["GET"])
def list_events():
    try:
        limit = int(request.args.get("limit", "50"))
    except ValueError:
        limit = 50
    limit = max(1, min(limit, 200))

    with _db() as conn:
        rows = conn.execute(
            """
            SELECT id, event_type, probability, source, created_at, image_path, video_path
            FROM events
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

    events = []
    for r in rows:
        events.append(
            {
                "id": r["id"],
                "event_type": r["event_type"],
                "probability": r["probability"],
                "source": r["source"],
                "created_at": r["created_at"],
                "image_url": f"/static/{r['image_path']}" if r["image_path"] else None,
                "video_url": f"/static/{r['video_path']}" if r["video_path"] else None,
            }
        )

    return jsonify({"events": events})


@app.route("/api/events", methods=["POST"])
def create_event():
    event_type = (request.form.get("event_type") or "").strip()
    source = (request.form.get("source") or "").strip() or None

    prob_raw = request.form.get("probability")
    probability = None
    if prob_raw is not None and prob_raw != "":
        try:
            probability = float(prob_raw)
        except ValueError:
            probability = None

    if event_type not in {"TeTe", "Nguy hiem"}:
        return jsonify({"error": "event_type must be TeTe or Nguy hiem"}), 400

    snapshot = request.files.get("snapshot")
    video = request.files.get("video")

    image_path = _save_upload(snapshot, DETECTIONS_IMG_DIR, ".jpg")
    video_path = _save_upload(video, DETECTIONS_VIDEO_DIR, ".webm")

    created_at = _utc_now_iso()

    with _db() as conn:
        cur = conn.execute(
            """
            INSERT INTO events (event_type, probability, source, created_at, image_path, video_path)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (event_type, probability, source, created_at, image_path, video_path),
        )
        event_id = cur.lastrowid

    return jsonify(
        {
            "id": event_id,
            "event_type": event_type,
            "probability": probability,
            "source": source,
            "created_at": created_at,
            "image_url": f"/static/{image_path}" if image_path else None,
            "video_url": f"/static/{video_path}" if video_path else None,
        }
    )

@app.route("/analyze", methods=["POST"])
def analyze():
    audio = request.files["audio"]
    latitude = request.form.get("latitude")
    longitude = request.form.get("longitude")

    filepath = os.path.join(app.config["UPLOAD_FOLDER"], audio.filename)
    audio.save(filepath)

    result = analyze_audio(filepath)

    return jsonify({
        "status": result,
        "latitude": latitude,
        "longitude": longitude
    })

if __name__ == "__main__":
    app.run(debug=True)

