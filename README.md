# TanStack Start Application

A modern full-stack application built with TanStack Start, React, and Supabase.

## Tech Stack

- **Frontend**: TanStack Start (React 19)
- **Styling**: Tailwind CSS v4
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **UI Components**: Radix UI primitives
- **State Management**: Zustand
- **Form Handling**: React Hook Form + Zod

## Features

- 🔐 Authentication (via Supabase)
- 📊 Dashboard with analytics
- 📋 Kanban board with drag-and-drop
- 👥 Team management
- 📄 Document management
- 🎨 Modern UI with shadcn/ui components

## Getting Started

### Prerequisites

- Node.js 18+ 
- Yarn package manager

### Installation

```bash
# Install dependencies
yarn install

# Start development server
yarn dev

# Build for production
yarn build
```

## Environment Variables

Create a `.env` file with your Supabase credentials:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id
```

## Project Structure

```
src/
├── components/     # Reusable UI components
├── hooks/          # Custom React hooks
├── integrations/   # External service integrations
├── lib/            # Utility functions
└── routes/         # Application routes
```

## Scripts

- `yarn dev` - Start development server
- `yarn build` - Build for production
- `yarn preview` - Preview production build
- `yarn lint` - Run ESLint
- `yarn format` - Format code with Prettier
