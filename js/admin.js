// =============================================================================
// FILENAME: admin.js
// =============================================================================
// Purpose: Admin panel for managing map pins
//
// Responsibilities:
// - Handle admin authentication via Supabase Auth
// - Click-to-place pin workflow
// - Pin CRUD with form management
// - Render pin list with edit/delete actions
//
// Dependencies:
// - config.js (CONFIG, PIN_STATUS)
// - map.js (initMap, renderPins, addPinToMap, removePinFromMap, panToPin, getMap)
// - storage.js (auth + CRUD functions)
// =============================================================================

import { CONFIG, PIN_STATUS } from './config.js';
import { initMap, renderPins, addPinToMap, removePinFromMap, panToPin, getMap } from './map.js';
import { 
    getAllPins, savePin, updatePin, deletePin, getPinById,
    signIn, signOut, getSession, onAuthStateChange 
} from './storage.js';

// =============================================================================
// DOM Elements
// =============================================================================

const loginScreen = document.getElementById('login-screen');
const adminPanel = document.getElementById('admin-panel');
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');

const pinForm = document.getElementById('pin-form');
const pinTitleInput = document.getElementById('pin-title');
const pinAddressInput = document.getElementById('pin-address');
const pinStatusSelect = document.getElementById('pin-status');
const pinSummaryInput = document.getElementById('pin-summary');
const pinUrlInput = document.getElementById('pin-url');
const pinUrlTextInput = document.getElementById('pin-url-text');
const pinShowDonateCheckbox = document.getElementById('pin-show-donate');
const pinShowVolunteerCheckbox = document.getElementById('pin-show-volunteer');
const pinShowHelpCheckbox = document.getElementById('pin-show-help');
const pinLatInput = document.getElementById('pin-lat');
const pinLngInput = document.getElementById('pin-lng');
const pinIdInput = document.getElementById('pin-id');
const cancelBtn = document.getElementById('cancel-btn');

const pinList = document.getElementById('pin-list');

// =============================================================================
// State
// =============================================================================

let tempMarker = null;
let isEditing = false;
let pinsCache = [];
let mapInitialized = false;

// =============================================================================
// Auth
// =============================================================================

async function checkAuth() {
    const { user } = await getSession();
    
    if (user) {
        showAdminPanel();
    } else {
        showLoginScreen();
    }
}

function showLoginScreen() {
    loginScreen.classList.remove('is-hidden');
    adminPanel.classList.add('is-hidden');
}

