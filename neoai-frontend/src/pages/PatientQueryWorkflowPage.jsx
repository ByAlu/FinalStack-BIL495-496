import { Fragment, useEffect, useMemo, useState } from "react";
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
import { getExaminationByIds, getPatientExaminations } from "../services/examinationApi";
import { resetExaminationWorkflowSession } from "../utils/resetExaminationWorkflowSession";
import { getActiveWorkflowContext, resetWorkflowAfterStep, setActiveWorkflowContext } from "../utils/workflowState";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

const QUERY_PAGE_STATE_KEY = "neoai-query-page-state";

function parseExamDate(value) {
  return new Date(value.replace(" ", "T"));
}

function padDatePart(value) {
  return String(value).padStart(2, "0");
}

function formatDatePart(date) {
  return `${padDatePart(date.getDate())}-${padDatePart(date.getMonth() + 1)}-${date.getFullYear()}`;
}

function formatExamDate(value) {
  const parsedDate = parseExamDate(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  const [, timePart] = value.split(" ");

  return timePart ? `${formatDatePart(parsedDate)} ${timePart}` : formatDatePart(parsedDate);
}

function parseDisplayDate(value) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
    const parsedDate = new Date(`${normalizedValue}T00:00:00`);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  const match = normalizedValue.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);

  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  const parsedDate = new Date(`${year}-${padDatePart(month)}-${padDatePart(day)}T00:00:00`);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function normalizeDisplayDate(value) {
  const parsedDate = parseDisplayDate(value);

  return parsedDate ? formatDatePart(parsedDate) : value;
}

