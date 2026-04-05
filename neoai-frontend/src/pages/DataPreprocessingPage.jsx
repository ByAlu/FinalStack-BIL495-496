import { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import { WorkflowSteps } from "../components/WorkflowSteps";
import { preprocessImages } from "../services/api";
import ThreeColumnLayout from "../components/ThreeColumnLayout";
import CircularProgress from "@mui/material/CircularProgress";
/**
 * TODO:
 * Add retry button when an server side error occurs
 * Handle going back and changing the data
 * Disable the page if user goes back to selection
 * Show selected frames on the left
 * show applies filters on the right as a list
 */
function getStorageKey(patientId, examinationId) {
  return `neoai-selection:${patientId}:${examinationId}`;
}

export function DataPreprocessingPage() {

  const [showFilterList, setShowFilterList] = useState(true);
  const [showSelectedMenu, setShowSelectedMenu] = useState(true);
  const [processedFrames, setProcessedFrames] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFrameRegion, setSelectedFrameRegion] = useState(null);

  const viewerMode = "frame"; // Or make this dynamic if needed
  const maxRegions = 6;

  // Example regions list; adjust as needed
  const regions = ["R1", "R2", "R3", "R4", "R5", "R6"];

  const location = useLocation();
  const { patientId, examinationId, selectedFrames } = location.state;

  useEffect(() => {
  loadImages();
}, [patientId, examinationId]);

async function loadImages() {
  setLoading(true);
  setError("");

  try {
    const storageKey = getStorageKey(patientId, examinationId);
    const storedSelectedFrames = selectedFrames || {};
    const selectedFramesArray = Object.values(storedSelectedFrames).filter(Boolean);

    if (selectedFramesArray.length === 0) {
      setProcessedFrames([]);
      setLoading(false);
      return;
    }

    const result = await preprocessImages(selectedFramesArray);
    setProcessedFrames(result);
    setError(null);
  } catch (err) {
    console.error("Error loading images:", err);
    setError(err.message || "Failed to load images.");
  } finally {
    setLoading(false);
  }
}

  const handleSelectedFrameClick = (region) => {
    setSelectedFrameRegion(region);
    const frameData = selectedFrames[region];
    console.log("Clicked frame data:", frameData);
  };

  const isApprovedReady = Object.keys(selectedFrames).length > 0;

  return (
    <div className="page-stack">
      <WorkflowSteps currentStep="preprocessing" context={{ patientId, examinationId }} />
      {loading && 
          <div 
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              height: "60vh"
              }}
          >
          <CircularProgress />
        </div>
      }

      {!loading && error && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "60vh"
        }}>
          <p style={{ color: "red" }}>Error: {error}</p>
          <button 
          className="primary-button"
          type="button" 
          onClick={loadImages}
          >
            Try Again
          </button>
        </div>
      )}

      {!loading && !error && (
        <ThreeColumnLayout
          leftContent={
            <div>
              {Object.entries(selectedFrames).map(([region, frame]) => (
                <div key={region} onClick={() => handleSelectedFrameClick(region)}>
                  <p>{region}</p>
                  <img src={frame.thumbnail} alt={`Region ${region}`} />
                </div>
              ))}
            </div>
          }
          centerContent={
            <div>
              {Object.entries(processedFrames).map(([frameId, processed]) => (
                <img key={frameId} src={processed.url} alt={`Processed ${frameId}`} />
              ))}
            </div>
          }
        />
      )}
    </div>
  );
}
