
module.exports = async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    const API_KEY = process.env.OPENWEATHER_API_KEY;

    if (!API_KEY) {
        return res.status(500).json({
            error: "Weather API key is missing in Vercel settings."
        });
    }

    try {
        const { city, lat, lon } = req.query;

        let location;

        // Find city or reverse-geocode coordinates
        if (city) {
            const geoURL = new URL(
                "https://api.openweathermap.org/geo/1.0/direct"
            );

            geoURL.search = new URLSearchParams({
                q: city,
                limit: "1",
                appid: API_KEY
            });

            const geoResponse = await fetch(geoURL);

            if (!geoResponse.ok) {
                throw new Error(`Geocoding failed: ${geoResponse.status}`);
            }

            const locations = await geoResponse.json();

            if (!locations.length) {
                return res.status(404).json({
                    error: "City not found."
                });
            }

            location = locations[0];

        } else if (lat !== undefined && lon !== undefined) {
            const geoURL = new URL(
                "https://api.openweathermap.org/geo/1.0/reverse"
            );

            geoURL.search = new URLSearchParams({
                lat,
                lon,
                limit: "1",
                appid: API_KEY
            });

            const geoResponse = await fetch(geoURL);

            if (!geoResponse.ok) {
                throw new Error(`Location lookup failed: ${geoResponse.status}`);
            }

            const locations = await geoResponse.json();

            if (!locations.length) {
                return res.status(404).json({
                    error: "Location not found."
                });
            }

            location = locations[0];

        } else {
            return res.status(400).json({
                error: "Provide a city or valid coordinates."
            });
        }

        const weatherParams = new URLSearchParams({
            lat: String(location.lat),
            lon: String(location.lon),
            units: "metric",
            appid: API_KEY
        });

        const currentURL =
            `https://api.openweathermap.org/data/2.5/weather?${weatherParams}`;

        const forecastURL =
            `https://api.openweathermap.org/data/2.5/forecast?${weatherParams}`;

        const [currentResponse, forecastResponse] =
            await Promise.all([
                fetch(currentURL),
                fetch(forecastURL)
            ]);

        if (!currentResponse.ok || !forecastResponse.ok) {
            const failedResponse =
                !currentResponse.ok ? currentResponse : forecastResponse;

            throw new Error(
                `OpenWeatherMap error: ${failedResponse.status}`
            );
        }

        const [current, forecast] = await Promise.all([
            currentResponse.json(),
            forecastResponse.json()
        ]);

        return res.status(200).json({
            location,
            current,
            forecast
        });

    } catch (error) {
        console.error("Weather API Error:", error);

        return res.status(500).json({
            error: error.message || "Unable to load weather data."
        });
    }
};
