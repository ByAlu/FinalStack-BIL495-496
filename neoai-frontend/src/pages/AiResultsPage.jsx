import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { getReportById } from "../services/mockApi";

export function AiResultsPage() {
  const { reportId } = useParams();
  const report = useMemo(() => getReportById(reportId), [reportId]);

  if (!report) {
    return <section className="panel"><h2>Results not found</h2></section>;
  }

  return <div className="page-stack" />;
}
