// =============================================================================
// FILENAME: config.js
// =============================================================================
// Purpose: Application configuration and constants
// =============================================================================

export const CONFIG = {
    // Map defaults (centered on Louisiana)
    MapCenter: [30.9843, -91.9623],
    MapZoom: 6,
    MapMinZoom: 4,
    MapMaxZoom: 18,
    
    // Tile layer
    TileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    TileAttribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    
    // UCN external links
    DonateUrl: 'https://www.unitedcajunnavy.org/donate',
    VolunteerUrl: 'https://www.unitedcajunnavy.org/volunteer',
    RequestHelpUrl: 'https://www.unitedcajunnavy.org/request-help'
};

// Pin status definitions
export const PIN_STATUS = {
    critical: {
        label: 'Critical',
        color: '#dc2626',
        emoji: '🔴'
    },
    warning: {
        label: 'Warning',
        color: '#f97316',
        emoji: '🟠'
    },
    active: {
        label: 'Active',
        color: '#16a34a',
        emoji: '🟢'
    },
    past: {
        label: 'Past',
        color: '#2563eb',
        emoji: '🔵'
    },
    weather: {
        label: 'Weather',
        color: '#eab308',
        emoji: '🟡'
    }
};

// Supabase config
export const SUPABASE_CONFIG = {
    url: 'https://wvjowefbxusalmypocvt.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2am93ZWZieHVzYWxteXBvY3Z0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1NjU1NjQsImV4cCI6MjA4MDE0MTU2NH0.WOTwjYheWDHiCmmHMU6v9g7p4KDRA7G_oZVmXaKJtNM'
};
