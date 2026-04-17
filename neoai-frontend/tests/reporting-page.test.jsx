import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pdfRenderMock = vi.fn();
const toBlobMock = vi.fn();
const mockGetDoctorSuggestion = vi.fn();
const mockSaveDoctorSuggestion = vi.fn();

vi.mock("@react-pdf/renderer", async () => {
  const React = await import("react");

  return {
    pdf: (...args) => pdfRenderMock(...args),
    Document: ({ children }) => React.createElement(React.Fragment, null, children),
    Image: (props) => React.createElement("img", props),
    Page: ({ children }) => React.createElement("div", null, children),
    StyleSheet: {
      create: (styles) => styles
    },
    Text: ({ children }) => React.createElement("span", null, children),
    View: ({ children }) => React.createElement("div", null, children)
  };
});

vi.mock("../src/context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      fullName: "Dr. Test User",
      role: "DOCTOR"
    },
    token: {
      fullName: "Dr. Test User"
    },
    logout: vi.fn()
  })
}));

vi.mock("../src/services/anallysisApi", () => ({
  getDoctorSuggestion: (...args) => mockGetDoctorSuggestion(...args),
  saveDoctorSuggestion: (...args) => mockSaveDoctorSuggestion(...args)
}));

const { AppLayout } = await import("../src/components/AppLayout");
const { ReportingPage } = await import("../src/pages/ReportingPage");

const frameThumbnail =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

function buildRouteState() {
  return {
    reportId: "REP-2001",
    patientId: "PT-1001",
    examinationId: "Exam_1001",
    selectedFrames: {
      r1: {
        region: "r1",
        videoName: "VID-000101",
        thumbnail: frameThumbnail,
        frameIndex: 0
      },
      r2: {
        region: "r2",
        videoName: "VID-000102",
        thumbnail: frameThumbnail,
        frameIndex: 0
      }
    },
    selectedModuleIds: ["rds-score", "b-line"],
    analysisId: "analysis-123",
    analysisResult: {
      analysisUuid: "analysis-123",
      resultData: {
        regions: {
          R1: {
            region: "R1",
            b_line_module: {
              count: 3
            },
            rds_score_module: {
              score: 2
            }
          },
          R2: {
            region: "R2",
            b_line_module: {
              count: 1
            },
            rds_score_module: {
              score: 1
            }
          }
        }
      }
    }
  };
}

function renderReportingPage(routeState = buildRouteState()) {
  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: "/report/REP-2001",
          state: routeState
        }
      ]}
    >
      <Routes>
        <Route path="/report/:reportId" element={<ReportingPage />} />
      </Routes>
    </MemoryRouter>
  );
}

function renderReportingPageInApp(routeState = buildRouteState()) {
  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: "/report/REP-2001",
          state: routeState
        }
      ]}
    >
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route path="report/:reportId" element={<ReportingPage />} />
          <Route path="query" element={<div>Query Screen</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("ReportingPage", () => {
  beforeEach(() => {
    pdfRenderMock.mockReset();
    toBlobMock.mockReset();
    mockGetDoctorSuggestion.mockReset();
    mockSaveDoctorSuggestion.mockReset();
    pdfRenderMock.mockReturnValue({
      toBlob: toBlobMock.mockResolvedValue(new Blob(["pdf"], { type: "application/pdf" }))
    });
    mockGetDoctorSuggestion.mockResolvedValue({
      finalDiagnosis: "",
      treatmentRecommendation: "",
      followUpRecommendation: ""
    });
    mockSaveDoctorSuggestion.mockResolvedValue({
      finalDiagnosis: "",
      treatmentRecommendation: "",
      followUpRecommendation: ""
    });
    window.URL.createObjectURL = vi.fn(() => "blob:report");
    window.URL.revokeObjectURL = vi.fn();
  });

  it("renders the generated diagnostic report with AI result sections", () => {
    renderReportingPage();

    expect(screen.getByRole("heading", { name: /neoai lus assistant/i })).toBeInTheDocument();
    expect(screen.getByText(/1\. patient information/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. selected module results by frame/i)).toBeInTheDocument();
    expect(screen.getByText(/4\. ai disease classification/i)).toBeInTheDocument();
    expect(screen.getByText(/respiratory distress syndrome \(rds\)/i)).toBeInTheDocument();
    expect(screen.getByText(/selected ai modules:/i)).toBeInTheDocument();
    expect(screen.getByText(/total detected b-lines across selected frames: 4/i)).toBeInTheDocument();
    expect(screen.getByText(/dr\. test user/i)).toBeInTheDocument();
  });

  it("lets the doctor enter assessment commentary in the report panel", async () => {
    renderReportingPage();

    const finalDiagnosisInput = screen.getByPlaceholderText(/write final diagnosis/i);
    const treatmentInput = screen.getByPlaceholderText(/write treatment or recommendation/i);

    await userEvent.type(finalDiagnosisInput, "Moderate neonatal RDS.");
    await userEvent.type(treatmentInput, "Continue respiratory support and monitor closely.");

    expect(finalDiagnosisInput).toHaveValue("Moderate neonatal RDS.");
    expect(treatmentInput).toHaveValue("Continue respiratory support and monitor closely.");
  });

  it("saves the physician assessment to the backend doctor suggestion endpoint", async () => {
    renderReportingPage();

    const finalDiagnosisInput = screen.getByPlaceholderText(/write final diagnosis/i);
    const saveButton = screen.getByRole("button", { name: /save assessment/i });

    await userEvent.type(finalDiagnosisInput, "Moderate neonatal RDS.");
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(mockSaveDoctorSuggestion).toHaveBeenCalledWith("analysis-123", {
        finalDiagnosis: "Moderate neonatal RDS.",
        treatmentRecommendation: "",
        followUpRecommendation: ""
      });
    });
  });

  it("exports the report as PDF", async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    renderReportingPage();

    await userEvent.click(screen.getByRole("button", { name: /^export$/i }));

    await waitFor(() => {
      expect(pdfRenderMock).toHaveBeenCalledTimes(1);
      expect(toBlobMock).toHaveBeenCalledTimes(1);
      expect(window.URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(window.URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    });

    clickSpy.mockRestore();
  });

  it("navigates back to the data query page from the report route", async () => {
    renderReportingPageInApp();

    await userEvent.click(screen.getByRole("link", { name: /data query/i }));

    expect(screen.getByText("Query Screen")).toBeInTheDocument();
  });
});
