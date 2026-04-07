import { useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { AiModuleOptionsSidebar } from "../components/AiModuleOptionsSidebar";
import { SelectedFramesSidebar } from "../components/SelectedFramesSidebar";
import { ViewerStage } from "../components/ViewerStage";
import { getExaminationByIds } from "../services/mockApi";
import { resetWorkflowAfterStep, setActiveWorkflowContext } from "../utils/workflowState";

const regions = ["r1", "r2", "r3", "r4", "r5", "r6"];
const DEFAULT_MODULE_IDS = ["rds-score"];
const DEFAULT_REPORT_ID = "REP-2001";

export function AiModuleSelectionPage() {
  const { patientId, examinationId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const viewerStageRef = useRef(null);
  const previewImageRef = useRef(null);
  const examination = useMemo(() => getExaminationByIds(patientId, examinationId), [patientId, examinationId]);
  const selectedFrameMap = location.state?.processedFrames || location.state?.selectedFrames || {};
  const selectedRegions = useMemo(() => regions.filter((region) => selectedFrameMap[region]), [selectedFrameMap]);
  const [showOptionsMenu, setShowOptionsMenu] = useState(true);
  const [showSelectedMenu, setShowSelectedMenu] = useState(true);
  const [selectedModuleIds, setSelectedModuleIds] = useState(() => {
    if (Array.isArray(location.state?.selectedModuleIds) && location.state.selectedModuleIds.length > 0) {
      return location.state.selectedModuleIds;
    }

    if (location.state?.selectedModuleId) {
      return [location.state.selectedModuleId];
    }

    return DEFAULT_MODULE_IDS;
  });
  const [activeRegion, setActiveRegion] = useState(location.state?.activePreprocessingRegion || selectedRegions[0] || "r1");

  if (!examination) {
    return (
      <div className="page-stack">
        <section className="panel">
          <h2>Examination not found</h2>
          <Link className="secondary-button" to="/query">
            Back to query
          </Link>
        </section>
      </div>
    );
  }

  if (selectedRegions.length === 0) {
    return (
      <div className="page-stack">
        <section className="panel">
          <h2>No processed frames found</h2>
          <p>Complete preprocessing before opening AI module selection.</p>
          <Link className="secondary-button" to={`/preprocessing/${patientId}/${examinationId}`}>
            Back to preprocessing
          </Link>
        </section>
      </div>
    );
  }

  const activeSelectedFrame = activeRegion ? selectedFrameMap[activeRegion] || null : null;
  const selectedModuleLabel = selectedModuleIds.length > 0
    ? selectedModuleIds
        .map((moduleId) => (moduleId === "b-line" ? "B-LINE" : "RDS-SCORE"))
        .join(", ")
    : "No module selected";

  function handleToggleModule(moduleId) {
    setSelectedModuleIds((current) =>
      current.includes(moduleId) ? current.filter((item) => item !== moduleId) : [...current, moduleId]
    );
  }

  function handleContinue() {
    setActiveWorkflowContext({ patientId, examinationId, reportId: DEFAULT_REPORT_ID });
    resetWorkflowAfterStep(patientId, examinationId, 4);
    navigate(`/results/${DEFAULT_REPORT_ID}`, {
      state: {
        ...location.state,
        patientId,
        examinationId,
        reportId: DEFAULT_REPORT_ID,
        selectedModuleId: selectedModuleIds[0] || null,
        selectedModuleIds
      }
    });
  }

  return (
    <div className="page-stack selection-page">
      <section className={`selection-layout${showOptionsMenu ? "" : " hide-left"}${showSelectedMenu ? "" : " hide-right"}`}>
        <AiModuleOptionsSidebar
          selectedModuleIds={selectedModuleIds}
          showMenu={showOptionsMenu}
          onClose={() => setShowOptionsMenu(false)}
          onOpen={() => setShowOptionsMenu(true)}
          onToggleModule={handleToggleModule}
        />

        <section className="selection-main panel">
          <div className="selection-viewer-header ai-module-viewer-header">
            <div className="viewer-header-actions">
              <div className="viewer-header-side viewer-header-side-left">
                <Link className="secondary-button" to={`/preprocessing/${patientId}/${examinationId}`} state={location.state}>
                  Back
                </Link>
              </div>

              <div className="viewer-header-center">
                <div className="viewer-control-cluster preprocessing-center-chip ai-module-center-chip">
                  {selectedModuleLabel} selected
                </div>
              </div>

              <div className="viewer-header-side viewer-header-side-right">
                <div className="viewer-primary-actions">
                  <button className="primary-button" type="button" onClick={handleContinue} disabled={selectedModuleIds.length === 0}>
                    Continue
                  </button>
                </div>
              </div>
            </div>
          </div>

          <ViewerStage
            activeProgressPercent={0}
            activeRegion={activeRegion}
            activeSelectedFrame={activeSelectedFrame}
            activeVideo={null}
            activeVideoFrames={[]}
            className="viewer-stage"
            currentFrame={0}
            disabledActionMessage=""
            handleRailMouseDown={() => {}}
            handleRailPointerMove={() => {}}
            handleViewerPointerDown={() => {}}
            handleViewerPointerMove={() => {}}
            handleViewerWheel={() => {}}
            isActiveVideoReady={false}
            isMagnifierActive={false}
            magnifierConfig={{ size: 200, zoomFactor: 2 }}
            magnifierState={{
              x: 0,
              y: 0,
              backgroundWidth: 0,
              backgroundHeight: 0,
              backgroundOffsetX: 0,
              backgroundOffsetY: 0
            }}
            onStopViewerInteraction={() => {}}
            panOffset={{ x: 0, y: 0 }}
            previewImageRef={previewImageRef}
            scrubberRailRef={null}
            scrubberThumbTop={0}
            selectedFrameRegion={activeRegion}
            showCacheProgress={false}
            stopRailDrag={() => {}}
            viewerMode="frame"
            viewRotation={0}
            viewerStageRef={viewerStageRef}
            framePlaceholderMessage="Preparing selected frame..."
            viewerOverlayMessage=""
            zoomOrigin={{ x: 50, y: 50 }}
            zoomScale={1}
          />
        </section>

        <SelectedFramesSidebar
          onClose={() => setShowSelectedMenu(false)}
          onOpen={() => setShowSelectedMenu(true)}
          onSelectFrame={setActiveRegion}
          regions={regions}
          selectedFrameRegion={activeRegion}
          selectedFrames={selectedFrameMap}
          showSelectedMenu={showSelectedMenu}
          viewerMode="frame"
        />
      </section>
    </div>
  );
}
