/**
 * Express Backend – entry point
 *
 * Thin wrapper that delegates to server.js.
 * Kept so existing Dockerfile CMD and npm scripts don't break.
 */

import './server.js';
