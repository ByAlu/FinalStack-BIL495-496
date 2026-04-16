import { api } from "./httpClient";

function normalizePatientId(patientId) {
  const normalizedValue = String(patientId || "").trim();
  const numericPart = normalizedValue.replace(/[^\d]/g, "");
  const parsedId = Number(numericPart);

  if (!numericPart || Number.isNaN(parsedId)) {
    throw new Error("Please provide a valid patient id.");
  }

  return parsedId;
}

function getVideoName(video) {
  if (video.url) {
    const urlWithoutQuery = video.url.split("?")[0];
    const pathSegments = urlWithoutQuery.split("/");
    const filename = pathSegments[pathSegments.length - 1];
    if (filename) {
      return filename;
    }
  }

  return `${video.examinationName || "Exam"}-${video.region || "video"}`;
}

function formatDateTime(value) {
  if (!value) {
    return "";
  }

  return String(value).replace("T", " ").slice(0, 16);
}

function formatBytes(bytes) {
  if (!bytes || Number.isNaN(Number(bytes))) {
    return "";
  }

  const units = ["B", "KB", "MB", "GB"];
  let size = Number(bytes);
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function mapVideo(video, index) {
  const fileSize = formatBytes(video.fileSize);

  return {
    id: `${video.examinationName || "exam"}-${video.region || "region"}-${index}`,
    name: getVideoName(video),
    region: String(video.region || "").toLowerCase(),
    duration: video.duration || "--",
    comment: video.description || (fileSize ? `File size: ${fileSize}` : "No description"),
    thumbnail: video.thumbnailUrl || "",
    videoUrl: video.url || ""
  };
}

function formatDuration(seconds) {
  if (seconds === undefined || seconds === null || Number.isNaN(Number(seconds))) {
    return "--";
  }

  const totalSeconds = Math.max(0, Number(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function mapGroupedExaminations(payload) {
  const exams = payload?.exams || {};
  const mappedExams = Object.entries(exams).map(([examName, regions]) => {
    const regionEntries = Object.entries(regions || {});
    const videos = regionEntries.map(([region, regionData], index) =>
      mapVideo(
        {
          examinationName: examName,
          region: region.toUpperCase(),
          url: regionData?.url || "",
          fileSize: regionData?.fileSize,
          uploadDate: regionData?.uploadDate,
          thumbnailUrl: regionData?.thumbnailUrl,
          description: regionData?.description,
          duration: formatDuration(regionData?.videoLengthSeconds)
        },
        index
      )
    );

    const firstUploadDate = regionEntries.find(([, regionData]) => regionData?.uploadDate)?.[1]?.uploadDate;
    return {
      id: examName,
      date: formatDateTime(firstUploadDate) || "Unknown date",
      videos
    };
  });

  return mappedExams;
}

export async function getPatientExaminations(patientIdInput, options = {}) {
  try {
    const patientId = normalizePatientId(patientIdInput);
    const page = options.page ?? 0;
    const size = options.size ?? 10;
    const response = await api.get("/api/v1/examinations", {
      params: {
        patientId,
        page,
        size
      }
    });
    const data = response.data || {};
    const payload = data.content?.[0] || {};

    return {
      id: String(patientIdInput).trim(),
      name: `Patient ${patientId}`,
      examinations: mapGroupedExaminations(payload),
      hasNext: Boolean(data.hasNext),
      pageNumber: page
    };
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data?.message || "Could not load examination videos.");
    }

    throw error instanceof Error ? error : new Error("Could not reach the server.");
  }
}
