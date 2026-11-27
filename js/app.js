
/* =========================================
   SKYPULSE WEATHER ENGINE
   PHASE 3 - LIVE API INTEGRATION
========================================= */



"use strict";

// DOM ELEMENTS

const weatherForm = document.getElementById("weatherForm");
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");

const loader = document.getElementById("loader");
const errorMessage = document.getElementById("errorMessage");



// PHASE 4 - ADVANCED FEATURES

const locationBtn = document.getElementById("locationBtn");
const refreshBtn = document.getElementById("refreshBtn");
const recentSearches = document.getElementById("recentSearches");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const lastUpdated = document.getElementById("lastUpdated");

const HISTORY_KEY = "skypulse_recent_cities";

let lastSearchedCity = "Bhopal";


// INITIALIZE APPLICATION


function initializeApp() {

    console.log("SkyPulse Advanced Dashboard initialized.");

    updateDate();

    weatherForm.addEventListener("submit", handleSearch);

    locationBtn.addEventListener("click", getCurrentLocation);

    refreshBtn.addEventListener("click", refreshWeather);

    clearHistoryBtn.addEventListener("click", clearSearchHistory);

    recentSearches.addEventListener("click", handleRecentSearch);

    renderRecentSearches();

    

    loadWeather("Bhopal");

}


// DATE

