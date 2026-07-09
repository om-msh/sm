const express = require('express');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

// Default static content database for July 2026
const DEFAULT_CONTENT = [
    {
        id: "1",
        date: "2026-07-01",
        contentType: "Startup Spotlight",
        topic: "SkyySkill Academy Pvt. Ltd",
        pillar: "Skill Development",
        copy: "Spotlight on SkyySkill Academy Pvt. Ltd! 🚀 Empowers students and professionals with state-of-the-art technical training & vocational skills. Let's celebrate skill-building! #StartupIndia #SkillDevelopment #MeitY",
        status: "Scheduled",
        platforms: ["LinkedIn", "X/Twitter"]
    },
    {
        id: "2",
        date: "2026-07-02",
        contentType: "Incubator Spotlight",
        topic: "Amrita Technology Business Incubator",
        pillar: "Incubation Support",
        copy: "We are highlighting Amrita Technology Business Incubator today! 🌟 Supporting tech entrepreneurs with state-of-the-art labs, mentorship, and funding opportunities to scale ideas into giants. #Incubator #AmritaTBI #TechInnovation",
        status: "Scheduled",
        platforms: ["LinkedIn", "X/Twitter"]
    },
    {
        id: "4",
        date: "2026-07-04",
        contentType: "Startup Decode",
        topic: "DeepTech Innovations Breakdown",
        pillar: "Technology Knowledge",
        copy: "Startup Decode: Understanding how DeepTech is altering the modern landscape. Deep dive into algorithms, datasets, and how Indian startups are leading the revolution! 🧠💡 #DeepTech #StartupDecode #TechExplained",
        status: "Draft",
        platforms: ["LinkedIn", "X/Twitter"]
    },
    {
        id: "5",
        date: "2026-07-05",
        contentType: "Human Content",
        topic: "Startup Hub Diaries",
        pillar: "Sector Shoutout & Details",
        copy: "Giving a shoutout to our incredible startups in core sectors! 🚀 Transitioning to explain what exactly these sectors mean and their direct impact on our future:\n\n- HealthTech (e.g. telemedicine, diagnostics)\n- Agro IoT (smart farming, crop monitoring)\n- Industrial IoT (automation, efficiency)\n- Automation & Robotics (smart manufacturing)\n\n#StartupHubDiaries #IoT #Robotics #HealthTech #Innovation",
        status: "Scheduled",
        platforms: ["LinkedIn", "X/Twitter", "Instagram"]
    },
    {
        id: "6",
        date: "2026-07-06",
        contentType: "FoundHer",
        topic: "Women in Tech Leadership",
        pillar: "Diversity & Inclusion",
        copy: "This FoundHer session, we celebrate the exceptional women leaders driving change in technology and startup ecosystems across India. Meet the founders breaking barriers and scaling heights! 👩‍💻✨ #FoundHer #WomenInBusiness #DiversityInTech",
        status: "Scheduled",
        platforms: ["LinkedIn", "X/Twitter"]
    },
    {
        id: "7",
        date: "2026-07-07",
        contentType: "Incubator Spotlight",
        topic: "AIC-AMTZ MEDIVALLEY INCUBATION COUNCIL",
        pillar: "Healthcare Infrastructure",
        copy: "Spotlight on AIC-AMTZ MEDIVALLEY Incubation Council! 🏥 India's premier med-tech incubator supporting startups manufacturing advanced medical devices and diagnostics. Inspiring self-reliance in health! #MedTech #MakeInIndia #Healthcare",
        status: "Scheduled",
        platforms: ["LinkedIn", "X/Twitter"]
    },
    {
        id: "8",
        date: "2026-07-08",
        contentType: "Startup Spotlight",
        topic: "Bariflo Cybernetics Private Limited",
        pillar: "Water Management & IoT",
        copy: "Startup Spotlight: Bariflo Cybernetics! 🌊 Utilizing IoT, robotics, and cybernetics to automate water body management, aquaculture, and agriculture monitoring. Scaling sustainable tech for a better tomorrow. #SustainableTech #WaterIoT #Automation",
        status: "Scheduled",
        platforms: ["LinkedIn", "X/Twitter"]
    },
    {
        id: "9",
        date: "2026-07-09",
        contentType: "Comic Strip",
        topic: "Dream to Startup",
        pillar: "Creative Engagement",
        copy: "Dream to Startup: The roller-coaster ride of building a company in one simple comic strip! 🎨 Which stage are you currently at? Let us know in the comments! #StartupLife #FounderHumor #ComicStrip",
        status: "Scheduled",
        platforms: ["LinkedIn", "X/Twitter", "Instagram"]
    },
    {
        id: "10",
        date: "2026-07-10",
        contentType: "MSH Brand Identity",
        topic: "Brand Identity Showcase",
        pillar: "MSH Branding",
        copy: "MeitY Startup Hub (MSH) is a platform to build, support, and accelerate the Indian startup ecosystem. Discover our values, our goals, and how we can support your journey today! 🔗 #MSH #StartupEcosystem #InnovationIndia",
        status: "Scheduled",
        platforms: ["LinkedIn", "X/Twitter"]
    },
    {
        id: "11",
        date: "2026-07-11",
        contentType: "Human Content",
        topic: "Founder in Frames",
        pillar: "Avsar Founder's Video",
        copy: "Founder in Frames: Presenting the story of Avsar's founder! 🎥 Watch the journey, the hurdles, and the ultimate breakthrough that built Avsar into the platform it is today. Real stories, real inspiration. #FounderInFrames #Avsar #StartupJourney",
        status: "Scheduled",
        platforms: ["LinkedIn", "X/Twitter", "Instagram"]
    },
    {
        id: "12",
        date: "2026-07-12",
        contentType: "Student to Founder",
        topic: "Young Student Innovations",
        pillar: "Skill & Leadership",
        copy: "Student to Founder: How young minds are transitioning from university lecture halls to boardroom pitches. Learn about student incubation grants and mentorship programs! 🎓🚀 #StudentFounder #YouthInnovation #Incubation",
        status: "Scheduled",
        platforms: ["LinkedIn", "X/Twitter"]
    },
    {
        id: "13",
        date: "2026-07-13",
        contentType: "FoundHer",
        topic: "Dynamic Women Entrepreneurs",
        pillar: "Diversity & Inclusion",
        copy: "Highlighting another powerful story of female leadership in our ecosystem! Inspiring, motivating, and scaling. Here's to more diversity in boardrooms! 🌟 #FoundHer #WomenInStartups #TechLeaders",
        status: "Scheduled",
        platforms: ["LinkedIn", "X/Twitter"]
    },
    {
        id: "14",
        date: "2026-07-14",
        contentType: "Incubator Spotlight",
        topic: "ANUPAM INNOVATION AND INCUBATION CENTER",
        pillar: "Incubation Network",
        copy: "Spotlight on ANUPAM Innovation and Incubation Center! 💡 Providing physical space, funding access, and legal advisory to early-stage startups to smooth their launch and growth paths. #Incubation #StartupsIndia #AnupamCenter",
        status: "Scheduled",
        platforms: ["LinkedIn", "X/Twitter"]
    },
    {
        id: "15",
        date: "2026-07-15",
        contentType: "World Youth Skills Day",
        topic: "Empowering Youth Skills",
        pillar: "Global Milestones",
        copy: "On World Youth Skills Day, MeitY Startup Hub reiterates its commitment to upskilling the youth in AI, IoT, Blockchain, and Robotics. Preparing the workforce of the future! 🛠️📈 #WorldYouthSkillsDay #Upskilling #FutureOfWork",
        status: "Scheduled",
        platforms: ["LinkedIn", "X/Twitter", "Instagram"]
    },
    {
        id: "16",
        date: "2026-07-16",
        contentType: "Milestone Moments",
        topic: "Scaling Ecosystem Success",
        pillar: "MSH Achievements",
        copy: "Milestone Moments: Celebrating our ecosystem's growth, total funding raised by incubated startups, and number of patents filed this quarter. Together, we build the future! 🏆📈 #MilestoneMoments #EcosystemGrowth #StartupAchievements",
        status: "Scheduled",
        platforms: ["LinkedIn", "X/Twitter"]
    },
    {
        id: "17",
        date: "2026-07-17",
        contentType: "Human Content",
        topic: "Startup Hub Diaries - Deep Dive",
        pillar: "Sector Knowledge",
        copy: "Startup Hub Diaries: A day in the life of an incubator manager. Discover what goes on behind the scenes to keep the startup engine running! ☕⚙️ #StartupDiaries #IncubatorLife #BehindTheScenes",
        status: "Scheduled",
        platforms: ["LinkedIn", "X/Twitter"]
    },
    {
        id: "18",
        date: "2026-07-18",
        contentType: "Startup Decode",
        topic: "Market Entry Strategy",
        pillar: "Business Knowledge",
        copy: "Startup Decode: Deconstructing Go-To-Market (GTM) strategies for B2B SaaS startups. How to find your product-market fit and make your first 100 enterprise sales! 📊💼 #SaaS #StartupDecode #GTMStrategy",
        status: "Draft",
        platforms: ["LinkedIn", "X/Twitter"]
    },
    {
        id: "19",
        date: "2026-07-19",
        contentType: "Startup Spotlight",
        topic: "Larkai Healthcare",
        pillar: "Healthcare Technologies",
        copy: "Startup Spotlight: Larkai Healthcare! 🩺 Integrating AI with portable medical hardware to diagnose cardio and respiratory illnesses instantly. Democratizing healthcare access for all. #HealthTech #AIinHealthcare #StartupSpotlight",
        status: "Scheduled",
        platforms: ["LinkedIn", "X/Twitter"]
    },
    {
        id: "20",
        date: "2026-07-20",
        contentType: "FoundHer",
        topic: "Tech Women Leaders",
        pillar: "Diversity & Inclusion",
        copy: "A weekly showcase of brilliant female innovators. Learn about their technical contributions, building teams, and scaling products. 🌟 #FoundHer #WomenInSTEM #TechFounders",
        status: "Scheduled",
        platforms: ["LinkedIn", "X/Twitter"]
    },
    {
        id: "21",
        date: "2026-07-21",
        contentType: "Incubator Spotlight",
        topic: "Association of Lady Entrepreneurs of India (ALEAP)",
        pillar: "Women-led Incubators",
        copy: "Spotlight: Association of Lady Entrepreneurs of India (ALEAP)! 👩‍💼 Dedicated to promoting women entrepreneurship, providing vocational training, industrial infrastructure, and incubation support. #ALEAP #WomenEntrepreneurs #Incubator",
        status: "Scheduled",
        platforms: ["LinkedIn", "X/Twitter"]
    },
    {
        id: "22",
        date: "2026-07-22",
        contentType: "Startup Spotlight",
        topic: "Invent Grid India Pvt. Ltd. (IG Drones/IG Defence)",
        pillar: "Drone Technology",
        copy: "Spotlight on Invent Grid India (IG Drones / IG Defence)! 🛸 Pioneering AI-powered drone inspections, surveying, and defensive drone tech. Securing national assets and digitizing infrastructure. #DroneTech #IGDrones #MakeInIndia",
        status: "Scheduled",
        platforms: ["LinkedIn", "X/Twitter"]
    },
    {
        id: "23",
        date: "2026-07-23",
        contentType: "Human Content",
        topic: "Founder in Frames - Breakthrough",
        pillar: "Founder Stories",
        copy: "Founder in Frames: Capturing the hard-working minds behind India's deep-tech solutions. From late-night debugging sessions to raising seed rounds. 🎥 #FounderInFrames #HardWork #TechIndia",
        status: "Scheduled",
        platforms: ["LinkedIn", "X/Twitter"]
    },
    {
        id: "25",
        date: "2026-07-25",
        contentType: "MSH Brand Identity",
        topic: "Genesis Map",
        pillar: "MSH Branding",
        copy: "Announcing the Genesis Map! 🗺️ A comprehensive spatial directory of active incubators and startups supported by MeitY across India. Find resources, mentors, and partners near you. #GenesisMap #StartupEcosystem #Geospatial",
        status: "Scheduled",
        platforms: ["LinkedIn", "X/Twitter"]
    },
    {
        id: "26",
        date: "2026-07-26",
        contentType: "Human Content",
        topic: "Startup Hub Diaries - Collaboration",
        pillar: "Networking & Alliances",
        copy: "Startup Hub Diaries: Bridging the gap between corporate giants and agile startups. How corporate-startup accelerators speed up commercial adoption! 🤝📈 #CorporateInnovation #Startups #Collaboration",
        status: "Scheduled",
        platforms: ["LinkedIn", "X/Twitter"]
    },
    {
        id: "27",
        date: "2026-07-27",
        contentType: "FoundHer",
        topic: "Mentorship and Scaling",
        pillar: "Diversity & Inclusion",
        copy: "FoundHer: Highlighting advice from senior female executives and startup mentors. How to navigate fundraising, pitch decks, and building early-stage boards. #FoundHer #StartupAdvice #FemaleMentorship",
        status: "Scheduled",
        platforms: ["LinkedIn", "X/Twitter"]
    },
    {
        id: "28",
        date: "2026-07-28",
        contentType: "Incubator Spotlight",
        topic: "Centre for Entrepreneurship Development and Incubation- NIT Trichy",
        pillar: "Academic Incubation",
        copy: "Highlighting CEDI, NIT Trichy! 🎓 Supporting technical research and commercialization of academic projects. Providing pre-incubation, funding, and IP filing guidance. #CEDI #NITTrichy #AcademicIncubation",
        status: "Scheduled",
        platforms: ["LinkedIn", "X/Twitter"]
    },
    {
        id: "29",
        date: "2026-07-29",
        contentType: "Startup Spotlight",
        topic: "Yespoho India Private Limited",
        pillar: "E-commerce & Artisans",
        copy: "Startup Spotlight: Yespoho India! 🧵 Direct-to-consumer digital platform connecting local handloom weavers and artisans with global buyers, ensuring fair wages and preserving heritage. #DTC #HandloomArtisans #SocialImpact",
        status: "Scheduled",
        platforms: ["LinkedIn", "X/Twitter"]
    },
    {
        id: "30",
        date: "2026-07-30",
        contentType: "Startup Decode",
        topic: "Funding and Cap Tables",
        pillar: "Financial Literacy",
        copy: "Startup Decode: Decoupling cap table management, equity dilution, and SAFE notes. A quick guide for first-time founders preparing for seed investments. 📝💰 #CapTable #StartupFunding #FinanceTips",
        status: "Draft",
        platforms: ["LinkedIn", "X/Twitter"]
    },
    {
        id: "31",
        date: "2026-07-31",
        contentType: "Milestone Moments",
        topic: "Monthly Roundup",
        pillar: "MSH Achievements",
        copy: "July Round-up: Reflecting on a month of tremendous tech growth, spotlighted startups, and active incubation achievements. Onward and upward to August! 🚀📅 #MilestoneMoments #MonthlyRoundup #MSH",
        status: "Scheduled",
        platforms: ["LinkedIn", "X/Twitter"]
    }
];

