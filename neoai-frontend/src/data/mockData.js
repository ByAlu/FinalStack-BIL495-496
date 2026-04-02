import sampleThumbnail from "./lus_sample_thumbnail.jpg";
import sampleVideo from "./lus_sample_video.mp4";

export const demoUsers = [
  {
    id: "doctor-elif",
    username: "doctor",
    password: "doctor123",
    fullName: "Dr. Elif Kaya",
    role: "DOCTOR",
    department: "Radiology",
    email: "elif.kaya@hospital.local",
    active: true
  },
  {
    id: "admin-deniz",
    username: "admin",
    password: "admin123",
    fullName: "Deniz Aydin",
    role: "ADMIN",
    department: "System Administration",
    email: "deniz.aydin@hospital.local",
    active: true
  }
];

function padNumber(value) {
  return String(value).padStart(4, "0");
}

function buildDateString(index) {
  const month = ((index - 1) % 12) + 1;
  const day = ((index * 3 - 1) % 28) + 1;
  const hour = 8 + (index % 9);
  const minute = (index * 7) % 60;

  return `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function createVideoSet(seed) {
  return [
    {
      name: `VID-${seed}01`,
      region: "r1",
      duration: "00:18",
      thumbnail: sampleThumbnail,
      videoUrl: sampleVideo,
      comment: "Left lobe sweep"
    },
    {
      name: `VID-${seed}02`,
      region: "r2",
      duration: "00:22",
      thumbnail: sampleThumbnail,
      videoUrl: sampleVideo,
      comment: "Upper pole focus"
    },
    {
      name: `VID-${seed}03`,
      region: "r3",
      duration: "00:20",
      thumbnail: sampleThumbnail,
      videoUrl: sampleVideo,
      comment: "Suspicious nodule view"
    },
    {
      name: `VID-${seed}04`,
      region: "r4",
      duration: "00:25",
      thumbnail: sampleThumbnail,
      videoUrl: sampleVideo,
      comment: "Transverse section"
    },
    {
      name: `VID-${seed}05`,
      region: "r5",
      duration: "00:17",
      thumbnail: sampleThumbnail,
      videoUrl: sampleVideo,
      comment: "Lower margin pass"
    },
    {
      name: `VID-${seed}06`,
      region: "r6",
      duration: "00:21",
      thumbnail: sampleThumbnail,
      videoUrl: sampleVideo,
      comment: "Right lobe close-up"
    }
  ];
}

function createExamination(index) {
  return {
    id: `Exam_${padNumber(1000 + index)}`,
    date: buildDateString(index),
    status: index % 5 === 0 ? "Archived" : "Ready for review",
    videos: createVideoSet(padNumber(index))
  };
}

export const patients = [
  {
    id: "PT-1001",
    name: "Aylin Yilmaz",
    age: 47,
    examinations: Array.from({ length: 55 }, (_, index) => createExamination(index + 1))
  },
  {
    id: "PT-1002",
    name: "Kerem Demir",
    age: 55,
    examinations: Array.from({ length: 8 }, (_, index) => createExamination(index + 101))
  }
];

export const preprocessingOptions = [
  {
    key: "denoise",
    label: "Noise reduction",
    description: "Smooth the selected ultrasound frames before diagnosis.",
    enabled: true,
    intensity: 45
  },
  {
    key: "contrast",
    label: "Contrast normalization",
    description: "Standardize intensity distribution between regions.",
    enabled: true,
    intensity: 60
  },
  {
    key: "crop",
    label: "Region focused crop",
    description: "Trim unused borders before sending images to the AI module.",
    enabled: false,
    intensity: 30
  }
];

export const aiModels = [
  {
    id: "thyroid-v2",
    name: "Thyroid Insight v2",
    specialty: "Ultrasound lesion classification",
    turnaround: "25 sec",
    confidence: "High"
  },
  {
    id: "nodex-lite",
    name: "Nodex Lite",
    specialty: "Fast screening",
    turnaround: "12 sec",
    confidence: "Medium"
  }
];

export const reportTemplates = [
  {
    id: "REP-2001",
    patientId: "PT-1001",
    examinationId: "Exam_1001",
    title: "AI Diagnostic Report",
    summary: "Suspicious nodule detected in region r3. Recommend specialist confirmation.",
    findings: [
      "Selected 6 representative frames, one per region.",
      "Applied denoise and contrast normalization before inference.",
      "Highest anomaly probability observed in region r3."
    ],
    confidence: "89%",
    exportedFormats: ["PDF", "DOCX"]
  }
];

export const auditEntries = [
  {
    id: "AUD-1",
    actor: "Deniz Aydin",
    action: "Created user",
    target: "Dr. Aylin Aras",
    timestamp: "2026-04-01 09:10"
  },
  {
    id: "AUD-2",
    actor: "Dr. Elif Kaya",
    action: "Generated AI report",
    target: "EX-2026-041",
    timestamp: "2026-04-01 11:42"
  }
];
