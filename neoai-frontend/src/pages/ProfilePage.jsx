import { useEffect, useState } from "react";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  List,
  Paper,
  Stack,
  Typography,
  useMediaQuery
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useAuth } from "../context/AuthContext";
import { getCurrentUserProfile } from "../services/api";

function formatRole(role) {
  if (!role) {
    return "Unspecified";
  }

  return role === "ADMIN" ? "Administrator" : "Doctor";
}

export function ProfilePage() {
  const { user, logout } = useAuth();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));
  const [sidebarOpen, setSidebarOpen] = useState(isDesktop);
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const profileData = profile ?? user;
  const initials = profileData?.fullName
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      setLoadingProfile(true);
      setProfileError("");

      try {
        const response = await getCurrentUserProfile();
        if (!active) {
          return;
        }

        const fullName = [response.firstName, response.lastName].filter(Boolean).join(" ");
        setProfile({
          id: response.id,
          username: response.userName ?? user?.username ?? "",
          fullName: fullName || response.userName || user?.fullName || "",
          firstName: response.firstName ?? "",
          lastName: response.lastName ?? "",
          email: response.email ?? "",
          phoneNumber: response.phoneNumber ?? "",
          role: response.role ?? user?.role ?? null,
          allowedDataTypes: Array.isArray(response.allowedDataTypes) ? response.allowedDataTypes : [],
          enabled: typeof response.enabled === "boolean" ? response.enabled : true,
          createTime: response.createTime ?? null,
          updateTime: response.updateTime ?? null
        });
      } catch (error) {
        if (active) {
          setProfile(null);
          setProfileError(error.message || "Could not load profile information.");
        }
      } finally {
        if (active) {
          setLoadingProfile(false);
        }
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [user]);

  const drawerWidth = 260;
  const sidebar = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background:
          "linear-gradient(180deg, rgba(6, 18, 31, 0.98), rgba(8, 20, 34, 0.96))",
        borderRight: "1px solid rgba(148, 197, 255, 0.12)"
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 2 }}>
        <Typography variant="overline" sx={{ color: "rgba(186, 230, 253, 0.75)", letterSpacing: "0.12em" }}>
          Profile
        </Typography>
        <IconButton onClick={() => setSidebarOpen(false)} sx={{ color: "text.primary" }}>
          <ChevronLeftRoundedIcon />
        </IconButton>
      </Stack>
      <List sx={{ px: 1.25, py: 0 }}>
        <Box
          sx={{
            minHeight: 52,
            px: 2,
            display: "flex",
            alignItems: "center",
            borderLeft: "3px solid #38bdf8",
            backgroundColor: "rgba(56, 189, 248, 0.08)"
          }}
        >
          <Typography sx={{ fontWeight: 700, color: "text.primary" }}>Accound Details</Typography>
        </Box>
      </List>
    </Box>
  );

  return (
    <>
      <IconButton
        onClick={() => setSidebarOpen(true)}
        sx={{
          position: "fixed",
          left: 16,
          top: { xs: 108, md: 116 },
          zIndex: (muiTheme) => muiTheme.zIndex.drawer + 2,
          width: 48,
          height: 48,
          borderRadius: 1,
          border: "1px solid rgba(148, 197, 255, 0.16)",
          backgroundColor: "rgba(7, 17, 31, 0.92)",
          color: "text.primary",
          boxShadow: "0 18px 35px rgba(0, 0, 0, 0.28)",
          "&:hover": {
            backgroundColor: "rgba(11, 27, 46, 0.96)"
          },
          display: sidebarOpen && isDesktop ? "none" : "inline-flex"
        }}
      >
        <MenuRoundedIcon />
      </IconButton>

      <Drawer
        anchor="left"
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        variant={isDesktop ? "persistent" : "temporary"}
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          sx: {
            width: drawerWidth,
            top: { xs: 94, md: 94 },
            height: "calc(100% - 94px)",
            background: "transparent",
            boxShadow: isDesktop ? "none" : undefined
          }
        }}
      >
        {sidebar}
      </Drawer>

      <Stack
        spacing={3.5}
        sx={{
          maxWidth: 980,
          mx: "auto",
          transition: "none"
        }}
      >
      <Paper
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 1,
          background:
            "linear-gradient(135deg, rgba(17, 94, 89, 0.28), rgba(15, 23, 42, 0.92)), rgba(10, 18, 32, 0.96)",
          border: "1px solid rgba(125, 211, 252, 0.18)",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.24)"
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems={{ xs: "flex-start", md: "center" }}>
          <Avatar
            sx={{
              width: 88,
              height: 88,
              fontSize: "2rem",
              fontWeight: 800,
              color: "#04141f",
              background: "linear-gradient(135deg, #38bdf8, #14b8a6)"
            }}
          >
            {initials || "NA"}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="overline" sx={{ color: "rgba(186, 230, 253, 0.8)", letterSpacing: "0.12em" }}>
              User Profile
            </Typography>
            <Typography variant="h3" sx={{ mt: 0.75 }}>
              {profileData?.fullName || "Unknown user"}
            </Typography>
          </Box>
          <Button variant="outlined" color="inherit" startIcon={<LogoutRoundedIcon />} onClick={logout} sx={{ minHeight: 46 }}>
            Logout
          </Button>
        </Stack>
      </Paper>

      <Stack spacing={3} sx={{ flex: 1 }}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 1,
              border: "1px solid rgba(148, 197, 255, 0.12)",
              backgroundColor: "rgba(12, 22, 37, 0.92)"
            }}
          >
            <Stack spacing={2.25}>
              <Stack direction="row" spacing={1.25} alignItems="center">
                <PersonRoundedIcon color="primary" />
                <Typography variant="h5">Account details</Typography>
              </Stack>
              <Divider />
              {loadingProfile ? (
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <CircularProgress size={18} />
                  <Typography color="text.secondary">Loading profile...</Typography>
                </Stack>
              ) : null}
              {profileError ? <Typography color="error.main">{profileError}</Typography> : null}
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Username
                </Typography>
                <Typography variant="h6">{profileData?.username || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Display name
                </Typography>
                <Typography variant="h6">{profileData?.fullName || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  First name
                </Typography>
                <Typography variant="h6">{profileData?.firstName || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Last name
                </Typography>
                <Typography variant="h6">{profileData?.lastName || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Email
                </Typography>
                <Typography variant="h6">{profileData?.email || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Phone number
                </Typography>
                <Typography variant="h6">{profileData?.phoneNumber || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Role
                </Typography>
                <Typography variant="h6">{formatRole(profileData?.role)}</Typography>
              </Box>
            </Stack>
          </Paper>

          <Paper
            sx={{
              p: 3,
              borderRadius: 1,
              border: "1px solid rgba(148, 197, 255, 0.12)",
              backgroundColor: "rgba(12, 22, 37, 0.92)"
            }}
          >
            <Stack spacing={2.25}>
              <Stack direction="row" spacing={1.25} alignItems="center">
                <ShieldRoundedIcon color="primary" />
                <Typography variant="h5">Permissions</Typography>
              </Stack>
              <Divider />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Account status
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1.25 }}>
                  <Chip label={profileData?.enabled === false ? "Disabled" : "Enabled"} color={profileData?.enabled === false ? "default" : "success"} variant="outlined" />
                  <Chip label={formatRole(profileData?.role)} color="primary" />
                </Stack>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Allowed data types
                </Typography>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1.25 }}>
                  {profileData?.allowedDataTypes?.length ? (
                    profileData.allowedDataTypes.map((type) => (
                      <Chip key={type} label={type.replaceAll("_", " ")} color="primary" variant="outlined" />
                    ))
                  ) : (
                    <Typography color="text.secondary">No explicit data-type claims were found in the current token.</Typography>
                  )}
                </Stack>
              </Box>
            </Stack>
          </Paper>
      </Stack>
      </Stack>
    </>
  );
}
