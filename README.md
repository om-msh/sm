# MeitY Startup Hub Content Planner

A modern Content Planner dashboard for managing startup spotlights, incubator highlights, and content strategies with local file fallback or cloud MongoDB database integration.

## Hosting Guide

This project is fully host-agnostic and ready for cloud deployment. Here are the step-by-step guides for the most ideal and easy hosting platforms:

---

### Option A: Vercel (Recommended)

Vercel provides a free tier with fast CDN static hosting and instant serverless functions.

1. **Prerequisite**: Set up a free MongoDB database on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) since Vercel serverless functions have a read-only filesystem.
2. Sign in to your [Vercel Dashboard](https://vercel.com).
3. Click **Add New** > **Project** and import your Git repository.
4. Vercel automatically detects the project layout. Under **Environment Variables**, add:
   - `MONGODB_URI`: `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority`
5. Click **Deploy**.
6. Vercel will build and launch your application instantly. The static files are served via CDN, and all `/api/*` routes are handled by your Express server.

---

### Option B: Render

Render allows running a persistent Node.js web service.

1. Sign in to your [Render Dashboard](https://render.com).
2. Click **New** > **Web Service** and connect your Git repository.
3. Use the following configuration:
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Under **Environment Variables**, you can add `MONGODB_URI` to use MongoDB. If omitted, Render will fall back to local file storage (note: Render's free tier filesystem is ephemeral, so files in `data/` will reset on server restarts).
5. Click **Create Web Service**.

---

## Local Development

To run the application locally:

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm start
   ```
3. Open `http://localhost:3000` in your browser.
