import { useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";
import { WorkflowSteps } from "../components/WorkflowSteps";
import { getReportById } from "../services/mockApi";

export function AiResultsPage() {
  const { reportId } = useParams();
  const location = useLocation();
  const report = useMemo(() => getReportById(reportId), [reportId]);
  const workflowContext = {
    patientId: location.state?.patientId,
    examinationId: location.state?.examinationId,
    reportId
  };

  if (!report) {
    return <section className="panel"><h2>Results not found</h2></section>;
  }

  return (
    <div className="page-stack">
      <WorkflowSteps currentStep="results" context={workflowContext} />
    </div>
  );
}
