function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image for preprocessing."));
    image.src = src;
  });
}

export async function applyMedianFilter(src, kernelSize = 3) {
  if (!src || kernelSize <= 1) {
    return src;
  }

  if (!window.cv?.medianBlur) {
    throw new Error("OpenCV is not ready yet.");
  }

  const image = await loadImage(src);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  const sourceContext = sourceCanvas.getContext("2d");
  sourceContext.drawImage(image, 0, 0, width, height);
  const targetCanvas = document.createElement("canvas");
  targetCanvas.width = width;
  targetCanvas.height = height;

  const sourceMat = window.cv.imread(sourceCanvas);
  const targetMat = new window.cv.Mat();

  try {
    window.cv.medianBlur(sourceMat, targetMat, kernelSize);
    window.cv.imshow(targetCanvas, targetMat);
    return targetCanvas.toDataURL("image/png");
  } finally {
    sourceMat.delete();
    targetMat.delete();
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
  }

  return currentSrc;
}
