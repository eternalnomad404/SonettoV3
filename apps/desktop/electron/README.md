# Sonetto Desktop

Electron wrapper for Sonetto React frontend.

## Setup

```bash
cd apps/desktop/electron
npm install
```

## Development

**Prerequisites**: Frontend dev server must be running on `localhost:5173`

```bash
# Terminal 1: Start frontend (from root)
npm run dev

# Terminal 2: Start Electron
npm run dev
```

## Build

```bash
npm run build
```

Compiled output in `dist/`

## How It Works

- **Development**: Loads `http://localhost:5173` (Vite dev server)
- **Production**: Loads built HTML from `../../ui/dist/`

## Configuration

- `src/main.ts` - Main process (window management)
- `src/preload.ts` - Preload script (context bridge)
- `tsconfig.json` - TypeScript config

## Packaging

```bash
npm run package
```

Executable created in `dist/electron/`
