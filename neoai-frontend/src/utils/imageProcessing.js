function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image for preprocessing."));
    image.src = src;
  });
}

function ensureOpenCvReady() {
  if (!window.cv) {
    throw new Error("OpenCV is not ready yet.");
  }
}

function loadMatFromSourceCanvas(src, width, height) {
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  const sourceContext = sourceCanvas.getContext("2d");
  sourceContext.drawImage(src, 0, 0, width, height);
  return window.cv.imread(sourceCanvas);
}

function matToDataUrl(mat) {
  const targetCanvas = document.createElement("canvas");
  targetCanvas.width = mat.cols;
  targetCanvas.height = mat.rows;
  window.cv.imshow(targetCanvas, mat);
  return targetCanvas.toDataURL("image/png");
}

export async function applyMedianFilter(src, kernelSize = 3) {
  if (!src || kernelSize <= 1) {
    return src;
  }

  ensureOpenCvReady();

  const image = await loadImage(src);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const sourceMat = loadMatFromSourceCanvas(image, width, height);
  const targetMat = new window.cv.Mat();

  try {
    window.cv.medianBlur(sourceMat, targetMat, kernelSize);
    return matToDataUrl(targetMat);
  } finally {
    sourceMat.delete();
    targetMat.delete();
  }
}

export async function applyClahe(src, clipLimit = 2) {
  if (!src) {
    return src;
  }

  ensureOpenCvReady();

  const image = await loadImage(src);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const sourceMat = loadMatFromSourceCanvas(image, width, height);
  const grayMat = new window.cv.Mat();
  const claheMat = new window.cv.Mat();
  const outputMat = new window.cv.Mat();
  const tileGridSize = new window.cv.Size(8, 8);
  const clahe =
    typeof window.cv.createCLAHE === "function"
      ? window.cv.createCLAHE(clipLimit, tileGridSize)
      : typeof window.cv.CLAHE === "function"
        ? new window.cv.CLAHE(clipLimit, tileGridSize)
        : null;

  if (!clahe?.apply) {
    throw new Error("CLAHE is not available in this OpenCV build.");
  }

  try {
    window.cv.cvtColor(sourceMat, grayMat, window.cv.COLOR_RGBA2GRAY);
    clahe.apply(grayMat, claheMat);
    window.cv.cvtColor(claheMat, outputMat, window.cv.COLOR_GRAY2RGBA);
    return matToDataUrl(outputMat);
  } finally {
    sourceMat.delete();
    grayMat.delete();
    claheMat.delete();
    outputMat.delete();
    clahe.delete();
  }
}

export async function applySharpen(src, strength = 1) {
  if (!src || strength <= 0) {
    return src;
  }

  ensureOpenCvReady();

  const image = await loadImage(src);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const sourceMat = loadMatFromSourceCanvas(image, width, height);
  const outputMat = new window.cv.Mat();
  const kernel = window.cv.matFromArray(3, 3, window.cv.CV_32F, [
    0,
    -1,
    0,
    -1,
    4 + strength,
    -1,
    0,
    -1,
    0
  ]);

  try {
    window.cv.filter2D(sourceMat, outputMat, -1, kernel);
    return matToDataUrl(outputMat);
  } finally {
    sourceMat.delete();
    outputMat.delete();
    kernel.delete();
  }
}

export async function applyOperationsToFrame(src, operations) {
  let currentSrc = src;

  for (const operation of operations) {
    if (!operation.enabled) {
      continue;
    }

    if (operation.type === "median-filter") {
      currentSrc = await applyMedianFilter(currentSrc, operation.kernelSize);
    }

    if (operation.type === "clahe") {
      currentSrc = await applyClahe(currentSrc, operation.clipLimit);
    }

    if (operation.type === "sharpen") {
      currentSrc = await applySharpen(currentSrc, operation.strength);
    }
  }

  return currentSrc;
}
