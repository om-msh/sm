const express = require('express');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

// Default static content database (Empty by default)
const DEFAULT_CONTENT = [];

// Default Social Analytics database (Zeroed by default)
const DEFAULT_ANALYTICS = {
    linkedin: {
        followers: 0,
        followersGrowth: 0,
        impressions: 0,
        engagement: 0
    },
    facebook: {
        followers: 0,
        followersGrowth: 0,
        reach: 0,
        engagement: 0
    },
    instagram: {
        followers: 0,
        followersGrowth: 0,
        reach: 0,
        engagement: 0
    },
    twitter: {
        followers: 0,
        followersGrowth: 0,
        impressions: 0,
        engagement: 0
    },
    youtube: {
        followers: 0,
        followersGrowth: 0,
        views: 0,
        engagement: 0
    }
};

// Default Flagship Series database (Empty by default)
const DEFAULT_SERIES = [];

const DATA_DIR = path.join(__dirname, 'data');
const SCHEDULES_FILE = path.join(DATA_DIR, 'schedules.json');
const SERIES_FILE = path.join(DATA_DIR, 'series.json');
const ANALYTICS_FILE = path.join(DATA_DIR, 'analytics.json');

// Helper to initialize files with default data — only if file does NOT already exist (Local Mode only)
function initializeFile(filePath, defaultValue) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 4), 'utf8');
        console.log(`[INIT] Created default data file: ${filePath}`);
    } else {
        // Verify existing file is valid JSON; if corrupted, re-initialize
        try {
            JSON.parse(fs.readFileSync(filePath, 'utf8'));
            console.log(`[INIT] Existing data file OK: ${filePath}`);
        } catch (e) {
            console.warn(`[INIT] Corrupted JSON in ${filePath}, re-initializing with defaults.`);
            fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 4), 'utf8');
        }
    }
}

// Only initialize folder and files locally if neither MONGODB_URI nor VERCEL is set to avoid write-errors in read-only environments
if (!process.env.MONGODB_URI && !process.env.VERCEL) {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        initializeFile(SCHEDULES_FILE, DEFAULT_CONTENT);
        initializeFile(SERIES_FILE, DEFAULT_SERIES);
        initializeFile(ANALYTICS_FILE, DEFAULT_ANALYTICS);
    } catch (err) {
        console.warn('[INIT] Failed to initialize local storage:', err.message);
    }
}

// --- MongoDB Integration Client Caching ---
let mongoClient = null;
let mongoDb = null;

async function getMongoDb() {
    const uri = process.env.MONGODB_URI;
    if (!uri) return null; // Fallback
    
    if (mongoDb) return mongoDb;
    
    try {
        console.log('[MONGODB] Connecting to cloud database...');
        mongoClient = new MongoClient(uri);
        await mongoClient.connect();
        mongoDb = mongoClient.db('content_planner');
        console.log('[MONGODB] Connected successfully to db: content_planner');
        return mongoDb;
    } catch (e) {
        console.error('[MONGODB ERROR] Connection failed:', e.message);
        throw e;
    }
}

