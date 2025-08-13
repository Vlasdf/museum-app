const pool = require('../config/db');

const getPhotosWithItems = async () => {
    const { rows: images } = await pool.query('SELECT id, data, mime_type FROM images');
    const { rows: items } = await pool.query('SELECT * FROM museum_items');

    return images.map(row => {
        if (!row.data) return null;
        
        return {
            id: row.id,
            data: `data:${row.mime_type};base64,${row.data.toString('base64')}`,
            items: items.filter(item => item.image_id === row.id)
        };
    }).filter(img => img !== null);
};

module.exports = { getPhotosWithItems };