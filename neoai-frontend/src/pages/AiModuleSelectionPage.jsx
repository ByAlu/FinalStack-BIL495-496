import { useParams } from "react-router-dom";
import { WorkflowSteps } from "../components/WorkflowSteps";

export function AiModuleSelectionPage() {
  const { patientId, examinationId } = useParams();

  return (
    <div className="page-stack">
      <WorkflowSteps currentStep="ai-module" context={{ patientId, examinationId }} />
    </div>
  );
}
