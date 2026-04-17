import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AiModuleSelectionPage } from "../src/pages/AiModuleSelectionPage";

vi.mock("../src/services/examinationApi", () => ({
  getExaminationByIds: vi.fn()
}));

const mockGetAvailableAiModules = vi.fn();

vi.mock("../src/services/anallysisApi", () => ({
  getAvailableAiModules: (...args) => mockGetAvailableAiModules(...args)
}));

vi.mock("../src/services/actionLogger", () => ({
  ActionTypes: {
    AI_PROCESSING: "AI_PROCESSING"
  },
  logSimpleAction: vi.fn(),
  completeAction: vi.fn()
}));

function buildRouteState(overrides = {}) {
  return {
    examination: {
      id: "Exam_1001",
      videos: [
        { name: "VID-000101", region: "r1", thumbnail: "frame-r1" },
        { name: "VID-000102", region: "r2", thumbnail: "frame-r2" }
      ]
    },
    processedFrames: {
      r1: {
        region: "r1",
        videoName: "VID-000101",
        thumbnail: "frame-r1",
        frameIndex: 0
      },
      r2: {
        region: "r2",
        videoName: "VID-000102",
        thumbnail: "frame-r2",
        frameIndex: 0
      }
    },
    activePreprocessingRegion: "r1",
    ...overrides
  };
}

function renderAiModuleSelectionPage(routeState = buildRouteState()) {
  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: "/ai-module/PT-1001/Exam_1001",
          state: routeState
        }
      ]}
    >
      <Routes>
        <Route path="/ai-module/:patientId/:examinationId" element={<AiModuleSelectionPage />} />
        <Route path="/results/:reportId" element={<div>Results Screen</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("AiModuleSelectionPage", () => {
  beforeEach(() => {
    mockGetAvailableAiModules.mockReset();
    mockGetAvailableAiModules.mockResolvedValue([
      {
        moduleCode: "B_LINE_DETECTION",
        moduleId: "b-line",
        displayName: "B-line Detection",
        description: "Detects B-lines across ultrasound lung regions."
      },
      {
        moduleCode: "RDS_SCORING",
        moduleId: "rds-score",
        displayName: "RDS Scoring",
        description: "Scores respiratory distress syndrome findings for ultrasound examinations."
      }
    ]);
  });

  it("allows continuing after selecting an available AI module", async () => {
    renderAiModuleSelectionPage();

    const continueButton = await screen.findByRole("button", { name: /continue/i });
    expect(continueButton).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: /b-line detection/i }));

    expect(continueButton).toBeEnabled();
    await userEvent.click(continueButton);

    expect(screen.getByText("Results Screen")).toBeInTheDocument();
  });

  it("blocks progression when no AI module is selected", async () => {
    renderAiModuleSelectionPage();

    const continueButton = await screen.findByRole("button", { name: /continue/i });
    expect(continueButton).toBeDisabled();
  });
});
