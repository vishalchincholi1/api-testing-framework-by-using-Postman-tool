/**
 * Authentication Helpers for Postman
 * Common authentication patterns and utilities
 */

const AuthHelpers = {

    // =============================================================================
    // JWT TOKEN MANAGEMENT
    // =============================================================================

    /**
     * Extract and store JWT token from response
     * @param {string} tokenPath - Path to token in response (e.g., 'data.token' or 'access_token')
     */
    extractAndStoreJWT: function(tokenPath = 'token') {
        pm.test("Token extraction", () => {
            const responseJson = pm.response.json();
            const token = this.getNestedProperty(responseJson, tokenPath);
            
            pm.expect(token).to.not.be.undefined;
            pm.expect(token).to.not.be.empty;
            
            // Store token in environment
            pm.environment.set("authToken", token);
            pm.environment.set("tokenTimestamp", new Date().toISOString());
            
            console.log("JWT token stored successfully");
        });
    },

    /**
     * Validate JWT token structure
     * @param {string} token - JWT token to validate
     */
    validateJWTStructure: function(token = null) {
        const jwtToken = token || pm.environment.get("authToken");
        
        pm.test("JWT token structure validation", () => {
            pm.expect(jwtToken).to.not.be.undefined;
            
            const parts = jwtToken.split('.');
            pm.expect(parts).to.have.lengthOf(3);
            
            // Validate each part is base64 encoded
            parts.forEach((part, index) => {
                pm.expect(part).to.not.be.empty;
                // Basic base64 validation
                pm.expect(part).to.match(/^[A-Za-z0-9_-]+$/);
            });
        });
    },

    /**
     * Decode JWT payload (without verification)
     * @param {string} token - JWT token to decode
     * @returns {Object} - Decoded payload
     */
    decodeJWTPayload: function(token = null) {
        const jwtToken = token || pm.environment.get("authToken");
        
        try {
            const parts = jwtToken.split('.');
            const payload = parts[1];
            
            // Add padding if needed
            const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
            const decodedPayload = atob(paddedPayload.replace(/-/g, '+').replace(/_/g, '/'));
            
            return JSON.parse(decodedPayload);
        } catch (error) {
            console.error("Failed to decode JWT payload:", error);
            return null;
        }
    },

    /**
     * Check if JWT token is expired
     * @param {string} token - JWT token to check
     * @returns {boolean} - True if token is expired
     */
    isJWTExpired: function(token = null) {
        const payload = this.decodeJWTPayload(token);
        
        if (!payload || !payload.exp) {
            return true; // Consider invalid tokens as expired
        }
        
        const currentTime = Math.floor(Date.now() / 1000);
        return payload.exp < currentTime;
    },

    // =============================================================================
    // OAUTH 2.0 HELPERS
    // =============================================================================

    /**
     * Handle OAuth 2.0 authorization code flow
     * @param {Object} config - OAuth configuration
     */
    handleOAuthCodeFlow: function(config) {
        const {
            clientId,
            clientSecret,
            redirectUri,
            authorizationCode,
            tokenEndpoint
        } = config;

        const requestBody = {
            grant_type: 'authorization_code',
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            code: authorizationCode
        };

        pm.sendRequest({
            url: tokenEndpoint,
            method: 'POST',
            header: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: {
                mode: 'urlencoded',
                urlencoded: Object.entries(requestBody).map(([key, value]) => ({
                    key,
                    value,
                    disabled: false
                }))
            }
        }, (err, response) => {
            if (err) {
                console.error('OAuth token request failed:', err);
                return;
            }

            const tokenData = response.json();
            pm.environment.set("accessToken", tokenData.access_token);
            pm.environment.set("refreshToken", tokenData.refresh_token);
            pm.environment.set("tokenType", tokenData.token_type || "Bearer");
            
            if (tokenData.expires_in) {
                const expiryTime = new Date(Date.now() + (tokenData.expires_in * 1000));
                pm.environment.set("tokenExpiry", expiryTime.toISOString());
            }
        });
    },

    /**
     * Refresh OAuth 2.0 access token
     * @param {Object} config - Refresh token configuration
     */
    refreshOAuthToken: function(config) {
        const {
            clientId,
            clientSecret,
            tokenEndpoint
        } = config;

        const refreshToken = pm.environment.get("refreshToken");
        
        if (!refreshToken) {
            console.error("No refresh token available");
            return;
        }

        const requestBody = {
            grant_type: 'refresh_token',
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken
        };

        pm.sendRequest({
            url: tokenEndpoint,
            method: 'POST',
            header: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: {
                mode: 'urlencoded',
                urlencoded: Object.entries(requestBody).map(([key, value]) => ({
                    key,
                    value,
                    disabled: false
                }))
            }
        }, (err, response) => {
            if (err) {
                console.error('Token refresh failed:', err);
                return;
            }

            const tokenData = response.json();
            pm.environment.set("accessToken", tokenData.access_token);
            
            if (tokenData.refresh_token) {
                pm.environment.set("refreshToken", tokenData.refresh_token);
            }
            
            if (tokenData.expires_in) {
                const expiryTime = new Date(Date.now() + (tokenData.expires_in * 1000));
                pm.environment.set("tokenExpiry", expiryTime.toISOString());
            }
        });
    },

    // =============================================================================
    // API KEY MANAGEMENT
    // =============================================================================

    /**
     * Validate API key response
     * @param {string} apiKeyHeader - Header name for API key
     */
    validateApiKeyAuth: function(apiKeyHeader = 'X-API-Key') {
        pm.test("API Key authentication", () => {
            const apiKey = pm.request.headers.get(apiKeyHeader);
            pm.expect(apiKey).to.not.be.undefined;
            pm.expect(apiKey).to.not.be.empty;
            
            // Validate response indicates successful authentication
            pm.response.to.have.status(200);
            pm.response.to.not.have.header('WWW-Authenticate');
        });
    },

    // =============================================================================
    // BASIC AUTH HELPERS
    // =============================================================================

    /**
     * Generate Basic Auth header
     * @param {string} username - Username
     * @param {string} password - Password
     * @returns {string} - Basic auth header value
     */
    generateBasicAuth: function(username, password) {
        const credentials = `${username}:${password}`;
        const encoded = btoa(credentials);
        return `Basic ${encoded}`;
    },

    /**
     * Validate Basic Auth response
     */
    validateBasicAuth: function() {
        pm.test("Basic authentication successful", () => {
            pm.response.to.have.status(200);
            pm.response.to.not.have.header('WWW-Authenticate');
        });
    },

    // =============================================================================
    // SESSION MANAGEMENT
    // =============================================================================

    /**
     * Extract and store session cookies
     */
    extractSessionCookies: function() {
        pm.test("Session cookie extraction", () => {
            const cookies = pm.cookies.all();
            const sessionCookies = cookies.filter(cookie => 
                cookie.name.toLowerCase().includes('session') ||
                cookie.name.toLowerCase().includes('jsessionid') ||
                cookie.name.toLowerCase().includes('phpsessid')
            );
            
            pm.expect(sessionCookies).to.not.be.empty;
            
            sessionCookies.forEach(cookie => {
                pm.environment.set(`cookie_${cookie.name}`, cookie.value);
            });
            
            console.log(`Stored ${sessionCookies.length} session cookies`);
        });
    },

    /**
     * Validate session is active
     */
    validateActiveSession: function() {
        pm.test("Active session validation", () => {
            // Check for session indicators in response
            pm.response.to.have.status(200);
            pm.response.to.not.have.status(401);
            pm.response.to.not.have.status(403);
            
            const responseBody = pm.response.text();
            pm.expect(responseBody).to.not.include('login');
            pm.expect(responseBody).to.not.include('unauthorized');
        });
    },

    // =============================================================================
    // UTILITY FUNCTIONS
    // =============================================================================

    /**
     * Get nested property from object using dot notation
     * @param {Object} obj - Object to search
     * @param {string} path - Dot notation path (e.g., 'data.user.token')
     * @returns {*} - Property value or undefined
     */
    getNestedProperty: function(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    },

    /**
     * Check if token needs refresh (expires within 5 minutes)
     * @returns {boolean} - True if token needs refresh
     */
    needsTokenRefresh: function() {
        const tokenExpiry = pm.environment.get("tokenExpiry");
        
        if (!tokenExpiry) {
            return true;
        }
        
        const expiryTime = new Date(tokenExpiry);
        const currentTime = new Date();
        const fiveMinutesFromNow = new Date(currentTime.getTime() + (5 * 60 * 1000));
        
        return expiryTime <= fiveMinutesFromNow;
    },

    /**
     * Clear all authentication data
     */
    clearAuthData: function() {
        const authVars = [
            'authToken', 'accessToken', 'refreshToken', 'tokenType',
            'tokenExpiry', 'tokenTimestamp'
        ];
        
        authVars.forEach(varName => {
            pm.environment.unset(varName);
        });
        
        console.log("Authentication data cleared");
    },

    /**
     * Log authentication status
     */
    logAuthStatus: function() {
        const token = pm.environment.get("authToken") || pm.environment.get("accessToken");
        const tokenExpiry = pm.environment.get("tokenExpiry");
        
        console.log("=== Authentication Status ===");
        console.log(`Token present: ${!!token}`);
        console.log(`Token expires: ${tokenExpiry || 'Unknown'}`);
        console.log(`Needs refresh: ${this.needsTokenRefresh()}`);
        console.log("=============================");
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthHelpers;
}

// Usage Examples:
/*
// JWT Token handling
AuthHelpers.extractAndStoreJWT('data.access_token');
AuthHelpers.validateJWTStructure();

// Check if token is expired
if (AuthHelpers.isJWTExpired()) {
    console.log("Token is expired, need to refresh");
}

// OAuth 2.0 flow
AuthHelpers.handleOAuthCodeFlow({
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret',
    redirectUri: 'https://your-app.com/callback',
    authorizationCode: 'received-auth-code',
    tokenEndpoint: 'https://auth-server.com/token'
});

// API Key validation
AuthHelpers.validateApiKeyAuth('X-API-Key');

// Session management
AuthHelpers.extractSessionCookies();
AuthHelpers.validateActiveSession();
*/
