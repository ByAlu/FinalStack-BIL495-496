import { Fragment, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Box,
  Button,
  IconButton,
  FormControl,
  InputLabel,
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
  Collapse
} from "@mui/material";
import { WorkflowSteps } from "../components/WorkflowSteps";
import { findPatientById } from "../services/mockApi";
import { resetWorkflowAfterStep, setActiveWorkflowContext } from "../utils/workflowState";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

const QUERY_PAGE_STATE_KEY = "neoai-query-page-state";

function parseExamDate(value) {
  return new Date(value.replace(" ", "T"));
}

function getInitialPageState() {
  const rawValue = window.sessionStorage.getItem(QUERY_PAGE_STATE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    window.sessionStorage.removeItem(QUERY_PAGE_STATE_KEY);
    return null;
  }
}

export function PatientQueryWorkflowPage() {
  const savedPageState = getInitialPageState();
  const [query, setQuery] = useState(savedPageState?.query || "PT-1001");
  const [patient, setPatient] = useState(() => findPatientById(savedPageState?.query || "PT-1001"));
  const [expandedExaminationId, setExpandedExaminationId] = useState(savedPageState?.expandedExaminationId || "");
  const [resultSize, setResultSize] = useState(savedPageState?.resultSize || 10);
  const [currentPage, setCurrentPage] = useState(savedPageState?.currentPage || 1);
  const [examinationSearch, setExaminationSearch] = useState(savedPageState?.examinationSearch || "");
  const [sortConfig, setSortConfig] = useState(savedPageState?.sortConfig || { key: "date", direction: "desc" });
  const [dateRange, setDateRange] = useState(savedPageState?.dateRange || { start: "", end: "" });

  window.sessionStorage.setItem(
    QUERY_PAGE_STATE_KEY,
    JSON.stringify({
      query,
      expandedExaminationId,
      resultSize,
      currentPage,
      examinationSearch,
      sortConfig,
      dateRange
    })
  );

  function handleSubmit(event) {
    event.preventDefault();
    setPatient(findPatientById(query));
    setExpandedExaminationId("");
    setCurrentPage(1);
  }

  const filteredExaminations = useMemo(() => {
    if (!patient) {
      return [];
    }

    const normalizedSearch = examinationSearch.trim().toLowerCase();
    const startDate = dateRange.start ? new Date(dateRange.start) : null;
    const endDate = dateRange.end ? new Date(dateRange.end) : null;

    return [...patient.examinations]
      .filter((examination) => examination.id.toLowerCase().includes(normalizedSearch))
      .filter((examination) => {
        const examDate = parseExamDate(examination.date);

        if (startDate && examDate < startDate) {
          return false;
        }

        if (endDate && examDate > endDate) {
          return false;
        }

        return true;
      })
      .sort((left, right) => {
        let comparison = 0;

        if (sortConfig.key === "id") {
          comparison = left.id.localeCompare(right.id);
        } else if (sortConfig.key === "date") {
          comparison = parseExamDate(left.date) - parseExamDate(right.date);
        } else if (sortConfig.key === "videos") {
          comparison = left.videos.length - right.videos.length;
        }

        return sortConfig.direction === "asc" ? comparison : -comparison;
      });
  }, [patient, examinationSearch, sortConfig, dateRange]);

  const totalResults = filteredExaminations.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / resultSize));
  const activePage = Math.min(currentPage, totalPages);
  const paginatedExaminations = filteredExaminations.slice((activePage - 1) * resultSize, activePage * resultSize);
  const showingStart = totalResults > 0 ? (activePage - 1) * resultSize + 1 : 0;
  const showingEnd = Math.min(activePage * resultSize, totalResults);

  function handleSort(columnKey) {
    setCurrentPage(1);
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

  function handleDateRangeChange(field, value) {
    setCurrentPage(1);
    setDateRange((current) => ({ ...current, [field]: value }));
  }

  function handleContinue(patientId, examinationId) {
    setActiveWorkflowContext({ patientId, examinationId });
    resetWorkflowAfterStep(patientId, examinationId, 1);
  }

  function getSortIndicator(columnKey) {
    if (sortConfig.key !== columnKey) {
      return "|";
    }

    return sortConfig.direction === "asc" ? "^" : "v";
  }

  return (
    <Stack spacing={3}>
      <WorkflowSteps currentStep="query" />

      <Paper sx={{ p: 3.5, borderRadius: 3.5, boxShadow: "0 24px 60px rgba(0, 0, 0, 0.2)" }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography
              variant="overline"
              sx={{ color: "text.secondary", letterSpacing: "0.14em", fontWeight: 700 }}
            >
              Patient lookup
            </Typography>
            <Typography variant="h4">Search patient records</Typography>
          </Box>

          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1fr) auto" }, gap: 1.75 }}
          >
            <TextField
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Enter patient id"
              fullWidth
            />
            <Button type="submit" variant="contained" startIcon={<SearchRoundedIcon />} sx={{ minHeight: 56, px: 3 }}>
              Search
            </Button>
          </Box>
        </Stack>
      </Paper>

      {patient ? (
        <Paper sx={{ p: 3.5, borderRadius: 3.5, boxShadow: "0 24px 60px rgba(0, 0, 0, 0.2)" }}>
          <Stack spacing={2.5}>
            <Box>
              <Typography
                variant="overline"
                sx={{ color: "text.secondary", letterSpacing: "0.14em", fontWeight: 700 }}
              >
                Patient data
              </Typography>
              <Typography variant="h4">
                {patient.name} - {patient.id}
              </Typography>
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", lg: "180px minmax(0, 1fr) minmax(320px, 420px)" },
                gap: 2
              }}
            >
              <FormControl fullWidth>
                <InputLabel id="results-per-page-label">Show results</InputLabel>
                <Select
                  labelId="results-per-page-label"
                  label="Show results"
                  value={resultSize}
                  onChange={(event) => {
                    setResultSize(Number(event.target.value));
                    setCurrentPage(1);
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        "& .MuiMenuItem-root": {
                          color: "#04141f"
                        }
                      }
                    }
                  }}
                >
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={20}>20</MenuItem>
                  <MenuItem value={30}>30</MenuItem>
                  <MenuItem value={40}>40</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Search by examination id"
                value={examinationSearch}
                onChange={(event) => {
                  setExaminationSearch(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search examination id"
                fullWidth
              />

              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1.5 }}>
                <TextField
                  label="Start date"
                  type="date"
                  value={dateRange.start}
                  onChange={(event) => handleDateRangeChange("start", event.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  label="End date"
                  type="date"
                  value={dateRange.end}
                  onChange={(event) => handleDateRangeChange("end", event.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Box>
            </Box>

            <TableContainer component={Box} sx={{ overflowX: "auto" }}>
              <Table>
                <TableHead>
                  <TableRow >
                    <TableCell padding="none" size="small"></TableCell>
                    <TableCell>
                      <Button color="inherit" onClick={() => handleSort("id")} sx={{ px: 0, fontWeight: 700 }}>
                        Examination id
                        <Box component="span" sx={{ ml: 0.75, color: "primary.main" }}>
                          {getSortIndicator("id")}
                        </Box>
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button color="inherit" onClick={() => handleSort("date")} sx={{ px: 0, fontWeight: 700 }}>
                        Date
                        <Box component="span" sx={{ ml: 0.75, color: "primary.main" }}>
                          {getSortIndicator("date")}
                        </Box>
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button color="inherit" onClick={() => handleSort("videos")} sx={{ px: 0, fontWeight: 700 }}>
                        Videos
                        <Box component="span" sx={{ ml: 0.75, color: "primary.main" }}>
                          {getSortIndicator("videos")}
                        </Box>
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedExaminations.map((examination) => {
                    const isExpanded = expandedExaminationId === examination.id;

                    return (
                      <Fragment key={examination.id}>
                        <TableRow 
                          hover  
                          sx={{ '& > *': { borderBottom: 'unset' }, borderBottom: 0}}
                        >
                          <TableCell  padding="none" 
                          >
                            <IconButton
                              aria-label="expand row"
                              size="small"
                              onClick={() =>
                                  setExpandedExaminationId((current) =>
                                    current === examination.id ? "" : examination.id
                                  )
                                }
                            >
                              {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                            </IconButton>
                          </TableCell>
                          <TableCell>{examination.id}</TableCell>
                          <TableCell>{examination.date}</TableCell>
                          <TableCell>{examination.videos.length}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={4} style={{ paddingBottom: 0, paddingTop: 0 }}>
                            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                              <Box sx={{ margin: 1 }}>
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                                  <Typography fontWeight={700}>Videos</Typography>
                                  <Button
                                    component={Link}
                                    to={`/selection/${patient.id}/${examination.id}`}
                                    onClick={() => handleContinue(patient.id, examination.id)}
                                    variant="contained"
                                  >
                                    Continue
                                  </Button>
                                </Box>

                                   <TableContainer component={Box} sx={{ overflowX: "auto" }}>
                                  <Table size="small">
                                    <TableHead>
                                      <TableRow>
                                        <TableCell>Thumbnail</TableCell>
                                        <TableCell>Video Name</TableCell>
                                        <TableCell>Region</TableCell>
                                        <TableCell>Duration</TableCell>
                                        <TableCell>Comment</TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {examination.videos.map((video) => (
                                        <TableRow key={video.id}>
                                          <TableCell>
                                            <Box
                                              component="img"
                                              alt={`${video.name} thumbnail`}
                                              src={video.thumbnail}
                                              sx={{
                                                width: 72,
                                                height: 72,
                                                borderRadius: 2,
                                                objectFit: "cover",
                                                border: "1px solid rgba(148, 197, 255, 0.12)"
                                              }}
                                            />
                                          </TableCell>
                                          <TableCell>{video.name}</TableCell>
                                          <TableCell>{video.region.toUpperCase()}</TableCell>
                                          <TableCell>{video.duration}</TableCell>
                                          <TableCell>{video.comment}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </TableContainer>
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </Fragment>
                    );
                  })}
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
      ) : (
        <Paper sx={{ p: 3.5, borderRadius: 3.5, boxShadow: "0 24px 60px rgba(0, 0, 0, 0.2)" }}>
          <Typography variant="h4" gutterBottom>
            No patient found
          </Typography>
          <Typography color="text.secondary">Use the sample ids `PT-1001` or `PT-1002` to explore the workflow.</Typography>
        </Paper>
      )}
    </Stack>
  );
}
