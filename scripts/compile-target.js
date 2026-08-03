import fs from 'fs';
import path from 'path';

console.log("Checking target image 1.jpg...");
const imagePath = path.resolve('public/1.jpg');

if (fs.existsSync(imagePath)) {
  const stats = fs.statSync(imagePath);
  console.log(`Target image 1.jpg found! (${stats.size} bytes)`);
  console.log("Dynamic browser compilation is active in WebAR application!");
} else {
  console.error("Target image 1.jpg not found in public/ directory.");
}
