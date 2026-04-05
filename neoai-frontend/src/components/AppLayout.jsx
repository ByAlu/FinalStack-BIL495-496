import { useState } from "react";
import { Link, Outlet, matchPath, useLocation } from "react-router-dom";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import {
  AppBar,
  Avatar,
  Box,
  Container,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Typography
} from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { WorkflowSteps } from "./WorkflowSteps";

export function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState(null);
  const initials = user?.fullName
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
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

  const menuOpen = Boolean(anchorEl);

  return (
    <Box className={`app-frame${isSelectionRoute ? " app-frame-selection" : ""}`}>
      <AppBar
        position="static"
        color="transparent"
        elevation={0}
        sx={{
          backgroundColor: "transparent",
          border: 0,
          boxShadow: "none",
          mb: isWorkflowRoute ? { xs: 2.5, md: 3 } : 6
        }}
      >
        <Toolbar disableGutters sx={{ gap: 2 }}>
          <Box sx={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "flex-start", pl: 1.5 }}>
            <Box
              component={Link}
              to="/"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 1.25,
                color: "text.primary",
                textDecoration: "none"
              }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2.5,
                  border: "1px solid rgba(148, 197, 255, 0.14)",
                  backgroundColor: "rgba(255,255,255,0.06)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <HomeRoundedIcon sx={{ fontSize: 22 }} />
              </Box>
              <Typography sx={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "0.02em" }}>NeoAi</Typography>
            </Box>
          </Box>

          <Box sx={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "center", pt: 0.75 }}>
            {workflowMeta ? <WorkflowSteps currentStep={workflowMeta.currentStep} context={workflowMeta.context} /> : null}
          </Box>

          <Box sx={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "flex-end", pr: 1.5 }}>
            <IconButton onClick={(event) => setAnchorEl(event.currentTarget)} sx={{ p: 0.25 }}>
              <Avatar
                sx={{
                  width: 48,
                  height: 48,
                  background: "linear-gradient(135deg, #38bdf8, #14b8a6)",
                  color: "#04141f",
                  fontWeight: 800,
                  boxShadow: "0 12px 24px rgba(0, 0, 0, 0.22)"
                }}
              >
                {initials || "NA"}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={menuOpen}
              onClose={() => setAnchorEl(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              slotProps={{
                paper: {
                  sx: {
                    mt: 1.5,
                    minWidth: 220,
                    borderRadius: 2.5,
                    p: 1
                  }
                }
              }}
            >
              <Box sx={{ px: 1.5, py: 1 }}>
                <Typography fontWeight={700}>{user?.fullName}</Typography>
                <Typography color="text.secondary" variant="body2">
                  {user?.role === "ADMIN" ? "Administrator" : "Doctor"}
                </Typography>
              </Box>
              <MenuItem
                onClick={() => {
                  setAnchorEl(null);
                  logout();
                }}
                sx={{ borderRadius: 2 }}
              >
                <LogoutRoundedIcon fontSize="small" sx={{ mr: 1 }} />
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Container
        component="main"
        disableGutters
        maxWidth={false}
        className={`content ${isSelectionRoute ? "content-full" : "content-centered"}`}
      >
        <Outlet />
      </Container>
    </Box>
  );
}
