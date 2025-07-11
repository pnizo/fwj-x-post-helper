# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a web application for posting FWJ contest progress updates to X (Twitter). It's built with Node.js/Express.js backend and vanilla JavaScript frontend, allowing users to create and manage contest status updates.

## Project Structure

- `server.js` - Main Express.js server with API endpoints
- `public/` - Static frontend files
  - `index.html` - Main web interface
  - `script.js` - Frontend JavaScript logic
  - `styles.css` - CSS styling
- `package.json` - Dependencies and scripts
- `.env.example` - Environment variables template

## Development Commands

- `npm install` - Install dependencies
- `npm start` - Run the server in production mode
- `npm run dev` - Run with nodemon for development (auto-restart)

## Key Features

1. **Contest Status Form**: Input form for contest name, event, status, score, and additional messages
2. **Post Management**: Create, view, and manage contest status posts
3. **X Integration**: Post updates to X (Twitter) - requires API credentials
4. **Responsive Design**: Mobile-friendly interface

## API Endpoints

- `GET /` - Main web interface
- `GET /api/posts` - Retrieve all posts
- `POST /api/posts` - Create new post
- `POST /api/posts/:id/tweet` - Post to X (Twitter)

## Environment Setup

1. Copy `.env.example` to `.env`
2. Add your Twitter API credentials from https://developer.twitter.com/
3. Set PORT if different from 3000

## Security Features

- Helmet.js for security headers
- CORS protection
- Rate limiting (100 requests per 15 minutes)
- Input validation

## Notes

- Currently uses in-memory storage (posts array) - consider database for production
- X API integration is scaffolded but requires actual Twitter API implementation
- Mobile responsive design included