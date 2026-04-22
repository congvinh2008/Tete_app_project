const MODEL_URL = "/static/my_model/";

let model;
let labelContainer;
let maxPredictions = 0;
let img;
let canvas;
let ctx;
let isModelLoaded = false;

// Audio alerts
const amThanhCuu = new Audio("/static/sound/Nguy_hiem.mp3");
const amThanhTeTe = new Audio("/static/sound/Phat_hien_te_te.mp3");
let dangPhatCuu = false;
let dangPhatTeTe = false;

// Upload/throttle state
let isUploadingEvent = false;
const lastEventAtByType = new Map(); // event_type -> epoch ms

async function startIPCamera() {
  try {
    const modelURL = MODEL_URL + "model.json";
    const metadataURL = MODEL_URL + "metadata.json";

    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();
    isModelLoaded = true;

    img = document.getElementById("ipcam");
    canvas = document.getElementById("canvas");
    ctx = canvas.getContext("2d");

    labelContainer = document.getElementById("label-container");
    labelContainer.innerHTML = "";
    for (let i = 0; i < maxPredictions; i++) {
      labelContainer.appendChild(document.createElement("div"));
    }

    loop();
  } catch (error) {
    console.error("Khong the tai mo hinh:", error);
    const el = document.getElementById("label-container");
    if (el) el.textContent = "Loi: khong tai duoc AI model.";
  }
}

async function loop() {
  if (isModelLoaded) {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    await predict();
  }
  requestAnimationFrame(loop);
}

async function predict() {
  const prediction = await model.predict(canvas);

  for (let i = 0; i < maxPredictions; i++) {
    const prob = Number(prediction[i].probability);
    const name = prediction[i].className;
    let text = "";

    if (name === "TeTe" && prob >= 0.8) {
      text = `Phat hien Te Te (${Math.round(prob * 100)}%)`;
      playAudioOnce("tete");
      maybeCaptureAndUploadEvent("TeTe", prob);
    } else if (name === "Nguy hiem" && prob >= 0.8) {
      text = `CANH BAO: Te Te keu cuu (${Math.round(prob * 100)}%)`;
      playAudioOnce("nguyhiem");
      maybeCaptureAndUploadEvent("Nguy hiem", prob);
    } else {
      text = "";
      resetAudioState(name);
    }

    if (labelContainer?.childNodes?.[i] && labelContainer.childNodes[i].innerHTML !== text) {
      labelContainer.childNodes[i].innerHTML = text;
    }
  }
}

function playAudioOnce(type) {
  if (type === "tete" && !dangPhatTeTe) {
    dangPhatTeTe = true;
    amThanhTeTe.play().catch(() => {});
    amThanhTeTe.onended = () => {
      dangPhatTeTe = false;
    };
    return;
  }

  if (type === "nguyhiem" && !dangPhatCuu) {
    dangPhatCuu = true;
    amThanhCuu.play().catch(() => {});
    amThanhCuu.onended = () => {
      dangPhatCuu = false;
    };
  }
}

function resetAudioState(_name) {
  // Optional: can stop/reset audio here if needed.
}

function canSendEventNow(eventType) {
  const now = Date.now();
  const last = lastEventAtByType.get(eventType) ?? 0;
  return now - last >= 15000; // throttle 15s per type
}

async function captureSnapshotBlob() {
  if (!canvas) return null;

  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
    } catch (e) {
      console.warn("Khong the chup anh (canvas bi taint?)", e);
      resolve(null);
    }
  });
}

async function recordClipBlob(durationMs = 8000) {
  if (!("MediaRecorder" in window) || !canvas?.captureStream) return null;

  let stream;
  try {
    stream = canvas.captureStream(15);
  } catch (e) {
    console.warn("Khong the captureStream()", e);
    return null;
  }

  let recorder;
  try {
    recorder = new MediaRecorder(stream);
  } catch (e) {
    console.warn("Khong the tao MediaRecorder", e);
    try {
      stream.getTracks().forEach((t) => t.stop());
    } catch (_) {}
    return null;
  }

  const chunks = [];
  recorder.ondataavailable = (ev) => {
    if (ev.data && ev.data.size > 0) chunks.push(ev.data);
  };

  const stopped = new Promise((resolve) => {
    recorder.onstop = () => resolve();
    recorder.onerror = () => resolve();
  });

  recorder.start();
  setTimeout(() => {
    try {
      recorder.stop();
    } catch (_) {}
    try {
      stream.getTracks().forEach((t) => t.stop());
    } catch (_) {}
  }, durationMs);

  await stopped;
  if (!chunks.length) return null;
  return new Blob(chunks, { type: recorder.mimeType || "video/webm" });
}

async function maybeCaptureAndUploadEvent(eventType, probability) {
  if (isUploadingEvent) return;
  if (!canSendEventNow(eventType)) return;

  isUploadingEvent = true;
  lastEventAtByType.set(eventType, Date.now());

  try {
    const snapshotBlob = await captureSnapshotBlob();
    const videoBlob = await recordClipBlob(8000);

    const form = new FormData();
    form.append("event_type", eventType);
    form.append("probability", String(probability ?? ""));
    form.append("source", "camera");

    if (snapshotBlob) form.append("snapshot", snapshotBlob, "snapshot.jpg");
    if (videoBlob) form.append("video", videoBlob, "clip.webm");

    const res = await fetch("/api/events", { method: "POST", body: form });
    if (!res.ok) console.warn("Upload event that bai:", res.status, await res.text());
  } catch (e) {
    console.warn("Loi khi upload event:", e);
  } finally {
    isUploadingEvent = false;
  }
}

// Browser audio often needs a user gesture
window.addEventListener(
  "click",
  () => {
    // no-op; just ensures user interaction happened
  },
  { once: true }
);

window.addEventListener("DOMContentLoaded", startIPCamera);
