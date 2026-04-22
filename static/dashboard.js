let refreshTimer = null;

function formatTime(iso) {
  if (!iso) return "—";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleString();
}

function eventLabel(eventType) {
  if (eventType === "TeTe") return "Phát hiện TeTe";
  if (eventType === "Nguy hiem") return "Cảnh báo nguy hiểm";
  return eventType || "—";
}

function pillClass(eventType) {
  if (eventType === "Nguy hiem") return "pill danger";
  if (eventType === "TeTe") return "pill ok";
  return "pill";
}

async function fetchEvents(limit = 50) {
  const res = await fetch(`/api/events?limit=${encodeURIComponent(String(limit))}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function renderEvents(events) {
  const listEl = document.getElementById("events");
  const emptyEl = document.getElementById("events-empty");
  listEl.innerHTML = "";

  if (!events.length) {
    emptyEl.style.display = "block";
    return;
  }

  emptyEl.style.display = "none";

  for (const ev of events) {
    const probText =
      typeof ev.probability === "number" ? `${Math.round(ev.probability * 100)}%` : "—";

    const wrap = document.createElement("div");
    wrap.className = "event";

    wrap.innerHTML = `
      <div class="event-top">
        <div class="event-meta">
          <div class="event-title">${eventLabel(ev.event_type)}</div>
          <div class="event-desc">
            Thời gian: ${formatTime(ev.created_at)} · Độ tin cậy: ${probText} · Nguồn: ${ev.source ?? "—"}
          </div>
        </div>
        <div class="${pillClass(ev.event_type)}">${ev.event_type}</div>
      </div>
      <div class="event-media">
        <div>
          ${
            ev.image_url
              ? `<img class="thumb" src="${ev.image_url}" alt="snapshot" loading="lazy" />`
              : `<div class="thumb" style="display:flex;align-items:center;justify-content:center;color:rgba(232,245,233,0.6);">Không có ảnh</div>`
          }
        </div>
        <div>
          ${
            ev.video_url
              ? `<video controls muted playsinline preload="metadata" src="${ev.video_url}"></video>`
              : `<div style="height:100%;min-height:120px;display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,0.08);border-radius:12px;background:rgba(255,255,255,0.04);color:rgba(232,245,233,0.6);">Không có video</div>`
          }
        </div>
      </div>
    `;

    listEl.appendChild(wrap);
  }
}

function updateSummary(events) {
  const totalEl = document.getElementById("total-events");
  const lastEl = document.getElementById("last-seen");
  const lastSubEl = document.getElementById("last-seen-sub");
  const healthEl = document.getElementById("health-pill");
  const updatedAtEl = document.getElementById("updated-at");

  totalEl.textContent = String(events.length);
  updatedAtEl.textContent = `Cập nhật: ${new Date().toLocaleTimeString()}`;

  if (!events.length) {
    lastEl.textContent = "—";
    lastSubEl.textContent = "Mở CCTV để bắt đầu nhận dữ liệu.";
    healthEl.className = "pill";
    healthEl.textContent = "Chưa có dữ liệu";
    return;
  }

  const latest = events[0];
  lastEl.textContent = formatTime(latest.created_at);
  lastSubEl.textContent = `${eventLabel(latest.event_type)} · ${latest.source ?? "camera"}`;
  healthEl.className = pillClass(latest.event_type);
  healthEl.textContent = latest.event_type;
}

async function refresh() {
  const btn = document.getElementById("refresh-now");
  btn.disabled = true;
  try {
    const data = await fetchEvents(50);
    const events = Array.isArray(data.events) ? data.events : [];
    updateSummary(events);
    renderEvents(events);
  } catch (e) {
    console.warn("Refresh failed:", e);
  } finally {
    btn.disabled = false;
  }
}

function startAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(refresh, 5000);
}

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("refresh-now").addEventListener("click", refresh);
  refresh();
  startAutoRefresh();
});
