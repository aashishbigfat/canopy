const http = require('http');

const endpoints = [
    'stats',
    'recent-sales',
    'revenue-chart',
    'opportunities-by-stage',
    'analytics/key-deals',
    'analytics/tasks-summary'
];

endpoints.forEach(path => {
    http.get(`http://localhost:8000/api/v1/dashboards/${path}`, res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => console.log(`[${res.statusCode}] /dashboards/${path}:`, data.substring(0, 50)));
    }).on('error', err => console.log('Error', path, err.message));
});