// --- Unified Storage abstraction layer ---
const Storage = {
    async getSchedules() {
        if (process.env.MONGODB_URI) {
            const db = await getMongoDb();
            const items = await db.collection('schedules').find({}).toArray();
            if (items.length === 0) {
                console.log('[MONGODB] Seeding empty schedules with defaults');
                await db.collection('schedules').insertMany(DEFAULT_CONTENT);
                return DEFAULT_CONTENT;
            }
            return items.map(({ _id, ...rest }) => rest);
        } else {
            try {
                if (fs.existsSync(SCHEDULES_FILE)) {
                    const raw = fs.readFileSync(SCHEDULES_FILE, 'utf8');
                    return JSON.parse(raw);
                }
            } catch (e) {
                console.error('[STORAGE ERROR] Failed to read schedules:', e.message);
            }
            return DEFAULT_CONTENT;
        }
    },

    async saveSchedules(schedules) {
        if (process.env.MONGODB_URI) {
            const db = await getMongoDb();
            await db.collection('schedules').deleteMany({});
            if (schedules.length > 0) {
                await db.collection('schedules').insertMany(schedules);
            }
            console.log(`[MONGODB] Saved ${schedules.length} schedules.`);
        } else {
            try {
                const json = JSON.stringify(schedules, null, 4);
                fs.writeFileSync(SCHEDULES_FILE, json, 'utf8');
            } catch (e) {
                console.error('[STORAGE ERROR] Failed to save schedules:', e.message);
                throw e;
            }
        }
    },

    async getSeries() {
        if (process.env.MONGODB_URI) {
            const db = await getMongoDb();
            const items = await db.collection('series').find({}).toArray();
            if (items.length === 0) {
                console.log('[MONGODB] Seeding empty series with defaults');
                await db.collection('series').insertMany(DEFAULT_SERIES);
                return DEFAULT_SERIES;
            }
            return items.map(({ _id, ...rest }) => rest);
        } else {
            try {
                if (fs.existsSync(SERIES_FILE)) {
                    const raw = fs.readFileSync(SERIES_FILE, 'utf8');
                    return JSON.parse(raw);
                }
            } catch (e) {
                console.error('[STORAGE ERROR] Failed to read series:', e.message);
            }
            return DEFAULT_SERIES;
        }
    },

    async saveSeries(series) {
        if (process.env.MONGODB_URI) {
            const db = await getMongoDb();
            await db.collection('series').deleteMany({});
            if (series.length > 0) {
                await db.collection('series').insertMany(series);
            }
            console.log(`[MONGODB] Saved ${series.length} series.`);
        } else {
            try {
                const json = JSON.stringify(series, null, 4);
                fs.writeFileSync(SERIES_FILE, json, 'utf8');
            } catch (e) {
                console.error('[STORAGE ERROR] Failed to save series:', e.message);
                throw e;
            }
        }
    },

    async getAnalytics() {
        if (process.env.MONGODB_URI) {
            const db = await getMongoDb();
            const doc = await db.collection('analytics').findOne({});
            if (!doc) {
                console.log('[MONGODB] Seeding empty analytics with defaults');
                await db.collection('analytics').insertOne(DEFAULT_ANALYTICS);
                return DEFAULT_ANALYTICS;
            }
            const { _id, ...rest } = doc;
            return rest;
        } else {
            try {
                if (fs.existsSync(ANALYTICS_FILE)) {
                    const raw = fs.readFileSync(ANALYTICS_FILE, 'utf8');
                    return JSON.parse(raw);
                }
            } catch (e) {
                console.error('[STORAGE ERROR] Failed to read analytics:', e.message);
            }
            return DEFAULT_ANALYTICS;
        }
    },

    async saveAnalytics(analytics) {
        if (process.env.MONGODB_URI) {
            const db = await getMongoDb();
            await db.collection('analytics').replaceOne({}, analytics, { upsert: true });
            console.log('[MONGODB] Saved analytics.');
        } else {
            try {
                const json = JSON.stringify(analytics, null, 4);
                fs.writeFileSync(ANALYTICS_FILE, json, 'utf8');
            } catch (e) {
                console.error('[STORAGE ERROR] Failed to save analytics:', e.message);
                throw e;
            }
        }
    },

    async reset() {
        if (process.env.MONGODB_URI) {
            const db = await getMongoDb();
            await db.collection('schedules').deleteMany({});
            await db.collection('series').deleteMany({});
            await db.collection('analytics').deleteMany({});
            
            await db.collection('schedules').insertMany(DEFAULT_CONTENT);
            await db.collection('series').insertMany(DEFAULT_SERIES);
            await db.collection('analytics').insertOne(DEFAULT_ANALYTICS);
            console.log('[MONGODB] Database collections reset to defaults');
        } else {
            try {
                fs.writeFileSync(SCHEDULES_FILE, JSON.stringify(DEFAULT_CONTENT, null, 4), 'utf8');
                fs.writeFileSync(SERIES_FILE, JSON.stringify(DEFAULT_SERIES, null, 4), 'utf8');
                fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(DEFAULT_ANALYTICS, null, 4), 'utf8');
            } catch (e) {
                console.error('[STORAGE ERROR] Failed to reset data files:', e.message);
                throw e;
            }
        }
    }
};

