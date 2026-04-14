import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography
} from "@mui/material";
import { useAuth } from "../context/AuthContext";

function formatRole(role) {
  if (!role) {
    return "Unspecified";
  }

  return role === "ADMIN" ? "Administrator" : "Doctor";
}

export function ProfilePage() {
  const { user, logout } = useAuth();
  const initials = user?.fullName
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Stack spacing={3.5} sx={{ maxWidth: 980, mx: "auto" }}>
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
              {user?.fullName || "Unknown user"}
            </Typography>
          </Box>
          <Button variant="outlined" color="inherit" startIcon={<LogoutRoundedIcon />} onClick={logout} sx={{ minHeight: 46 }}>
            Logout
          </Button>
        </Stack>
      </Paper>

      <Stack direction={{ xs: "column", lg: "row" }} spacing={3}>
        <Paper
          sx={{
            flex: 1,
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
            <Box>
              <Typography variant="caption" color="text.secondary">
                Username
              </Typography>
              <Typography variant="h6">{user?.username || "-"}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Display name
              </Typography>
              <Typography variant="h6">{user?.fullName || "-"}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                First name
              </Typography>
              <Typography variant="h6">Not exposed by current API</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Last name
              </Typography>
              <Typography variant="h6">Not exposed by current API</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Email
              </Typography>
              <Typography variant="h6">Not exposed by current API</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Role
              </Typography>
              <Typography variant="h6">{formatRole(user?.role)}</Typography>
            </Box>
          </Stack>
        </Paper>

        <Paper
          sx={{
            flex: 1,
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
                <Chip label="Active session user" color="success" variant="outlined" />
                <Chip label={formatRole(user?.role)} color="primary" />
              </Stack>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Allowed data types
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1.25 }}>
                {user?.allowedDataTypes?.length ? (
                  user.allowedDataTypes.map((type) => (
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
  );
}
