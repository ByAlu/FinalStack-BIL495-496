import { Outlet, matchPath, useLocation } from "react-router-dom";
import { Box } from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { AppHeader } from "./AppHeader";

export function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isSelectionRoute = location.pathname.startsWith("/selection/");
  const isWorkflowRoute = [
    "/query",
    "/selection/",
    "/preprocessing/",
    "/ai-module/",
    "/results/",
    "/report/"
  ].some((routePrefix) => location.pathname.startsWith(routePrefix));
  const selectionMatch = matchPath("/selection/:patientId/:examinationId", location.pathname);
  const preprocessingMatch = matchPath("/preprocessing/:patientId/:examinationId", location.pathname);
  const aiModuleMatch = matchPath("/ai-module/:patientId/:examinationId", location.pathname);
  const resultsMatch = matchPath("/results/:reportId", location.pathname);
  const reportMatch = matchPath("/report/:reportId", location.pathname);
  let workflowMeta = null;

  if (location.pathname === "/query") {
    workflowMeta = { currentStep: "query" };
  } else if (selectionMatch) {
    workflowMeta = { currentStep: "selection", context: selectionMatch.params };
  } else if (preprocessingMatch) {
    workflowMeta = { currentStep: "preprocessing", context: preprocessingMatch.params };
  } else if (aiModuleMatch) {
    workflowMeta = { currentStep: "ai-module", context: aiModuleMatch.params };
  } else if (resultsMatch) {
    workflowMeta = {
      currentStep: "results",
      context: {
        patientId: location.state?.patientId,
        examinationId: location.state?.examinationId,
        reportId: resultsMatch.params.reportId
      }
    };
  } else if (reportMatch) {
    workflowMeta = {
      currentStep: "reporting",
      context: {
        patientId: location.state?.patientId,
        examinationId: location.state?.examinationId,
        reportId: reportMatch.params.reportId
      }
    };
  }

  return (
    <Box className={`app-frame${isSelectionRoute ? " app-frame-selection" : ""}`}>
      <Box className="app-header-shell">
        <AppHeader user={user} logout={logout} workflowMeta={workflowMeta} />
      </Box>

      <Box component="main" className={`content ${isSelectionRoute ? "content-full content-selection-shell" : ""}`}>
        {isSelectionRoute ? (
          <Outlet />
        ) : (
          <Box className="content-centered">
            <Outlet />
          </Box>
        )}
      </Box>
    </Box>
  );
}
