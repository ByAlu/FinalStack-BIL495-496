function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image for preprocessing."));
    image.src = src;
  });
}

function getMedian(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

export async function applyMedianFilter(src, kernelSize = 3) {
  if (!src || kernelSize <= 1) {
    return src;
  }

  const image = await loadImage(src);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
  sourceContext.drawImage(image, 0, 0, width, height);

  const sourceData = sourceContext.getImageData(0, 0, width, height);
  const targetData = sourceContext.createImageData(width, height);
  const radius = Math.floor(kernelSize / 2);
  const bufferR = [];
  const bufferG = [];
  const bufferB = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      bufferR.length = 0;
      bufferG.length = 0;
      bufferB.length = 0;

      for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
        const sampleY = Math.min(height - 1, Math.max(0, y + offsetY));

        for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
          const sampleX = Math.min(width - 1, Math.max(0, x + offsetX));
          const sampleIndex = (sampleY * width + sampleX) * 4;
          bufferR.push(sourceData.data[sampleIndex]);
          bufferG.push(sourceData.data[sampleIndex + 1]);
          bufferB.push(sourceData.data[sampleIndex + 2]);
        }
      }

      const pixelIndex = (y * width + x) * 4;
      targetData.data[pixelIndex] = getMedian(bufferR);
      targetData.data[pixelIndex + 1] = getMedian(bufferG);
      targetData.data[pixelIndex + 2] = getMedian(bufferB);
      targetData.data[pixelIndex + 3] = sourceData.data[pixelIndex + 3];
    }
  }

  sourceContext.putImageData(targetData, 0, 0);
  return sourceCanvas.toDataURL("image/png");
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
