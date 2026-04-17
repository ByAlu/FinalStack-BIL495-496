import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DataSelectionPage } from "../src/pages/DataSelectionPage";

vi.mock("../src/hooks/useVideoFrameExtraction", () => ({
  useVideoFrameExtraction: ({ examination }) => ({
    videoFramesByName: Object.fromEntries(
      (examination?.videos || []).map((video) => [
        video.name,
        [
          "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
          "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
        ]
      ])
    ),
    videoInfoByName: {},
    extractionStateByName: Object.fromEntries(
      (examination?.videos || []).map((video) => [
        video.name,
        {
          status: "done",
          progress: 1
        }
      ])
    )
  })
}));

vi.mock("../src/utils/workflowState", () => ({
  resetWorkflowAfterStep: vi.fn(),
  setActiveWorkflowContext: vi.fn()
}));

function buildExamination() {
  return {
    id: "Exam_1001",
    videos: ["r1", "r2", "r3", "r4", "r5", "r6"].map((region, index) => ({
      name: `VID-00010${index + 1}`,
      region,
      thumbnail: ""
    }))
  };
}

function renderDataSelectionPage() {
  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: "/selection/PT-1001/Exam_1001",
          state: {
            examination: buildExamination()
          }
        }
      ]}
    >
      <Routes>
        <Route path="/selection/:patientId/:examinationId" element={<DataSelectionPage />} />
        <Route path="/preprocessing/:patientId/:examinationId" element={<div>Preprocessing Screen</div>} />
      </Routes>
    </MemoryRouter>
  );
}

function getRegionSelectionButton(region, status = "Select frame|Frame selected") {
  return screen.getAllByRole("button").find((button) => {
    if (!button.className.includes("region-video-item")) {
      return false;
    }

    const utils = within(button);
    return Boolean(
      utils.queryByText(region.toUpperCase()) &&
        utils.queryByText(new RegExp(status, "i"))
    );
  });
}

describe("DataSelectionPage", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("blocks approval until all six regions have a selected frame", async () => {
    renderDataSelectionPage();

    const approveButton = screen.getByRole("button", { name: /approve/i });
    expect(approveButton).toBeDisabled();

    for (const region of ["r1", "r2", "r3", "r4"]) {
      await userEvent.click(getRegionSelectionButton(region));
      await userEvent.click(screen.getByRole("button", { name: /^select frame$/i }));
    }

    expect(screen.getByText("4/6")).toBeInTheDocument();
    expect(approveButton).toBeDisabled();
  });

  it("allows selecting one frame for each region and approving the selection", async () => {
    renderDataSelectionPage();

    for (const region of ["r1", "r2", "r3", "r4", "r5", "r6"]) {
      await userEvent.click(getRegionSelectionButton(region));
      await userEvent.click(screen.getByRole("button", { name: /^select frame$/i }));
    }

    const approveButton = screen.getByRole("button", { name: /approve/i });
    expect(screen.getByText("6/6")).toBeInTheDocument();
    expect(approveButton).toBeEnabled();

    await userEvent.click(approveButton);

    await waitFor(() => {
      expect(screen.getByText("Preprocessing Screen")).toBeInTheDocument();
    });
  });
});
