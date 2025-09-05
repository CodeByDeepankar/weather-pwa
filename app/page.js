"use client";
import React, { useState, useRef } from "react";
import { useEffect } from "react";
import { featchWeather, featchWeatherByCoords } from "./api/fetchWeather";
import Image from "next/image";

const App = () => {
  const [query, setQuery] = useState("");
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const errorTimer = useRef(null);

  // Shared search logic used by Enter key and button
  const clearErrorTimer = () => {
    if (errorTimer.current) {
      clearTimeout(errorTimer.current);
      errorTimer.current = null;
    }
  };

  const scheduleClearErrors = () => {
    clearErrorTimer();
    errorTimer.current = setTimeout(() => {
      setError(null);
      setValidationError(null);
      errorTimer.current = null;
    }, 6000);
  };

  const handleSearch = async () => {
    const trimmed = query.trim();
    // basic validation: non-empty and reasonable characters (letters, numbers, comma, dot, hyphen, space)
    const validPattern = /^[a-zA-Z0-9\s,.'-]{1,60}$/u;
    if (!trimmed) {
      setValidationError("Please enter a city name or zip code.");
      scheduleClearErrors();
      return;
    }
    if (!validPattern.test(trimmed)) {
      setValidationError(
        "Please enter a valid city name (letters, numbers, commas, dashes)."
      );
      scheduleClearErrors();
      return;
    }

    setLoading(true);
    setError(null);
    setValidationError(null);
    try {
      const data = await featchWeather(trimmed);
      setWeather(data);
      setQuery("");
    } catch (err) {
      // axios errors include response; handle 404 as not found
      const status = err?.response?.status;
      if (status === 404) {
        setError(
          "City not found. Please try a different name (e.g. 'London')."
        );
      } else if (
        err?.code === "ENOTFOUND" ||
        err?.message?.includes("Network")
      ) {
        setError("Network error. Check your connection and try again.");
      } else {
        setError("Unable to fetch weather. Try again later.");
      }
      console.error("Fetch error:", err);
      scheduleClearErrors();
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  // compute a simple class from weather main type for themed background
  const themeClass = weather?.weather?.[0]?.main
    ? weather.weather[0].main.toLowerCase()
    : "default";

  return (
    <div className={`main-container ${themeClass}`}>
      <div className="search-wrap">
        <div className="input-with-icons">
          <input
            type="text"
            className="search"
            placeholder="Search city, e.g. London"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setError(null);
              setValidationError(null);
              clearErrorTimer();
            }}
            onKeyDown={handleKeyDown}
            aria-label="Search city"
            disabled={loading}
          />
          <span className="icon icon-left" aria-hidden>
            <Image
              width={64}
              height={64}
              src="/icons/icon-512.png"
              alt="search"
              className="input-icon"
            />
          </span>
        </div>
        <button
          className="search-btn"
          onClick={handleSearch}
          disabled={loading}
          aria-label="Search"
        >
          {loading ? (
            "Searching..."
          ) : (
            <span className="icon icon-right logo" aria-hidden>
              <Image
                width={50}
                height={50}
                src="/icons/icon-192.png"
                alt="app logo"
                className="input-icon"
              />
            </span>
          )}
        </button>
        <button
          className="geo-btn-small"
          onClick={async () => {
            // geolocation action moved to small button
            if (!("geolocation" in navigator)) {
              setError("Geolocation not supported in this browser.");
              scheduleClearErrors();
              return;
            }
            setLoading(true);
            setError(null);
            try {
              navigator.geolocation.getCurrentPosition(
                async (pos) => {
                  try {
                    const data = await featchWeatherByCoords(
                      pos.coords.latitude,
                      pos.coords.longitude
                    );
                    setWeather(data);
                  } catch (err) {
                    setError("Unable to fetch weather for your location.");
                    console.error(err);
                    scheduleClearErrors();
                  } finally {
                    setLoading(false);
                  }
                },
                (err) => {
                  setLoading(false);
                  setError("Permission denied or unable to retrieve location.");
                  scheduleClearErrors();
                }
              );
            } catch (err) {
              setLoading(false);
              setError("Unable to access geolocation.");
              scheduleClearErrors();
            }
          }}
          aria-label="Use my location"
          title="Use my location"
          disabled={loading}
        >
          📍
        </button>
      </div>

      {validationError && (
        <div className="error-card card" role="alert" aria-live="assertive">
          {validationError}
        </div>
      )}

      {error && (
        <div className="error-card card" role="alert" aria-live="assertive">
          {error}
        </div>
      )}

      {weather?.main && (
        <div className="city card">
          <h2 className="city-name">
            <span>{weather.name}</span>
            <sup>{weather.sys.country}</sup>
          </h2>

          <div className="city-temp">
            {Math.round(weather.main.temp)}
            <sup>&deg;C</sup>
          </div>

          <div className="info">
            <Image
              width={100}
              height={100}
              className="city-icon"
              src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`}
              alt={weather.weather[0].description}
            />
            <p className="description">{weather.weather[0].description}</p>
          </div>

          <div className="meta">
            <div>Humidity: {weather.main.humidity}%</div>
            <div>Wind: {Math.round(weather.wind.speed)} m/s</div>
          </div>
        </div>
      )}

      {!weather && !loading && (
        <div className="hint card">
          Try searching for a city to see the weather. Press Enter or click
          Search.
        </div>
      )}
    </div>
  );
};

export default App;

// Register service worker when running in browser
if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("Service worker registered:", reg.scope))
        .catch((err) =>
          console.warn("Service worker registration failed:", err)
        );
    }
  });
}
