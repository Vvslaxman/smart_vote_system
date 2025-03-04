import { existsSync, mkdirSync, createWriteStream, unlink, createReadStream } from 'fs';  // Import createReadStream
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { get } from 'https';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MODEL_DIR = join(__dirname, 'client', 'public', 'models');
const PUBLIC_MODEL_DIR = join(__dirname, 'public', 'models');

// Ensure the models directories exist
for (const dir of [MODEL_DIR, PUBLIC_MODEL_DIR]) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
}

const MODEL_FILES = [
  {
    name: 'model.json',
    url: 'https://tfhub.dev/mediapipe/tfjs-model/blazeface/1/default/1/model.json'
  },
  {
    name: 'group1-shard1of1.bin',
    url: 'https://tfhub.dev/mediapipe/tfjs-model/blazeface/1/default/1/group1-shard1of1.bin'
  }
];

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading ${url} to ${dest}`);
    
    function handleResponse(response) {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        console.log(`Following redirect to: ${response.headers.location}`);
        get(response.headers.location, handleResponse).on('error', handleError);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      const file = createWriteStream(dest);
      response.pipe(file);
      
      file.on('finish', () => {
        file.close(() => {
          console.log(`Downloaded: ${dest}`);
          resolve();
        });
      });

      file.on('error', (err) => {
        unlink(dest, () => {});
        reject(err);
      });
    }

    function handleError(err) {
      unlink(dest, () => {});
      reject(err);
    }

    get(url, handleResponse).on('error', handleError);
  });
}

async function copyFile(source, dest) {
  return new Promise((resolve, reject) => {
    const rd = createReadStream(source);  // Added the missing import here
    const wr = createWriteStream(dest);
    rd.on('error', reject);
    wr.on('error', reject);
    wr.on('finish', resolve);
    rd.pipe(wr);
  });
}

async function downloadModels() {
  console.log('Downloading BlazeFace model files...');
  
  try {
    for (const file of MODEL_FILES) {
      const clientPath = join(MODEL_DIR, file.name);
      const publicPath = join(PUBLIC_MODEL_DIR, file.name);

      if (!existsSync(clientPath)) {
        await downloadFile(file.url, clientPath);
        // Copy to public folder
        await copyFile(clientPath, publicPath);
      } else {
        console.log(`File already exists: ${clientPath}`);
        // Ensure public folder has the file too
        if (!existsSync(publicPath)) {
          await copyFile(clientPath, publicPath);
        }
      }
    }
    console.log('All BlazeFace model files downloaded successfully!');
  } catch (error) {
    console.error('Error downloading model files:', error);
    process.exit(1);
  }
}

downloadModels().catch(console.error);
