// =============================================================================
// FILENAME: main.js
// =============================================================================
// Purpose: Public map entry point with search, filters, and realtime updates
//
// Responsibilities:
// - Initialize map and load pins
// - Location/zip search with 50-mile radius filtering
// - Legend filter toggles (click to dim/show statuses)
// - Realtime subscription for live pin updates
// - Pin count display and last updated timestamp
//
// Dependencies:
// - config.js (CONFIG, PIN_STATUS)
// - map.js (initMap, renderPins, addPinToMap, removePinFromMap, applyFilter, clearFilter)
// - storage.js (getAllPins, subscribeToChanges)
// =============================================================================

import { CONFIG, PIN_STATUS } from './config.js';
import { initMap, renderPins, addPinToMap, removePinFromMap, applyFilter, clearFilter, getMarkersLayer } from './map.js';
import { getAllPins, subscribeToChanges } from './storage.js';

// =============================================================================
// Constants
// =============================================================================

const SEARCH_RADIUS_MILES = 50;
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

// =============================================================================
// State
// =============================================================================

let pinsCache = [];
let activeFilters = new Set(['critical', 'warning', 'active', 'past', 'weather']);
let searchCircle = null;

// =============================================================================
// DOM Elements
// =============================================================================

const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const searchResult = document.getElementById('search-result');
const legendList = document.getElementById('legend-list');
const showAllBtn = document.getElementById('show-all-btn');
const lastUpdatedEl = document.getElementById('last-updated');
const legend = document.getElementById('legend');
const legendToggle = document.getElementById('legend-toggle');

// =============================================================================
// Init
// =============================================================================

async function init() {
    // Initialize map
    const map = initMap('map');
    
    // Load and render pins
    pinsCache = await getAllPins();
    renderPins(pinsCache);
    updateCounts();
    updateLastUpdated();
    
    // Setup event listeners
    setupSearch();
    setupFilters();
    
    // Subscribe to realtime updates
    setupRealtime();
    
    console.log(`Loaded ${pinsCache.length} pins`);
}

// =============================================================================
// Search
// =============================================================================

function setupSearch() {
    searchForm.onsubmit = handleSearch;
}

async function handleSearch(e) {
    e.preventDefault();
    
    const query = searchInput.value.trim();
    
    // Validate zip code format
    if (!query) {
        showSearchResult('Please enter a zip code', 'error');
        return;
    }
    
    if (!/^\d{5}$/.test(query)) {
        showSearchResult('Please enter a valid 5-digit zip code', 'error');
        return;
    }
    
    // Show loading state
    showSearchResult('Searching...', 'neutral');
    
    try {
        // Geocode the zip code
        const coords = await geocode(query);
        
        if (!coords) {
            showSearchResult(`Zip code ${query} not found`, 'error');
            return;
        }
        
        // Find pins within radius
        const nearbyPins = findPinsInRadius(coords.lat, coords.lng, SEARCH_RADIUS_MILES);
        
        // Pan to location
        const map = await import('./map.js').then(m => m.getMap());
        map.setView([coords.lat, coords.lng], 9);
        
        // Draw search radius circle
        drawSearchCircle(coords.lat, coords.lng);
        
        // Show confirmation with location name
        if (nearbyPins.length === 0) {
            showSearchResult(`✓ Found ${query} (${coords.display}) — No pins within ${SEARCH_RADIUS_MILES} miles`, 'neutral');
        } else {
            showSearchResult(`✓ Found ${query} (${coords.display}) — ${nearbyPins.length} pin${nearbyPins.length === 1 ? '' : 's'} within ${SEARCH_RADIUS_MILES} miles`, 'success');
        }
        
    } catch (err) {
        console.error('Search error:', err);
        showSearchResult('Search failed. Please try again.', 'error');
    }
}

async function geocode(zipCode) {
    const params = new URLSearchParams({
        q: zipCode + ', USA',
        format: 'json',
        limit: 1,
        countrycodes: 'us'
    });
    
    const response = await fetch(`${NOMINATIM_URL}?${params}`, {
        headers: { 'User-Agent': 'UCN-Deployment-Map' }
    });
    
    if (!response.ok) return null;
    
    const results = await response.json();
    if (results.length === 0) return null;
    
    const result = results[0];
    // Extract city/state from display name
    const parts = result.display_name.split(',');
    const display = parts.slice(0, 2).join(',').trim();
    
    return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        display: display
    };
}

function findPinsInRadius(lat, lng, radiusMiles) {
    return pinsCache.filter(pin => {
        const distance = haversineDistance(lat, lng, pin.lat, pin.lng);
        return distance <= radiusMiles;
    });
}

