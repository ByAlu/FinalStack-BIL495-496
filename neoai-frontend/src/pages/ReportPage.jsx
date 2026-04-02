import { useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { getReportById } from "../services/mockApi";

export function ReportPage() {
  const { reportId } = useParams();
  const location = useLocation();
  const report = useMemo(() => getReportById(reportId), [reportId]);
  const [commentary, setCommentary] = useState("");
  const executionState = location.state;

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
    <div className="page-stack">
      <section className="page-hero compact">
        <div>
          <p className="section-kicker">Report panel</p>
          <h2>{report.title}</h2>
          <p className="page-lead">
            Doctors can review the generated result, add commentary, and export the report as PDF or DOCX. The backend
            should also store preprocessing details, report metadata, and audit records.
          </p>
        </div>
      </section>

      <section className="grid-two">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">Result</p>
              <h3>{report.summary}</h3>
            </div>
            <span className="status-badge positive">Confidence {report.confidence}</span>
          </div>

          <ul className="summary-list">
            {report.findings.map((finding) => (
              <li key={finding}>{finding}</li>
            ))}
          </ul>

          {executionState ? (
            <div className="context-block">
              <strong>Submitted execution</strong>
              <p>Model: {executionState.selectedModel}</p>
              <p>Selected regions: {Object.values(executionState.selectedFrames).filter(Boolean).length} / 6</p>
            </div>
          ) : null}
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">Doctor commentary</p>
              <h3>Add review notes before export</h3>
            </div>
          </div>

          <textarea
            className="commentary-box"
            rows="10"
            placeholder="Add your commentary to accompany the AI result."
            value={commentary}
            onChange={(event) => setCommentary(event.target.value)}
          />

          <div className="button-row">
            <button className="primary-button" type="button">
              Export PDF
            </button>
            <button className="secondary-button" type="button">
              Export DOCX
            </button>
            <Link className="ghost-button inline" to="/query">
              Back to query
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}
