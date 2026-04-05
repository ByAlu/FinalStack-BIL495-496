import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { getReportById } from "../services/mockApi";

export function ReportingPage() {
  const { reportId } = useParams();
  const report = useMemo(() => getReportById(reportId), [reportId]);

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

  return <div className="page-stack" />;
}
