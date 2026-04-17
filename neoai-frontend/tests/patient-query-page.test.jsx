import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { PatientQueryPage } from "../src/pages/PatientQueryPage";

function renderPatientQueryPage() {
  return render(
    <MemoryRouter>
      <PatientQueryPage />
    </MemoryRouter>
  );
}

describe("PatientQueryPage", () => {
  it("shows the examination list for a valid patient id", async () => {
    renderPatientQueryPage();

    await userEvent.clear(screen.getByPlaceholderText(/enter patient id/i));
    await userEvent.type(screen.getByPlaceholderText(/enter patient id/i), "PT-1002");
    await userEvent.click(screen.getByRole("button", { name: /search/i }));

    expect(screen.getByText(/kerem demir/i)).toBeInTheDocument();
    expect(screen.getByText("Exam_1101")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /open workspace/i })).toHaveLength(8);
  });

  it("shows a no patient found message for an unknown patient id", async () => {
    renderPatientQueryPage();

    await userEvent.clear(screen.getByPlaceholderText(/enter patient id/i));
    await userEvent.type(screen.getByPlaceholderText(/enter patient id/i), "PT-9999");
    await userEvent.click(screen.getByRole("button", { name: /search/i }));

    expect(screen.getByText(/no patient found/i)).toBeInTheDocument();
    expect(screen.getByText(/use the sample ids/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /open workspace/i })).not.toBeInTheDocument();
  });
});
