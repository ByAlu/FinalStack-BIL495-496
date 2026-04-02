import { useParams } from "react-router-dom";
import { WorkflowSteps } from "../components/WorkflowSteps";

export function DataPreprocessingPage() {
  const { patientId, examinationId } = useParams();

  return (
    <div className="page-stack">
      <WorkflowSteps currentStep="preprocessing" context={{ patientId, examinationId }} />
    </div>
  );
}
