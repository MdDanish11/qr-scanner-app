import React, { useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import "./App.css";

const verifyScannedText = async (text) => {
  try {
    const response = await fetch(
      `https://stgscreening.be.karmaalab.com/api/user/qr-test?qr_code=${encodeURIComponent(
        text
      )}`
    );
    const data = await response.json();
    return data.message || "No message received from server.";
  } catch (error) {
    console.error("API Error:", error);
    return "Something went wrong while verifying.";
  }
};

function App() {
  const scannerRef = useRef(null);
  const [scannedText, setScannedText] = useState("");
  const [scanning, setScanning] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [cameraTrack, setCameraTrack] = useState(null);
  const alreadyScannedRef = useRef(false); // ✅ to avoid multiple calls

  const startScanner = () => {
    setScannedText("");
    alreadyScannedRef.current = false;

    const html5QrCode = new Html5Qrcode("reader");
    scannerRef.current = html5QrCode;

    const config = { fps: 10, qrbox: { width: 750, height: 750 } };

    html5QrCode
      .start(
        { facingMode: "environment" },
        config,
        async (decodedText) => {
          if (alreadyScannedRef.current) return; // ✅ only first scan allowed
          alreadyScannedRef.current = true;

          const cleanedText = decodedText.trim();

          console.log("Scanned:", cleanedText);
          setScanning(false);
          html5QrCode.stop();

          if (cameraTrack) {
            cameraTrack.stop();
            setCameraTrack(null);
          }

          const apiMessage = await verifyScannedText(cleanedText);
          setScannedText(apiMessage);
        },
        (err) => {
          console.log("Scan error:", err); // Ignore individual scan failures
        }
      )
      .then(() => {
        setScanning(true);
        try {
          const stream = html5QrCode.getRunningTrackSettings()?.stream;
          const track = stream?.getVideoTracks?.()[0];
          if (track) setCameraTrack(track);
        } catch (e) {
          console.warn("Could not access camera track");
        }
      });
  };

  const stopScanner = () => {
    scannerRef.current?.stop().then(() => {
      setScanning(false);
      if (cameraTrack) {
        cameraTrack.stop();
        setCameraTrack(null);
      }
    });
  };

  const toggleFlash = async () => {
    if (!cameraTrack) return;
    const capabilities = cameraTrack.getCapabilities();
    if (!capabilities.torch) {
      alert("Flashlight not supported on this device.");
      return;
    }

    try {
      await cameraTrack.applyConstraints({
        advanced: [{ torch: !flashOn }],
      });
      setFlashOn((prev) => !prev);
    } catch (err) {
      console.error("Flashlight error:", err);
    }
  };

  return (
    <div className="container">
      <h1>QR Code Scanner</h1>
      <div className="scanner-container">
        <div id="reader" className="scanner-box"></div>
      </div>
      <div className="button-group">
        {!scanning ? (
          <button onClick={startScanner}>Scan QR</button>
        ) : (
          <>
            <button onClick={stopScanner}>Close Scan</button>
            <button onClick={toggleFlash}>
              {flashOn ? "Flash Off" : "Flash On"}
            </button>
          </>
        )}
      </div>

      {scannedText && (
        <p
          className={`result-text ${
            scannedText.toLowerCase().includes("valid") ? "valid" : "invalid"
          }`}
        >
          {scannedText}
        </p>
      )}
    </div>
  );
}

export default App;
