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
  const fileInputRef = useRef(null);
  const [scannedText, setScannedText] = useState("");
  const [scanning, setScanning] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [cameraTrack, setCameraTrack] = useState(null);
  const alreadyScannedRef = useRef(false);

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
          if (alreadyScannedRef.current) return;
          alreadyScannedRef.current = true;

          const rawText = decodedText;
          const cleanedText = decodedText.trim().replace(/\s+/g, "");

          console.log("Raw Scanned Text:", rawText);
          console.log("Cleaned Scanned Text:", cleanedText);

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
          // Don't log unnecessary scan errors
        }
      )
      .then(() => {
        setScanning(true);
        try {
        const tracks = html5QrCode.getMediaStream()?.getVideoTracks?.();
        if (tracks && tracks.length > 0) {
          setCameraTrack(tracks[0]);
        }
      } catch (e) {
        
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
    try {
      const track = cameraTrack;
  
      if (!track) {
        alert("Camera not initialized yet.");
        return;
      }
  
      const capabilities = track.getCapabilities();
      if (!capabilities || !capabilities.torch) {
        alert("Flashlight not supported on this device.");
        return;
      }
  
      await track.applyConstraints({
        advanced: [{ torch: !flashOn }],
      });
      setFlashOn((prev) => !prev);
    } catch (err) {
      console.error("Flashlight error:", err);
      alert("Could not toggle flashlight.");
    }
  };
  
  
  
  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const html5QrCode = new Html5Qrcode("reader");

    try {
      const result = await html5QrCode.scanFile(file, true);
      console.log("Image QR Result:", result);

      const cleanedText = result.trim().replace(/\s+/g, "");
      const apiMessage = await verifyScannedText(cleanedText);
      setScannedText(apiMessage);
    } catch (err) {
      console.error("Image Scan Error:", err);
      alert("Could not scan the selected image.");
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
          <>
            <button onClick={startScanner}>Scan QR</button>
            <button onClick={handleUploadClick}>Upload QR Image</button>
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              ref={fileInputRef}
              onChange={handleFileChange}
            />
          </>
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
