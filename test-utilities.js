/**
 * Postman Test Utilities
 * Collection of reusable functions for API testing
 */

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

const TestUtils = {
    
    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} - True if valid email format
     */
    validateEmail: function(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    },

    /**
     * Validate phone number (US format)
     * @param {string} phone - Phone number to validate
     * @returns {boolean} - True if valid phone format
     */
    validatePhone: function(phone) {
        const regex = /^\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/;
        return regex.test(phone);
    },

    /**
     * Validate URL format
     * @param {string} url - URL to validate
     * @returns {boolean} - True if valid URL format
     */
    validateUrl: function(url) {
        try {
            new URL(url);
            return true;
        } catch (e) {
            return false;
        }
    },

    /**
     * Validate date format (YYYY-MM-DD)
     * @param {string} date - Date string to validate
     * @returns {boolean} - True if valid date format
     */
    validateDate: function(date) {
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(date)) return false;
        const dateObj = new Date(date);
        return dateObj instanceof Date && !isNaN(dateObj);
    },

    // =============================================================================
    // RESPONSE VALIDATION
    // =============================================================================

    /**
     * Validate standard HTTP status codes
     * @param {number} expectedStatus - Expected status code
     */
    validateStatusCode: function(expectedStatus) {
        pm.test(`Status code is ${expectedStatus}`, () => {
            pm.response.to.have.status(expectedStatus);
        });
    },

    /**
     * Validate response time threshold
     * @param {number} maxTime - Maximum acceptable response time in ms
     */
    validateResponseTime: function(maxTime = 2000) {
        pm.test(`Response time is below ${maxTime}ms`, () => {
            pm.expect(pm.response.responseTime).to.be.below(maxTime);
        });
    },

    /**
     * Validate required headers are present
     * @param {Array} requiredHeaders - Array of required header names
     */
    validateHeaders: function(requiredHeaders) {
        pm.test("Required headers are present", () => {
            requiredHeaders.forEach(header => {
                pm.response.to.have.header(header);
            });
        });
    },

    /**
     * Validate security headers
     */
    validateSecurityHeaders: function() {
        const securityHeaders = [
            "Strict-Transport-Security",
            "X-Content-Type-Options",
            "X-Frame-Options",
            "X-XSS-Protection"
        ];
        
        pm.test("Security headers are present", () => {
            securityHeaders.forEach(header => {
                pm.response.to.have.header(header);
            });
        });
    },

    // =============================================================================
    // DATA GENERATION
    // =============================================================================

    /**
     * Generate random string
     * @param {number} length - Length of string to generate
     * @returns {string} - Random string
     */
    generateRandomString: function(length = 10) {
        const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        return Array(length)
            .fill('')
            .map(() => chars[Math.floor(Math.random() * chars.length)])
            .join('');
    },

    /**
     * Generate random email
     * @param {string} domain - Email domain (optional)
     * @returns {string} - Random email address
     */
    generateRandomEmail: function(domain = 'example.com') {
        const username = this.generateRandomString(8).toLowerCase();
        return `${username}@${domain}`;
    },

    /**
     * Generate random number within range
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} - Random number
     */
    generateRandomNumber: function(min = 1, max = 100) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * Generate UUID v4
     * @returns {string} - UUID string
     */
    generateUUID: function() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    // =============================================================================
    // ENVIRONMENT MANAGEMENT
    // =============================================================================

    /**
     * Set environment variable with logging
     * @param {string} key - Variable name
     * @param {*} value - Variable value
     */
    setEnvVar: function(key, value) {
        pm.environment.set(key, typeof value === 'object' ? JSON.stringify(value) : value);
        console.log(`Set environment variable: ${key} = ${value}`);
    },

    /**
     * Get environment variable with default value
     * @param {string} key - Variable name
     * @param {*} defaultValue - Default value if not found
     * @returns {*} - Variable value or default
     */
    getEnvVar: function(key, defaultValue = null) {
        const value = pm.environment.get(key);
        return value !== undefined ? value : defaultValue;
    },

    /**
     * Clear environment variable
     * @param {string} key - Variable name to clear
     */
    clearEnvVar: function(key) {
        pm.environment.unset(key);
        console.log(`Cleared environment variable: ${key}`);
    },

    // =============================================================================
    // METRICS COLLECTION
    // =============================================================================

    /**
     * Collect test metrics
     * @param {Object} additionalData - Additional metrics to collect
     */
    collectMetrics: function(additionalData = {}) {
        const metrics = {
            timestamp: new Date().toISOString(),
            endpoint: pm.request.url.toString(),
            method: pm.request.method,
            responseTime: pm.response.responseTime,
            status: pm.response.status,
            responseSize: pm.response.size(),
            ...additionalData
        };

        // Store metrics
        let testMetrics = JSON.parse(this.getEnvVar("testMetrics", "[]"));
        testMetrics.push(metrics);
        
        // Keep only last 100 entries
        if (testMetrics.length > 100) {
            testMetrics = testMetrics.slice(-100);
        }
        
        this.setEnvVar("testMetrics", testMetrics);
    },

    /**
     * Get performance summary
     * @returns {Object} - Performance metrics summary
     */
    getPerformanceSummary: function() {
        const metrics = JSON.parse(this.getEnvVar("testMetrics", "[]"));
        
        if (metrics.length === 0) {
            return { message: "No metrics collected yet" };
        }

        const responseTimes = metrics.map(m => m.responseTime);
        const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        const maxResponseTime = Math.max(...responseTimes);
        const minResponseTime = Math.min(...responseTimes);

        return {
            totalRequests: metrics.length,
            avgResponseTime: Math.round(avgResponseTime),
            maxResponseTime,
            minResponseTime,
            successRate: (metrics.filter(m => m.status < 400).length / metrics.length * 100).toFixed(2) + '%'
        };
    },

    // =============================================================================
    // SCHEMA VALIDATION
    // =============================================================================

    /**
     * Validate JSON schema
     * @param {Object} schema - JSON schema object
     * @param {Object} data - Data to validate (optional, uses response if not provided)
     */
    validateSchema: function(schema, data = null) {
        const responseData = data || pm.response.json();
        
        pm.test("Schema validation", () => {
            pm.expect(responseData).to.have.jsonSchema(schema);
        });
    },

    /**
     * Common schemas for reuse
     */
    schemas: {
        user: {
            type: "object",
            properties: {
                id: { type: "integer" },
                name: { type: "string" },
                email: { type: "string", format: "email" },
                createdAt: { type: "string", format: "date-time" }
            },
            required: ["id", "name", "email"]
        },

        product: {
            type: "object",
            properties: {
                id: { type: "integer" },
                name: { type: "string" },
                price: { type: "number", minimum: 0 },
                category: { type: "string" },
                inStock: { type: "boolean" }
            },
            required: ["id", "name", "price"]
        },

        apiResponse: {
            type: "object",
            properties: {
                status: { type: "string" },
                message: { type: "string" },
                data: { type: "object" },
                timestamp: { type: "string", format: "date-time" }
            },
            required: ["status"]
        }
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TestUtils;
}

// Usage Examples:
/*
// Basic validation
TestUtils.validateStatusCode(200);
TestUtils.validateResponseTime(1000);

// Data validation
const email = pm.response.json().email;
pm.test("Email format is valid", () => {
    pm.expect(TestUtils.validateEmail(email)).to.be.true;
});

// Generate test data
const randomEmail = TestUtils.generateRandomEmail();
pm.environment.set("testEmail", randomEmail);

// Schema validation
TestUtils.validateSchema(TestUtils.schemas.user);

// Collect metrics
TestUtils.collectMetrics({ testName: "User Registration" });
*/
