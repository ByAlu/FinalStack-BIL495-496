import { useState } from "react";
import { Link } from "react-router-dom";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import StorageRoundedIcon from "@mui/icons-material/StorageRounded";
import {
  AppBar,
  Avatar,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Typography
} from "@mui/material";
import { WorkflowSteps } from "./WorkflowSteps";

export function AppHeader({ user, logout, workflowMeta }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);
  const initials = user?.fullName
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <AppBar
      position="static"
      color="transparent"
      elevation={0}
      sx={{
        height: "100%",
        backgroundColor: "transparent",
        border: 0,
        boxShadow: "none"
      }}
    >
      <Toolbar disableGutters sx={{ gap: 2, minHeight: "100% !important", height: "100%" }}>
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            pl: 1.5
          }}
        >
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
                  borderRadius: 1,
                  p: 1,
                  border: "1px solid rgba(148, 197, 255, 0.12)"
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
              component={Link}
              to="/profile"
              onClick={() => setAnchorEl(null)}
              sx={{ borderRadius: 1 }}
            >
              <PersonRoundedIcon fontSize="small" sx={{ mr: 1 }} />
              Profile
            </MenuItem>
            <MenuItem
              component={Link}
              to="/logs"
              onClick={() => setAnchorEl(null)}
              sx={{ borderRadius: 1 }}
            >
              <StorageRoundedIcon fontSize="small" sx={{ mr: 1 }} />
              System Logs
            </MenuItem>
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                logout();
              }}
              sx={{ borderRadius: 1 }}
            >
              <LogoutRoundedIcon fontSize="small" sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
