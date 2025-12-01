// =============================================================================
// FILENAME: storage.js
// =============================================================================
// Purpose: Supabase REST API wrapper for pin CRUD and authentication
//
// Responsibilities:
// - Authentication via Supabase Auth
// - GET/POST/PATCH/DELETE requests to Supabase
// - Realtime subscriptions
//
// Dependencies:
// - config.js (SUPABASE_CONFIG)
// - Supabase JS client (loaded via script tag)
// =============================================================================

import { SUPABASE_CONFIG } from './config.js';

const SUPABASE_URL = SUPABASE_CONFIG.url;
const SUPABASE_KEY = SUPABASE_CONFIG.anonKey;

// Singleton Supabase client
let supabaseClient = null;

/**
 * Get or create the Supabase client
 * @returns {Object} Supabase client
 */
function getClient() {
    if (!supabaseClient) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    return supabaseClient;
}

// =============================================================================
// Authentication
// =============================================================================

/**
 * Sign in with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{user: Object|null, error: string|null}>}
 */
export async function signIn(email, password) {
    try {
        const { data, error } = await getClient().auth.signInWithPassword({
            email,
            password
        });
        
        if (error) {
            return { user: null, error: error.message };
        }
        
        return { user: data.user, error: null };
    } catch (err) {
        return { user: null, error: 'Sign in failed' };
    }
}

/**
 * Sign out the current user
 * @returns {Promise<boolean>} Success
 */
export async function signOut() {
    try {
        await getClient().auth.signOut();
        return true;
    } catch (err) {
        return false;
    }
}

/**
 * Get the current session
 * @returns {Promise<{session: Object|null, user: Object|null}>}
 */
export async function getSession() {
    try {
        const { data: { session } } = await getClient().auth.getSession();
        return {
            session,
            user: session?.user || null
        };
    } catch (err) {
        return { session: null, user: null };
    }
}

/**
 * Subscribe to auth state changes
 * @param {Function} callback - Called with (event, session)
 * @returns {Object} Subscription (call .unsubscribe() to stop)
 */
export function onAuthStateChange(callback) {
    const { data: { subscription } } = getClient().auth.onAuthStateChange(callback);
    return subscription;
}

// =============================================================================
// Pin CRUD
// =============================================================================

/**
 * Make an authenticated request to Supabase REST API
 */
async function supabaseRequest(endpoint, options = {}) {
    const client = getClient();
    const { data: { session } } = await client.auth.getSession();
    
    const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
    
    const headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${session?.access_token || SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': options.prefer || 'return=representation'
    };
    
    const response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
    });
    
    if (!response.ok) {
        const error = await response.text();
        console.error('Supabase error:', error);
        throw new Error(`Supabase request failed: ${response.status}`);
    }
    
    const text = await response.text();
    return text ? JSON.parse(text) : null;
}

/**
 * Get all pins from Supabase
 * @returns {Promise<Array>} Array of pin objects
 */
export async function getAllPins() {
    try {
        const pins = await supabaseRequest('pins?select=*&order=created_at.desc');
        return pins || [];
    } catch (err) {
        console.error('Failed to load pins:', err);
        return [];
    }
}

/**
 * Save a new pin to Supabase (requires authentication)
 * @param {Object} pin - Pin data
 * @returns {Promise<Object>} Saved pin with id and created_at
 */
export async function savePin(pin) {
    try {
        const newPin = {
            title: pin.title,
            address: pin.address || '',
            summary: pin.summary || '',
            status: pin.status,
            lat: pin.lat,
            lng: pin.lng,
            url: pin.url || '',
            url_text: pin.url_text || 'More Info',
            show_donate: pin.show_donate || false,
            show_volunteer: pin.show_volunteer || false,
            show_help: pin.show_help || false
        };
        
        const result = await supabaseRequest('pins', {
            method: 'POST',
            body: newPin
        });
        
        return result[0];
    } catch (err) {
        console.error('Failed to save pin:', err);
        return null;
    }
}

/**
 * Update an existing pin (requires authentication)
 * @param {string|number} id - Pin ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object|null>} Updated pin or null
 */
export async function updatePin(id, updates) {
    try {
        const result = await supabaseRequest(`pins?id=eq.${id}`, {
            method: 'PATCH',
            body: updates
        });
        
        return result[0] || null;
    } catch (err) {
        console.error('Failed to update pin:', err);
        return null;
    }
}

/**
 * Delete a pin (requires authentication)
 * @param {string|number} id - Pin ID
 * @returns {Promise<boolean>} Success
 */
export async function deletePin(id) {
    try {
        await supabaseRequest(`pins?id=eq.${id}`, {
            method: 'DELETE'
        });
        return true;
    } catch (err) {
        console.error('Failed to delete pin:', err);
        return false;
    }
}

/**
 * Get a single pin by ID
 * @param {string|number} id - Pin ID
 * @returns {Promise<Object|null>} Pin or null
 */
export async function getPinById(id) {
    try {
        const result = await supabaseRequest(`pins?id=eq.${id}&select=*`);
        return result[0] || null;
    } catch (err) {
        console.error('Failed to get pin:', err);
        return null;
    }
}

// =============================================================================
// Realtime
// =============================================================================

/**
 * Subscribe to realtime pin changes
 * @param {Function} onInsert - Callback for new pins
 * @param {Function} onUpdate - Callback for updated pins
 * @param {Function} onDelete - Callback for deleted pins
 * @returns {Object} Supabase channel (call .unsubscribe() to stop)
 */
export function subscribeToChanges(onInsert, onUpdate, onDelete) {
    const channel = getClient()
        .channel('pins-realtime')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'pins' },
            (payload) => onInsert?.(payload.new)
        )
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'pins' },
            (payload) => onUpdate?.(payload.new)
        )
        .on(
            'postgres_changes',
            { event: 'DELETE', schema: 'public', table: 'pins' },
            (payload) => onDelete?.(payload.old)
        )
        .subscribe();
    
    return channel;
}
