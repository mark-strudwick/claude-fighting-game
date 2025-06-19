# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a fighting game project. The codebase structure and development commands will be documented here as the project evolves.

## Development Commands

- `npm run dev` - Start both client and server in development mode
- `npm run dev:client` - Start client development server (Vite on port 3000)
- `npm run dev:server` - Start server in development mode (port 3001)
- `npm run build` - Build both client and server for production
- `npm run lint` - Run ESLint on all TypeScript files
- `npm run typecheck` - Run TypeScript type checking

## Architecture

### Project Structure
- `src/client/` - Frontend game client (TypeScript + HTML5 Canvas)
- `src/server/` - Backend game server (Koa + Socket.io)
- `src/shared/` - Shared types and utilities between client/server
- `dist/` - Compiled output

### Technology Stack
- **Frontend**: TypeScript, HTML5 Canvas, Socket.io Client, Vite
- **Backend**: Node.js, Koa, Socket.io Server
- **Build Tools**: Vite (client), TypeScript compiler (server)

### Game Features
- Real-time multiplayer arena combat
- 60fps server tick rate
- Circular arena with boundary constraints
- Basic player movement (WASD/Arrow keys)
- Health system with visual health bars
- Team-based gameplay support (1v1, 2v2, 3v3)
- Round timer system