function updateDate() {
    const dateElement = document.getElementById("weatherDate");

    dateElement.textContent = new Date().toLocaleDateString(
        "en-IN",
        {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    );
}

// SEARCH

async function handleSearch(event) {
    event.preventDefault();

    const city = cityInput.value.trim();

    if (!city) {
        showError("Please enter a city name.");
        return;
    }

    await loadWeather(city);
}

// MAIN WEATHER FUNCTION

async function loadWeather(city) {

    try {

        showLoader();
        hideError();

        searchBtn.disabled = true;
        searchBtn.textContent = "Loading...";

        
        const response = await fetch(
            `/api/weather?city=${encodeURIComponent(city)}`
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Weather data unavailable.");
        }

        updateCurrentWeather(result.current, result.location);
        updateForecast(result.forecast);

        lastSearchedCity = city;

        saveRecentSearch(
            result.location.name,
            result.location.country
        );

        lastUpdated.textContent =
            "Last updated: " + new Date().toLocaleTimeString("en-IN");

        console.log("Live weather updated successfully.");

        updateForecast(forecastData);
        // PHASE 4 - SAVE RECENT SEARCH

        lastSearchedCity = city;

        saveRecentSearch(location.name, location.country);

        lastUpdated.textContent =
           "Last updated: " + new Date().toLocaleTimeString("en-IN");

        console.log("Live weather updated successfully.");

    } catch (error) {

        console.error("Weather API error:", error);

        showError(getFriendlyError(error));

    } finally {

        hideLoader();

        searchBtn.disabled = false;
        searchBtn.textContent = "Search →";

    }
}

// CURRENT WEATHER

function updateCurrentWeather(data, location) {

    const weather = data.weather[0];

    document.getElementById("cityName").textContent =
        `${location.name}, ${location.country}`;

    document.getElementById("temperature").textContent =
        `${Math.round(data.main.temp)}°`;

    document.getElementById("weatherDescription").textContent =
        capitalize(weather.description);

    document.getElementById("feelsLike").textContent =
        `${Math.round(data.main.feels_like)}°C`;

    document.getElementById("humidity").textContent =
        `${data.main.humidity}%`;

    document.getElementById("wind").textContent =
        `${(data.wind.speed * 3.6).toFixed(1)} km/h`;

    document.getElementById("pressure").textContent =
        `${data.main.pressure} hPa`;

    document.getElementById("visibility").textContent =
        `${(data.visibility / 1000).toFixed(1)} km`;

    // WEATHER ICON

    const iconCode = weather.icon;

    document.getElementById("weatherIcon").innerHTML = `
        <img
            src="https://openweathermap.org/img/wn/${iconCode}@2x.png"
            alt="${weather.description}"
            width="120"
            height="120"
        >
    `;

    // HIGH AND LOW TEMPERATURE

    const temperatureFooter = document.querySelector(
        ".temperature-footer"
    );

    const values = temperatureFooter.querySelectorAll("strong");

    values[0].textContent = `${Math.round(data.main.temp_max)}°`;
    values[1].textContent = `${Math.round(data.main.temp_min)}°`;
    values[2].textContent = `${data.clouds.all}%`;

    // SUNRISE AND SUNSET

    document.getElementById("sunrise").textContent =
        formatTime(data.sys.sunrise, data.timezone);

    document.getElementById("sunset").textContent =
        formatTime(data.sys.sunset, data.timezone);

    // DYNAMIC BACKGROUND

    updateWeatherTheme(weather.main, iconCode);
}

// TIME FORMAT

function formatTime(timestamp, timezone) {

    const date = new Date(
        (timestamp + timezone) * 1000
    );

    return date.toISOString().slice(11, 16);

}

// FORECAST

function updateForecast(data) {

    const forecastGrid = document.getElementById("forecastGrid");

    // Group forecast entries by location's local date

    const dailyForecast = new Map();

    data.list.forEach(item => {

        const localDate = new Date(
            (item.dt + data.city.timezone) * 1000
        ).toISOString().slice(0, 10);

        if (!dailyForecast.has(localDate)) {
            dailyForecast.set(localDate, []);
        }

        dailyForecast.get(localDate).push(item);

    });

    const days = Array.from(dailyForecast.entries()).slice(0, 5);

    forecastGrid.innerHTML = "";

    days.forEach(([date, entries]) => {

        // Select the forecast nearest to midday

        const middayForecast = entries.reduce((best, item) => {

            const hour = new Date(
                (item.dt + data.city.timezone) * 1000
            ).getUTCHours();

            const bestHour = new Date(
                (best.dt + data.city.timezone) * 1000
            ).getUTCHours();

            return Math.abs(hour - 12) < Math.abs(bestHour - 12)
                ? item
                : best;

        });

        const high = Math.max(
            ...entries.map(item => item.main.temp_max)
        );

        const low = Math.min(
            ...entries.map(item => item.main.temp_min)
        );

        const dayName = new Date(`${date}T12:00:00Z`)
            .toLocaleDateString("en-IN", {
                weekday: "short",
                timeZone: "UTC"
            });

        const icon = middayForecast.weather[0].icon;

        const card = document.createElement("div");
        card.className = "forecast-item";

        const day = document.createElement("p");
        day.textContent = dayName;

        const weatherImage = document.createElement("img");
        weatherImage.src =
            `https://openweathermap.org/img/wn/${icon}.png`;
        weatherImage.alt = middayForecast.weather[0].description;
        weatherImage.width = 50;
        weatherImage.height = 50;

        const highTemp = document.createElement("h3");
        highTemp.textContent = `${Math.round(high)}°`;

        const lowTemp = document.createElement("p");
        lowTemp.className = "forecast-low";
        lowTemp.textContent = `${Math.round(low)}°`;

        card.append(day, weatherImage, highTemp, lowTemp);

        forecastGrid.appendChild(card);

    });

}

// WEATHER THEME

function updateWeatherTheme(condition, iconCode) {

    document.body.classList.remove(
        "weather-sunny",
        "weather-cloudy",
        "weather-rainy",
        "weather-night",
        "weather-snowy"
    );

    if (iconCode.endsWith("n")) {
        document.body.classList.add("weather-night");
        return;
    }

    const type = condition.toLowerCase();

    if (type.includes("rain") || type.includes("drizzle") ||
        type.includes("thunderstorm")) {

        document.body.classList.add("weather-rainy");

    } else if (type.includes("cloud") || type.includes("mist") ||
        type.includes("fog")) {

        document.body.classList.add("weather-cloudy");

    } else if (type.includes("snow")) {

        document.body.classList.add("weather-snowy");

    } else {

        document.body.classList.add("weather-sunny");

    }

}

// HELPERS

function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function showLoader() {
    loader.classList.remove("hidden");
}

function hideLoader() {
    loader.classList.add("hidden");
}


// ===================================
// IMPROVED ERROR HANDLING
// ===================================

function showError(message) {

    if (!errorMessage) {
        console.error("SkyPulse Error:", message);
        return;
    }

    errorMessage.textContent = message;
    errorMessage.classList.remove("hidden");

}

function hideError() {

    if (!errorMessage) return;

    errorMessage.textContent = "";
    errorMessage.classList.add("hidden");

}

function getFriendlyError(error) {

    const message = error.message.toLowerCase();

    if (!navigator.onLine) {
        return "Internet connection unavailable. Please reconnect.";
    }

    if (message.includes("failed to fetch")) {
        return "Network error. Please check your internet connection.";
    }

    if (message.includes("401")) {
        return "API key invalid or not activated. Check OpenWeatherMap.";
    }

    if (message.includes("404")) {
        return "City not found. Please check the city name.";
    }

    if (message.includes("429")) {
        return "API request limit reached. Please try again later.";
    }

    return error.message || "Something went wrong. Please try again.";

}


// START APP

// ===================================
// PHASE 4 - RECENT SEARCH HISTORY
// ===================================

function getSearchHistory() {

    try {

        return JSON.parse(
            localStorage.getItem(HISTORY_KEY) || "[]"
        );

    } catch (error) {

        console.error("History read error:", error);

        return [];

    }

}

function saveRecentSearch(city, country) {

    const history = getSearchHistory();

    const cityData = {
        name: city,
        country: country
    };

    const filteredHistory = history.filter(item =>
        item.name.toLowerCase() !== city.toLowerCase() ||
        item.country !== country
    );

    filteredHistory.unshift(cityData);

    const limitedHistory = filteredHistory.slice(0, 6);

    localStorage.setItem(
        HISTORY_KEY,
        JSON.stringify(limitedHistory)
    );

    renderRecentSearches();

}

function renderRecentSearches() {

    const history = getSearchHistory();

    recentSearches.innerHTML = "";

    if (history.length === 0) {

        const empty = document.createElement("p");

        empty.className = "recent-empty";
        empty.textContent = "No recent searches yet.";

        recentSearches.appendChild(empty);

        return;

    }

    history.forEach(city => {

        const button = document.createElement("button");

        button.type = "button";
        button.className = "recent-chip";

        button.textContent = `📍 ${city.name}, ${city.country}`;

        button.dataset.city = `${city.name}, ${city.country}`;

        recentSearches.appendChild(button);

    });

}

// RECENT SEARCH CLICK

function handleRecentSearch(event) {

    const button = event.target.closest(".recent-chip");

    if (!button) return;

    const city = button.dataset.city;

    cityInput.value = city;

    loadWeather(city);

}

// CLEAR HISTORY

function clearSearchHistory() {

    localStorage.removeItem(HISTORY_KEY);

    renderRecentSearches();

}

// REFRESH WEATHER

async function refreshWeather() {

    await loadWeather(lastSearchedCity);

}


// ===================================
// CURRENT LOCATION - IMPROVED
// ===================================

function getCurrentLocation() {

    if (!navigator.geolocation) {
        showError("Your browser does not support location services.");
        return;
    }

    if (!window.isSecureContext) {
        showError("Please open SkyPulse using localhost or HTTPS.");
        return;
    }

    if (!navigator.onLine) {
        showError("Please check your internet connection.");
        return;
    }

    hideError();

    locationBtn.disabled = true;
    locationBtn.textContent = "Locating...";

    showLoader();

    navigator.geolocation.getCurrentPosition(

        async function(position) {

            try {

                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                console.log("Location coordinates received:", lat, lon);

                const response = await fetch(
                   `/api/weather?lat=${lat}&lon=${lon}`
                );

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || "Location weather unavailable.");
                }
                const city =
                    `${result.location.name}, ${result.location.country}`;

                cityInput.value = city;

                updateCurrentWeather(result.current, result.location);
                updateForecast(result.forecast);

                lastSearchedCity = city;

                saveRecentSearch(
                    result.location.name,
                    result.location.country
                );

                lastUpdated.textContent =
                    "Last updated: " + new Date().toLocaleTimeString("en-IN");

                console.log("Location weather updated successfully.");

            } catch (error) {

                console.error("Location error:", error);

                showError(getFriendlyError(error));

            } finally {

                hideLoader();

                locationBtn.disabled = false;
                locationBtn.textContent = "⌖ Use My Location";

            }

        },

        function(error) {

            hideLoader();

            locationBtn.disabled = false;
            locationBtn.textContent = "⌖ Use My Location";

            if (error.code === 1) {

                showError(
                    "Location permission denied. Allow location access in browser settings."
                );

            } else if (error.code === 2) {

                showError("Your current location is unavailable.");

            } else if (error.code === 3) {

                showError("Location request timed out. Please try again.");

            } else {

                showError("Unable to detect your location.");

            }

        },

        {
            enableHighAccuracy: false,
            timeout: 15000,
            maximumAge: 300000
        }

    );

}


initializeApp();
