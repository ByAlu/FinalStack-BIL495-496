import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  extendMaxVisitedStep,
  getActiveWorkflowContext,
  getMaxVisitedStep,
  getWorkflowStorageKey,
  setActiveWorkflowContext
} from "../utils/workflowState";

const stepOrder = [
  { key: "query", label: "Data Query" },
  { key: "selection", label: "Data Selection" },
  { key: "preprocessing", label: "Data Preprocessing" },
  { key: "ai-module", label: "AI Module Selection" },
  { key: "results", label: "AI Results" },
  { key: "reporting", label: "Reporting" }
];

function buildStepHref(stepKey, context) {
  const patientId = context?.patientId;
  const examinationId = context?.examinationId;
  const reportId = context?.reportId || "REP-2001";

  switch (stepKey) {
    case "query":
      return "/query";
    case "selection":
      return patientId && examinationId ? `/selection/${patientId}/${examinationId}` : "/query";
    case "preprocessing":
      return patientId && examinationId ? `/preprocessing/${patientId}/${examinationId}` : "/query";
    case "ai-module":
      return patientId && examinationId ? `/ai-module/${patientId}/${examinationId}` : "/query";
    case "results":
      return `/results/${reportId}`;
    case "reporting":
      return `/report/${reportId}`;
    default:
      return "/query";
  }
}

export function WorkflowSteps({ currentStep, context }) {
  const location = useLocation();
  const currentIndex = stepOrder.findIndex((step) => step.key === currentStep);
  const [storedContext, setStoredContext] = useState(null);
  const effectiveContext = context ?? storedContext;

  useEffect(() => {
    setStoredContext(getActiveWorkflowContext());
  }, []);

  useEffect(() => {
    if (!context?.patientId || !context?.examinationId) {
      return;
    }

    const nextContext = {
      patientId: context.patientId,
      examinationId: context.examinationId,
      reportId: context.reportId || storedContext?.reportId || "REP-2001"
    };

    setStoredContext(nextContext);
    setActiveWorkflowContext(nextContext);
  }, [context, storedContext?.reportId]);

  const workflowKey = useMemo(() => {
    return getWorkflowStorageKey(effectiveContext?.patientId, effectiveContext?.examinationId);
  }, [effectiveContext?.patientId, effectiveContext?.examinationId]);
  const [maxVisitedIndex, setMaxVisitedIndex] = useState(currentIndex);

  useEffect(() => {
    const nextIndex = effectiveContext?.patientId && effectiveContext?.examinationId
      ? extendMaxVisitedStep(effectiveContext.patientId, effectiveContext.examinationId, currentIndex)
      : Math.max(getMaxVisitedStep("no-patient", "no-exam"), currentIndex);
    setMaxVisitedIndex(nextIndex);
  }, [currentIndex, effectiveContext?.examinationId, effectiveContext?.patientId, workflowKey]);

  return (
    <nav className="workflow-nav" aria-label="Workflow steps">
      {stepOrder.map((step, index) => {
        const isCurrent = step.key === currentStep;
        const isAllowed = index <= maxVisitedIndex;
        const href = buildStepHref(step.key, effectiveContext);

        return isAllowed ? (
          <Link
            key={step.key}
            className={`workflow-step${isCurrent ? " current" : ""}`}
            to={href}
            state={location.state}
          >
            {step.label}
          </Link>
        ) : (
          <span key={step.key} className="workflow-step disabled">
            {step.label}
          </span>
        );
      })}
    </nav>
  );
}
