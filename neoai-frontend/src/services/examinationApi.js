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

function mapExaminations(videos) {
  const grouped = new Map();

  videos.forEach((video, index) => {
    const examinationId = video.examinationName || `Exam_${index + 1}`;
    const examinationDate = formatDateTime(video.examinationDate || video.uploadDate);
    const current = grouped.get(examinationId);
    const mappedVideo = mapVideo(video, index);

    if (!current) {
      grouped.set(examinationId, {
        id: examinationId,
        date: examinationDate || "Unknown date",
        videos: [mappedVideo]
      });
      return;
    }

    current.videos.push(mappedVideo);

    if (!current.date || current.date === "Unknown date") {
      current.date = examinationDate || current.date;
    }
  });

  return Array.from(grouped.values());
}

async function getAllExaminationVideos(patientId) {
  const content = [];
  let nextPageToken;
  let hasNext = true;
  let safetyCounter = 0;

  while (hasNext && safetyCounter < 20) {
    const response = await api.get("/api/v1/examinations", {
      params: {
        patientId,
        pageToken: nextPageToken
      }
    });

    const page = response.data || {};
    content.push(...(page.content || []));
    nextPageToken = page.nextPageToken;
    hasNext = Boolean(page.hasNext);
    safetyCounter += 1;
  }

  return content;
}

export async function getPatientExaminations(patientIdInput) {
  try {
    const patientId = normalizePatientId(patientIdInput);
    const videos = await getAllExaminationVideos(patientId);

    return {
      id: String(patientIdInput).trim(),
      name: `Patient ${patientId}`,
      examinations: mapExaminations(videos)
    };
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data?.message || "Could not load examination videos.");
    }

    throw error instanceof Error ? error : new Error("Could not reach the server.");
  }
}
