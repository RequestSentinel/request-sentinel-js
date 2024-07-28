const express = require('express');
const path = require('path');

const app = express();

// Serve static files
app.use(express.static(path.join(__dirname, 'examples')));

// Single API endpoint
app.get('/api/example', (req, res) => {
  res.status(201).json({ message: 'Example Response' });
});

// We server node_modules so that the index.html can load the underlying request-sentinel js in this static demo
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

// Serve index.html for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(9091, () => {
  console.log('Server running on http://localhost:9091');
});