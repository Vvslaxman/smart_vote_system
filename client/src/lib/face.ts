
import * as blazeface from '@tensorflow-models/blazeface';
import * as tf from '@tensorflow/tfjs';

let faceModel: blazeface.BlazeFaceModel | null = null;

export async function loadModels(): Promise<void> {
  if (faceModel) return;
  
  console.log("Loading BlazeFace model...");
  try {
    await tf.ready();
    faceModel = await blazeface.load();
    console.log("Face detection model loaded successfully");
  } catch (error) {
    console.error("Error loading face detection model:", error);
    throw error;
  }
}

// Clean descriptor to ensure it can be safely stored in JSON
function sanitizeDescriptor(descriptor: Float32Array): number[] {
  return Array.from(descriptor).map(val => 
    isFinite(val) ? val : 0 // Replace Infinity with 0
  );
}

export async function getFaceDescriptor(image: HTMLImageElement | HTMLVideoElement): Promise<Float32Array> {
  if (!faceModel) {
    await loadModels();
  }
  
  if (!faceModel) {
    throw new Error("Face model failed to load");
  }

  const predictions = await faceModel.estimateFaces(image, false);
  
  if (predictions.length === 0) {
    throw new Error("No face detected");
  }
  
  // Extract the first face features
  const face = predictions[0];
  // Create a normalized descriptor from the face landmarks
  const descriptor = new Float32Array(128); // Standard length for face descriptors
  
  // Fill with normalized values from the face landmarks
  const landmarks = face.landmarks as number[][] || [];
  for (let i = 0; i < landmarks.length && i < 6; i++) {
    const point = landmarks[i];
    descriptor[i*2] = point[0] / image.width;
    descriptor[i*2+1] = point[1] / image.height;
  }
  
  // Add other normalized face features
  if (face.probability) {
    if (Array.isArray(face.probability)) {
      descriptor[12] = face.probability[0];
    } else if (typeof face.probability === 'number') {
      descriptor[12] = face.probability;
    }
  }
  
  // Add face box dimensions
  const box = face.topLeft && face.bottomRight ? {
    x: (face.topLeft as [number, number])[0],
    y: (face.topLeft as [number, number])[1],
    width: (face.bottomRight as [number, number])[0] - (face.topLeft as [number, number])[0],
    height: (face.bottomRight as [number, number])[1] - (face.topLeft as [number, number])[1]
  } : null;
  
  if (box) {
    descriptor[13] = box.x / image.width;
    descriptor[14] = box.y / image.height;
    descriptor[15] = box.width / image.width;
    descriptor[16] = box.height / image.height;
  }
  
  return descriptor;
}

export async function getFaceDescriptors(
  video: HTMLVideoElement,
  progressCallback?: (count: number, timeLeft: number) => void
): Promise<Float32Array[]> {
  if (!faceModel) {
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
      const descriptor = await getFaceDescriptor(video);
      descriptors.push(descriptor);
      count++;
      
      // Wait a bit before capturing the next image
      await new Promise(resolve => setTimeout(resolve, 800));
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
  threshold = 0.6,
  minMatchesRequired = 3
): boolean {
  if (!liveDescriptor || !storedDescriptors || storedDescriptors.length === 0) {
    return false;
  }

  let matches = 0;
  const distances: number[] = [];

  for (const storedDescriptor of storedDescriptors) {
    const distance = euclideanDistance(liveDescriptor, storedDescriptor);
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

// Calculate Euclidean distance between two descriptors
function euclideanDistance(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    return Infinity;
  }
  
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const aVal = isFinite(a[i]) ? a[i] : 0;
    const bVal = isFinite(b[i]) ? b[i] : 0;
    const diff = aVal - bVal;
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

// Function to safely convert descriptors for storage
export function prepareDescriptorsForStorage(descriptors: Float32Array[]): number[][] {
  return descriptors.map(d => sanitizeDescriptor(d));
}

// Function to parse descriptor strings back to Float32Array
export function parseStoredDescriptors(storedDescriptors: any[]): Float32Array[] {
  return storedDescriptors.map(d => {
    if (Array.isArray(d)) {
      return new Float32Array(d);
    } else if (typeof d === 'string') {
      try {
        return new Float32Array(JSON.parse(d));
      } catch (e) {
        console.error("Error parsing descriptor:", e);
        return new Float32Array(128); // Return empty descriptor if parsing fails
      }
    } else {
      return new Float32Array(128);
    }
  });
}
