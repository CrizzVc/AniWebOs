const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); // Allow TV app to connect

// Serve the frontend files (webOS TV app) from the parent directory
app.use(express.static(path.join(__dirname, '..')));

app.get('/api/servers', async (req, res) => {
    const episodeUrl = req.query.url;

    if (!episodeUrl) {
        return res.status(400).json({ error: "Missing 'url' parameter" });
    }

    try {
        console.log(`Fetching: ${episodeUrl}`);
        
        // AnimeFLV often requires a realistic User-Agent to avoid quick blocks
        const response = await axios.get(episodeUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const html = response.data;
        const $ = cheerio.load(html);
        
        let serversJson = null;

        // Search for the script tag containing "var videos = {"
        $('script').each((index, element) => {
            const scriptContent = $(element).html();
            if (scriptContent && scriptContent.includes('var videos = {')) {
                // Extract the JSON string using RegExp
                // The structure usually is: var videos = {"SUB":[{"server":"mega", ...}]};
                const match = scriptContent.match(/var videos = (\{.*?\});/);
                
                if (match && match[1]) {
                    try {
                        serversJson = JSON.parse(match[1]);
                    } catch (e) {
                        console.error("Error parsing JSON:", e);
                    }
                }
            }
        });

        if (serversJson && serversJson.SUB) {
            // Usually we only care about the SUBbed version for now
            return res.json({
                success: true,
                servers: serversJson.SUB
            });
        } else {
            return res.status(404).json({ error: "Could not find video servers in the page." });
        }

    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ error: "Failed to fetch from AnimeFLV." });
    }
});

app.get('/api/latest', async (req, res) => {
    try {
        const response = await axios.get('https://www4.animeflv.net/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const html = response.data;
        const $ = cheerio.load(html);
        
        const latestEpisodes = [];

        $('.ListEpisodios li a').each((index, element) => {
            // AnimeFLV usually shows around 20 episodes on the homepage
            const urlPath = $(element).attr('href');
            const url = 'https://www4.animeflv.net' + urlPath;
            
            // Extract title and episode number
            const title = $(element).find('.Title').text().trim();
            const episode = $(element).find('.Capi').text().trim();
            
            // Extract image URL
            let image = $(element).find('img').attr('src');
            // Sometimes images are lazy loaded or relative
            if (image && image.startsWith('/')) {
                image = 'https://www4.animeflv.net' + image;
            }

            latestEpisodes.push({
                title,
                episode,
                image,
                url
            });
        });

        return res.json({
            success: true,
            data: latestEpisodes
        });

    } catch (error) {
        console.error("Error fetching latest:", error.message);
        return res.status(500).json({ error: "Failed to fetch latest episodes." });
    }
});

app.listen(PORT, () => {
    console.log(`AnimeFLV Scraper Backend running at http://localhost:${PORT}`);
});
