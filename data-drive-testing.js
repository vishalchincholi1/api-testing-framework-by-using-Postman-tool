/**
 * Data-Driven Testing Utilities for Postman
 * Utilities for running tests with multiple data sets
 */

const DataDrivenTesting = {

    // =============================================================================
    // TEST DATA MANAGEMENT
    // =============================================================================

    /**
     * Load test data from environment variable
     * @param {string} dataKey - Environment variable key containing test data
     * @returns {Array} - Array of test scenarios
     */
    loadTestData: function(dataKey = 'testData') {
        try {
            const testDataString = pm.environment.get(dataKey);
            if (!testDataString) {
                console.error(`No test data found for key: ${dataKey}`);
                return [];
            }
            
            const testData = JSON.parse(testDataString);
            console.log(`Loaded ${testData.length} test scenarios from ${dataKey}`);
            return testData;
        } catch (error) {
            console.error(`Failed to parse test data: ${error.message}`);
            return [];
        }
    },

    /**
     * Set test data in environment
     * @param {Array} testData - Array of test scenarios
     * @param {string} dataKey - Environment variable key to store data
     */
    setTestData: function(testData, dataKey = 'testData') {
        try {
            pm.environment.set(dataKey, JSON.stringify(testData));
            console.log(`Stored ${testData.length} test scenarios in ${dataKey}`);
        } catch (error) {
            console.error(`Failed to store test data: ${error.message}`);
        }
    },

    /**
     * Get current test scenario index
     * @returns {number} - Current scenario index
     */
    getCurrentScenarioIndex: function() {
        return parseInt(pm.environment.get('currentScenarioIndex') || '0');
    },

    /**
     * Set current test scenario index
     * @param {number} index - Scenario index to set
     */
    setCurrentScenarioIndex: function(index) {
        pm.environment.set('currentScenarioIndex', index.toString());
    },

    /**
     * Get current test scenario
     * @param {string} dataKey - Environment variable key containing test data
     * @returns {Object|null} - Current test scenario or null
     */
    getCurrentScenario: function(dataKey = 'testData') {
        const testData = this.loadTestData(dataKey);
        const currentIndex = this.getCurrentScenarioIndex();
        
        if (currentIndex >= testData.length) {
            return null;
        }
        
        return testData[currentIndex];
    },

    /**
     * Move to next test scenario
     * @param {string} dataKey - Environment variable key containing test data
     * @returns {Object|null} - Next test scenario or null if no more scenarios
     */
    nextScenario: function(dataKey = 'testData') {
        const testData = this.loadTestData(dataKey);
        const currentIndex = this.getCurrentScenarioIndex();
        const nextIndex = currentIndex + 1;
        
        if (nextIndex >= testData.length) {
            console.log('All test scenarios completed');
            return null;
        }
        
        this.setCurrentScenarioIndex(nextIndex);
        return testData[nextIndex];
    },

    /**
     * Reset scenario index to beginning
     */
    resetScenarioIndex: function() {
        this.setCurrentScenarioIndex(0);
        console.log('Reset scenario index to 0');
    },

    // =============================================================================
    // DATA GENERATION
    // =============================================================================

    /**
     * Generate test data for user registration scenarios
     * @param {number} count - Number of scenarios to generate
     * @returns {Array} - Array of user registration test scenarios
     */
    generateUserRegistrationData: function(count = 5) {
        const scenarios = [];
        const domains = ['example.com', 'test.org', 'demo.net'];
        const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Lisa'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia'];
        
        for (let i = 0; i < count; i++) {
            const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
            const domain = domains[Math.floor(Math.random() * domains.length)];
            
            scenarios.push({
                description: `User registration scenario ${i + 1}`,
                input: {
                    firstName: firstName,
                    lastName: lastName,
                    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@${domain}`,
                    password: `SecurePass${i}!`,
                    age: Math.floor(Math.random() * 50) + 18,
                    country: 'US'
                },
                expectedStatus: 201,
                expectedResponse: {
                    status: 'success',
                    verified: false
                }
            });
        }
        
        return scenarios;
    },

    /**
     * Generate test data for product creation scenarios
     * @param {number} count - Number of scenarios to generate
     * @returns {Array} - Array of product creation test scenarios
     */
    generateProductData: function(count = 5) {
        const scenarios = [];
        const categories = ['Electronics', 'Clothing', 'Books', 'Home', 'Sports'];
        const productTypes = ['Laptop', 'Shirt', 'Novel', 'Chair', 'Ball'];
        
        for (let i = 0; i < count; i++) {
            const category = categories[Math.floor(Math.random() * categories.length)];
            const productType = productTypes[Math.floor(Math.random() * productTypes.length)];
            
            scenarios.push({
                description: `Product creation scenario ${i + 1}`,
                input: {
                    name: `${productType} ${i + 1}`,
                    description: `High quality ${productType.toLowerCase()} for testing`,
                    price: Math.floor(Math.random() * 1000) + 10,
                    category: category,
                    inStock: Math.random() > 0.2,
                    quantity: Math.floor(Math.random() * 100) + 1
                },
                expectedStatus: 201,
                expectedResponse: {
                    status: 'created'
                }
            });
        }
        
        return scenarios;
    },

    // =============================================================================
    // TEST EXECUTION
    // =============================================================================

    /**
     * Execute data-driven test for current scenario
     * @param {Object} config - Test configuration
     */
    executeDataDrivenTest: function(config) {
        const {
            dataKey = 'testData',
            requestConfig,
            validationFunction
        } = config;
        
        const scenario = this.getCurrentScenario(dataKey);
        
        if (!scenario) {
            console.log('No more test scenarios to execute');
            return;
        }
        
        console.log(`Executing: ${scenario.description}`);
        
        // Prepare request with scenario data
        const request = {
            ...requestConfig,
            body: {
                ...requestConfig.body,
                raw: JSON.stringify(scenario.input)
            }
        };
        
        // Execute request
        pm.sendRequest(request, (err, response) => {
            if (err) {
                pm.test(`${scenario.description} - Request failed`, () => {
                    pm.expect.fail(`Request error: ${err.message}`);
                });
                return;
            }
            
            // Run validations
            pm.test(`${scenario.description} - Status code`, () => {
                pm.expect(response.code).to.equal(scenario.expectedStatus);
            });
            
            if (scenario.expectedResponse) {
                pm.test(`${scenario.description} - Response validation`, () => {
                    const responseData = response.json();
                    Object.keys(scenario.expectedResponse).forEach(key => {
                        pm.expect(responseData).to.have.property(key);
                        pm.expect(responseData[key]).to.equal(scenario.expectedResponse[key]);
                    });
                });
            }
            
            // Custom validation function
            if (validationFunction && typeof validationFunction === 'function') {
                validationFunction(scenario, response);
            }
            
            // Store results
            this.storeTestResult(scenario, response);
        });
    },

    /**
     * Run all scenarios in sequence
     * @param {Object} config - Test configuration
     */
    runAllScenarios: function(config) {
        const { dataKey = 'testData' } = config;
        const testData = this.loadTestData(dataKey);
        
        if (testData.length === 0) {
            console.log('No test data available');
            return;
        }
        
        console.log(`Starting data-driven test with ${testData.length} scenarios`);
        
        // Reset to first scenario
        this.resetScenarioIndex();
        
        // Execute current scenario
        this.executeDataDrivenTest(config);
        
        // Set up for next iteration (if running in collection runner)
        const currentIndex = this.getCurrentScenarioIndex();
        if (currentIndex < testData.length - 1) {
            this.setCurrentScenarioIndex(currentIndex + 1);
            postman.setNextRequest(pm.info.requestName); // Repeat current request
        }
    },

    // =============================================================================
    // RESULT MANAGEMENT
    // =============================================================================

    /**
     * Store test result for scenario
     * @param {Object} scenario - Test scenario
     * @param {Object} response - Response object
     */
    storeTestResult: function(scenario, response) {
        const result = {
            scenario: scenario.description,
            timestamp: new Date().toISOString(),
            status: response.code,
            responseTime: response.responseTime,
            success: response.code === scenario.expectedStatus,
            errorMessage: response.code !== scenario.expectedStatus ? 
                `Expected ${scenario.expectedStatus}, got ${response.code}` : null
        };
        
        // Get existing results
        let testResults = [];
        try {
            testResults = JSON.parse(pm.environment.get('testResults') || '[]');
        } catch (error) {
            console.error('Failed to parse existing test results');
        }
        
        testResults.push(result);
        pm.environment.set('testResults', JSON.stringify(testResults));
    },

    /**
     * Get test results summary
     * @returns {Object} - Test results summary
     */
    getTestResultsSummary: function() {
        let testResults = [];
        try {
            testResults = JSON.parse(pm.environment.get('testResults') || '[]');
        } catch (error) {
            return { error: 'Failed to parse test results' };
        }
        
        if (testResults.length === 0) {
            return { message: 'No test results available' };
        }
        
        const totalTests = testResults.length;
        const passedTests = testResults.filter(r => r.success).length;
        const failedTests = totalTests - passedTests;
        const avgResponseTime = testResults.reduce((sum, r) => sum + r.responseTime, 0) / totalTests;
        
        return {
            totalTests,
            passedTests,
            failedTests,
            successRate: `${((passedTests / totalTests) * 100).toFixed(2)}%`,
            avgResponseTime: Math.round(avgResponseTime),
            failedScenarios: testResults.filter(r => !r.success).map(r => ({
                scenario: r.scenario,
                error: r.errorMessage
            }))
        };
    },

    /**
     * Clear test results
     */
    clearTestResults: function() {
        pm.environment.unset('testResults');
        pm.environment.unset('currentScenarioIndex');
        console.log('Test results cleared');
    },

    // =============================================================================
    // BOUNDARY VALUE TESTING
    // =============================================================================

    /**
     * Generate boundary value test cases
     * @param {Object} fieldConfig - Field configuration for boundary testing
     * @returns {Array} - Array of boundary test scenarios
     */
    generateBoundaryTests: function(fieldConfig) {
        const scenarios = [];
        
        Object.keys(fieldConfig).forEach(fieldName => {
            const config = fieldConfig[fieldName];
            
            if (config.type === 'string' && config.maxLength) {
                // String length boundary tests
                scenarios.push({
                    description: `${fieldName} - Empty string`,
                    field: fieldName,
                    value: '',
                    expectedValid: config.required === false
                });
                
                scenarios.push({
                    description: `${fieldName} - Max length`,
                    field: fieldName,
                    value: 'a'.repeat(config.maxLength),
                    expectedValid: true
                });
                
                scenarios.push({
                    description: `${fieldName} - Over max length`,
                    field: fieldName,
                    value: 'a'.repeat(config.maxLength + 1),
                    expectedValid: false
                });
            }
            
            if (config.type === 'number') {
                // Numeric boundary tests
                if (config.min !== undefined) {
                    scenarios.push({
                        description: `${fieldName} - Minimum value`,
                        field: fieldName,
                        value: config.min,
                        expectedValid: true
                    });
                    
                    scenarios.push({
                        description: `${fieldName} - Below minimum`,
                        field: fieldName,
                        value: config.min - 1,
                        expectedValid: false
                    });
                }
                
                if (config.max !== undefined) {
                    scenarios.push({
                        description: `${fieldName} - Maximum value`,
                        field: fieldName,
                        value: config.max,
                        expectedValid: true
                    });
                    
                    scenarios.push({
                        description: `${fieldName} - Above maximum`,
                        field: fieldName,
                        value: config.max + 1,
                        expectedValid: false
                    });
                }
            }
        });
        
        return scenarios;
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataDrivenTesting;
}

// Usage Examples:
/*
// Set up test data
const userTestData = DataDrivenTesting.generateUserRegistrationData(10);
DataDrivenTesting.setTestData(userTestData);

// Execute data-driven test
DataDrivenTesting.executeDataDrivenTest({
    dataKey: 'testData',
    requestConfig: {
        url: pm.environment.get('base_url') + '/users',
        method: 'POST',
        header: {
            'Content-Type': 'application/json'
        },
        body: {
            mode: 'raw'
        }
    },
    validationFunction: (scenario, response) => {
        // Custom validation logic
        const responseData = response.json();
        pm.test(`${scenario.description} - Email validation`, () => {
            pm.expect(responseData.email).to.equal(scenario.input.email);
        });
    }
});

// Get test results summary
const summary = DataDrivenTesting.getTestResultsSummary();
console.log('Test Summary:', JSON.stringify(summary, null, 2));
*/
