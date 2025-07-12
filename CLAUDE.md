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
- `lib/db.js` - Supabase database operations
- `package.json` - Dependencies and scripts
- `.env.example` - Environment variables template
- `supabase-schema.sql` - Database schema for Supabase

## Development Commands

- `npm install` - Install dependencies
- `npm start` - Run the server in production mode
- `npm run dev` - Run with nodemon for development (auto-restart)

## Key Features

1. **Contest Status Form**: Input form for contest name, status, and additional messages
2. **CSV Upload**: Upload CSV files to dynamically set status options (B and D columns)
3. **Media Upload**: Attach images/videos (max 4 files) to tweets
4. **Reply Threading**: Posts automatically reply to previous posts in same contest
5. **Post Management**: Create, view, and manage contest status posts with database persistence
6. **X Integration**: Post updates to X (Twitter) with media attachments
7. **Responsive Design**: Mobile-friendly interface

## API Endpoints

- `GET /` - Main web interface
- `GET /api/posts` - Retrieve all posts
- `POST /api/posts` - Create new post
- `GET /api/posts/:id/preview` - Preview tweet with reply info
- `POST /api/posts/:id/tweet` - Post to X (Twitter) with optional media
- `GET /api/status-options` - Get CSV-uploaded status options
- `POST /api/upload-csv` - Upload CSV file for status options
- `POST /api/upload-media` - Upload media files for tweets
- `GET /api/twitter/status` - Check Twitter API authentication status

## Environment Setup

1. Copy `.env.example` to `.env`
2. Create a Supabase project at https://supabase.com/
3. Execute `supabase-schema.sql` in Supabase SQL Editor to create tables
4. Add your Supabase credentials (URL and anon key) to `.env`
5. Add your Twitter API credentials from https://developer.twitter.com/
6. Set PORT if different from 3000

## Security Features

- Helmet.js for security headers
- CORS protection
- Rate limiting (100 requests per 15 minutes)
- Input validation

## Notes

- Uses Supabase (PostgreSQL) for production-ready database persistence
- Full Twitter API v2 integration with OAuth 1.0a authentication
- Reply threading functionality connects related contest posts
- Media upload supports images and videos with Twitter API integration
- Mobile responsive design with comprehensive UI/UX
- Ready for Vercel deployment with Supabase backend