// --- Middleware ---

// Parse JSON bodies (must come BEFORE routes)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Disable ALL caching for API routes
app.use('/api', (req, res, next) => {
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, private',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
    });
    next();
});

// Block direct static access to the data/ directory (Local Mode only)
app.use('/data', (req, res) => {
    res.status(403).json({ error: 'Direct access to data files is not allowed. Use the /api endpoints.' });
});

// Serve static files ONLY from specific allowed directories/files
app.use(express.static(__dirname, {
    etag: false,
    lastModified: false,
    setHeaders: (res, filePath) => {
        // Prevent caching of JS/HTML files during development
        if (filePath.endsWith('.js') || filePath.endsWith('.html') || filePath.endsWith('.css')) {
            res.set({
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
        }
    },
    index: false
}));

// --- API Routes ---

// SCHEDULES
app.get('/api/schedules', async (req, res) => {
    try {
        const data = await Storage.getSchedules();
        res.json(data);
    } catch (err) {
        console.error('[ERROR] GET /api/schedules:', err.message);
        res.status(500).json({ error: 'Failed to read schedules' });
    }
});

app.post('/api/schedules', async (req, res) => {
    try {
        if (!Array.isArray(req.body)) {
            return res.status(400).json({ error: 'Request body must be an array of schedules' });
        }
        await Storage.saveSchedules(req.body);
        res.json({ success: true, count: req.body.length });
    } catch (err) {
        console.error('[ERROR] POST /api/schedules:', err.message);
        res.status(500).json({ error: 'Failed to save schedules' });
    }
});

// SERIES
app.get('/api/series', async (req, res) => {
    try {
        const data = await Storage.getSeries();
        res.json(data);
    } catch (err) {
        console.error('[ERROR] GET /api/series:', err.message);
        res.status(500).json({ error: 'Failed to read series' });
    }
});

app.post('/api/series', async (req, res) => {
    try {
        if (!Array.isArray(req.body)) {
            return res.status(400).json({ error: 'Request body must be an array of series' });
        }
        await Storage.saveSeries(req.body);
        res.json({ success: true, count: req.body.length });
    } catch (err) {
        console.error('[ERROR] POST /api/series:', err.message);
        res.status(500).json({ error: 'Failed to save series' });
    }
});

// ANALYTICS
app.get('/api/analytics', async (req, res) => {
    try {
        const data = await Storage.getAnalytics();
        res.json(data);
    } catch (err) {
        console.error('[ERROR] GET /api/analytics:', err.message);
        res.status(500).json({ error: 'Failed to read analytics' });
    }
});

app.post('/api/analytics', async (req, res) => {
    try {
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({ error: 'Request body must be an analytics object' });
        }
        await Storage.saveAnalytics(req.body);
        res.json({ success: true });
    } catch (err) {
        console.error('[ERROR] POST /api/analytics:', err.message);
        res.status(500).json({ error: 'Failed to save analytics' });
    }
});

// RESET
app.post('/api/reset', async (req, res) => {
    try {
        await Storage.reset();
        console.log('[RESET] All databases reset to default contents.');
        res.json({
            schedules: DEFAULT_CONTENT,
            series: DEFAULT_SERIES,
            analytics: DEFAULT_ANALYTICS
        });
    } catch (err) {
        console.error('[ERROR] POST /api/reset:', err.message);
        res.status(500).json({ error: 'Failed to reset data' });
    }
});

// Catch-all route to serve index.html (must be AFTER api routes)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server ONLY when run directly (Local Mode), otherwise export app (Serverless Mode)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`[SERVER] Running at http://localhost:${PORT}`);
    });
}

module.exports = app;
