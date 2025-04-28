// server.js
require('dotenv').config();
const express = require('express');
const app = require('./app');

const port = process.env.PORT || 3000;
// Antes de crear la conexión a la base de datos


app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
