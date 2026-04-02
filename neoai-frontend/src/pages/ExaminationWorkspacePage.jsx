import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { aiModels, preprocessingOptions } from "../data/mockData";
import { getExaminationByIds } from "../services/patient_api";

const regions = ["r1", "r2", "r3", "r4", "r5", "r6"];

function buildInitialSelection(examination) {
  return regions.reduce((accumulator, region) => {
    const firstMatch = examination?.videos.find((video) => video.region === region);
    accumulator[region] = firstMatch?.id || "";
    return accumulator;
  }, {});
}

export function ExaminationWorkspacePage() {
  const { patientId, examinationId } = useParams();
  const navigate = useNavigate();
  const examination = useMemo(() => getExaminationByIds(patientId, examinationId), [patientId, examinationId]);
  const [selectedFrames, setSelectedFrames] = useState(() => buildInitialSelection(examination));
  const [operations, setOperations] = useState(preprocessingOptions);
  const [selectedModel, setSelectedModel] = useState(aiModels[0].id);

  if (!examination) {
    return (
      <section className="panel">
        <h2>Examination not found</h2>
        <Link className="secondary-button" to="/query">
          Back to query
        </Link>
      </section>
    );
  }

  function updateRegion(region, videoId) {
    setSelectedFrames((current) => ({ ...current, [region]: videoId }));
  }

  function toggleOperation(key) {
    setOperations((current) =>
      current.map((operation) =>
        operation.key === key ? { ...operation, enabled: !operation.enabled } : operation
      )
    );
  }

  function updateIntensity(key, value) {
    setOperations((current) =>
      current.map((operation) => (operation.key === key ? { ...operation, intensity: Number(value) } : operation))
    );
  }

  function handleGenerateReport() {
    navigate("/report/REP-2001", {
      state: {
        selectedFrames,
        operations,
        selectedModel,
        examinationId,
        patientId
      }
    });
  }

  const isSelectionComplete = regions.every((region) => selectedFrames[region]);

  return (
    <div className="page-stack">
      <section className="page-hero compact">
        <div>
          <p className="section-kicker">Examination workspace</p>
          <h2>
            {patientId} / {examination.id}
          </h2>
          <p className="page-lead">
            Review videos, choose one image for each region, confirm preprocessing, then select the AI model for
            diagnosis.
          </p>
        </div>
      </section>

      <section className="grid-two">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">Video review</p>
              <h3>Region-based frame selection</h3>
            </div>
          </div>

          <div className="region-list">
            {regions.map((region) => {
              const candidates = examination.videos.filter((video) => video.region === region);

              return (
                <div className="region-card" key={region}>
                  <div>
                    <strong>{region.toUpperCase()}</strong>
                    <p>Select one representative image from available videos.</p>
                  </div>
                  <select value={selectedFrames[region]} onChange={(event) => updateRegion(region, event.target.value)}>
                    <option value="">Select video</option>
                    {candidates.map((video) => (
                      <option key={video.id} value={video.id}>
                        {video.id} • {video.duration}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">Preprocessing settings</p>
              <h3>Configure operations before AI diagnosis</h3>
            </div>
          </div>

          <div className="operation-list">
            {operations.map((operation) => (
              <div className="operation-card" key={operation.key}>
                <label className="operation-toggle">
                  <input
                    checked={operation.enabled}
                    type="checkbox"
                    onChange={() => toggleOperation(operation.key)}
                  />
                  <span>{operation.label}</span>
                </label>
                <p>{operation.description}</p>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={operation.intensity}
                  onChange={(event) => updateIntensity(operation.key, event.target.value)}
                />
                <small>Intensity: {operation.intensity}</small>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid-two">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">AI model</p>
              <h3>Choose diagnosis engine</h3>
            </div>
          </div>

          <div className="model-list">
            {aiModels.map((model) => (
              <label className={`model-card${selectedModel === model.id ? " selected" : ""}`} key={model.id}>
                <input
                  checked={selectedModel === model.id}
                  name="model"
                  type="radio"
                  value={model.id}
                  onChange={(event) => setSelectedModel(event.target.value)}
                />
                <div>
                  <strong>{model.name}</strong>
                  <p>{model.specialty}</p>
                  <small>
                    Turnaround {model.turnaround} • Confidence {model.confidence}
                  </small>
                </div>
              </label>
            ))}
          </div>
        </article>

        <article className="panel accent-panel">
          <p className="panel-kicker">Execution summary</p>
          <h3>Ready to generate diagnostic report</h3>
          <ul className="summary-list">
            <li>Patient: {patientId}</li>
            <li>Examination date: {examination.date}</li>
            <li>Selected regions: {Object.values(selectedFrames).filter(Boolean).length} / 6</li>
            <li>Enabled operations: {operations.filter((operation) => operation.enabled).length}</li>
          </ul>
          <button className="primary-button" disabled={!isSelectionComplete} type="button" onClick={handleGenerateReport}>
            Generate report
          </button>
          {!isSelectionComplete ? <p className="inline-note">All six regions must have a selected image.</p> : null}
        </article>
      </section>
    </div>
  );
}
