# Twitter Clone

A full-stack Twitter/X clone built with the MERN stack. Supports posting, liking, commenting, following, notifications, and profile customization with image uploads.

## Features

- Auth (signup, login, logout) with JWT and HTTP-only cookies
- Create, delete, like, and comment on posts
- Image uploads for posts and profile/cover photos via Cloudinary
- Follow/unfollow users
- Suggested users list
- Notifications for likes and follows
- Edit profile (bio, link, username, password, profile pic, cover pic)
- Responsive UI with Tailwind CSS and DaisyUI

## Tech Stack

**Frontend** — React 19, React Router, TanStack Query, Tailwind CSS, DaisyUI

**Backend** — Node.js, Express 5, MongoDB, Mongoose, JWT, bcryptjs, Cloudinary

## Getting Started

### Prerequisites

- Node.js v18+
- MongoDB Atlas account (or local MongoDB)
- Cloudinary account

### Setup

1. Clone the repo

```bash
git clone https://github.com/your-username/twitter-clone.git
cd twitter-clone
```

2. Create a `.env` file in the root directory

```env
MONGO_URI=your_mongodb_connection_string
PORT=8000
JWT_SECRET=your_jwt_secret
NODE_ENV=development

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

3. Install dependencies and run in development

```bash
# Install backend deps
npm install

# Install frontend deps
npm install --prefix frontend

# Run both (backend on :8000, frontend on :5173)
npm run dev
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start backend with nodemon |
| `npm run build` | Install deps and build frontend |
| `npm run start` | Run in production mode |

## Project Structure

```
├── backend/
│   ├── controllers/
│   ├── db/
│   ├── lib/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   └── server.js
├── frontend/
│   └── src/
│       ├── components/
│       ├── hooks/
│       ├── pages/
│       └── utils/
└── package.json
```

## Deployment

Set `NODE_ENV=production` and run `npm run build` followed by `npm run start`. The Express server will serve the built frontend from `frontend/dist`.
