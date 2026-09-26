const API_BASE_URL = (window.AQUAAI_API_BASE_URL || "").replace(/\/$/, "");
const $ = (selector) => document.querySelector(selector);

const statusEl = $("#connection-status");
const refreshButton = $("#refresh-button");
const form = $("#sensor-form");
const formMessage = $("#form-message");

function setConnection(state, label) {
  statusEl.className = `connection ${state}`;
  statusEl.querySelector("span").textContent = label;
}

function isConfigured() {
  return API_BASE_URL && !API_BASE_URL.includes("YOUR-RENDER-SERVICE");
}

function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

function number(value, digits = 1) {
  return Number(value).toFixed(digits);
}

function readableTime(iso) {
  return new Intl.DateTimeFormat([], { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

function pumpPill(status) {
  const state = status.startsWith("POSTPONED") ? "postponed" : status.startsWith("OFF") ? "off" : "on";
  return `<span class="state-pill ${state}">${escapeText(status)}</span>`;
}

function escapeText(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[char]));
}

function showLatest(reading) {
  $("#decision-title").textContent = reading.pump_status === "POSTPONED" ? "Irrigation postponed for rain" : reading.pump_status.startsWith("ON") ? "Irrigation is recommended" : "No irrigation is needed";
  $("#decision-reason").textContent = reading.reason;
  $("#recommended-water").textContent = number(reading.recommended_water, 2);
  $("#pump-state strong").textContent = reading.pump_status;
  $("#metric-moisture").textContent = `${number(reading.moisture)}%`;
  $("#metric-temperature").textContent = `${number(reading.temperature)}°C`;
  $("#metric-humidity").textContent = `${number(reading.humidity)}%`;
  $("#metric-rain").textContent = reading.rain ? "YES" : "NO";
  $("#metric-previous-water").textContent = `${number(reading.previous_water, 2)} L`;
}

function showRows(readings) {
  const body = $("#readings-body");
  if (!readings.length) {
    body.innerHTML = '<tr><td colspan="8" class="empty-state">No sensor readings have been submitted yet.</td></tr>';
    return;
  }
  body.innerHTML = readings.map((reading) => `
    <tr>
      <td>${readableTime(reading.timestamp)}</td>
      <td><strong>${escapeText(reading.crop)}</strong> / ${escapeText(reading.growth_stage)}</td>
      <td>${number(reading.moisture)}%</td>
      <td>${number(reading.temperature)}°C · ${number(reading.humidity)}%</td>
      <td>${reading.rain ? "Yes" : "No"}</td>
      <td>${number(reading.previous_water, 2)} L</td>
      <td><strong>${number(reading.recommended_water, 2)} L</strong></td>
      <td>${pumpPill(reading.pump_status)}</td>
    </tr>`).join("");
}

async function fetchJson(path, options) {
  const response = await fetch(apiUrl(path), options);
  if (!response.ok) {
    const problem = await response.json().catch(() => ({}));
    throw new Error(problem.detail || `API request failed (${response.status})`);
  }
  return response.json();
}

async function refreshDashboard() {
  if (!isConfigured()) {
    setConnection("offline", "Add Render URL in config.js");
    formMessage.textContent = "Set the Render URL in config.js, then redeploy this frontend.";
    formMessage.className = "form-message error";
    return;
  }
  refreshButton.disabled = true;
  refreshButton.textContent = "Refreshing…";
  try {
    const dashboard = await fetchJson("/api/dashboard");
    showLatest(dashboard.latest);
    showRows(dashboard.recent_readings);
    $("#last-updated").textContent = `Updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    setConnection("online", "API connected");
  } catch (error) {
    setConnection("offline", "API unavailable");
    formMessage.textContent = `${error.message}. Check the Render URL and CORS setting.`;
    formMessage.className = "form-message error";
  } finally {
    refreshButton.disabled = false;
    refreshButton.textContent = "↻ Refresh dashboard";
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!isConfigured()) {
    formMessage.textContent = "Add your Render API URL in config.js first.";
    formMessage.className = "form-message error";
    return;
  }
  const data = new FormData(form);
  const payload = {
    moisture: Number(data.get("moisture")),
    temperature: Number(data.get("temperature")),
    humidity: Number(data.get("humidity")),
    rain: data.get("rain") === "on",
    crop: data.get("crop"),
    growth_stage: data.get("growth_stage"),
    previous_water: Number(data.get("previous_water")),
  };
  const submit = form.querySelector("button[type=submit]");
  submit.disabled = true;
  formMessage.textContent = "Sending reading…";
  formMessage.className = "form-message";
  try {
    const saved = await fetchJson("/api/sensor-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    showLatest(saved);
    formMessage.textContent = `Saved. ${saved.recommended_water.toFixed(2)} L/plant/day recommended.`;
    formMessage.className = "form-message";
    await refreshDashboard();
  } catch (error) {
    formMessage.textContent = error.message;
    formMessage.className = "form-message error";
  } finally {
    submit.disabled = false;
  }
});

$("#api-docs-link").href = isConfigured() ? apiUrl("/docs") : "#";
refreshDashboard();
