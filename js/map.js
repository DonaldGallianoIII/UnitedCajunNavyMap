// =============================================================================
// FILENAME: map.js
// =============================================================================
// Purpose: Leaflet map initialization and pin marker management
//
// Responsibilities:
// - Initialize Leaflet map with tile layer
// - Create styled circle markers with pulse animation
// - Build popup content with conditional CTA buttons
// - CRUD operations for markers on map
//
// Dependencies:
// - config.js (CONFIG, PIN_STATUS)
// - Leaflet (global L)
//
// Public API:
// - initMap(containerId, options) -> map instance
// - getMap() -> map instance
// - renderPins(pins), addPinToMap(pin), removePinFromMap(id)
// - panToPin(pin), clearMarkers()
// =============================================================================

import { CONFIG, PIN_STATUS } from './config.js';

let mapInstance = null;
let markersLayer = null;

/**
 * Initialize the Leaflet map
 * @param {string} containerId - DOM element ID for the map
 * @param {Object} options - Optional overrides
 * @returns {Object} Leaflet map instance
 */
export function initMap(containerId, options = {}) {
    const config = {
        center: CONFIG.MapCenter,
        zoom: CONFIG.MapZoom,
        minZoom: CONFIG.MapMinZoom,
        maxZoom: CONFIG.MapMaxZoom,
        ...options
    };
    
    mapInstance = L.map(containerId, {
        center: config.center,
        zoom: config.zoom,
        minZoom: config.minZoom,
        maxZoom: config.maxZoom
    });
    
    L.tileLayer(CONFIG.TileUrl, {
        attribution: CONFIG.TileAttribution
    }).addTo(mapInstance);
    
    // Layer group for markers (easy to clear/refresh)
    markersLayer = L.layerGroup().addTo(mapInstance);
    
    return mapInstance;
}

/**
 * Get the map instance
 * @returns {Object} Leaflet map
 */
export function getMap() {
    return mapInstance;
}

/**
 * Build CSS class string for a pin marker
 * @param {string} status - Pin status key
 * @returns {string} Space-separated class names
 */
function getMarkerClassName(status) {
    const baseClass = `pin-marker--${status}`;
    
    // Past pins don't pulse
    if (status === 'past') {
        return baseClass;
    }
    
    return `pin-marker--pulse ${baseClass}`;
}

/**
 * Create a colored circle marker for a pin
 * @param {Object} pin - Pin data
 * @returns {Object} Leaflet marker
 */
export function createPinMarker(pin) {
    const status = PIN_STATUS[pin.status] || PIN_STATUS.active;
    const className = getMarkerClassName(pin.status);
    
    const marker = L.circleMarker([pin.lat, pin.lng], {
        radius: 10,
        fillColor: status.color,
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9,
        className: className
    });
    
    // Store pin data on marker for reference
    marker.pinData = pin;
    
    return marker;
}

/**
 * Build popup HTML content for a pin
 * @param {Object} pin - Pin data
 * @returns {HTMLElement} Popup content element
 */
