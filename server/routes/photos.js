const express = require('express');
const { getPhotosWithItems } = require('../controllers/photos');
const router = express.Router();

router.get('/', async (req, res) => {
    try {
      const photos = await getPhotosWithItems();
      res.json(photos);
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).send('Server error');
    }
});

module.exports = router;