function showAdminPanel() {
    loginScreen.classList.add('is-hidden');
    adminPanel.classList.remove('is-hidden');
    
    if (!mapInitialized) {
        initAdminMap();
        mapInitialized = true;
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    if (!email || !password) {
        showLoginError('Please enter email and password');
        return;
    }
    
    // Disable form while logging in
    loginForm.querySelector('button').disabled = true;
    loginForm.querySelector('button').textContent = 'Signing in...';
    
    const { user, error } = await signIn(email, password);
    
    // Re-enable form
    loginForm.querySelector('button').disabled = false;
    loginForm.querySelector('button').textContent = 'Sign In';
    
    if (error) {
        showLoginError(error);
        passwordInput.value = '';
        passwordInput.focus();
    } else {
        hideLoginError();
        showAdminPanel();
    }
}

async function handleLogout() {
    await signOut();
    showLoginScreen();
    emailInput.value = '';
    passwordInput.value = '';
}

function showLoginError(message) {
    loginError.textContent = message;
    loginError.classList.remove('is-hidden');
}

function hideLoginError() {
    loginError.classList.add('is-hidden');
}

// =============================================================================
// Admin Map
// =============================================================================

async function initAdminMap() {
    const map = initMap('map');
    
    // Load existing pins
    pinsCache = await getAllPins();
    renderPins(pinsCache);
    renderPinList(pinsCache);
    
    // Click to place pin
    map.on('click', handleMapClick);
}

function handleMapClick(e) {
    const { lat, lng } = e.latlng;
    
    // Remove existing temp marker if any
    if (tempMarker) {
        getMap().removeLayer(tempMarker);
    }
    
    // Create temp marker
    tempMarker = L.circleMarker([lat, lng], {
        radius: 10,
        fillColor: '#888888',
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.7
    }).addTo(getMap());
    
    // Reset form for new pin
    resetForm();
    pinLatInput.value = lat;
    pinLngInput.value = lng;
    isEditing = false;
    
    // Show form
    pinForm.classList.remove('is-hidden');
    pinTitleInput.focus();
}

// =============================================================================
// Pin Form
// =============================================================================

async function handlePinSubmit(e) {
    e.preventDefault();
    
    const pinData = {
        title: pinTitleInput.value.trim(),
        address: pinAddressInput.value.trim(),
        status: pinStatusSelect.value,
        summary: pinSummaryInput.value.trim(),
        url: pinUrlInput.value.trim(),
        url_text: pinUrlTextInput.value.trim() || 'More Info',
        lat: parseFloat(pinLatInput.value),
        lng: parseFloat(pinLngInput.value),
        show_donate: pinShowDonateCheckbox.checked,
        show_volunteer: pinShowVolunteerCheckbox.checked,
        show_help: pinShowHelpCheckbox.checked
    };
    
    if (!pinData.title) {
        alert('Please enter a title');
        return;
    }
    
    // Remove temp marker
    if (tempMarker) {
        getMap().removeLayer(tempMarker);
        tempMarker = null;
    }
    
    if (isEditing) {
        // Update existing pin
        const id = pinIdInput.value;
        const updated = await updatePin(id, pinData);
        
        if (updated) {
            // Refresh map
            pinsCache = await getAllPins();
            renderPins(pinsCache);
            renderPinList(pinsCache);
        } else {
            alert('Failed to update pin. Please try again.');
        }
    } else {
        // Save new pin
        const newPin = await savePin(pinData);
        if (newPin) {
            addPinToMap(newPin);
            pinsCache = await getAllPins();
            renderPinList(pinsCache);
        } else {
            alert('Failed to save pin. Please try again.');
        }
    }
    
    // Reset form
    resetForm();
    pinForm.classList.add('is-hidden');
}

function handleCancel() {
    // Remove temp marker
    if (tempMarker) {
        getMap().removeLayer(tempMarker);
        tempMarker = null;
    }
    
    resetForm();
    pinForm.classList.add('is-hidden');
}

function resetForm() {
    pinTitleInput.value = '';
    pinAddressInput.value = '';
    pinStatusSelect.value = 'active';
    pinSummaryInput.value = '';
    pinUrlInput.value = '';
    pinUrlTextInput.value = 'More Info';
    pinShowDonateCheckbox.checked = false;
    pinShowVolunteerCheckbox.checked = false;
    pinShowHelpCheckbox.checked = false;
    pinLatInput.value = '';
    pinLngInput.value = '';
    pinIdInput.value = '';
    isEditing = false;
}

// =============================================================================
// Pin List
// =============================================================================

function renderPinList(pins) {
    // Clear list
    while (pinList.firstChild) {
        pinList.removeChild(pinList.firstChild);
    }
    
    if (pins.length === 0) {
        const empty = document.createElement('li');
        empty.className = 'pin-list__empty';
        empty.textContent = 'No pins yet. Click the map to add one.';
        empty.style.cssText = 'padding: 16px; text-align: center; color: #64748b; font-size: 14px;';
        pinList.appendChild(empty);
        return;
    }
    
    pins.forEach(pin => {
        const status = PIN_STATUS[pin.status] || PIN_STATUS.active;
        
        const li = document.createElement('li');
        li.className = 'pin-list__item';
        li.dataset.pinId = pin.id;
        
        // Info section
        const info = document.createElement('div');
        info.className = 'pin-list__info';
        
        const dot = document.createElement('span');
        dot.className = 'pin-list__dot';
        dot.style.backgroundColor = status.color;
        
        const name = document.createElement('span');
        name.className = 'pin-list__name';
        name.textContent = pin.title;
        
        info.appendChild(dot);
        info.appendChild(name);
        
        // Actions section
        const actions = document.createElement('div');
        actions.className = 'pin-list__actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'pin-list__btn';
        editBtn.textContent = '✏️';
        editBtn.title = 'Edit';
        editBtn.onclick = (e) => {
            e.stopPropagation();
            handleEditPin(pin.id);
        };
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'pin-list__btn';
        deleteBtn.textContent = '🗑️';
        deleteBtn.title = 'Delete';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            handleDeletePin(pin.id);
        };
        
        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        
        li.appendChild(info);
        li.appendChild(actions);
        
        // Click to pan to pin
        li.onclick = () => panToPin(pin);
        
        pinList.appendChild(li);
    });
}

async function handleEditPin(id) {
    const pin = await getPinById(id);
    if (!pin) return;
    
    // Remove temp marker if exists
    if (tempMarker) {
        getMap().removeLayer(tempMarker);
        tempMarker = null;
    }
    
    // Populate form
    pinTitleInput.value = pin.title;
    pinAddressInput.value = pin.address || '';
    pinStatusSelect.value = pin.status;
    pinSummaryInput.value = pin.summary || '';
    pinUrlInput.value = pin.url || '';
    pinUrlTextInput.value = pin.url_text || 'More Info';
    pinShowDonateCheckbox.checked = pin.show_donate === true;
    pinShowVolunteerCheckbox.checked = pin.show_volunteer === true;
    pinShowHelpCheckbox.checked = pin.show_help === true;
    pinLatInput.value = pin.lat;
    pinLngInput.value = pin.lng;
    pinIdInput.value = pin.id;
    isEditing = true;
    
    // Show form and pan to pin
    pinForm.classList.remove('is-hidden');
    panToPin(pin);
    pinTitleInput.focus();
}

async function handleDeletePin(id) {
    if (!confirm('Delete this pin?')) return;
    
    const success = await deletePin(id);
    
    if (success) {
        removePinFromMap(id);
        pinsCache = await getAllPins();
        renderPinList(pinsCache);
        
        // Hide form if editing this pin
        if (pinIdInput.value == id) {
            resetForm();
            pinForm.classList.add('is-hidden');
        }
    } else {
        alert('Failed to delete pin. Please try again.');
    }
}

// =============================================================================
// Event Listeners
// =============================================================================

loginForm.onsubmit = handleLogin;
logoutBtn.onclick = handleLogout;
pinForm.onsubmit = handlePinSubmit;
cancelBtn.onclick = handleCancel;

// Listen for auth state changes (handles session expiry, etc.)
onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
        showLoginScreen();
    }
});

// =============================================================================
// Init
// =============================================================================

checkAuth();
