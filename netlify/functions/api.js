const serverless = require('serverless-http');
const app = require('../../server'); // Imports the Express application instance from server.js

module.exports.handler = serverless(app);
