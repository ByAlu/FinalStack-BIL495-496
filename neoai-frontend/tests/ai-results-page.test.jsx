import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AiResultsPage } from "../src/pages/AiResultsPage";

vi.mock("../src/services/anallysisApi", () => ({
  getAiAnalysisResult: vi.fn()
}));

const frameThumbnail =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

function buildRouteState() {
  return {
    patientId: "PT-1001",
    examinationId: "Exam_1001",
    reportId: "REP-2001",
    selectedFrames: {
      r1: {
        region: "r1",
        videoName: "VID-000101",
        thumbnail: frameThumbnail,
        frameIndex: 3
      }
    },
    selectedModuleIds: ["b-line", "rds-score"],
    analysisResult: {
      analysisUuid: "analysis-123",
      patientId: "PT-1001",
      examinationId: "Exam_1001",
      status: "COMPLETED",
      resultData: {
        regions: {
          R1: {
            region: "R1",
            frame_index: 3,
            b_line_module: {
              count: 2,
              bounding_boxes: [
                { x: 50, y: 60, width: 100, height: 120, confidence: 0.87 }
              ]
            },
            rds_score_module: {
              score: 1
            }
          }
        }
      },
      moduleRuns: [
        { moduleId: "b-line" },
        { moduleId: "rds-score" }
      ]
    }
  };
}

function renderAiResultsPage(routeState = buildRouteState()) {
  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: "/results/analysis-123",
          state: routeState
        }
      ]}
    >
      <Routes>
        <Route path="/results/:analysisId" element={<AiResultsPage />} />
        <Route path="/report/:reportId" element={<div>Report Screen</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("AiResultsPage", () => {
  it("renders backend-provided AI findings for the selected region", () => {
    renderAiResultsPage();

    expect(screen.getByText(/b-line: 2 detections/i)).toBeInTheDocument();
    expect(screen.getByText(/rds-score: 1/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /go to reporting/i })).toBeInTheDocument();
  });

  it("navigates to the reporting page with the configured report route", async () => {
    renderAiResultsPage();

    await userEvent.click(screen.getByRole("button", { name: /go to reporting/i }));

    expect(screen.getByText("Report Screen")).toBeInTheDocument();
  });
});
