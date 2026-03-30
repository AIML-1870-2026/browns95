// No API key needed — powered by Open-Meteo (https://open-meteo.com)
// Free, open-source, no registration required.

const GEO_URL     = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";

// ── State ────────────────────────────────────────────────────────────────────
let currentUnit = "celsius"; // "celsius" or "fahrenheit"

// ── DOM refs ─────────────────────────────────────────────────────────────────
const cityInput      = document.getElementById("city-input");
const searchBtn      = document.getElementById("search-btn");
const errorEl        = document.getElementById("error-message");
const loadingEl      = document.getElementById("loading");
const weatherContent = document.getElementById("weather-content");
const btnCelsius     = document.getElementById("btn-celsius");
const btnFahrenheit  = document.getElementById("btn-fahrenheit");

const cityNameEl  = document.getElementById("city-name");
const countryEl   = document.getElementById("country-code");
const iconEl      = document.getElementById("weather-icon");
const tempEl      = document.getElementById("temperature");
const conditionEl = document.getElementById("condition");
const humidityEl  = document.getElementById("humidity");
const windEl      = document.getElementById("wind-speed");
const feelsEl     = document.getElementById("feels-like");
const rainEl      = document.getElementById("rain-chance");
const uvCardEl    = document.getElementById("uv-card");
const uvIndexEl   = document.getElementById("uv-index");
const uvBadgeEl   = document.getElementById("uv-badge");
const uvBarEl     = document.getElementById("uv-bar");

// ── Unit toggle ──────────────────────────────────────────────────────────────
btnCelsius.addEventListener("click", () => setUnit("celsius"));
btnFahrenheit.addEventListener("click", () => setUnit("fahrenheit"));

function setUnit(unit) {
  currentUnit = unit;
  btnCelsius.classList.toggle("active", unit === "celsius");
  btnFahrenheit.classList.toggle("active", unit === "fahrenheit");
  btnCelsius.setAttribute("aria-pressed", unit === "celsius");
  btnFahrenheit.setAttribute("aria-pressed", unit === "fahrenheit");
  const city = cityNameEl.textContent;
  if (city) fetchWeather(city);
}

// ── Search ────────────────────────────────────────────────────────────────────
searchBtn.addEventListener("click", handleSearch);
cityInput.addEventListener("keydown", (e) => { if (e.key === "Enter") handleSearch(); });

function handleSearch() {
  const city = cityInput.value.trim();
  if (!city) return;
  fetchWeather(city);
}

