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


export const aiRegionResults = {
  r1: {
    region: "R1",
    image_quality: "acceptable",
    b_line_module: {
      b_line_count: 6,
      pattern: "multiple",
      bounding_boxes: [
        { x_min: 110, y_min: 75, x_max: 150, y_max: 320, confidence: 0.94 },
        { x_min: 180, y_min: 80, x_max: 220, y_max: 310, confidence: 0.91 },
        { x_min: 250, y_min: 85, x_max: 290, y_max: 300, confidence: 0.9 }
      ],
      pleural_line: {
        status: "irregular",
        confidence: 0.88
      },
      white_lung: false,
      confidence: 0.92
    },
    rds_score_module: {
      region_score: 2,
      severity_label: "moderate_loss_of_aeration",
      findings: ["multiple B-lines", "irregular pleural line"],
      confidence: 0.89
    }
  },
  r2: {
    region: "R2",
    image_quality: "acceptable",
    b_line_module: {
      b_line_count: 4,
      pattern: "focal",
      bounding_boxes: [
        { x_min: 90, y_min: 88, x_max: 126, y_max: 302, confidence: 0.9 },
        { x_min: 190, y_min: 78, x_max: 226, y_max: 314, confidence: 0.88 }
      ],
      pleural_line: {
        status: "regular",
        confidence: 0.82
      },
      white_lung: false,
      confidence: 0.87
    },
    rds_score_module: {
      region_score: 1,
      severity_label: "mild_loss_of_aeration",
      findings: ["focal B-lines"],
      confidence: 0.85
    }
  },
  r3: {
    region: "R3",
    image_quality: "acceptable",
    b_line_module: {
      b_line_count: 8,
      pattern: "confluent",
      bounding_boxes: [
        { x_min: 72, y_min: 80, x_max: 110, y_max: 315, confidence: 0.95 },
        { x_min: 130, y_min: 82, x_max: 170, y_max: 322, confidence: 0.94 },
        { x_min: 205, y_min: 76, x_max: 246, y_max: 318, confidence: 0.92 },
        { x_min: 278, y_min: 84, x_max: 316, y_max: 308, confidence: 0.91 }
      ],
      pleural_line: {
        status: "irregular",
        confidence: 0.91
      },
      white_lung: true,
      confidence: 0.95
    },
    rds_score_module: {
      region_score: 3,
      severity_label: "severe_loss_of_aeration",
      findings: ["confluent B-lines", "white lung pattern", "irregular pleural line"],
      confidence: 0.94
    }
  },
  r4: {
    region: "R4",
    image_quality: "acceptable",
    b_line_module: {
      b_line_count: 3,
      pattern: "focal",
      bounding_boxes: [
        { x_min: 118, y_min: 92, x_max: 154, y_max: 286, confidence: 0.86 },
        { x_min: 234, y_min: 88, x_max: 270, y_max: 295, confidence: 0.84 }
      ],
      pleural_line: {
        status: "regular",
        confidence: 0.8
      },
      white_lung: false,
      confidence: 0.83
    },
    rds_score_module: {
      region_score: 1,
      severity_label: "mild_loss_of_aeration",
      findings: ["limited focal B-lines"],
      confidence: 0.81
    }
  },
  r5: {
    region: "R5",
    image_quality: "suboptimal",
    b_line_module: {
      b_line_count: 5,
      pattern: "multiple",
      bounding_boxes: [
        { x_min: 96, y_min: 94, x_max: 135, y_max: 306, confidence: 0.89 },
        { x_min: 164, y_min: 91, x_max: 202, y_max: 298, confidence: 0.87 },
        { x_min: 258, y_min: 96, x_max: 296, y_max: 290, confidence: 0.85 }
      ],
      pleural_line: {
        status: "irregular",
        confidence: 0.84
      },
      white_lung: false,
      confidence: 0.86
    },
    rds_score_module: {
      region_score: 2,
      severity_label: "moderate_loss_of_aeration",
      findings: ["multiple B-lines", "reduced image quality"],
      confidence: 0.83
    }
  },
  r6: {
    region: "R6",
    image_quality: "acceptable",
    b_line_module: {
      b_line_count: 2,
      pattern: "isolated",
      bounding_boxes: [
        { x_min: 140, y_min: 86, x_max: 178, y_max: 276, confidence: 0.8 },
        { x_min: 232, y_min: 94, x_max: 268, y_max: 282, confidence: 0.79 }
      ],
      pleural_line: {
        status: "regular",
        confidence: 0.77
      },
      white_lung: false,
      confidence: 0.78
    },
    rds_score_module: {
      region_score: 0,
      severity_label: "normal_aeration",
      findings: ["isolated B-lines within normal limits"],
      confidence: 0.76
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
