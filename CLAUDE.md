# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a web application for generating FWJ contest progress text. It's built with Node.js/Express.js backend and vanilla JavaScript frontend, allowing users to create formatted contest status text that can be edited and copied to clipboard.

## Project Structure

- `api/index.js` - Main Express.js server with API endpoints
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
3. **Text Generation**: Generate formatted contest status text
4. **Text Preview Dialog**: Editable dialog to preview and modify generated text
5. **Copy to Clipboard**: Easy copying of generated text for use elsewhere
6. **Contest Name Management**: Save and reuse frequently used contest names
7. **Responsive Design**: Mobile-friendly interface

## API Endpoints

- `GET /` - Main web interface
- `GET /health` - Health check endpoint
- `GET /api/status-options` - Get CSV-uploaded status options
- `POST /api/upload-csv` - Upload CSV file for status options
- `POST /api/generate-text` - Generate formatted text from contest data

## Environment Setup

1. Copy `.env.example` to `.env`
2. Create a Supabase project at https://supabase.com/
3. Execute `supabase-schema.sql` in Supabase SQL Editor to create tables (only status_options table is used)
4. Add your Supabase credentials (URL and anon key) to `.env`
5. Set PORT if different from 3000

## Security Features

- Helmet.js for security headers
- CORS protection
- Rate limiting (100 requests per 15 minutes)
- Input validation

## Notes

- Uses Supabase (PostgreSQL) for storing CSV-uploaded status options
- No external API integrations - purely text generation focused
- Mobile responsive design with clean UI/UX
- Ready for Vercel deployment with Supabase backend
- Lightweight application without complex dependencies