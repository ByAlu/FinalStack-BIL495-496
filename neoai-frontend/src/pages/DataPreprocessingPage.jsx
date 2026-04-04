import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { WorkflowSteps } from "../components/WorkflowSteps";
import { preprocessImages } from "../services/api";

function getStorageKey(patientId, examinationId) {
  return `neoai-selection:${patientId}:${examinationId}`;
}
/**
 * TODO:
 * Add retry button when an server side error occurs
 * Handle going back and changing the data
 * Disable the page if user goes back to selection
 * Show selected frames on the left
 * show applies filters on the right as a list
 */
export function DataPreprocessingPage() {
  const { patientId, examinationId } = useParams();

  const [showVideoMenu, setShowVideoMenu] = useState(true);
  const [showSelectedMenu, setShowSelectedMenu] = useState(true);
  const [processedImages, setProcessedImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
  async function loadImages() {
    setLoading(true);
    setError("");

    try {
      const storageKey = getStorageKey(patientId, examinationId);
      const storedData = JSON.parse(sessionStorage.getItem(storageKey) || "{}");
      console.log(storedData);
      
      let selectedFrames = storedData.selectedFrames;

      // Ensure selectedFrames is an array
      if (!Array.isArray(selectedFrames)) {
        console.warn("selectedFrames is not an array, converting to empty array");
        selectedFrames = [];
      }

      if (selectedFrames.length === 0) {
        setProcessedImages([]);
        setLoading(false);
        return;
      }

      // Preprocess the images
      const result = await preprocessImages(selectedFrames);
      setProcessedImages(result);
    } catch (err) {
      console.error("Error loading images:", err);
      setError(err.message || "Failed to load images.");
    } finally {
      setLoading(false);
    }
  }

  loadImages();
}, [patientId, examinationId]);

  return (
    <div className="page-stack">
      <WorkflowSteps currentStep="preprocessing" context={{ patientId, examinationId }} />
      <section
        className={`selection-layout${showVideoMenu ? "" : " hide-left"}${showSelectedMenu ? "" : " hide-right"}`}
      >
        <section className={`selection-sidebar panel${showVideoMenu ? "" : " collapsed"}`}>
          {showSelectedMenu ? (<></>):(<></>)}
        </section>

        <section className="selection-main panel">
          {loading && <p>Loading images...</p>}
          {error && <p style={{ color: "red" }}>{error}</p>}

          <div className="images-grid">
            {processedImages.map((img, index) => (
              <img key={index} src={img.url || img} alt={`Processed ${index}`} />
            ))}
          </div>
        </section>

        <section className={`selected-frames-sidebar panel${showSelectedMenu ? "" : " collapsed"}`}>
          {showSelectedMenu ? (<></>):(<></>)}
        </section>

      </section>
    </div>
  );
}
