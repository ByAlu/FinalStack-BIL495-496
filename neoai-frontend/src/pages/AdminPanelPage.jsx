import { useEffect, useMemo, useState } from "react";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import PersonAddAltRoundedIcon from "@mui/icons-material/PersonAddAltRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControl,
  IconButton,
  InputLabel,
  List,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { createUser, getAllUsers, updateUser } from "../services/userApi";
import { notifyUserError } from "../services/errorToastBus";

const ROLE_OPTIONS = [
  { value: "DOCTOR", label: "Doctor" },
  { value: "ADMIN", label: "Administrator" }
];

const DATA_TYPE_OPTIONS = ["ULTRASOUND", "PULSE_OXIMETER", "MRI", "ECG", "CT"];
const PHONE_COUNTRY_CODE = "+90";

const emptyForm = {
  id: null,
  username: "",
  email: "",
  firstName: "",
  lastName: "",
  phoneNumber: "",
  role: "DOCTOR",
  enabled: true,
  allowedDataTypes: ["ULTRASOUND"],
  password: ""
};

const initialSortConfig = {
  key: "name",
  direction: "asc"
};

function formatRole(role) {
  return role === "ADMIN" ? "Administrator" : "Doctor";
}

function formatDataType(type) {
  return type.replaceAll("_", " ");
}

function buildFullName(user) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.userName || "Unknown user";
}

