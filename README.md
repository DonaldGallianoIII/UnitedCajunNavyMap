# UCN Deployment Map

Interactive map for United Cajun Navy deployments, disaster response, and volunteer coordination.

## Features

- 🗺️ Interactive Leaflet map with status-colored pins
- 🔴 Pin statuses: Critical, Warning, Active, Past, Weather
- 🔍 Location/zip search with 50-mile radius
- 🎚️ Filter pins by status (click legend)
- ⚡ Realtime updates via Supabase
- 📱 Mobile-responsive with collapsible legend
- 🔐 Secure admin panel (Supabase Auth + RLS)

## Tech Stack

- Vanilla HTML/CSS/JavaScript (no build step)
- [Leaflet](https://leafletjs.com/) for maps
- [Supabase](https://supabase.com/) for database, auth, and realtime

## Local Development

```bash
npx serve .
```

Then open:
- Public map: http://localhost:3000
- Admin panel: http://localhost:3000/admin.html

## Deployment

Hosted on Netlify. Push to `main` branch to auto-deploy.

## Database Setup

See [SECURITY-SETUP.md](SECURITY-SETUP.md) for Supabase RLS policies and auth configuration.
