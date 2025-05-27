const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [192, 512];
const inputSvg = path.join(__dirname, 'icons', 'icon.svg');
const outputDir = path.join(__dirname, 'icons');

// Ensure the output directory exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Generate icons for each size
async function generateIcons() {
    try {
        for (const size of sizes) {
            const outputFile = path.join(outputDir, `icon-${size}x${size}.png`);
            
            await sharp(inputSvg)
                .resize(size, size)
                .png()
                .toFile(outputFile);
            
            console.log(`Generated ${size}x${size} icon`);
        }
        console.log('All icons generated successfully!');
    } catch (error) {
        console.error('Error generating icons:', error);
        process.exit(1);
    }
}

generateIcons(); 