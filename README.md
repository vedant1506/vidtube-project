# vidtube — Full project README

A simple Node.js + Express + MongoDB backend inspired by a video platform (VidTube).

This README covers the whole project: what it does, how to run it, environment variables, project layout and common endpoints.

Table of contents
- Overview
- Features
- Prerequisites
- Installation
- Environment variables
- Run & development
- Project structure
- Common endpoints
- Housekeeping notes
- Contributing & next steps

Overview
========
The project is an Express API using Mongoose (MongoDB) to manage video content and related resources (users, videos, comments, likes, playlists, subscriptions). It supports file uploads (via `multer`) and Cloudinary for media hosting.

Features
========
- User auth with JWT
- Video upload and metadata management
- Likes and comments on videos
- Playlists & subscriptions
- Cloudinary integration for media

Prerequisites
=============
- Node.js 18+ (or compatible LTS)
- npm (or pnpm)
- MongoDB (local or Atlas)
- (Optional) Cloudinary account for media uploads

Installation
============
Clone and install:

```bash
git clone https://github.com/vedant1506/vidtube.git
cd vidtube
npm install
```

Environment variables
=====================
Create a `.env` in the project root. Example variables used in this project:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/vidtube

# Auth
JWT_SECRET=replace_with_a_secure_secret
JWT_EXPIRES_IN=7d

# Cloudinary (if using uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Keep `.env` out of version control. If you need an example file, I can add `.env.example`.

Run & development
=================
- Start (production):
  ```bash
  npm start
  ```
- Start (development, nodemon):
  ```bash
  npm run dev
  ```

Scripts (from package.json)
---------------------------
- start — node src/index.js
- dev — nodemon src/index.js

Project structure
=================
Top-level layout (key files/folders):

- `src/`
  - `index.js` — server entrypoint
  - `app.js` — Express app configuration
  - `controllers/` — route handlers (comment.controllers.js, like.controllers.js, playlist.controllers.js, subscription.controllers.js, tweet.controllers.js, usercontrollers.js, video.controllers.js)
  - `routes/` — route definitions per resource
  - `models/` — Mongoose models (user, video, comment, like, playlist, subscription, tweet)
  - `middlewares/` — auth, error handling, multer config
  - `utils/` — helpers (apiError, apiresponse, asynchandler, cloudinary)
- `db/` — database connection setup
- `public/` — static/temp files

Common endpoints (examples)
===========================
Look in `src/routes` for exact route paths and HTTP methods. Example resource endpoints:

- Users / Auth
  - POST /api/users/register
  - POST /api/users/login
  - GET /api/users/:id

- Videos
  - POST /api/videos      # upload
  - GET /api/videos
  - GET /api/videos/:id
  - DELETE /api/videos/:id

- Comments & Likes
  - POST /api/comments
  - GET /api/comments?videoId=<id>
  - POST /api/likes

- Playlists & Subscriptions
  - POST /api/playlists
  - GET /api/playlists/:userId
  - POST /api/subscriptions

Housekeeping notes
==================
- `.gitignore` should exclude `node_modules`, `.env`, logs, editor configs and temporary files. If you want to track a lockfile, keep `package-lock.json` in repo.
- If you need to restore local pre-merge changes, check for a branch named `backup-local` (created during a previous merge/cleanup). To inspect it:

```bash
git branch -vv
git log --oneline backup-local..main
```

- If you see a `.env.backup` file, it contains your previous `.env` values — copy values back into `.env` as needed (never commit `.env`).

Contributing & next steps
=========================
- Add tests and CI (GitHub Actions) and a test script.
- Add request validation and stronger input sanitation.
- Add API docs (Swagger/OpenAPI) or a Postman collection.
- Add a `Dockerfile` / deployment instructions if you plan to deploy.

If you'd like a focused README section (detailed API examples, Postman collection, or `.env.example`), tell me which and I'll add it.
# vidtube

See README_FULL.md for full project documentation.
