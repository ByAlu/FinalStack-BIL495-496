import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { WorkflowSteps } from "../components/WorkflowSteps";

export function DataPreprocessingPage() {
  const { patientId, examinationId } = useParams();

  const [showVideoMenu, setShowVideoMenu] = useState(true);
  const [showSelectedMenu, setShowSelectedMenu] = useState(true);

  return (
    <div className="page-stack">
      <WorkflowSteps currentStep="preprocessing" context={{ patientId, examinationId }} />
      <section
        className={`selection-layout${showVideoMenu ? "" : " hide-left"}${showSelectedMenu ? "" : " hide-right"}`}
      >
        <section className={`selection-sidebar panel${showVideoMenu ? "" : " collapsed"}`}>
          {showSelectedMenu ? (<></>):(<></>)}
        </section>

        <section className="selection-main panel">

        </section>

        <section className={`selected-frames-sidebar panel${showSelectedMenu ? "" : " collapsed"}`}>
          {showSelectedMenu ? (<></>):(<></>)}
        </section>

      </section>
    </div>
  );
}
