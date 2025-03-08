const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const crypto = require('crypto');


const app = express();
const corsOptions = {
    origin: 'http://localhost:5173',
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(
    '/images', express.static(path.join(__dirname, 'public'))
);

const annotationsFile = path.join(__dirname, 'annotations.json');

if (!fs.existsSync(annotationsFile)){
    fs.writeFileSync(annotationsFile, JSON.stringify({ submissionCount: 0, submissions: [] }), 'utf-8');
}


const generateSubmissionID = (count) => {
    return crypto.createHash('sha256')
        .update(count.toString())
        .digest('hex')
        .slice(0, 8)
        .toUpperCase();
};

const imageMetaData = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'images.json'), 'utf-8')
)

app.get('/api', (req, res) => {
    if (imageMetaData.length === 0) {
        return res.status(404).json({ message: 'No images found' });
    }

    const randomImage = imageMetaData[Math.floor(Math.random() * imageMetaData.length)];
    res.json({ filename: randomImage.filename });
});


app.post('/submit', (req, res) => {
    const {imageUrl, annotations: newAnnotations} = req.body;

    if (!imageUrl || !newAnnotations){
        return res.status(400).json({message: 'Invalid request'});
    }

    let annotationData = JSON.parse(fs.readFileSync(annotationsFile, 'utf-8'));
    let submissionCount = annotationData.submissionCount || 0;
    let submissions = annotationData.submissions || [];

    submissionCount++;
    const submissionID = generateSubmissionID(submissionCount);
    const timestamp = new Date().toISOString();

    const entry = {
        submissionID,
        imageUrl,
        timestamp,
        annotations: newAnnotations
    };
    submissions.push(entry);

    fs.writeFileSync(annotationsFile,
        JSON.stringify({submissionCount, submissions}, null, 2),
        'utf-8');

    console.log("Anotations saved to annotations.json");
    res.json({message: 'Annotations saved', entry});
})

app.post("/api/segment", (req, res) => {
    console.log("Received request to segment image");
    const { imageName } = req.body;
    if (!imageName) {
        return res.status(400).json({message: 'Invalid request'});
    }

    const detectionFile = path.join(__dirname, 'detections.json');
    const detectionData = JSON.parse(fs.readFileSync(detectionFile, 'utf-8'));

    if (detectionData[imageName]) {
        console.log("Returning cached segmentation data");
        return res.json(detectionData[imageName]);
    }
});


app.listen(8080, () => {
    console.log('Server is running on http://localhost:8080');
});