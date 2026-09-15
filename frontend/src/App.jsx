import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [message, setMessage] = useState("");
  const [sosSent, setSosSent] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("Waiting for GPS...");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSOS, setPendingSOS] = useState(0);

  // Load pending SOS count when app starts
  useEffect(() => {
    const savedSOS = JSON.parse(
      localStorage.getItem("pendingSOS") || "[]"
    );

    setPendingSOS(savedSOS.length);
  }, []);

  // Detect internet connection changes
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Send SOS
  const handleSOS = async () => {
    setSosSent(false);
    setLocationStatus("Getting your location...");

    if (!navigator.geolocation) {
      setLocationStatus("GPS is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        const emergencyPacket = {
          messageId: `SOS-${Date.now()}`,
          senderId: "DEVICE-USER",
          type: "GENERAL",
          message: message || "Emergency assistance required",
          latitude: latitude,
          longitude: longitude,
          timestamp: new Date().toISOString(),
          hopCount: 0,
          status: isOnline ? "READY_TO_SEND" : "PENDING",
        };

        console.log("Emergency Packet:", emergencyPacket);

        setLocation({
          latitude,
          longitude,
        });

        setLocationStatus("Location captured");

        // ONLINE
        if (isOnline) {
          try {
            const response = await fetch(
              "http://127.0.0.1:8000/api/sos",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(emergencyPacket),
              }
            );

            if (!response.ok) {
              throw new Error("Server rejected the SOS");
            }

            const result = await response.json();

            console.log("SOS sent to server:", result);

            setSosSent(true);
          } catch (error) {
            console.error("Failed to send SOS:", error);

            // Save locally if server is unavailable
            const existingSOS = JSON.parse(
              localStorage.getItem("pendingSOS") || "[]"
            );

            existingSOS.push(emergencyPacket);

            localStorage.setItem(
              "pendingSOS",
              JSON.stringify(existingSOS)
            );

            setPendingSOS(existingSOS.length);
            setSosSent(true);

            console.log(
              "SOS saved locally because server was unavailable."
            );
          }
        }

        // OFFLINE
        else {
          const existingSOS = JSON.parse(
            localStorage.getItem("pendingSOS") || "[]"
          );

          existingSOS.push(emergencyPacket);

          localStorage.setItem(
            "pendingSOS",
            JSON.stringify(existingSOS)
          );

          setPendingSOS(existingSOS.length);
          setSosSent(true);

          console.log(
            "SOS saved locally because device is offline."
          );
        }
      },

      // GPS error
      (error) => {
        console.error("GPS Error:", error);

        setLocationStatus(
          "Unable to get GPS location. Please enable location services."
        );
      },

      // GPS options
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Dead Zone Emergency Network</h1>
        <p>Offline-first emergency communication</p>
      </header>

      <main className="container">
        <div className="status">
          <span className="status-dot"></span>

          <span>
            Network Status: {isOnline ? "Online" : "Offline"}
          </span>
        </div>

        <section className="sos-card">
          <h2>Emergency Assistance</h2>

          <p>
            Send an SOS with your location when you need emergency help.
          </p>

          <textarea
            placeholder="Describe the emergency..."
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />

          <button className="sos-button" onClick={handleSOS}>
            🚨 SEND SOS
          </button>

          {sosSent && (
            <div className="success-message">
              {isOnline
                ? "SOS sent successfully to emergency server."
                : "SOS saved locally. It will be sent when connection returns."}
            </div>
          )}
        </section>

        <section className="info-card">
          <h3>Emergency Information</h3>

          <div className="info-row">
            <span>📍 Location</span>
            <strong>{locationStatus}</strong>
          </div>

          {location && (
            <>
              <div className="info-row">
                <span>Latitude</span>
                <strong>{location.latitude.toFixed(6)}</strong>
              </div>

              <div className="info-row">
                <span>Longitude</span>
                <strong>{location.longitude.toFixed(6)}</strong>
              </div>
            </>
          )}

          <div className="info-row">
            <span>📡 Network</span>
            <strong>{isOnline ? "Online" : "Offline"}</strong>
          </div>

          <div className="info-row">
            <span>📦 Pending SOS</span>
            <strong>{pendingSOS}</strong>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;