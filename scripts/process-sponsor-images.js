import sharp from "sharp";
import { readdir } from "fs/promises";
import { join, extname, basename } from "path";

const sponsorsDir = "./public/sponsors";
const maxDimension = 1024;

async function processImage(filePath) {
  const image = sharp(filePath);
  const metadata = await image.metadata();
  
  const { width, height } = metadata;
  const needsResize = width > maxDimension || height > maxDimension;
  
  let processedImage = image;
  
  if (needsResize) {
    console.log(`Resizing ${basename(filePath)}: ${width}x${height} -> max ${maxDimension}px`);
    processedImage = image.resize(maxDimension, maxDimension, {
      fit: "inside",
      withoutEnlargement: true,
    });
  }
  
  const outputPath = filePath.replace(extname(filePath), ".webp");
  await processedImage.webp({ quality: 85 }).toFile(outputPath);
  console.log(`Converted ${basename(filePath)} -> ${basename(outputPath)}`);
  
  return {
    original: basename(filePath),
    webp: basename(outputPath),
  };
}

async function main() {
  try {
    const files = await readdir(sponsorsDir);
    const imageFiles = files.filter(
      (file) =>
        file.endsWith(".jpg") ||
        file.endsWith(".jpeg") ||
        file.endsWith(".png")
    );
    
    console.log(`Found ${imageFiles.length} images to process\n`);
    
    const results = [];
    for (const file of imageFiles) {
      const filePath = join(sponsorsDir, file);
      const result = await processImage(filePath);
      results.push(result);
    }
    
    console.log("\n✅ All images processed successfully!");
    console.log("\nConversion mapping:");
    results.forEach(({ original, webp }) => {
      console.log(`  ${original} -> ${webp}`);
    });
  } catch (error) {
    console.error("Error processing images:", error);
    process.exit(1);
  }
}

main();

