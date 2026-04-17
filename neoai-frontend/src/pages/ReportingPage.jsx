import { useMemo, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { Link, useLocation, useParams } from "react-router-dom";
import { ReportPdfDocument } from "../components/ReportPdfDocument";
import { aiRegionResults } from "../data/mockData";
import { useAuth } from "../context/AuthContext";
import { findPatientById, getExaminationByIds, getReportById } from "../services/mockApi";

const regions = ["r1", "r2", "r3", "r4", "r5", "r6"];
const moduleLabelMap = {
  "rds-score": "RDS-SCORE",
  "b-line": "B-LINE"
};
const SECTION_FOUR_CLASSIFICATION_ROWS = [
  { diagnosis: "Respiratory Distress Syndrome (RDS)", probability: "%74" },
  { diagnosis: "Transient Tachypnea of the Newborn (TTN)", probability: "%49" },
  { diagnosis: "Neonatal pneumonia", probability: "%37" },
  { diagnosis: "Normal lung pattern", probability: "%8" },
  { diagnosis: "Other", probability: "%9" }
];
const SECTION_FIVE_CONSTANT_PARAGRAPHS = [
  "The selected AI modules provide structured decision support for the reviewed representative frames.",
  "Findings should be interpreted together with bedside examination, respiratory support requirement, and overall NICU clinical status.",
  "Final diagnosis and treatment planning remain the responsibility of the reporting physician."
];
const clinicalIndicationOptions = [
  { id: "respiratory-distress", label: "Respiratory distress" },
  { id: "suspected-rds", label: "Suspected RDS" },
  { id: "ttn-differential", label: "TTN differential" },
  { id: "suspected-pneumonia", label: "Suspected pneumonia" },
  { id: "follow-up", label: "Follow-up / serial evaluation" }
];

function getSelectionStateCacheKey(patientId, examinationId) {
  return `neoai-selection:${patientId}:${examinationId}`;
}

function readSelectedFramesFromSession(patientId, examinationId) {
  if (!patientId || !examinationId) {
    return {};
  }

  try {
    const rawValue = window.sessionStorage.getItem(getSelectionStateCacheKey(patientId, examinationId));

    if (!rawValue) {
      return {};
    }

    const parsedValue = JSON.parse(rawValue);
    return parsedValue?.selectedFrames || {};
  } catch {
    return {};
  }
}

function getCommittedAiModuleStateCacheKey(patientId, examinationId) {
  return `neoai-ai-module-committed:${patientId}:${examinationId}`;
}

function readSelectedModulesFromSession(patientId, examinationId) {
  if (!patientId || !examinationId) {
    return [];
  }

  try {
    const rawValue = window.sessionStorage.getItem(getCommittedAiModuleStateCacheKey(patientId, examinationId));

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue?.selectedModuleIds) ? parsedValue.selectedModuleIds : [];
  } catch {
    return [];
  }
}

function getFrameImageSource(frameValue) {
  if (!frameValue) {
    return "";
  }

  if (typeof frameValue === "string") {
    return frameValue;
  }

  return frameValue.thumbnail || "";
}

function getOverallSeverity(totalScore) {
  if (totalScore <= 3) {
    return {
      label: "Minimal Loss of Aeration",
      summary: "Only limited regional involvement is visible on the selected clips."
    };
  }

  if (totalScore <= 8) {
    return {
      label: "Mild to Moderate Disease Burden",
      summary: "Regional abnormalities are present but not yet diffuse across all selected fields."
    };
  }

  if (totalScore <= 13) {
    return {
      label: "Moderate Diffuse Disease Burden",
      summary: "Multi-region aeration loss is present and should be correlated with bedside respiratory status."
    };
  }

  return {
    label: "Severe Diffuse Disease Burden",
    summary: "The regional score distribution suggests advanced diffuse lung involvement."
  };
}

function normalizeAnalysisRegionResults(resultData) {
  const regionEntries = Object.entries(resultData?.regions || {});

  return regionEntries.reduce((accumulator, [regionKey, regionValue]) => {
    const normalizedRegionKey = String(regionKey).toLowerCase();

    accumulator[normalizedRegionKey] = {
      region: regionValue?.region || String(regionKey).toUpperCase(),
      b_line_module: regionValue?.b_line_module || null,
      rds_score_module: regionValue?.rds_score_module || null
    };

    return accumulator;
  }, {});
}

