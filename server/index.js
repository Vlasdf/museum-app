require('dotenv').config();
const express = require('express');
const cors = require('cors');
const photosRouter = require('./routes/photos');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/images', photosRouter);

const PORT = process.env.SERVER_PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});