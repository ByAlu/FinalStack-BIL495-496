import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  Chip,
  Grid,
  Typography,
  CircularProgress,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider
} from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import RefreshIcon from "@mui/icons-material/Refresh";
import CloseIcon from "@mui/icons-material/Close";
import { getLogs } from "../services/systemApi";
import "../styles/logs.css";

const STATUS_COLORS = {
  RUNNING: "#14b8a6",
  FINISHED: "#6366f1",
  FAILED: "#ef4444"
};

const FINAL_STATUS_COLORS = {
  SUCCEEDED: "#10b981",
  FAILED: "#ef4444",
  KILLED: "#f59e0b"
};

const STATUS_ICONS = {
  RUNNING: HourglassEmptyIcon,
  FINISHED: CheckCircleOutlineIcon,
  FAILED: ErrorOutlineIcon
};

export function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [filters, setFilters] = useState({
    user: "",
    state: "",
    applicationType: "",
    searchTerm: ""
  });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getLogs();
      setLogs(data);
      applyFilters(data);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const applyFilters = (data) => {
    let filtered = data;

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.id.toLowerCase().includes(term) ||
          log.name.toLowerCase().includes(term)
      );
    }

    if (filters.user) {
      filtered = filtered.filter((log) => log.user === filters.user);
    }

    if (filters.state) {
      filtered = filtered.filter((log) => log.state === filters.state);
    }

    if (filters.applicationType) {
      filtered = filtered.filter(
        (log) => log.applicationType === filters.applicationType
      );
    }

    setFilteredLogs(filtered);
    setPage(0);
  };

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    applyFilters(logs);
  }, [filters, logs]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchLogs();
    }, 300000); // 5 dakika

    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearchChange = (event) => {
    setFilters((prev) => ({ ...prev, searchTerm: event.target.value }));
  };

  const handleClearFilters = () => {
    setFilters({
      user: "",
      state: "",
      applicationType: "",
      searchTerm: ""
    });
  };

  const handleOpenDetail = (log) => {
    setSelectedLog(log);
    setDetailDialogOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailDialogOpen(false);
    setSelectedLog(null);
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedLogs = filteredLogs.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const uniqueUsers = [...new Set(logs.map((log) => log.user))];
  const uniqueApplicationTypes = [...new Set(logs.map((log) => log.applicationType))];
  const uniqueStates = [...new Set(logs.map((log) => log.state))];

  const formatTime = (timestamp) => {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleString("tr-TR");
  };

  const getStateIcon = (state) => {
    const Icon = STATUS_ICONS[state] || CircularProgress;
    return <Icon sx={{ fontSize: 18, mr: 0.5 }} />;
  };

  const getStateDuration = (startTime, finishTime) => {
    if (!startTime || !finishTime) return "-";
    const duration = Math.floor((new Date(finishTime) - new Date(startTime)) / 1000);
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;

    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  return (
    <Box className="logs-page">
      <Box className="logs-header">
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
            System Logs & Monitoring
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Real-time tracking of application jobs and operations
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant={autoRefresh ? "contained" : "outlined"}
            onClick={() => setAutoRefresh(!autoRefresh)}
            startIcon={<RefreshIcon />}
            size="small"
          >
            {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
          </Button>
          <Button
            variant="outlined"
            onClick={fetchLogs}
            startIcon={<RefreshIcon />}
            disabled={loading}
            size="small"
          >
            Refresh
          </Button>
        </Box>
      </Box>

      <Paper className="logs-filters" elevation={0}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by ID or Name..."
              value={filters.searchTerm}
              onChange={handleSearchChange}
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>State</InputLabel>
              <Select
                name="state"
                value={filters.state}
                label="State"
                onChange={handleFilterChange}
              >
                <MenuItem value="">All States</MenuItem>
                {uniqueStates.map((state) => (
                  <MenuItem key={state} value={state}>
                    {state}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Application Type</InputLabel>
              <Select
                name="applicationType"
                value={filters.applicationType}
                label="Application Type"
                onChange={handleFilterChange}
              >
                <MenuItem value="">All Types</MenuItem>
                {uniqueApplicationTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>User</InputLabel>
              <Select
                name="user"
                value={filters.user}
                label="User"
                onChange={handleFilterChange}
              >
                <MenuItem value="">All Users</MenuItem>
                {uniqueUsers.map((user) => (
                  <MenuItem key={user} value={user}>
                    {user}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <Button
              size="small"
              onClick={handleClearFilters}
              variant="text"
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper className="logs-table-container" elevation={0}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow className="logs-table-header">
                    <TableCell>ID</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Application Type</TableCell>
                    <TableCell>Queue</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>StartTime</TableCell>
                    <TableCell>FinishTime</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>State</TableCell>
                    <TableCell>Final Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedLogs.map((log) => (
                    <TableRow 
                      key={log.id} 
                      className="logs-table-row"
                      onClick={() => handleOpenDetail(log)}
                      sx={{ cursor: "pointer" }}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
                          {log.id}
                        </Typography>
                      </TableCell>
                      <TableCell>{log.user}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {log.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={log.applicationType}
                          size="small"
                          variant="outlined"
                          sx={{
                            fontSize: "0.75rem",
                            height: 24
                          }}
                        />
                      </TableCell>
                      <TableCell>{log.queue}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={log.priority}
                          size="small"
                          variant="filled"
                          sx={{
                            fontSize: "0.75rem",
                            height: 24,
                            minWidth: 32
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ fontSize: "0.85rem" }}>
                          {formatTime(log.startTime)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ fontSize: "0.85rem" }}>
                          {formatTime(log.finishTime)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ fontSize: "0.85rem", fontWeight: 500 }}>
                          {getStateDuration(log.startTime, log.finishTime)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                          {getStateIcon(log.state)}
                          <Chip
                            label={log.state}
                            size="small"
                            sx={{
                              color: "white",
                              backgroundColor: STATUS_COLORS[log.state],
                              fontSize: "0.75rem",
                              height: 24
                            }}
                          />
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={log.finalStatus}
                          size="small"
                          sx={{
                            color: "white",
                            backgroundColor: FINAL_STATUS_COLORS[log.finalStatus],
                            fontSize: "0.75rem",
                            height: 24
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[20, 50, 100]}
              component="div"
              count={filteredLogs.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handlePageChange}
              onRowsPerPageChange={handleRowsPerPageChange}
            />
          </>
        )}
      </Paper>

      {/* Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={handleCloseDetail}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: "rgba(10, 20, 31, 0.95)",
            border: "1px solid rgba(148, 197, 255, 0.12)",
            borderRadius: 1.5
          }
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: 1
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Job Details
          </Typography>
          <Button
            onClick={handleCloseDetail}
            sx={{ minWidth: "auto", p: 0.5 }}
          >
            <CloseIcon fontSize="small" />
          </Button>
        </DialogTitle>
        <Divider sx={{ borderColor: "rgba(148, 197, 255, 0.12)" }} />
        <DialogContent sx={{ pt: 2 }}>
          {selectedLog && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
                  Application ID
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.8rem", wordBreak: "break-all" }}>
                  {selectedLog.id}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
                  Name
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {selectedLog.name}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
                  User
                </Typography>
                <Typography variant="body2">
                  {selectedLog.user}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
                  Application Type
                </Typography>
                <Chip
                  label={selectedLog.applicationType}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: "0.75rem", height: 24 }}
                />
              </Box>

              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
                  Queue
                </Typography>
                <Typography variant="body2">
                  {selectedLog.queue}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
                  Priority
                </Typography>
                <Chip
                  label={selectedLog.priority}
                  size="small"
                  variant="filled"
                  sx={{ fontSize: "0.75rem", height: 24, minWidth: 32 }}
                />
              </Box>

              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
                  Start Time
                </Typography>
                <Typography variant="body2" sx={{ fontSize: "0.85rem" }}>
                  {formatTime(selectedLog.startTime)}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
                  Finish Time
                </Typography>
                <Typography variant="body2" sx={{ fontSize: "0.85rem" }}>
                  {formatTime(selectedLog.finishTime)}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
                  Duration
                </Typography>
                <Typography variant="body2" sx={{ fontSize: "0.85rem", fontWeight: 500 }}>
                  {getStateDuration(selectedLog.startTime, selectedLog.finishTime)}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
                  State
                </Typography>
                <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", mt: 0.5 }}>
                  {getStateIcon(selectedLog.state)}
                  <Chip
                    label={selectedLog.state}
                    size="small"
                    sx={{
                      color: "white",
                      backgroundColor: STATUS_COLORS[selectedLog.state],
                      fontSize: "0.75rem",
                      height: 24
                    }}
                  />
                </Stack>
              </Box>

              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
                  Final Status
                </Typography>
                <Chip
                  label={selectedLog.finalStatus}
                  size="small"
                  sx={{
                    color: "white",
                    backgroundColor: FINAL_STATUS_COLORS[selectedLog.finalStatus],
                    fontSize: "0.75rem",
                    height: 24
                  }}
                />
              </Box>

              {selectedLog.state === "RUNNING" && (
                <Box>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
                    Progress
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Box
                      sx={{
                        width: "100%",
                        height: 24,
                        backgroundColor: "rgba(148, 197, 255, 0.1)",
                        borderRadius: 1,
                        overflow: "hidden",
                        position: "relative"
                      }}
                    >
                      <Box
                        sx={{
                          height: "100%",
                          width: `${selectedLog.progress}%`,
                          backgroundColor: "#14b8a6",
                          transition: "width 0.3s ease",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >
                        <Typography variant="caption" sx={{ fontSize: "0.7rem", fontWeight: 600 }}>
                          {selectedLog.progress}%
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <Divider sx={{ borderColor: "rgba(148, 197, 255, 0.12)" }} />
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDetail} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