function formatInputDateValue(date) {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function normalizeInputDateValue(value) {
  const parsedDate = parseDisplayDate(value);

  return parsedDate ? formatInputDateValue(parsedDate) : "";
}

function getEndOfDay(date) {
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay;
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

function mergeExaminationDetails(patient, examinationId, detailedExamination) {
  if (!patient) {
    return patient;
  }

  return {
    ...patient,
    examinations: patient.examinations.map((examination) =>
      examination.id === examinationId
        ? {
            ...examination,
            ...detailedExamination,
            displayName: examination.displayName || detailedExamination.displayName
          }
        : examination
    )
  };
}

function VideoThumbnail({ thumbnail, region, name }) {
  const [hasImageError, setHasImageError] = useState(false);
  const regionLabel = region ? String(region).toUpperCase() : "-";

  if (!thumbnail || hasImageError) {
    return (
      <Box
        aria-label={`${name} thumbnail placeholder`}
        sx={{
          width: 72,
          height: 72,
          borderRadius: 1,
          border: "1px solid rgba(148, 197, 255, 0.12)",
          bgcolor: "rgba(47, 200, 216, 0.08)",
          color: "primary.main",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          letterSpacing: "0.08em"
        }}
      >
        {regionLabel}
      </Box>
    );
  }

  return (
    <Box
      component="img"
      alt={`${name} thumbnail`}
      src={thumbnail}
      onError={() => setHasImageError(true)}
      sx={{
        width: 72,
        height: 72,
        borderRadius: 1,
        objectFit: "cover",
        border: "1px solid rgba(148, 197, 255, 0.12)"
      }}
    />
  );
}

export function PatientQueryWorkflowPage() {
  const [savedPageState] = useState(() => getInitialPageState());
  const [query, setQuery] = useState(savedPageState?.query || "");
  const [patient , setPatient] = useState(savedPageState?.patient || null);
  const [isLoadingPatient , setisLoadingPatient] = useState(false);
  const [hasSearched, setHasSearched] = useState(Boolean(savedPageState?.hasSearched));
  const [queryError, setQueryError] = useState(savedPageState?.queryError || "");
  const [loadingVideosById, setLoadingVideosById] = useState({});
  const [videoErrorsById, setVideoErrorsById] = useState(savedPageState?.videoErrorsById || {});
  const [expandedExaminationId, setExpandedExaminationId] = useState(savedPageState?.expandedExaminationId || "");
  const [resultSize, setResultSize] = useState(savedPageState?.resultSize || 10);
  const [currentPage, setCurrentPage] = useState(savedPageState?.currentPage || 1);
  const [examinationSearch, setExaminationSearch] = useState(savedPageState?.examinationSearch || "");
  const [sortConfig, setSortConfig] = useState(savedPageState?.sortConfig || { key: "date", direction: "desc" });
  const [dateRange, setDateRange] = useState(() => ({
    start: normalizeInputDateValue(savedPageState?.dateRange?.start || ""),
    end: normalizeInputDateValue(savedPageState?.dateRange?.end || "")
  }));

  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        QUERY_PAGE_STATE_KEY,
        JSON.stringify({
          query,
          patient,
          hasSearched,
          queryError,
          videoErrorsById,
          expandedExaminationId,
          resultSize,
          currentPage,
          examinationSearch,
          sortConfig,
          dateRange
        })
      );
    } catch {
      // Ignore session storage failures and keep the page functional.
    }
  }, [
    query,
    patient,
    hasSearched,
    queryError,
    videoErrorsById,
    expandedExaminationId,
    resultSize,
    currentPage,
    examinationSearch,
    sortConfig,
    dateRange
  ]);

  async function fetchPatient(patientQuery) {
      setisLoadingPatient(true);
      setQueryError("");
      setVideoErrorsById({});

      try {
        const result = await getPatientExaminations(patientQuery);
        setPatient(result);
        
      } catch (error) {
        setPatient(null);
        setQueryError(error.message || "Could not fetch patient data.")
      } finally {
        setisLoadingPatient(false)
      }
  }

  async function fetchExaminationVideos(examinationId) {
    if (!patient) {
      return;
    }

    const examination = patient.examinations.find((candidate) => candidate.id === examinationId);

    if (!examination || examination.videos.length > 0 || loadingVideosById[examinationId]) {
      return;
    }

    setLoadingVideosById((current) => ({
      ...current,
      [examinationId]: true
    }));
    setVideoErrorsById((current) => ({
      ...current,
      [examinationId]: ""
    }));

    try {
      const detailedExamination = await getExaminationByIds(patient.id, examinationId);

      if (detailedExamination) {
        setPatient((current) => mergeExaminationDetails(current, examinationId, detailedExamination));
      }
    } catch (error) {
      setVideoErrorsById((current) => ({
        ...current,
        [examinationId]: error.message || "Could not load examination videos."
      }));
    } finally {
      setLoadingVideosById((current) => ({
        ...current,
        [examinationId]: false
      }));
    }
  }

  async function handleToggleExamination(examinationId) {
    const isClosing = expandedExaminationId === examinationId;
    setExpandedExaminationId(isClosing ? "" : examinationId);

    if (!isClosing) {
      await fetchExaminationVideos(examinationId);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const normalizedQuery = query.trim();

    setHasSearched(true);
    setExpandedExaminationId("");
    setCurrentPage(1);

    if (!normalizedQuery) {
      setPatient(null);
      setQueryError("Enter a patient id.");
      return;
    }

    await fetchPatient(normalizedQuery);
    setExpandedExaminationId("");
    setCurrentPage(1);
  }

  const filteredExaminations = useMemo(() => {
    if (!patient) {
      return [];
    }

    const normalizedSearch = examinationSearch.trim().toLowerCase();
    const startDate = parseDisplayDate(dateRange.start);
    const endDate = parseDisplayDate(dateRange.end);
    const inclusiveEndDate = endDate ? getEndOfDay(endDate) : null;

    return [...patient.examinations]
      .filter((examination) => {
        const idText = examination.id.toLowerCase();
        const displayText = (examination.displayName || examination.id).toLowerCase();
        return idText.includes(normalizedSearch) || displayText.includes(normalizedSearch);
      })
      .filter((examination) => {
        const examDate = parseExamDate(examination.date);

        if (startDate && examDate < startDate) {
          return false;
        }

        if (inclusiveEndDate && examDate > inclusiveEndDate) {
          return false;
        }

        return true;
      })
      .sort((left, right) => {
        let comparison = 0;

        if (sortConfig.key === "id") {
          comparison = (left.displayName || left.id).localeCompare(right.displayName || right.id);
        } else if (sortConfig.key === "date") {
          comparison = parseExamDate(left.date) - parseExamDate(right.date);
        } else if (sortConfig.key === "videos") {
          comparison = (left.videoCount ?? left.videos.length ?? 0) - (right.videoCount ?? right.videos.length ?? 0);
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
    const activeWorkflowContext = getActiveWorkflowContext();
    const isSameExamination =
      activeWorkflowContext?.patientId === patientId && activeWorkflowContext?.examinationId === examinationId;

    if (isSameExamination) {
      setActiveWorkflowContext({ patientId, examinationId, reportId: activeWorkflowContext.reportId });
      return;
    }

    resetExaminationWorkflowSession(patientId, examinationId);
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

      {isLoadingPatient ? (
        <Paper
          sx={{
            p: 3.5,
            borderRadius: 1,
            border: "1px solid rgba(148, 197, 255, 0.12)",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.2)"
          }}
        >
          <Typography>Loading patient examinations...</Typography>
        </Paper>
      ) : patient ? (
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
                  sx={{
                    color: "text.primary",
                    "& .MuiSelect-icon": {
                      color: "text.primary"
                    }
                  }}
                  onChange={(event) => {
                    setResultSize(Number(event.target.value));
                    setCurrentPage(1);
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        bgcolor: "background.paper",
                        color: "text.primary",
                        border: "1px solid rgba(47, 200, 216, 0.22)",
                        boxShadow: "0 18px 40px rgba(0, 0, 0, 0.32)",
                        "& .MuiMenuItem-root": {
                          color: "text.primary",
                          "&:hover": {
                            bgcolor: "rgba(88, 166, 255, 0.14)"
                          },
                          "&.Mui-selected": {
                            bgcolor: "rgba(47, 200, 216, 0.18)",
                            color: "text.primary"
                          },
                          "&.Mui-selected:hover": {
                            bgcolor: "rgba(47, 200, 216, 0.26)"
                          }
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
                  value={dateRange.start}
                  onChange={(event) => handleDateRangeChange("start", event.target.value)}
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ max: dateRange.end || undefined, lang: "en-GB" }}
                  fullWidth
                />
                <TextField
                  label="End date"
                  value={dateRange.end}
                  onChange={(event) => handleDateRangeChange("end", event.target.value)}
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: dateRange.start || undefined, lang: "en-GB" }}
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
                  {paginatedExaminations.map((examination, examinationIndex) => {
                    const isExpanded = expandedExaminationId === examination.id;
                    const examinationRowKey = `${examination.id}-${examination.date}-${examinationIndex}`;

                    return (
                      <Fragment key={examinationRowKey}>
                        <TableRow 
                          hover  
                          sx={{ '& > *': { borderBottom: 'unset' } }}
                        >
                          <TableCell  padding="none" 
                              sx={{ 
                                width: "1%",
                                whiteSpace: "nowrap"
                              }}
                          >
                            <IconButton
                              aria-label="expand row"
                              size="small"
                              onClick={() => {
                                void handleToggleExamination(examination.id);
                              }}
                            >
                              {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                            </IconButton>
                          </TableCell>
                          <TableCell>{examination.displayName || examination.id}</TableCell>
                          <TableCell>{formatExamDate(examination.date)}</TableCell>
                          <TableCell>{examination.videoCount ?? "-"}</TableCell>
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
                                    state={{
                                      patientId: patient.id,
                                      examinationId: examination.id,
                                      examination
                                    }}
                                    onClick={() => handleContinue(patient.id, examination.id)}
                                    variant="contained"
                                    disabled={examination.videos.length === 0 || loadingVideosById[examination.id]}
                                  >
                                    Continue
                                  </Button>
                                </Box>

                                {loadingVideosById[examination.id] ? (
                                  <Typography color="text.secondary">Loading examination videos...</Typography>
                                ) : videoErrorsById[examination.id] ? (
                                  <Typography color="error.main">{videoErrorsById[examination.id]}</Typography>
                                ) : examination.videos.length === 0 ? (
                                  <Typography color="text.secondary">No videos found for this examination.</Typography>
                                ) : (
                                  <TableContainer component={Box} sx={{ overflowX: "auto" }}>
                                    <Table size="small">
                                      <TableHead>
                                        <TableRow>
                                          <TableCell>Thumbnail</TableCell>
                                          <TableCell>Video Name</TableCell>
                                          <TableCell>Region</TableCell>
                                          <TableCell>Duration</TableCell>
                                          <TableCell>Description</TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {examination.videos.map((video, videoIndex) => (
                                          <TableRow key={`${video.id}-${videoIndex}`}>
                                            <TableCell>
                                              <VideoThumbnail thumbnail={video.thumbnail} region={video.region} name={video.name} />
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
                                )}
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
      ) : hasSearched ? (
        <Paper
          sx={{
            p: 3.5,
            borderRadius: 1,
            border: "1px solid rgba(148, 197, 255, 0.12)",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.2)"
          }}
        >
          <Typography variant="h4" gutterBottom>
            No patient found
          </Typography>
          <Typography color={queryError ? "error.main" : "text.secondary"}>
            {queryError || "No records found for this patient id."}
          </Typography>
        </Paper>
      ) : null}
    </Stack>
  );
}