export function createPopupContent(pin) {
    const status = PIN_STATUS[pin.status] || PIN_STATUS.active;
    const date = new Date(pin.created_at).toLocaleDateString();
    
    const container = document.createElement('div');
    container.className = 'pin-popup';
    
    // Header
    const header = document.createElement('div');
    header.className = 'pin-popup__header';
    
    const statusDot = document.createElement('span');
    statusDot.className = 'pin-popup__status';
    statusDot.style.backgroundColor = status.color;
    
    const title = document.createElement('span');
    title.className = 'pin-popup__title';
    title.textContent = pin.title;
    
    header.appendChild(statusDot);
    header.appendChild(title);
    container.appendChild(header);
    
    // Date
    const dateEl = document.createElement('div');
    dateEl.className = 'pin-popup__date';
    dateEl.textContent = date;
    container.appendChild(dateEl);
    
    // Address (if present)
    if (pin.address) {
        const addressEl = document.createElement('div');
        addressEl.className = 'pin-popup__address';
        addressEl.textContent = pin.address;
        container.appendChild(addressEl);
    }
    
    // Summary
    if (pin.summary) {
        const summary = document.createElement('p');
        summary.className = 'pin-popup__summary';
        summary.textContent = pin.summary;
        container.appendChild(summary);
    }
    
    // Action buttons (only if at least one is enabled)
    const showDonate = pin.show_donate === true;
    const showVolunteer = pin.show_volunteer === true;
    const showHelp = pin.show_help === true;
    
    if (showDonate || showVolunteer || showHelp) {
        const actions = document.createElement('div');
        actions.className = 'pin-popup__actions';
        
        if (showDonate) {
            const donateBtn = document.createElement('a');
            donateBtn.className = 'pin-popup__btn pin-popup__btn--donate';
            donateBtn.href = CONFIG.DonateUrl;
            donateBtn.target = '_blank';
            donateBtn.textContent = 'Donate';
            actions.appendChild(donateBtn);
        }
        
        if (showVolunteer) {
            const volunteerBtn = document.createElement('a');
            volunteerBtn.className = 'pin-popup__btn pin-popup__btn--volunteer';
            volunteerBtn.href = CONFIG.VolunteerUrl;
            volunteerBtn.target = '_blank';
            volunteerBtn.textContent = 'Volunteer';
            actions.appendChild(volunteerBtn);
        }
        
        if (showHelp) {
            const helpBtn = document.createElement('a');
            helpBtn.className = 'pin-popup__btn pin-popup__btn--help';
            helpBtn.href = CONFIG.RequestHelpUrl;
            helpBtn.target = '_blank';
            helpBtn.textContent = 'Get Help';
            actions.appendChild(helpBtn);
        }
        
        // Custom URL button
        if (pin.url) {
            const urlBtn = document.createElement('a');
            urlBtn.className = 'pin-popup__btn pin-popup__btn--url';
            urlBtn.href = pin.url;
            urlBtn.target = '_blank';
            urlBtn.textContent = pin.url_text || 'More Info';
            actions.appendChild(urlBtn);
        }
        
        container.appendChild(actions);
    }
    
    return container;
}

/**
 * Render all pins on the map
 * @param {Array} pins - Array of pin objects
 */
export function renderPins(pins) {
    // Clear existing markers
    markersLayer.clearLayers();
    
    pins.forEach(pin => {
        const marker = createPinMarker(pin);
        const popupContent = createPopupContent(pin);
        
        marker.bindPopup(popupContent, {
            maxWidth: 280,
            className: 'pin-popup-wrapper'
        });
        
        markersLayer.addLayer(marker);
    });
}

/**
 * Add a single pin to the map
 * @param {Object} pin - Pin data
 * @returns {Object} Leaflet marker
 */
export function addPinToMap(pin) {
    const marker = createPinMarker(pin);
    const popupContent = createPopupContent(pin);
    
    marker.bindPopup(popupContent, {
        maxWidth: 280,
        className: 'pin-popup-wrapper'
    });
    
    markersLayer.addLayer(marker);
    return marker;
}

/**
 * Remove a pin from the map by ID
 * @param {string} pinId - Pin ID
 */
export function removePinFromMap(pinId) {
    markersLayer.eachLayer(layer => {
        if (layer.pinData && layer.pinData.id === pinId) {
            markersLayer.removeLayer(layer);
        }
    });
}

/**
 * Pan to a specific pin
 * @param {Object} pin - Pin data
 */
export function panToPin(pin) {
    mapInstance.setView([pin.lat, pin.lng], 12);
}

/**
 * Clear all markers
 */
export function clearMarkers() {
    markersLayer.clearLayers();
}

/**
 * Apply filter to markers - dims markers with statuses not in activeStatuses
 * @param {Set<string>} activeStatuses - Set of status keys to show fully
 */
export function applyFilter(activeStatuses) {
    markersLayer.eachLayer(layer => {
        if (!layer.pinData) return;
        
        const el = layer.getElement();
        if (!el) return;
        
        if (activeStatuses.has(layer.pinData.status)) {
            el.classList.remove('pin-marker--dimmed');
        } else {
            el.classList.add('pin-marker--dimmed');
        }
    });
}

/**
 * Clear all filters - show all markers fully
 */
export function clearFilter() {
    markersLayer.eachLayer(layer => {
        const el = layer.getElement();
        if (el) {
            el.classList.remove('pin-marker--dimmed');
        }
    });
}

/**
 * Get marker layer for external access
 * @returns {Object} Leaflet layer group
 */
export function getMarkersLayer() {
    return markersLayer;
}
