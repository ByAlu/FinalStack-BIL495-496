import { api } from "./httpClient";

function normalizePatientId(patientId) {
  if (patientId === null || patientId === undefined) {
    return null;
  }

  const text = String(patientId).trim();
  const match = text.match(/\d+/);
  return match ? match[0] : null;
}

function normalizeRegion(regionValue) {
  if (!regionValue) {
    return "r1";
  }

  return String(regionValue).toLowerCase();
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "-";
  }

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return String(dateValue);
  }

  const yyyy = parsed.getFullYear();
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const dd = String(parsed.getDate()).padStart(2, "0");
  const hh = String(parsed.getHours()).padStart(2, "0");
  const min = String(parsed.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function normalizeExaminationDisplayName(value) {
  if (!value) {
    return "Unknown";
  }

  const text = String(value);
  const markerIndex = text.indexOf("_EX_");

  if (markerIndex >= 0) {
    return text.slice(markerIndex + 1);
  }

  return text;
}

function mapVideo(dto, index = 0) {
  const region = normalizeRegion(dto.region);
  const videoName = `${dto.examinationName || "exam"}-${region}.mp4`;
  return {
    id: `${dto.examinationName || "exam"}-${region}-${index}`,
    name: videoName,
    url: dto.url || "",
    thumbnail: dto.thumbnailUrl || "",
    region,
    duration: "-",
    comment: "",
    fileSize: dto.fileSize ?? null
  };
}

function mapExaminationSummary(dto) {
  const fullName = dto.fullName || dto.examinationName || "Unknown";

  return {
    id: fullName,
    displayName: dto.examinationName || normalizeExaminationDisplayName(fullName),
    date: formatDate(dto.examinationDate),
    status: "AVAILABLE",
    videos: [],
    videoCount: null
  };
}

function mapToExamination(videos, examinationId) {
  const normalizedVideos = (videos || []).map((video, index) => mapVideo(video, index));
  const firstVideo = videos?.[0];
  const resolvedId = examinationId || firstVideo?.examinationName || "Unknown";

  return {
    id: resolvedId,
    displayName: normalizeExaminationDisplayName(resolvedId),
    date: formatDate(firstVideo?.uploadDate || firstVideo?.examinationDate),
    status: "AVAILABLE",
    videos: normalizedVideos,
    videoCount: normalizedVideos.length
  };
}

export async function getPatientExaminations(patientIdInput) {
  const patientId = normalizePatientId(patientIdInput);

  if (!patientId) {
    return null;
  }

  try {
    let nextPageToken = null;
    const examinations = [];

    do {
      const response = await api.get(`/api/v1/examinations/${patientId}`, {
        params: {
          size: 100,
          ...(nextPageToken ? { token: nextPageToken } : {})
        }
      });

      const content = Array.isArray(response.data?.content) ? response.data.content : [];
      examinations.push(...content.map(mapExaminationSummary));
      nextPageToken = response.data?.nextPageToken || null;
    } while (nextPageToken);

    return {
      id: `PT-${patientId}`,
      name: `Patient ${patientId}`,
      examinations
    };
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }

    throw new Error(error.response?.data?.message || "Could not load patient examinations.");
  }
}

export async function getExaminationByIds(patientIdInput, examinationId) {
  const patientId = normalizePatientId(patientIdInput);

  if (!patientId || !examinationId) {
    return null;
  }

  try {
    const response = await api.get(`/api/v1/examinations/${patientId}/${encodeURIComponent(examinationId)}`);
    const videos = Array.isArray(response.data) ? response.data : [];
    return mapToExamination(videos, examinationId);
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }

    throw new Error(error.response?.data?.message || "Could not load examination data.");
  }
}
