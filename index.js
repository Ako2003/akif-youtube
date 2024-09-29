require('dotenv').config();
const express = require('express');
const axios = require('axios'); // Use axios for HTTP requests
const fs = require('fs');

const app = express();
app.use(express.json()); // Parse incoming JSON requests

const VIZARDAI_API_KEY = process.env.VIZARD_API_KEY;

// Example constants for video processing
const PROJECT_NAME = "miyagi2";
const VIDEO_URL = "https://youtu.be/kDZXnYCIMuQ?si=w8OWPShg0A8o7m4c";
const VIDEO_FILE_EXT = "mp4";
const VIDEO_TYPE = 2;
const LANG = "en";
const PREFER_LENGTH = "[1]";
const SUBTITLE_SWITCH = 1;
const HEADLINE_SWITCH = 1;

// API headers
const headers = {
    "Content-Type": "application/json",
    "VIZARDAI_API_KEY": VIZARDAI_API_KEY
};

// Existing video creation logic
const createProject = async () => {
    const createData = {
        'projectName': PROJECT_NAME,
        'videoUrl': VIDEO_URL,
        'ext': VIDEO_FILE_EXT,
        'videoType': VIDEO_TYPE,
        'lang': LANG,
        'preferLength': PREFER_LENGTH,
        'subtitleSwitch': SUBTITLE_SWITCH,
        'headlineSwitch': HEADLINE_SWITCH,
    };
    const createUrl = "https://elb-api.vizard.ai/hvizard-server-front/open-api/v1/project/create";

    console.log('Creating project...');
    try {
        const response = await fetch(createUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(createData)
        });
        const createResult = await response.json();

        if (response.ok && createResult.code === 2000) {
            console.log(createResult);
            return createResult.projectId;
        } else {
            console.error("Create error:", createResult);
            return "";
        }
    } catch (error) {
        console.error('Create request failed:', error);
        return "";
    }
};

// Existing video query logic
const queryVideos = async (projectId) => {
    const queryUrl = `https://elb-api.vizard.ai/hvizard-server-front/open-api/v1/project/query/${projectId}`;

    while (true) {
        console.log('Querying videos...');
        try {
            const response = await fetch(queryUrl, { headers: headers });
            const queryResult = await response.json();

            if (response.ok) {
                if (queryResult.code === 2000) {
                    console.log('Clipping succeeded.');
                    console.log(queryResult);
                    break;
                } else if (queryResult.code === 1000) {
                    console.log('Clipping in progress, waiting...');
                    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds
                } else {
                    console.error("Clipping error:", queryResult.message || queryResult);
                    break;
                }
            } else {
                console.error('Query request failed:', response.status, queryResult);
                break;
            }
        } catch (error) {
            console.error('Query request failed:', error);
            break;
        }
    }
};

// Route to handle video processing
app.get('/process-video', async (req, res) => {
    const projectId = await createProject();
    if (projectId !== "") {
        await queryVideos(projectId);
        res.status(200).json({ message: 'Video processing completed', projectId: projectId });
    } else {
        res.status(500).json({ message: 'Failed to create project' });
    }
});

// NEW: Webhook endpoint to receive notifications from Vizard.ai
app.post('/webhook', async (req, res) => {
    const webhookData = req.body;

    console.log('Webhook received:', webhookData);

    // Check if the webhook payload contains the expected video status or download link
    const videoUrl = webhookData.video_url; // Replace with actual key from the webhook payload

    if (videoUrl) {
        try {
            // Download the video (optional)
            const response = await axios({
                method: 'GET',
                url: videoUrl,
                responseType: 'stream'
            });

            // Save the video to the server
            const videoPath = `./videos/${Date.now()}.mp4`;
            response.data.pipe(fs.createWriteStream(videoPath));

            console.log(`Video saved to ${videoPath}`);
            res.status(200).json({ message: 'Video received and saved', videoPath });
        } catch (error) {
            console.error('Error downloading video:', error);
            res.status(500).json({ message: 'Failed to download video' });
        }
    } else {
        console.error('Webhook payload missing video URL');
        res.status(400).json({ message: 'Invalid webhook data' });
    }
});

// Server setup
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