function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 3959; // Earth radius in miles
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(deg) {
    return deg * (Math.PI / 180);
}

function drawSearchCircle(lat, lng) {
    const map = getMap();
    
    // Remove existing circle
    if (searchCircle) {
        map.removeLayer(searchCircle);
    }
    
    // Draw new circle (50 miles = ~80467 meters)
    searchCircle = L.circle([lat, lng], {
        radius: SEARCH_RADIUS_MILES * 1609.34,
        color: '#1e3a5f',
        fillColor: '#1e3a5f',
        fillOpacity: 0.1,
        weight: 2,
        dashArray: '5, 5'
    }).addTo(map);
}

function showSearchResult(message, type) {
    searchResult.textContent = message;
    searchResult.classList.remove('is-hidden', 'search-bar__result--error', 'search-bar__result--success');
    
    if (type === 'error') {
        searchResult.classList.add('search-bar__result--error');
    } else if (type === 'success') {
        searchResult.classList.add('search-bar__result--success');
    }
}

// Import getMap for search circle
async function getMap() {
    const mapModule = await import('./map.js');
    return mapModule.getMap();
}

// =============================================================================
// Filters
// =============================================================================

function setupFilters() {
    // Click on legend items to toggle
    legendList.querySelectorAll('.legend__item--clickable').forEach(item => {
        item.onclick = () => toggleFilter(item.dataset.status);
    });
    
    // Show all button
    showAllBtn.onclick = resetFilters;
    
    // Legend accordion toggle (mobile)
    legendToggle.onclick = toggleLegend;
    
    // Start collapsed on mobile
    if (window.innerWidth <= 768) {
        legend.classList.add('legend--collapsed');
        legendToggle.setAttribute('aria-expanded', 'false');
    }
}

function toggleLegend() {
    const isCollapsed = legend.classList.toggle('legend--collapsed');
    legendToggle.setAttribute('aria-expanded', !isCollapsed);
}

function toggleFilter(status) {
    if (activeFilters.has(status)) {
        activeFilters.delete(status);
    } else {
        activeFilters.add(status);
    }
    
    updateFilterUI();
    applyFilter(activeFilters);
}

function resetFilters() {
    activeFilters = new Set(['critical', 'warning', 'active', 'past', 'weather']);
    updateFilterUI();
    clearFilter();
}

function updateFilterUI() {
    legendList.querySelectorAll('.legend__item--clickable').forEach(item => {
        const status = item.dataset.status;
        if (activeFilters.has(status)) {
            item.classList.remove('legend__item--dimmed');
        } else {
            item.classList.add('legend__item--dimmed');
        }
    });
}

// =============================================================================
// Counts & Timestamps
// =============================================================================

function updateCounts() {
    const counts = {
        critical: 0,
        warning: 0,
        active: 0,
        past: 0,
        weather: 0
    };
    
    pinsCache.forEach(pin => {
        if (counts[pin.status] !== undefined) {
            counts[pin.status]++;
        }
    });
    
    // Update count displays
    Object.entries(counts).forEach(([status, count]) => {
        const countEl = document.querySelector(`[data-count="${status}"]`);
        if (countEl) {
            countEl.textContent = count;
        }
    });
}

function updateLastUpdated() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    lastUpdatedEl.textContent = `Updated ${timeStr}`;
}

// =============================================================================
// Realtime
// =============================================================================

function setupRealtime() {
    subscribeToChanges(
        // On insert
        (newPin) => {
            console.log('Realtime: New pin', newPin.id);
            pinsCache.push(newPin);
            addPinToMap(newPin);
            updateCounts();
            updateLastUpdated();
            
            // Re-apply filters to include new pin
            if (!activeFilters.has(newPin.status)) {
                applyFilter(activeFilters);
            }
        },
        // On update
        (updatedPin) => {
            console.log('Realtime: Updated pin', updatedPin.id);
            const index = pinsCache.findIndex(p => p.id === updatedPin.id);
            if (index !== -1) {
                pinsCache[index] = updatedPin;
            }
            // Re-render all pins to reflect changes
            renderPins(pinsCache);
            updateCounts();
            updateLastUpdated();
            applyFilter(activeFilters);
        },
        // On delete
        (deletedPin) => {
            console.log('Realtime: Deleted pin', deletedPin.id);
            pinsCache = pinsCache.filter(p => p.id !== deletedPin.id);
            removePinFromMap(deletedPin.id);
            updateCounts();
            updateLastUpdated();
        }
    );
}

// =============================================================================
// Run
// =============================================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
