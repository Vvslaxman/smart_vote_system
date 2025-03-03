
import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define both model directories
const CLIENT_MODELS_DIR = './client/public/models';
const PUBLIC_MODELS_DIR = './public/models';

const BASE_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

const models = [
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1.bin',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1.bin',
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1.bin'
];

// Ensure directories exist
for (const dir of [CLIENT_MODELS_DIR, PUBLIC_MODELS_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
}

// Function to download a file with proper error handling
function downloadFile(fileUrl, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading ${fileUrl} to ${outputPath}`);
    const file = fs.createWriteStream(outputPath);
    
    https.get(fileUrl, response => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${fileUrl}: Status code ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`Successfully downloaded ${fileUrl}`);
        resolve();
      });
    }).on('error', err => {
      fs.unlink(outputPath, () => {}); // Delete the file if there was an error
      reject(err);
    });
    
    file.on('error', err => {
      fs.unlink(outputPath, () => {}); // Delete the file if there was an error
      reject(err);
    });
  });
}

// Download all model files to both directories
async function downloadAllModels() {
  for (const model of models) {
    const fileUrl = `${BASE_URL}/${model}`;
    
    try {
      // Download to client/public/models
      await downloadFile(fileUrl, path.join(CLIENT_MODELS_DIR, model));
      
      // Download to public/models (or copy from the first one to save bandwidth)
      if (fs.existsSync(path.join(CLIENT_MODELS_DIR, model))) {
        fs.copyFileSync(
          path.join(CLIENT_MODELS_DIR, model),
          path.join(PUBLIC_MODELS_DIR, model)
        );
        console.log(`Copied ${model} to ${PUBLIC_MODELS_DIR}`);
      } else {
        await downloadFile(fileUrl, path.join(PUBLIC_MODELS_DIR, model));
      }
    } catch (error) {
      console.error(`Error processing ${model}:`, error.message);
    }
  }
  
  console.log('All model files have been processed.');
}

downloadAllModels().catch(err => {
  console.error('Download failed:', err);
  process.exit(1);
});
