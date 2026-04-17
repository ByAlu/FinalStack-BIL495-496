import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DataPreprocessingPage } from "../src/pages/DataPreprocessingPage";

const mockGetCurrentUserPreprocessingSettings = vi.fn();
const mockSaveCurrentUserPreprocessingSettings = vi.fn();
const mockApplyOperationsToFrame = vi.fn();

vi.mock("../src/services/preprocessingSettingsApi", () => ({
  getCurrentUserPreprocessingSettings: (...args) => mockGetCurrentUserPreprocessingSettings(...args),
  saveCurrentUserPreprocessingSettings: (...args) => mockSaveCurrentUserPreprocessingSettings(...args)
}));

vi.mock("../src/hooks/useVideoFrameExtraction", () => ({
  useVideoFrameExtraction: () => ({
    videoFramesByName: {}
  })
}));

vi.mock("../src/utils/imageProcessing", () => ({
  applyOperationsToFrame: (...args) => mockApplyOperationsToFrame(...args)
}));

vi.mock("../src/utils/workflowState", () => ({
  resetWorkflowAfterStep: vi.fn(),
  setActiveWorkflowContext: vi.fn()
}));

const frameThumbnail = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

function buildRouteState() {
  return {
    examination: {
      id: "Exam_1001",
      videos: ["r1", "r2", "r3", "r4", "r5", "r6"].map((region, index) => ({
        name: `VID-00010${index + 1}`,
        region,
        thumbnail: frameThumbnail
      }))
    },
    selectedFrames: Object.fromEntries(
      ["r1", "r2", "r3", "r4", "r5", "r6"].map((region, index) => [
        region,
        {
          region,
          videoName: `VID-00010${index + 1}`,
          thumbnail: frameThumbnail,
          frameIndex: 0
        }
      ])
    )
  };
}

function renderDataPreprocessingPage() {
  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: "/preprocessing/PT-1001/Exam_1001",
          state: buildRouteState()
        }
      ]}
    >
      <Routes>
        <Route path="/preprocessing/:patientId/:examinationId" element={<DataPreprocessingPage />} />
        <Route path="/ai-module/:patientId/:examinationId" element={<div>AI Module Screen</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("DataPreprocessingPage", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.cv = {};
    mockGetCurrentUserPreprocessingSettings.mockReset();
    mockSaveCurrentUserPreprocessingSettings.mockReset();
    mockApplyOperationsToFrame.mockReset();
    mockGetCurrentUserPreprocessingSettings.mockResolvedValue([]);
    mockSaveCurrentUserPreprocessingSettings.mockResolvedValue([]);
    mockApplyOperationsToFrame.mockImplementation(async (source) => source);
  });

  it("loads the preprocessing operations panel", async () => {
    renderDataPreprocessingPage();

    expect(await screen.findByText(/operations/i)).toBeInTheDocument();
    expect(screen.getByText(/median filter/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue/i })).toBeEnabled();
  });

  it("adds a preprocessing operation and exposes its parameters", async () => {
    renderDataPreprocessingPage();

    await userEvent.click(screen.getByRole("button", { name: /expand clahe/i }));
    await userEvent.click(screen.getByLabelText(/enable clahe/i));

    expect(screen.getByText("2 operation enabled")).toBeInTheDocument();
    expect(screen.getByLabelText(/clip limit/i)).toBeEnabled();
    expect(screen.getByLabelText(/tile grid size/i)).toBeEnabled();
  });

  it("updates preprocessing parameter values", async () => {
    renderDataPreprocessingPage();

    const kernelSlider = screen.getByRole("slider", { name: /kernel size/i });
    fireEvent.change(kernelSlider, { target: { value: "5" } });
    fireEvent.mouseUp(kernelSlider);

    await waitFor(() => {
      expect(screen.getByText("5x5")).toBeInTheDocument();
    });
  });

  it("removes a preprocessing operation from the active set", async () => {
    renderDataPreprocessingPage();

    await waitFor(() => {
      expect(screen.getByText("1 operation enabled")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByLabelText(/enable median filter/i));

    expect(screen.getByText(/no operations enabled/i)).toBeInTheDocument();
  });
});
