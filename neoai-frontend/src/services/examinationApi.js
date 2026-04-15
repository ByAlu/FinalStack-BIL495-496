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

function mapVideo(dto, index = 0) {
  const region = normalizeRegion(dto.region);
  const videoName = `${dto.examinationName || "exam"}-${region}.mp4`;
  return {
    id: `${dto.examinationName || "exam"}-${region}-${index}`,
    name: videoName,
    url: dto.url || "",
    thumbnail: dto.thumbnailUrl || dto.url || "",
    region,
    duration: "-",
    comment: "",
    fileSize: dto.fileSize ?? null
  };
}

function mapToExamination(videos, examinationId) {
  const normalizedVideos = (videos || []).map((video, index) => mapVideo(video, index));
  const firstVideo = videos?.[0];

  return {
    id: examinationId || firstVideo?.examinationName || "Unknown",
    date: formatDate(firstVideo?.uploadDate || firstVideo?.examinationDate),
    status: "AVAILABLE",
    videos: normalizedVideos
  };
}

export async function getPatientExaminations(patientIdInput) {
  const patientId = normalizePatientId(patientIdInput);

  if (!patientId) {
    return null;
  }

  try {
    const response = await api.get("/api/v1/examinations", {
      params: {
        patientId,
        size: 100
      }
    });

    const content = Array.isArray(response.data?.content) ? response.data.content : [];
    const groupedByExam = content.reduce((accumulator, item) => {
      const key = item.examinationName || "Unknown";
      if (!accumulator[key]) {
        accumulator[key] = [];
      }
      accumulator[key].push(item);
      return accumulator;
    }, {});

    const examinations = Object.entries(groupedByExam).map(([examName, videos]) => mapToExamination(videos, examName));

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
    const response = await api.get(`/api/v1/examinations/${patientId}/${examinationId}`);
    const videos = Array.isArray(response.data) ? response.data : [];
    return mapToExamination(videos, examinationId);
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }

    throw new Error(error.response?.data?.message || "Could not load examination data.");
  }
}
