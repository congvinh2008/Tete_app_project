from flask import Flask, render_template, request, jsonify
import os
import random

app = Flask(__name__)
UPLOAD_FOLDER = "uploads"
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

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

@app.route("/register")
def goRegister():
    return render_template("register.html")

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

