const express = require('express');
const connectDB = require('./config/db');
const app = express();

app.get('/', async (req, res) => {
    try {
        res.send({ message: 'Welcome to Practical Exam!' });
    } catch (error) {
        res.send({ error: error.message });
    }
});

app.use(express.json())
app.use('/', require("./api"))

const PORT = process.env.PORT || 9999;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
    connectDB();
});