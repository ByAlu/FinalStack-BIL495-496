import sampleThumbnail from "./black_thumbnail.jpg";
import r2 from "./r2.mp4";
import r3 from "./r3.mp4";
import r4 from "./r4.mp4";
import r5 from "./r5.mp4";
import r6 from "./r6.mp4";

// video URL for R1. test ederken yenilemek gerekebilir.
const r1 =
  "https://storage.googleapis.com/neoai-storage-v1/ai/PT_1001/EX_123/R1.mp4?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=neoai-web-storage%40neoai-web-492100.iam.gserviceaccount.com%2F20260415%2Fauto%2Fstorage%2Fgoog4_request&X-Goog-Date=20260415T212044Z&X-Goog-Expires=3600&X-Goog-SignedHeaders=host&X-Goog-Signature=5740cc1cb07a0adbe165b2ca285df33fc3cef5ad17f6cf2ddbbfd9c3006d5ad31dc35ea8d8c5a8eb49e13f22ab4cbb696d328761067b4e77f160e574930418f135e94e7aac3d20a8a5ee2e3fedd0a474b38bf937253c722e56b6e9863e48dcbe2a0119f76b8d8bc4f23c2a038ce004f5402cce510cbf15f4e9ae1d84ecd5db5afd33f2ab381ba0fc728d7403ac1896e09f269a29dfe8527ba9274d535adf15a548699f5862d945ff3f16c680dbd36e71652c5c26975a31807a43bc2a191c1ef3ea5ec5acfe0f264c95bc2349a2ba035dfecb417e3e826d660a79fb59fab96fea7299350e361f22d3548aa4d5ad366b0aab43edd56c4febc8b14ae94ddf82b8fb";

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
      videoUrl: r1,
      comment: "Left lobe sweep"
    },
    {
      name: `VID-${seed}02`,
      region: "r2",
      duration: "00:22",
      thumbnail: sampleThumbnail,
      videoUrl: r2,
      comment: "Upper pole focus"
    },
    {
      name: `VID-${seed}03`,
      region: "r3",
      duration: "00:20",
      thumbnail: sampleThumbnail,
      videoUrl: r3,
      comment: "Suspicious nodule view"
    },
    {
      name: `VID-${seed}04`,
      region: "r4",
      duration: "00:25",
      thumbnail: sampleThumbnail,
      videoUrl: r4,
      comment: "Transverse section"
    },
    {
      name: `VID-${seed}05`,
      region: "r5",
      duration: "00:17",
      thumbnail: sampleThumbnail,
      videoUrl: r5,
      comment: "Lower margin pass"
    },
    {
      name: `VID-${seed}06`,
      region: "r6",
      duration: "00:21",
      thumbnail: sampleThumbnail,
      videoUrl: r6,
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


export const aiRegionResults = {
  r1: {
    region: "R1",
    image_quality: "acceptable",
    b_line_module: {
      count: 6,
      bounding_boxes: [
        { x: 110, y: 75, width: 40, height: 245, confidence: 0.94 },
        { x: 180, y: 80, width: 40, height: 230, confidence: 0.91 },
        { x: 250, y: 85, width: 40, height: 215, confidence: 0.9 }
      ]
    },
    rds_score_module: {
      score: 3
    }
  },
  r2: {
    region: "R2",
    image_quality: "acceptable",
    b_line_module: {
      count: 4,
      bounding_boxes: [
        { x: 90, y: 88, width: 36, height: 214, confidence: 0.9 },
        { x: 190, y: 78, width: 36, height: 236, confidence: 0.88 }
      ]
    },
    rds_score_module: {
      score: 2
    }
  },
  r3: {
    region: "R3",
    image_quality: "acceptable",
    b_line_module: {
      count: 8,
      bounding_boxes: [
        { x: 72, y: 80, width: 38, height: 235, confidence: 0.95 },
        { x: 130, y: 82, width: 40, height: 240, confidence: 0.94 },
        { x: 205, y: 76, width: 41, height: 242, confidence: 0.92 },
        { x: 278, y: 84, width: 38, height: 224, confidence: 0.91 }
      ]
    },
    rds_score_module: {
      score: 3
    }
  },
  r4: {
    region: "R4",
    image_quality: "acceptable",
    b_line_module: {
      count: 3,
      bounding_boxes: [
        { x: 118, y: 92, width: 36, height: 194, confidence: 0.86 },
        { x: 234, y: 88, width: 36, height: 207, confidence: 0.84 }
      ]
    },
    rds_score_module: {
      score: 2
    }
  },
  r5: {
    region: "R5",
    image_quality: "suboptimal",
    b_line_module: {
      count: 5,
      bounding_boxes: [
        { x: 96, y: 94, width: 39, height: 212, confidence: 0.89 },
        { x: 164, y: 91, width: 38, height: 207, confidence: 0.87 },
        { x: 258, y: 96, width: 38, height: 194, confidence: 0.85 }
      ]
    },
    rds_score_module: {
      score: 2
    }
  },
  r6: {
    region: "R6",
    image_quality: "acceptable",
    b_line_module: {
      count: 2,
      bounding_boxes: [
        { x: 140, y: 86, width: 38, height: 190, confidence: 0.8 },
        { x: 232, y: 94, width: 36, height: 188, confidence: 0.79 }
      ]
    },
    rds_score_module: {
      score: 1
    }
  }
};

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
