require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ 
    origin: true, // Automatically sets the 'Access-Control-Allow-Origin' to the requester's domain
    credentials: true, // Tells browsers "It's okay to send tokens/headers"
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-jira-token', 'x-jira-url'] 
})); 

app.use(express.json());

// --- HEALTH CHECK ENDPOINT ---
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'UP',
        timestamp: new Date().toISOString(),
        uptime: process.uptime() // How long (in seconds) the server has been running
    });
});

// --- PROXY ENDPOINT ---
app.all('/proxy', async (req, res) => {
    const endpoint = req.query.endpoint; 
    
    // --- READ HEADERS FROM FRONTEND ---
    const userToken = req.headers['x-jira-token']; // The Personal Access Token
    const jiraBaseUrl = req.headers['x-jira-url']; // The Jira URL (e.g., https://jira.sapfgl.com)

    // --- VALIDATION ---
    if (!endpoint) {
        return res.status(400).json({ error: "Missing 'endpoint' query parameter" });
    }
    if (!userToken) {
        return res.status(401).json({ error: "Missing 'x-jira-token' header" });
    }
    if (!jiraBaseUrl) {
        return res.status(400).json({ error: "Missing 'x-jira-url' header" });
    }

    // Combine the Base URL passed in the header with the Endpoint passed in the query
    // Make sure we handle potential double slashes
    const cleanBase = jiraBaseUrl.replace(/\/$/, ""); // Remove trailing slash if present
    const fullUrl = `${cleanBase}${endpoint}`;

    try {
        const response = await axios({
            method: req.method,
            url: fullUrl,
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            data: req.body // Pass body for PUT/POST
        });

        res.json(response.data);

    } catch (error) {
        console.error("Proxy Error:", error.message);
        const status = error.response ? error.response.status : 500;
        const data = error.response ? error.response.data : { error: error.message };
        res.status(status).json(data);
    }
});

app.listen(PORT, () => {
    console.log(`Proxy server running on port ${PORT}`);
});