import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PatientQueryWorkflowPage } from "../src/pages/PatientQueryWorkflowPage";

const mockGetPatientExaminations = vi.fn();
const mockGetExaminationByIds = vi.fn();

vi.mock("../src/services/examinationApi", () => ({
  getPatientExaminations: (...args) => mockGetPatientExaminations(...args),
  getExaminationByIds: (...args) => mockGetExaminationByIds(...args)
}));

vi.mock("../src/utils/resetExaminationWorkflowSession", () => ({
  resetExaminationWorkflowSession: vi.fn()
}));

vi.mock("../src/utils/workflowState", () => ({
  getActiveWorkflowContext: vi.fn(() => null),
  resetWorkflowAfterStep: vi.fn(),
  setActiveWorkflowContext: vi.fn()
}));

function renderPatientQueryWorkflowPage() {
  return render(
    <MemoryRouter initialEntries={["/query"]}>
      <Routes>
        <Route path="/query" element={<PatientQueryWorkflowPage />} />
        <Route path="/selection/:patientId/:examinationId" element={<div>Selection Screen</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("PatientQueryWorkflowPage", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    mockGetPatientExaminations.mockReset();
    mockGetExaminationByIds.mockReset();
    mockGetPatientExaminations.mockResolvedValue({
      id: "PT-1001",
      name: "Aylin Yilmaz",
      examinations: [
        {
          id: "Exam_1001",
          displayName: "EX_1001",
          date: "2026-04-08 10:15",
          videos: []
        }
      ]
    });
    mockGetExaminationByIds.mockResolvedValue({
      id: "Exam_1001",
      displayName: "EX_1001",
      date: "2026-04-08 10:15",
      videos: [
        {
          id: "video-r1",
          name: "VID-000101",
          region: "r1",
          duration: "00:18",
          comment: "Left lobe sweep",
          thumbnail: ""
        }
      ]
    });
  });

  it("loads examination details and continues into the selection workflow", async () => {
    renderPatientQueryWorkflowPage();

    await userEvent.type(screen.getByPlaceholderText(/enter patient id/i), "PT-1001");
    await userEvent.click(screen.getByRole("button", { name: /search/i }));

    expect(await screen.findByText(/aylin yilmaz - pt-1001/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /expand row/i }));

    expect(await screen.findByText("VID-000101")).toBeInTheDocument();

    const continueButton = await screen.findByRole("link", { name: /continue/i });
    expect(continueButton).toBeEnabled();

    await userEvent.click(continueButton);

    await waitFor(() => {
      expect(screen.getByText("Selection Screen")).toBeInTheDocument();
    });
  });
});
