#!/usr/bin/env node

/**
 * Backend Connection Test Script
 * Tests connectivity to the Python FastAPI backend
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000';

const tests = [
    {
        name: 'Health Check',
        url: `${API_BASE_URL}/health`,
        expectedStatus: 200,
        description: 'Basic health endpoint'
    },
    {
        name: 'Root Endpoint',
        url: `${API_BASE_URL}/`,
        expectedStatus: 200,
        description: 'Application root endpoint'
    },
    {
        name: 'API Documentation',
        url: `${API_BASE_URL}/api/docs`,
        expectedStatus: 200,
        description: 'FastAPI auto-generated docs'
    },
    {
        name: 'Auth Endpoint',
        url: `${API_BASE_URL}/api/v1/auth/login`,
        expectedStatus: [405, 422], // Method not allowed or validation error
        description: 'Authentication endpoint exists'
    },
    {
        name: 'Accounts Endpoint',
        url: `${API_BASE_URL}/api/v1/accounts`,
        expectedStatus: [401, 403], // Unauthorized
        description: 'Accounts API endpoint'
    },
    {
        name: 'Contacts Endpoint',
        url: `${API_BASE_URL}/api/v1/contacts`,
        expectedStatus: [401, 403], // Unauthorized
        description: 'Contacts API endpoint'
    },
    {
        name: 'Leads Endpoint',
        url: `${API_BASE_URL}/api/v1/leads`,
        expectedStatus: [401, 403], // Unauthorized
        description: 'Leads API endpoint'
    },
    {
        name: 'Opportunities Endpoint',
        url: `${API_BASE_URL}/api/v1/opportunities`,
        expectedStatus: [401, 403], // Unauthorized
        description: 'Opportunities API endpoint'
    },
    {
        name: 'Tasks Endpoint',
        url: `${API_BASE_URL}/api/v1/tasks`,
        expectedStatus: [401, 403], // Unauthorized
        description: 'Tasks API endpoint'
    },
    {
        name: 'Files Endpoint',
        url: `${API_BASE_URL}/api/v1/files`,
        expectedStatus: [401, 403], // Unauthorized
        description: 'Files API endpoint'
    },
    {
        name: 'Dashboard Endpoint',
        url: `${API_BASE_URL}/api/v1/dashboards`,
        expectedStatus: [401, 403], // Unauthorized
        description: 'Dashboard API endpoint'
    }
];

async function runTest(test) {
    try {
        console.log(`🧪 Testing: ${test.name}`);
        console.log(`   URL: ${test.url}`);
        
        const response = await axios.get(test.url, { 
            timeout: 5000,
            validateStatus: () => true // Don't throw on any status code
        });
        
        const expectedStatuses = Array.isArray(test.expectedStatus) 
            ? test.expectedStatus 
            : [test.expectedStatus];
            
        const passed = expectedStatuses.includes(response.status);
        
        if (passed) {
            console.log(`   ✅ PASSED - Status: ${response.status}`);
        } else {
            console.log(`   ❌ FAILED - Status: ${response.status}, Expected: ${expectedStatuses.join(' or ')}`);
        }
        
        return { ...test, status: response.status, passed, error: null };
        
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log(`   🔌 FAILED - Connection refused. Backend not running?`);
        } else {
            console.log(`   ❌ FAILED - Error: ${error.message}`);
        }
        return { ...test, status: null, passed: false, error: error.message };
    }
}

async function runAllTests() {
    console.log('🚀 Starting Backend Connection Tests\n');
    console.log(`📡 Testing API at: ${API_BASE_URL}\n`);
    
    const results = [];
    
    for (const test of tests) {
        const result = await runTest(test);
        results.push(result);
        console.log(''); // Empty line for readability
    }
    
    // Summary
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    const connectionErrors = results.filter(r => r.error && r.error.includes('ECONNREFUSED')).length;
    
    console.log('📊 Test Summary:');
    console.log(`   Total Tests: ${total}`);
    console.log(`   Passed: ${passed}`);
    console.log(`   Failed: ${total - passed}`);
    
    if (connectionErrors > 0) {
        console.log('\n🔌 Connection Issues Detected:');
        console.log('   Make sure the Python FastAPI backend is running:');
        console.log('   cd tutterfly-python');
        console.log('   uvicorn app.main:app --reload --port 8000');
    } else if (passed === total) {
        console.log('\n🎉 All Tests Passed! Backend is accessible.');
    } else {
        console.log('\n⚠️  Some tests failed. Check backend configuration.');
    }
    
    console.log('\n📚 API Documentation:');
    console.log(`   ${API_BASE_URL}/api/docs`);
    console.log(`   ${API_BASE_URL}/api/redoc`);
}

// Run tests
runAllTests().catch(console.error);
