require('dotenv').config();

const VIZARD_API_URL = 'https://elb-api.vizard.ai/hvizard-server-front/open-api/v1/project/create';  // Replace with the actual base URL of the Vizard.ai API

const vizardApi = axios.create({
    baseURL: VIZARD_API_URL,
    headers: {
        'Authorization': `Bearer ${process.env.VIZARD_API_KEY}`,
        'Content-Type': 'application/json',
    }
});

module.exports = {
    createShort: async (youtubeUrl) => {
        try {
            const response = await vizardApi.post('/shorts', { url: youtubeUrl });
            return response.data;
        } catch (error) {
            console.error('Error creating short:', error);
            throw error;
        }
    }
};
