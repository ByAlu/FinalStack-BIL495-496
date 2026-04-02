import { useMemo } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { WorkflowSteps } from "../components/WorkflowSteps";
import { getReportById } from "../services/mockApi";

export function ReportingPage() {
  const { reportId } = useParams();
  const location = useLocation();
  const report = useMemo(() => getReportById(reportId), [reportId]);
  const executionState = location.state;
  const workflowContext = {
    patientId: executionState?.patientId,
    examinationId: executionState?.examinationId,
    reportId
  };

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
      <WorkflowSteps currentStep="reporting" context={workflowContext} />
    </div>
  );
}