// Default Social Analytics database
const DEFAULT_ANALYTICS = {
    linkedin: {
        followers: 124500,
        followersGrowth: 12.4,
        impressions: 485000,
        engagement: 4.8
    },
    facebook: {
        followers: 142000,
        followersGrowth: 7.2,
        reach: 310000,
        engagement: 4.5
    },
    instagram: {
        followers: 85200,
        followersGrowth: 8.7,
        reach: 215000,
        engagement: 5.2
    },
    twitter: {
        followers: 98100,
        followersGrowth: 5.1,
        impressions: 320000,
        engagement: 3.1
    },
    youtube: {
        followers: 43600,
        followersGrowth: 15.2,
        views: 180000,
        engagement: 8.5
    }
};

// Default Flagship Series database
const DEFAULT_SERIES = [
    {
        name: "Startup Spotlight",
        image: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
        startDate: "2026-07-01",
        endDate: "",
        ongoing: true,
        totalPublished: 12
    },
    {
        name: "Incubator Spotlight",
        image: "linear-gradient(135deg, #059669 0%, #047857 100%)",
        startDate: "2026-07-01",
        endDate: "",
        ongoing: true,
        totalPublished: 8
    },
    {
        name: "FoundHer",
        image: "linear-gradient(135deg, #db2777 0%, #be185d 100%)",
        startDate: "2026-07-01",
        endDate: "",
        ongoing: true,
        totalPublished: 5
    },
    {
        name: "Startup Decode",
        image: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
        startDate: "2026-07-01",
        endDate: "",
        ongoing: true,
        totalPublished: 9
    }
];

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