function normalizeSearchValue(value) {
  return (value ?? "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function extractTurkeyLocalPhoneNumber(phoneNumber) {
  if (!phoneNumber) {
    return "";
  }

  const normalizedPhoneNumber = phoneNumber.replace(/[^\d+]/g, "");

  if (normalizedPhoneNumber.startsWith("+90")) {
    return normalizedPhoneNumber.slice(3);
  }

  if (normalizedPhoneNumber.startsWith("90")) {
    return normalizedPhoneNumber.slice(2);
  }

  return normalizedPhoneNumber.replace(/\D/g, "");
}

function toFormState(user) {
  return {
    id: user.id,
    username: user.userName ?? "",
    email: user.email ?? "",
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    phoneNumber: extractTurkeyLocalPhoneNumber(user.phoneNumber),
    role: user.role ?? "DOCTOR",
    enabled: typeof user.enabled === "boolean" ? user.enabled : true,
    allowedDataTypes: Array.isArray(user.allowedDataTypes) && user.allowedDataTypes.length
      ? user.allowedDataTypes
      : ["ULTRASOUND"],
    password: ""
  };
}

function isStrongPassword(password) {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

function normalizeTurkeyPhoneNumber(phoneNumber) {
  return phoneNumber.replace(/\D/g, "");
}

function isValidTurkeyPhoneNumber(phoneNumber) {
  if (!phoneNumber) {
    return true;
  }

  return /^\d{10}$/.test(normalizeTurkeyPhoneNumber(phoneNumber));
}

function sortUsers(users) {
  return [...users].sort((left, right) => buildFullName(left).localeCompare(buildFullName(right)));
}

export function AdminPanelPage() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));
  const [sidebarOpen, setSidebarOpen] = useState(isDesktop);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [sortConfig, setSortConfig] = useState(initialSortConfig);
  const [nameSearch, setNameSearch] = useState("");
  const [resultSize, setResultSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const drawerWidth = 280;

  const sortedUsers = useMemo(() => {
    const normalizedSearch = normalizeSearchValue(nameSearch.trim());
    const filteredUsers = normalizedSearch
      ? users.filter((user) => normalizeSearchValue(buildFullName(user)).includes(normalizedSearch))
      : users;
    const sorted = sortUsers(filteredUsers);

    return sorted.sort((left, right) => {
      let comparison = 0;

      if (sortConfig.key === "name") {
        comparison = buildFullName(left).localeCompare(buildFullName(right));
      } else if (sortConfig.key === "username") {
        comparison = (left.userName ?? "").localeCompare(right.userName ?? "");
      } else if (sortConfig.key === "email") {
        comparison = (left.email ?? "").localeCompare(right.email ?? "");
      } else if (sortConfig.key === "role") {
        comparison = formatRole(left.role).localeCompare(formatRole(right.role));
      } else if (sortConfig.key === "status") {
        comparison = Number(left.enabled === false) - Number(right.enabled === false);
      }

      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
  }, [nameSearch, sortConfig, users]);

  const totalResults = sortedUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / resultSize));
  const activePage = Math.min(currentPage, totalPages);
  const paginatedUsers = sortedUsers.slice((activePage - 1) * resultSize, activePage * resultSize);
  const showingStart = totalResults > 0 ? (activePage - 1) * resultSize + 1 : 0;
  const showingEnd = Math.min(activePage * resultSize, totalResults);

  function handleSort(columnKey) {
    setSortConfig((current) => {
      if (current.key === columnKey) {
        return {
          key: columnKey,
          direction: current.direction === "asc" ? "desc" : "asc"
        };
      }

      return {
        key: columnKey,
        direction: "asc"
      };
    });
  }

  function getSortIndicator(columnKey) {
    if (sortConfig.key !== columnKey) {
      return "|";
    }

    return sortConfig.direction === "asc" ? "^" : "v";
  }

  useEffect(() => {
    setSidebarOpen(isDesktop);
  }, [isDesktop]);

  useEffect(() => {
    setCurrentPage(1);
  }, [nameSearch, resultSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    let active = true;

    async function loadUsers() {
      setLoading(true);
      setLoadError("");

      try {
        const response = await getAllUsers();
        if (!active) {
          return;
        }

        setUsers(Array.isArray(response) ? response : []);
      } catch (error) {
        if (active) {
          setLoadError(error.message || "Could not load users.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadUsers();

    return () => {
      active = false;
    };
  }, []);

  function openCreateDialog() {
    setIsCreating(true);
    setSelectedUserId(null);
    setForm(emptyForm);
    setSubmitError("");
    setSubmitSuccess("");
    setDialogOpen(true);
  }

  function openEditDialog(user) {
    setIsCreating(false);
    setSelectedUserId(user.id);
    setForm(toFormState(user));
    setSubmitError("");
    setSubmitSuccess("");
    setDialogOpen(true);
  }

  function closeDialog(_, reason) {
    if (reason === "backdropClick") {
      return;
    }

    if (saving) {
      return;
    }

    setDialogOpen(false);
    setSubmitError("");
    setSubmitSuccess("");
  }

  function handleFieldChange(event) {
    const { name, value, checked, type } = event.target;
    setForm((current) => {
      const nextForm = {
        ...current,
        [name]: type === "checkbox" ? checked : value
      };

      if (name === "role" && value === "ADMIN") {
        nextForm.allowedDataTypes = [...DATA_TYPE_OPTIONS];
      }

      if (name === "role" && value === "DOCTOR" && current.role === "ADMIN") {
        nextForm.allowedDataTypes = current.allowedDataTypes.length ? current.allowedDataTypes : ["ULTRASOUND"];
      }

      return nextForm;
    });
  }

  function handleDataTypeToggle(dataType) {
    setForm((current) => {
      const exists = current.allowedDataTypes.includes(dataType);
      const nextAllowedDataTypes = exists
        ? current.allowedDataTypes.filter((item) => item !== dataType)
        : [...current.allowedDataTypes, dataType];

      return {
        ...current,
        allowedDataTypes: nextAllowedDataTypes
      };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError("");
    setSubmitSuccess("");

    if (!form.username.trim() || !form.email.trim()) {
      const text = "Username and email are required.";
      setSubmitError(text);
      notifyUserError(text);
      return;
    }

    if (isCreating && !form.password) {
      const text = "Password is required for new users.";
      setSubmitError(text);
      notifyUserError(text);
      return;
    }

    if (form.password && !isStrongPassword(form.password)) {
      const text = "Password must be at least 8 characters long and include both letters and numbers.";
      setSubmitError(text);
      notifyUserError(text);
      return;
    }

    if (!isValidTurkeyPhoneNumber(form.phoneNumber.trim())) {
      const text = "Phone number must be a valid Turkish number with 10 digits after +90.";
      setSubmitError(text);
      notifyUserError(text);
      return;
    }

    if (!form.allowedDataTypes.length) {
      const text = "Select at least one allowed data type.";
      setSubmitError(text);
      notifyUserError(text);
      return;
    }

    const payload = {
      username: form.username.trim(),
      email: form.email.trim(),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phoneNumber: form.phoneNumber.trim()
        ? `${PHONE_COUNTRY_CODE}${normalizeTurkeyPhoneNumber(form.phoneNumber.trim())}`
        : "",
      role: form.role,
      enabled: form.enabled,
      allowedDataTypes: form.allowedDataTypes,
      ...(form.password ? { password: form.password } : {})
    };

    setSaving(true);

    try {
      if (isCreating) {
        const createdUser = await createUser(payload);
        setUsers((current) => sortUsers([...current, createdUser]));
        setSelectedUserId(createdUser.id);
        setSubmitSuccess("User created successfully.");
        setIsCreating(false);
        setForm(toFormState(createdUser));
      } else if (form.id != null) {
        const updatedUser = await updateUser(form.id, payload);
        setUsers((current) => current.map((user) => (user.id === updatedUser.id ? updatedUser : user)));
        setSelectedUserId(updatedUser.id);
        setSubmitSuccess("User profile updated successfully.");
        setForm(toFormState(updatedUser));
      }
    } catch (error) {
      setSubmitError(error.message || "Could not save user.");
    } finally {
      setSaving(false);
    }
  }

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
          Admin
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
          <Typography sx={{ fontWeight: 700, color: "text.primary" }}>User Management</Typography>
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

      <Stack spacing={3} sx={{ maxWidth: 1120, mx: "auto" }}>
        {loadError ? <Alert severity="error">{loadError}</Alert> : null}

        <Paper
          sx={{
            p: 3.5,
            borderRadius: 1,
            border: "1px solid rgba(148, 197, 255, 0.12)",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.2)"
          }}
        >
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.14em", fontWeight: 700 }}>
                User management
              </Typography>
              <Typography variant="h4">Internal users</Typography>
            </Box>

            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "180px minmax(320px, 420px)" },
                  gap: 2,
                  width: { xs: "100%", md: "auto" }
                }}
              >
                <FormControl fullWidth>
                  <InputLabel id="user-results-per-page-label">Show rows</InputLabel>
                  <Select
                    labelId="user-results-per-page-label"
                    label="Show rows"
                    value={resultSize}
                    onChange={(event) => setResultSize(Number(event.target.value))}
                  >
                    <MenuItem value={10}>10</MenuItem>
                    <MenuItem value={20}>20</MenuItem>
                    <MenuItem value={30}>30</MenuItem>
                    <MenuItem value={50}>50</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Search by name"
                  value={nameSearch}
                  onChange={(event) => setNameSearch(event.target.value)}
                  placeholder="Search user name"
                  fullWidth
                />
              </Box>
              <Button variant="contained" startIcon={<PersonAddAltRoundedIcon />} onClick={openCreateDialog}>
                New user
              </Button>
            </Box>

            <TableContainer component={Box} sx={{ overflowX: "auto" }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <Button color="inherit" onClick={() => handleSort("name")} sx={{ px: 0, fontWeight: 700 }}>
                          Name
                          <Box component="span" sx={{ ml: 0.75, color: "primary.main" }}>
                            {getSortIndicator("name")}
                          </Box>
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button color="inherit" onClick={() => handleSort("username")} sx={{ px: 0, fontWeight: 700 }}>
                          Username
                          <Box component="span" sx={{ ml: 0.75, color: "primary.main" }}>
                            {getSortIndicator("username")}
                          </Box>
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button color="inherit" onClick={() => handleSort("email")} sx={{ px: 0, fontWeight: 700 }}>
                          Email
                          <Box component="span" sx={{ ml: 0.75, color: "primary.main" }}>
                            {getSortIndicator("email")}
                          </Box>
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button color="inherit" onClick={() => handleSort("role")} sx={{ px: 0, fontWeight: 700 }}>
                          Role
                          <Box component="span" sx={{ ml: 0.75, color: "primary.main" }}>
                            {getSortIndicator("role")}
                          </Box>
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button color="inherit" onClick={() => handleSort("status")} sx={{ px: 0, fontWeight: 700 }}>
                          Status
                          <Box component="span" sx={{ ml: 0.75, color: "primary.main" }}>
                            {getSortIndicator("status")}
                          </Box>
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Stack direction="row" spacing={1.25} alignItems="center" justifyContent="center" sx={{ py: 3 }}>
                          <CircularProgress size={18} />
                          <Typography color="text.secondary">Loading users...</Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ) : paginatedUsers.length ? (
                    paginatedUsers.map((user) => (
                      <TableRow
                        key={user.id}
                        hover
                        selected={selectedUserId === user.id}
                        onClick={() => openEditDialog(user)}
                        sx={{
                          cursor: "pointer",
                          "& .MuiTableCell-root": {
                            borderBottom: "1px solid rgba(148, 197, 255, 0.08)"
                          }
                        }}
                      >
                        <TableCell sx={{ fontWeight: 700 }}>{buildFullName(user)}</TableCell>
                        <TableCell>{user.userName}</TableCell>
                        <TableCell>{user.email || "-"}</TableCell>
                        <TableCell>{formatRole(user.role)}</TableCell>
                        <TableCell>{user.enabled === false ? "Disabled" : "Enabled"}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
                          No users found.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
              <Typography color="text.secondary">
                Showing {showingStart}-{showingEnd} of {totalResults}
              </Typography>

              <Stack direction="row" spacing={1.25} alignItems="center" sx={{ ml: "auto" }}>
                <Button
                  variant="outlined"
                  disabled={activePage === 1}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                >
                  Previous
                </Button>
                <Typography color="text.secondary">
                  Page {activePage} / {totalPages}
                </Typography>
                <Button
                  variant="outlined"
                  disabled={activePage === totalPages}
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                >
                  Next
                </Button>
              </Stack>
            </Box>
          </Stack>
        </Paper>
      </Stack>

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        fullWidth
        maxWidth="lg"
        PaperProps={{
          sx: {
            minHeight: 720
          }
        }}
      >
        <DialogTitle sx={{ pr: 7 }}>
          {isCreating ? "New user" : `Edit ${buildFullName(form)}`}
          <IconButton onClick={closeDialog} sx={{ position: "absolute", right: 12, top: 12 }} disabled={saving}>
            <CloseRoundedIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} component="form" id="admin-user-form" onSubmit={handleSubmit} sx={{ pt: 1 }}>
            {submitError ? <Alert severity="error">{submitError}</Alert> : null}
            {submitSuccess ? <Alert severity="success">{submitSuccess}</Alert> : null}

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField label="Username" name="username" value={form.username} onChange={handleFieldChange} fullWidth required />
              <TextField label="Email" name="email" type="email" value={form.email} onChange={handleFieldChange} fullWidth required />
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField label="First name" name="firstName" value={form.firstName} onChange={handleFieldChange} fullWidth />
              <TextField label="Last name" name="lastName" value={form.lastName} onChange={handleFieldChange} fullWidth />
            </Stack>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.2fr) minmax(260px, 1fr)" },
                gap: 2,
                alignItems: "start"
              }}
            >
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "180px minmax(0, 1fr)" },
                  gap: 2,
                  alignItems: "start"
                }}
              >
                <TextField
                  label="Country code"
                  value={PHONE_COUNTRY_CODE}
                  select
                  fullWidth
                  SelectProps={{ native: true }}
                  slotProps={{ input: { readOnly: true } }}
                >
                  <option value={PHONE_COUNTRY_CODE}>Turkey (+90)</option>
                </TextField>
                <TextField
                  label="Phone number"
                  name="phoneNumber"
                  value={form.phoneNumber}
                  onChange={(event) => {
                    const numericValue = event.target.value.replace(/\D/g, "").slice(0, 10);
                    setForm((current) => ({ ...current, phoneNumber: numericValue }));
                  }}
                  fullWidth
                  placeholder="5551234567"
                  inputProps={{ inputMode: "numeric", maxLength: 10 }}
                />
              </Box>

            </Box>
            <TextField
                label="Role"
                name="role"
                value={form.role}
                onChange={handleFieldChange}
                select
                fullWidth
                SelectProps={{ native: true }}
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
            </TextField>
            <TextField
              label="Status"
              name="enabled"
              value={form.enabled ? "enabled" : "disabled"}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  enabled: event.target.value === "enabled"
                }))
              }
              select
              fullWidth
              SelectProps={{ native: true }}
            >
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </TextField>

            <TextField
              label={isCreating ? "Password" : "Reset password"}
              name="password"
              type="password"
              value={form.password}
              onChange={handleFieldChange}
              fullWidth
              required={isCreating}
              helperText={
                isCreating
                  ? "At least 8 characters, including letters and numbers."
                  : "Leave blank to keep the current password."
              }
            />

            <Box>
              <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
                Allowed data types
              </Typography>
              <Stack direction="row" useFlexGap flexWrap="wrap" spacing={1}>
                {DATA_TYPE_OPTIONS.map((dataType) => (
                  <Chip
                    key={dataType}
                    label={formatDataType(dataType)}
                    color={form.allowedDataTypes.includes(dataType) ? "primary" : "default"}
                    variant={form.allowedDataTypes.includes(dataType) ? "filled" : "outlined"}
                    onClick={() => handleDataTypeToggle(dataType)}
                  />
                ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeDialog} disabled={saving}>Cancel</Button>
          <Button type="submit" form="admin-user-form" variant="contained" disabled={saving}>
            {saving ? "Saving..." : isCreating ? "Create user" : "Save changes"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
