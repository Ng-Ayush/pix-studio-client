const path = require('path');
const faceapi = require('face-api.js');
const canvas = require('canvas');
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const loadModels = async () => {
    try {
        const modelsPath = path.join(__dirname);
        await faceapi.nets.tinyFaceDetector.loadFromDisk(modelsPath);
        await faceapi.nets.faceLandmark68Net.loadFromDisk(modelsPath);
        await faceapi.nets.faceRecognitionNet.loadFromDisk(modelsPath);
        console.log('Face-api.js models loaded successfully');
    } catch (error) {
        console.error('Error loading models', error);
    }
};

const extractFaceDescriptor = async (imageUrl) => {
    try {
        const img = await canvas.loadImage(imageUrl);
        const detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();
        if (!detection) return null;
        return Array.from(detection.descriptor);
    } catch (error) {
        console.error('Error extracting face descriptor:', error);
        return null;
    }
};

module.exports = { loadModels, extractFaceDescriptor };
