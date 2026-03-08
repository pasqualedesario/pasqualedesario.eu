#!/usr/bin/env node
/**
 * Pre-optimizes PNG/JPEG images to WebP.
 * Run: npm run build:images
 * Output: .webp alongside originals in assets/images/
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'images');
const IMAGE_EXT = ['.png', '.jpg', '.jpeg'];

async function optimizeImages() {
    const files = fs.readdirSync(IMAGES_DIR);
    const imageFiles = files.filter((f) =>
        IMAGE_EXT.includes(path.extname(f).toLowerCase())
    );

    if (imageFiles.length === 0) {
        console.log('No PNG/JPEG images found in', IMAGES_DIR);
        return;
    }

    console.log(`Optimizing ${imageFiles.length} images...`);

    for (const file of imageFiles) {
        const inputPath = path.join(IMAGES_DIR, file);
        const base = path.basename(file, path.extname(file));

        try {
            const webpPath = path.join(IMAGES_DIR, `${base}.webp`);

            await sharp(inputPath)
                .webp({ quality: 82 })
                .toFile(webpPath);
            const webpSize = (fs.statSync(webpPath).size / 1024).toFixed(1);
            const origSize = (fs.statSync(inputPath).size / 1024).toFixed(1);
            console.log(`  ${file} → .webp (${webpSize}KB) [orig: ${origSize}KB]`);
        } catch (err) {
            console.error(`  ${file}: ${err.message}`);
        }
    }

    console.log('Done.');
}

optimizeImages().catch((err) => {
    console.error(err);
    process.exit(1);
});