export function ReportingPage() {
  const { reportId } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const report = useMemo(() => getReportById(reportId), [reportId]);
  const patientId = location.state?.patientId || report?.patientId;
  const examinationId = location.state?.examinationId || report?.examinationId;
  const patient = useMemo(() => findPatientById(patientId), [patientId]);
  const examination = useMemo(() => getExaminationByIds(patientId, examinationId), [examinationId, patientId]);
  const [finalDiagnosis, setFinalDiagnosis] = useState("");
  const [treatmentRecommendation, setTreatmentRecommendation] = useState("");
  const [followUpRecommendation, setFollowUpRecommendation] = useState("");
  const [selectedClinicalIndications, setSelectedClinicalIndications] = useState([
    "respiratory-distress",
    "suspected-rds"
  ]);
  const [otherClinicalIndication, setOtherClinicalIndication] = useState("");
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportFormat, setExportFormat] = useState("pdf");
  const sessionSelectedFrameMap = useMemo(
    () => readSelectedFramesFromSession(patientId, examinationId),
    [examinationId, patientId]
  );
  const sessionSelectedModuleIds = useMemo(
    () => readSelectedModulesFromSession(patientId, examinationId),
    [examinationId, patientId]
  );
  const selectedFrameMap = location.state?.processedFrames || location.state?.selectedFrames || sessionSelectedFrameMap;
  const selectedModuleIds = useMemo(() => {
    if (Array.isArray(location.state?.selectedModuleIds) && location.state.selectedModuleIds.length > 0) {
      return location.state.selectedModuleIds;
    }

    if (location.state?.selectedModuleId) {
      return [location.state.selectedModuleId];
    }

    if (sessionSelectedModuleIds.length > 0) {
      return sessionSelectedModuleIds;
    }

    return ["rds-score", "b-line"];
  }, [location.state, sessionSelectedModuleIds]);

  const selectedRegions = useMemo(() => {
    const stateRegions = regions.filter((region) => selectedFrameMap[region]);

    if (stateRegions.length > 0) {
      return stateRegions;
    }

    return examination?.videos?.map((video) => video.region) || [];
  }, [examination?.videos, selectedFrameMap]);
  const analysisRegionResults = useMemo(() => {
    const normalizedResults = normalizeAnalysisRegionResults(location.state?.analysisResult?.resultData);
    return Object.keys(normalizedResults).length > 0 ? normalizedResults : aiRegionResults;
  }, [location.state?.analysisResult]);

  const regionReportRows = useMemo(
    () =>
      selectedRegions.map((region) => {
        const regionResult = analysisRegionResults[region];
        const matchingVideo = examination?.videos?.find((video) => video.region === region);

        return {
          region,
          image: getFrameImageSource(selectedFrameMap[region]) || matchingVideo?.thumbnail || "",
          videoName: matchingVideo?.name || "-",
          comment: matchingVideo?.comment || "-",
          imageQuality: regionResult?.image_quality || "unknown",
          bLineCount: regionResult?.b_line_module?.count ?? 0,
          regionScore: regionResult?.rds_score_module?.score ?? 0
        };
      }),
    [analysisRegionResults, examination?.videos, selectedFrameMap, selectedRegions]
  );

  const totalScore = regionReportRows.reduce((sum, row) => sum + row.regionScore, 0);
  const totalBLineCount = regionReportRows.reduce((sum, row) => sum + row.bLineCount, 0);
  const isRdsSelected = selectedModuleIds.includes("rds-score");
  const isBLineSelected = selectedModuleIds.includes("b-line");
  const overallSeverity = getOverallSeverity(totalScore);
  const highlightedRegions = regionReportRows
    .filter((row) => row.regionScore >= 2 || row.bLineCount >= 3)
    .map((row) => row.region.toUpperCase());
  const signedBy = user?.fullName || report?.reviewedBy || "Dr. Elif Kaya";
  const selectedModuleLabels = selectedModuleIds
    .map((moduleId) => moduleLabelMap[moduleId] || moduleId.toUpperCase())
    .join(", ");
  const selectedAiSummaryRows = [
    isBLineSelected
      ? {
          label: "B-LINE Summary",
          value: `Total detected B-lines across selected frames: ${totalBLineCount}`
        }
      : null,
    isRdsSelected
      ? {
          label: "RDS-SCORE Summary",
          value: `Total score across selected regions: ${totalScore} (${overallSeverity.label})`
        }
      : null,
    highlightedRegions.length > 0
      ? {
          label: "Highlighted Regions",
          value: highlightedRegions.join(", ")
        }
      : null
  ].filter(Boolean);
  const patientFields = useMemo(
    () => [
      { label: "Patient ID:", value: report?.patientId || "-" },
      { label: "Full Name:", value: patient?.name || "-" },
      { label: "Date of Birth:", value: report?.dateOfBirth || "-" },
      { label: "Gestational Age:", value: report?.gestationalAge || "-" },
      { label: "Birth Weight:", value: report?.birthWeight || "-" },
      { label: "Postnatal Age:", value: report?.postnatalAge || "-" },
      { label: "Clinic (NICU):", value: report?.clinic || "-" },
      { label: "Bed Number:", value: report?.bedNumber || "-" },
      { label: "Scan Date / Time:", value: report?.reportDate || "-" },
      { label: "AI Software Version (NeoAI LUS Assistant):", value: report?.softwareVersion || "-" }
    ],
    [patient?.name, report]
  );
  const selectedIndicationLabels = clinicalIndicationOptions
    .map((option) => ({
      label: option.label,
      checked: selectedClinicalIndications.includes(option.id)
    }));
  const pdfReportData = useMemo(
    () => ({
      title: report?.title || "NeoAi LUS Assistant",
      patientFields,
      selectedIndications: selectedIndicationLabels,
      otherIndication: {
        checked: otherClinicalIndication.trim().length > 0,
        value: otherClinicalIndication
      },
      selectedModuleIds,
      regionRows: regionReportRows,
      classificationRows: SECTION_FOUR_CLASSIFICATION_ROWS,
      selectedAiSummaryRows,
      sectionFiveParagraphs: SECTION_FIVE_CONSTANT_PARAGRAPHS,
      totalScore,
      overallSeverityLabel: overallSeverity.label,
      highlightedRegions,
      finalDiagnosis,
      treatmentRecommendation,
      followUpRecommendation,
      signedBy
    }),
    [
      finalDiagnosis,
      followUpRecommendation,
      highlightedRegions,
      overallSeverity.label,
      otherClinicalIndication,
      patientFields,
      selectedAiSummaryRows,
      selectedModuleIds,
      regionReportRows,
      report?.title,
      signedBy,
      selectedIndicationLabels,
      totalBLineCount,
      totalScore,
      treatmentRecommendation
    ]
  );

  function handleClinicalIndicationToggle(optionId) {
    setSelectedClinicalIndications((current) =>
      current.includes(optionId) ? current.filter((item) => item !== optionId) : [...current, optionId]
    );
  }

  async function handleExportPdf() {
    setIsExportingPdf(true);

    try {
      const blob = await pdf(<ReportPdfDocument reportData={pdfReportData} />).toBlob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeTitle = (report?.title || "NeoAi-LUS-Assistant").replace(/[^a-z0-9]+/gi, "-");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

      link.href = downloadUrl;
      link.download = `${safeTitle}-${reportId}-${timestamp}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } finally {
      setIsExportingPdf(false);
    }
  }

  if (!report) {
    return (
      <section className="panel">
        <h2>Report not found</h2>
        <Link className="secondary-button" to="/query">
          Back to query
        </Link>
      </section>
    );
  }

  return (
    <div className="report-page">
      <div className="report-shell">
        <article className="report-document">
          <header className="report-hero">
            <div>
              <h1 className="report-title">{report.title}</h1>
            </div>
          </header>

          <section className="report-section-grid">
            <section className="report-card">
              <h2 className="report-card-title">1. Patient Information</h2>
              <div className="report-field-list">
                <div className="report-field-row">
                  <span className="report-field-label">Patient ID:</span>
                  <span className="report-field-value">{report.patientId}</span>
                </div>
                <div className="report-field-row">
                  <span className="report-field-label">Full Name:</span>
                  <span className="report-field-value">{patient?.name || "-"}</span>
                </div>
                <div className="report-field-row">
                  <span className="report-field-label">Date of Birth:</span>
                  <span className="report-field-value">{report.dateOfBirth || "-"}</span>
                </div>
                <div className="report-field-row">
                  <span className="report-field-label">Gestational Age:</span>
                  <span className="report-field-value">{report.gestationalAge || "-"}</span>
                </div>
                <div className="report-field-row">
                  <span className="report-field-label">Birth Weight:</span>
                  <span className="report-field-value">{report.birthWeight || "-"}</span>
                </div>
                <div className="report-field-row">
                  <span className="report-field-label">Postnatal Age:</span>
                  <span className="report-field-value">{report.postnatalAge || "-"}</span>
                </div>
                <div className="report-field-row">
                  <span className="report-field-label">Clinic (NICU):</span>
                  <span className="report-field-value">{report.clinic || "-"}</span>
                </div>
                <div className="report-field-row">
                  <span className="report-field-label">Bed Number:</span>
                  <span className="report-field-value">{report.bedNumber || "-"}</span>
                </div>
                <div className="report-field-row">
                  <span className="report-field-label">Scan Date / Time:</span>
                  <span className="report-field-value">{report.reportDate}</span>
                </div>
                <div className="report-field-row">
                  <span className="report-field-label">AI Software Version (NeoAI LUS Assistant):</span>
                  <span className="report-field-value">{report.softwareVersion || "-"}</span>
                </div>
              </div>
            </section>

            <section className="report-card">
              <h2 className="report-card-title">2. Clinical Indication</h2>
              <div className="report-indication-line">
                {clinicalIndicationOptions.map((option) => (
                  <label className="report-check-option" key={option.id}>
                    <input
                      checked={selectedClinicalIndications.includes(option.id)}
                      onChange={() => handleClinicalIndicationToggle(option.id)}
                      type="checkbox"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
                <div className="report-check-option report-other-option">
                  <label className="report-check-toggle">
                    <input
                      checked={otherClinicalIndication.trim().length > 0}
                      onChange={(event) => {
                        if (!event.target.checked) {
                          setOtherClinicalIndication("");
                        }
                      }}
                      type="checkbox"
                    />
                    <span>Other:</span>
                  </label>
                  <input
                    className="report-other-input"
                    onChange={(event) => setOtherClinicalIndication(event.target.value)}
                    placeholder="Write here"
                    type="text"
                    value={otherClinicalIndication}
                  />
                </div>
              </div>
            </section>
          </section>

          <section className="report-section-grid">
            <section className="report-card">
              <h2 className="report-card-title">3. Selected Module Results by Frame</h2>
              <div className="report-region-grid report-region-grid-inline">
                {regionReportRows.map((row) => (
                  <article className="report-region-card" key={row.region}>
                    <div className="report-region-frame">
                      <img alt={`${row.region.toUpperCase()} selected frame`} src={row.image} />
                      <span className="report-region-overlay-label">{row.region.toUpperCase()}</span>
                    </div>
                    <div className="report-region-results">
                      {isBLineSelected ? (
                        <div className="report-module-block">
                          <h3 className="report-module-title">{moduleLabelMap["b-line"]}</h3>
                          <div className="report-table-wrap">
                            <table className="report-table report-module-table">
                              <tbody>
                                <tr>
                                  <th>Metric</th>
                                  <th>Value</th>
                                </tr>
                                <tr>
                                  <td>Count</td>
                                  <td>{row.bLineCount}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : null}

                      {isRdsSelected ? (
                        <div className="report-module-block">
                          <h3 className="report-module-title">{moduleLabelMap["rds-score"]}</h3>
                          <div className="report-table-wrap">
                            <table className="report-table report-module-table">
                              <tbody>
                                <tr>
                                  <th>Metric</th>
                                  <th>Value</th>
                                </tr>
                                <tr>
                                  <td>Score</td>
                                  <td>{row.regionScore}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </section>

          {isRdsSelected ? (
          <section className="report-table-card">
            <div className="report-card" style={{ background: "transparent", border: "none", paddingBottom: 0 }}>
              <h2 className="report-card-title">4. AI Disease Classification</h2>
            </div>
            <div className="report-table-wrap">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Diagnosis</th>
                    <th>Probability</th>
                  </tr>
                </thead>
                <tbody>
                  {SECTION_FOUR_CLASSIFICATION_ROWS.map((item) => (
                    <tr key={item.diagnosis}>
                      <td>{item.diagnosis}</td>
                      <td>{item.probability}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          ) : null}

          <section className="report-section-grid">
            <section className="report-card">
              <h2 className="report-card-title">{isRdsSelected ? "5. AI Clinical Report" : "4. AI Clinical Report"}</h2>
              <p className="report-section-copy">Automatic clinical assessment generated by NeoAI LUS Assistant:</p>
              <div className="report-field-list report-ai-summary-list">
                <div className="report-field-row">
                  <span className="report-field-label">Selected AI Modules:</span>
                  <span className="report-field-value">{selectedModuleLabels || "-"}</span>
                </div>
                {selectedAiSummaryRows.map((item) => (
                  <div className="report-field-row" key={item.label}>
                    <span className="report-field-label">{item.label}:</span>
                    <span className="report-field-value">{item.value}</span>
                  </div>
                ))}
              </div>
              <div className="report-ai-report-copy">
                {SECTION_FIVE_CONSTANT_PARAGRAPHS.map((paragraph) => (
                  <p className="report-section-copy" key={paragraph}>
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          </section>

          <section className="report-footer-grid">
            <section className="report-card">
              <h2 className="report-card-title">{isRdsSelected ? "6. Clinical Assessment (Physician)" : "5. Clinical Assessment (Physician)"}</h2>
              <div className="report-assessment-block">
                <label className="report-assessment-row">
                  <span className="report-assessment-label">Final Diagnosis</span>
                  <textarea
                    className="report-assessment-input report-assessment-textarea"
                    onChange={(event) => setFinalDiagnosis(event.target.value)}
                    placeholder="Write final diagnosis"
                    rows="3"
                    value={finalDiagnosis}
                  />
                </label>
                <label className="report-assessment-row">
                  <span className="report-assessment-label">Treatment / Recommendation</span>
                  <textarea
                    className="report-assessment-input report-assessment-textarea"
                    onChange={(event) => setTreatmentRecommendation(event.target.value)}
                    placeholder="Write treatment or recommendation"
                    rows="3"
                    value={treatmentRecommendation}
                  />
                </label>
                <label className="report-assessment-row">
                  <span className="report-assessment-label">Follow-up Recommendation</span>
                  <textarea
                    className="report-assessment-input report-assessment-textarea"
                    onChange={(event) => setFollowUpRecommendation(event.target.value)}
                    placeholder="Write follow-up recommendation"
                    rows="3"
                    value={followUpRecommendation}
                  />
                </label>
              </div>
            </section>

            <section className="report-card report-approval">
              <h2 className="report-card-title">{isRdsSelected ? "7. Approval" : "6. Approval"}</h2>
              <div className="report-table-wrap">
                <table className="report-table report-approval-table">
                  <thead>
                    <tr>
                      <th>Role</th>
                      <th>Name</th>
                      <th>Signature</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Reporting Physician</td>
                      <td>{signedBy}</td>
                      <td className="report-signature-cell">________________</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="report-approval-note">
                <strong>Note:</strong> This report contains AI analysis generated by NeoAI LUS Assistant. Clinical decisions should be
                made based on physician evaluation.
              </p>
            </section>
          </section>

          <div className="report-actions report-actions-bottom">
            <div className="report-export-control">
              <select
                className="report-export-select"
                onChange={(event) => setExportFormat(event.target.value)}
                value={exportFormat}
              >
                <option value="pdf">PDF</option>
                <option value="docx">DOCX</option>
              </select>
              <button
                className="report-button primary"
                disabled={isExportingPdf || exportFormat === "docx"}
                type="button"
                onClick={exportFormat === "pdf" ? handleExportPdf : undefined}
              >
                {exportFormat === "pdf"
                  ? isExportingPdf
                    ? "Preparing PDF..."
                    : "Export"
                  : "DOCX Soon"}
              </button>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
