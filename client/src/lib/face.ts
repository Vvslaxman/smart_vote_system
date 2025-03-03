
import * as faceapi from 'face-api.js';

let modelsLoaded = false;

async function tryLoadModels(retries = 3): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${retries} to load face detection models...`);
      const MODEL_URL = '/models';
      
      await Promise.all([
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      ]);

      console.log("Face detection models loaded successfully");
      modelsLoaded = true;
      return;
    } catch (error) {
      console.error(`Attempt ${attempt}/${retries} failed:`, error);
      if (attempt === retries) {
        throw new Error(`Failed to load face detection models after ${retries} attempts`);
      }
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

export async function loadModels(): Promise<void> {
  if (modelsLoaded) return;
  console.log("Loading face detection models...");
  await tryLoadModels();
}

export async function getFaceDescriptor(image: HTMLImageElement | HTMLVideoElement): Promise<Float32Array> {
  if (!modelsLoaded) {
    await loadModels();
  }

  const detections = await faceapi.detectSingleFace(image)
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detections) {
    throw new Error("No face detected");
  }

  return detections.descriptor;
}

export async function getFaceDescriptors(
  video: HTMLVideoElement,
  progressCallback?: (count: number, timeLeft: number) => void
): Promise<Float32Array[]> {
  if (!modelsLoaded) {
    await loadModels();
  }

  const descriptors: Float32Array[] = [];
  const targetCount = 10;
  const totalTime = 15; // seconds
  let startTime = Date.now();
  let count = 0;

  while (count < targetCount) {
    try {
      const timeElapsed = (Date.now() - startTime) / 1000;
      const timeLeft = Math.max(0, Math.round(totalTime - timeElapsed));
      
      if (timeElapsed >= totalTime) {
        break;
      }

      // Update progress
      if (progressCallback) {
        progressCallback(count, timeLeft);
      }

      // Detect face and get descriptor
      const detection = await faceapi.detectSingleFace(video)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        descriptors.push(detection.descriptor);
        count++;
        
        // Wait a bit before capturing the next image
        await new Promise(resolve => setTimeout(resolve, 800));
      } else {
        // If no face detected, try again after a short delay
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error("Error during face capture:", error);
      // Continue trying despite errors
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  if (descriptors.length === 0) {
    throw new Error("Could not capture any faces");
  }

  return descriptors;
}

export function compareFaces(
  liveDescriptor: Float32Array,
  storedDescriptors: Float32Array[],
  threshold = 0.5,
  minMatchesRequired = 3
): boolean {
  if (!liveDescriptor || !storedDescriptors || storedDescriptors.length === 0) {
    return false;
  }

  let matches = 0;
  const distances: number[] = [];

  for (const storedDescriptor of storedDescriptors) {
    const distance = faceapi.euclideanDistance(liveDescriptor, storedDescriptor);
    distances.push(distance);
    if (distance < threshold) {
      matches++;
    }
  }

  console.log(`Face comparison results:
    - Total stored descriptors: ${storedDescriptors.length}
    - Matches found: ${matches}
    - Minimum required: ${minMatchesRequired}
    - Average distance: ${distances.reduce((a, b) => a + b, 0) / distances.length}
    - Best match distance: ${Math.min(...distances)}
  `);

  return matches >= minMatchesRequired;
}