// Only initialize folder and files locally if MONGODB_URI is not set to avoid EROFS error on Netlify
if (!process.env.MONGODB_URI) {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    initializeFile(SCHEDULES_FILE, DEFAULT_CONTENT);
    initializeFile(SERIES_FILE, DEFAULT_SERIES);
    initializeFile(ANALYTICS_FILE, DEFAULT_ANALYTICS);
}

// --- MongoDB Integration Client Caching ---
let mongoClient = null;
let mongoDb = null;

async function getMongoDb() {
    const uri = process.env.MONGODB_URI;
    if (!uri) return null; // Fallback to Local Mode (JSON files)
    
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
        const db = await getMongoDb();
        if (db) {
            const items = await db.collection('schedules').find({}).toArray();
            if (items.length === 0) {
                console.log('[MONGODB] Seeding empty schedules with defaults');
                await db.collection('schedules').insertMany(DEFAULT_CONTENT);
                return DEFAULT_CONTENT;
            }
            // Map to exclude the MongoDB specific ObjectID
            return items.map(({ _id, ...rest }) => rest);
        } else {
            const raw = fs.readFileSync(SCHEDULES_FILE, 'utf8');
            return JSON.parse(raw);
        }
    },

    async saveSchedules(schedules) {
        const db = await getMongoDb();
        if (db) {
            await db.collection('schedules').deleteMany({});
            if (schedules.length > 0) {
                await db.collection('schedules').insertMany(schedules);
            }
            console.log(`[MONGODB] Saved ${schedules.length} schedules.`);
        } else {
            const json = JSON.stringify(schedules, null, 4);
            fs.writeFileSync(SCHEDULES_FILE, json, 'utf8');
        }
    },

    async getSeries() {
        const db = await getMongoDb();
        if (db) {
            const items = await db.collection('series').find({}).toArray();
            if (items.length === 0) {
                console.log('[MONGODB] Seeding empty series with defaults');
                await db.collection('series').insertMany(DEFAULT_SERIES);
                return DEFAULT_SERIES;
            }
            return items.map(({ _id, ...rest }) => rest);
        } else {
            const raw = fs.readFileSync(SERIES_FILE, 'utf8');
            return JSON.parse(raw);
        }
    },

    async saveSeries(series) {
        const db = await getMongoDb();
        if (db) {
            await db.collection('series').deleteMany({});
            if (series.length > 0) {
                await db.collection('series').insertMany(series);
            }
            console.log(`[MONGODB] Saved ${series.length} series.`);
        } else {
            const json = JSON.stringify(series, null, 4);
            fs.writeFileSync(SERIES_FILE, json, 'utf8');
        }
    },

    async getAnalytics() {
        const db = await getMongoDb();
        if (db) {
            const doc = await db.collection('analytics').findOne({});
            if (!doc) {
                console.log('[MONGODB] Seeding empty analytics with defaults');
                await db.collection('analytics').insertOne(DEFAULT_ANALYTICS);
                return DEFAULT_ANALYTICS;
            }
            const { _id, ...rest } = doc;
            return rest;
        } else {
            const raw = fs.readFileSync(ANALYTICS_FILE, 'utf8');
            return JSON.parse(raw);
        }
    },

    async saveAnalytics(analytics) {
        const db = await getMongoDb();
        if (db) {
            await db.collection('analytics').replaceOne({}, analytics, { upsert: true });
            console.log('[MONGODB] Saved analytics.');
        } else {
            const json = JSON.stringify(analytics, null, 4);
            fs.writeFileSync(ANALYTICS_FILE, json, 'utf8');
        }
    },

    async reset() {
        const db = await getMongoDb();
        if (db) {
            await db.collection('schedules').deleteMany({});
            await db.collection('series').deleteMany({});
            await db.collection('analytics').deleteMany({});
            
            await db.collection('schedules').insertMany(DEFAULT_CONTENT);
            await db.collection('series').insertMany(DEFAULT_SERIES);
            await db.collection('analytics').insertOne(DEFAULT_ANALYTICS);
            console.log('[MONGODB] Database collections reset to defaults');
        } else {
            fs.writeFileSync(SCHEDULES_FILE, JSON.stringify(DEFAULT_CONTENT, null, 4), 'utf8');
            fs.writeFileSync(SERIES_FILE, JSON.stringify(DEFAULT_SERIES, null, 4), 'utf8');
            fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(DEFAULT_ANALYTICS, null, 4), 'utf8');
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