// ── API calls ─────────────────────────────────────────────────────────────────
async function fetchWeather(city) {
  showLoading(true);
  clearError();
  hideWeather();

  try {
    // Step 1: geocode city name → lat/lon
    const geoRes = await apiFetch(
      `${GEO_URL}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
    );
    if (!geoRes.results || geoRes.results.length === 0) {
      throw new Error("City not found. Please try again.");
    }
    const { latitude, longitude, name, country_code, country } = geoRes.results[0];

    // Step 2: fetch current weather + hourly precipitation for next 24 h
    const isFahrenheit = currentUnit === "fahrenheit";
    const params = new URLSearchParams({
      latitude,
      longitude,
      current: [
        "temperature_2m",
        "relative_humidity_2m",
        "apparent_temperature",
        "weather_code",
        "wind_speed_10m",
        "uv_index",
      ].join(","),
      hourly: "precipitation_probability",
      forecast_days: 1,
      temperature_unit: currentUnit,
      wind_speed_unit: isFahrenheit ? "mph" : "ms",
      timezone: "auto",
    });

    const weather = await apiFetch(`${WEATHER_URL}?${params}`);
    renderWeather(weather, name, country_code || country, isFahrenheit);
  } catch (err) {
    showError(err.message);
  } finally {
    showLoading(false);
  }
}

async function apiFetch(url) {
  let response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error("Unable to reach weather service. Check your connection.");
  }
  if (!response.ok) {
    throw new Error(`Unexpected error (${response.status}). Please try again.`);
  }
  return response.json();
}

// ── Rendering ─────────────────────────────────────────────────────────────────
function renderWeather(data, cityName, countryCode, isFahrenheit) {
  const c = data.current;
  const unitSymbol = isFahrenheit ? "°F" : "°C";
  const windUnit   = isFahrenheit ? "mph" : "m/s";

  cityNameEl.textContent  = cityName;
  countryEl.textContent   = countryCode;
  tempEl.textContent      = `${Math.round(c.temperature_2m)}${unitSymbol}`;
  feelsEl.textContent     = `${Math.round(c.apparent_temperature)}${unitSymbol}`;
  humidityEl.textContent  = `${c.relative_humidity_2m}%`;
  windEl.textContent      = `${Math.round(c.wind_speed_10m)} ${windUnit}`;

  const { emoji, description } = wmoInfo(c.weather_code);
  conditionEl.textContent = description;

  // Use emoji as the "icon" — swap img for a styled span
  iconEl.style.display = "none";
  let emojiEl = document.getElementById("weather-emoji");
  if (!emojiEl) {
    emojiEl = document.createElement("span");
    emojiEl.id = "weather-emoji";
    emojiEl.style.cssText = "font-size:4rem;line-height:1;";
    iconEl.parentNode.insertBefore(emojiEl, iconEl);
  }
  emojiEl.textContent = emoji;

  // Chance of rain — max precipitation probability over next 24 h
  const probs = data.hourly?.precipitation_probability ?? [];
  const maxPop = probs.length ? Math.max(...probs) : 0;
  rainEl.textContent = `${maxPop}%`;

  // UV index
  const uvi = c.uv_index;
  if (uvi !== null && uvi !== undefined) {
    const { label, cssClass, color } = uvInfo(uvi);
    uvIndexEl.textContent = Math.round(uvi);
    uvBadgeEl.textContent = label;
    uvBadgeEl.className   = `uv-badge ${cssClass}`;
    uvBarEl.style.width   = `${Math.min((uvi / 14) * 100, 100)}%`;
    uvBarEl.style.background = color;
    uvCardEl.classList.remove("hidden");
  } else {
    uvCardEl.classList.add("hidden");
  }

  weatherContent.classList.remove("hidden");
}

// ── WMO weather code → description + emoji ────────────────────────────────────
function wmoInfo(code) {
  const map = {
    0:  { emoji: "☀️",  description: "Clear sky" },
    1:  { emoji: "🌤️", description: "Mainly clear" },
    2:  { emoji: "⛅",  description: "Partly cloudy" },
    3:  { emoji: "☁️",  description: "Overcast" },
    45: { emoji: "🌫️", description: "Fog" },
    48: { emoji: "🌫️", description: "Icy fog" },
    51: { emoji: "🌦️", description: "Light drizzle" },
    53: { emoji: "🌦️", description: "Moderate drizzle" },
    55: { emoji: "🌧️", description: "Dense drizzle" },
    56: { emoji: "🌧️", description: "Light freezing drizzle" },
    57: { emoji: "🌧️", description: "Heavy freezing drizzle" },
    61: { emoji: "🌧️", description: "Slight rain" },
    63: { emoji: "🌧️", description: "Moderate rain" },
    65: { emoji: "🌧️", description: "Heavy rain" },
    66: { emoji: "🌨️", description: "Light freezing rain" },
    67: { emoji: "🌨️", description: "Heavy freezing rain" },
    71: { emoji: "❄️",  description: "Slight snowfall" },
    73: { emoji: "❄️",  description: "Moderate snowfall" },
    75: { emoji: "❄️",  description: "Heavy snowfall" },
    77: { emoji: "🌨️", description: "Snow grains" },
    80: { emoji: "🌦️", description: "Slight rain showers" },
    81: { emoji: "🌧️", description: "Moderate rain showers" },
    82: { emoji: "⛈️",  description: "Violent rain showers" },
    85: { emoji: "🌨️", description: "Slight snow showers" },
    86: { emoji: "🌨️", description: "Heavy snow showers" },
    95: { emoji: "⛈️",  description: "Thunderstorm" },
    96: { emoji: "⛈️",  description: "Thunderstorm with hail" },
    99: { emoji: "⛈️",  description: "Thunderstorm with heavy hail" },
  };
  return map[code] ?? { emoji: "🌡️", description: "Unknown" };
}

// ── UV helpers ────────────────────────────────────────────────────────────────
function uvInfo(index) {
  if (index <= 2)  return { label: "Low",       cssClass: "low",       color: "var(--uv-low)"       };
  if (index <= 5)  return { label: "Moderate",  cssClass: "moderate",  color: "var(--uv-moderate)"  };
  if (index <= 7)  return { label: "High",      cssClass: "high",      color: "var(--uv-high)"      };
  if (index <= 10) return { label: "Very High", cssClass: "very-high", color: "var(--uv-very-high)" };
  return              { label: "Extreme",    cssClass: "extreme",   color: "var(--uv-extreme)"   };
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function showLoading(show) { loadingEl.classList.toggle("hidden", !show); }
function hideWeather()     { weatherContent.classList.add("hidden"); }
function showError(msg)    { errorEl.textContent = msg; errorEl.classList.remove("hidden"); }
function clearError()      { errorEl.textContent = ""; errorEl.classList.add("hidden"); }
