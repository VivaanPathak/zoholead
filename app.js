const express = require('express');
const bodyParser = require('body-parser');
const leadRoutes = require('./routes/api');

const app = express();
app.use(bodyParser.json());

// Use lead routes
app.use('/api/leads', leadRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
