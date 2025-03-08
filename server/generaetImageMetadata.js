const fs = require('fs');
const path = require('path');
const { imageSize } = require('image-size');

const publicDir = path.join(__dirname, 'public');
const jsonFilePath = path.join(__dirname, 'images.json');

// Read image files
fs.readdir(publicDir, (err, files) => {
    if (err) {
        console.error("Error reading image directory:", err);
        return;
    }

    // Filter for image files
    const imageFiles = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));

    // Generate metadata
    const imageMetadata = imageFiles.map(file => {
        const imagePath = path.join(publicDir, file);

        const imageBuffer = fs.readFileSync(imagePath)
        const dimensions = imageSize(imageBuffer);
        
        return {
            filename: file,
            imageUrl: `http://localhost:8080/images/${file}`,
            width: dimensions.width,
            height: dimensions.height
        };
    });

    // Save to JSON file
    fs.writeFileSync(jsonFilePath, JSON.stringify(imageMetadata, null, 2), 'utf-8');
    console.log("✅ Image metadata saved to images.json");
});
