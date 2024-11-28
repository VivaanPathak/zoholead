const pool = require('../db/api');

// Store refresh token and access token in the database, and delete old access tokens
const storeTokens = async (refreshToken, accessToken, lastUpdated) => {
    const connection = await pool.getConnection(); // Get a connection from the pool
    try {
        await connection.beginTransaction(); // Start a transaction

        // Delete the old access token
        const deleteQuery = 'DELETE FROM tokens WHERE refresh_token = ?';
        await connection.query(deleteQuery, [refreshToken]);

        // Insert the new access token
        const insertQuery = `
            INSERT INTO tokens (refresh_token, access_token, last_updated) 
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE
            access_token = VALUES(access_token),
            last_updated = VALUES(last_updated);
        `;
        await connection.query(insertQuery, [refreshToken, accessToken, lastUpdated]);

        await connection.commit(); // Commit the transaction
    } catch (error) {
        await connection.rollback(); // Rollback the transaction in case of error
        throw error;
    } finally {
        connection.release(); // Release the connection back to the pool
    }
};

// Fetch tokens from the database
const getTokens = async () => {
    const [rows] = await pool.query('SELECT refresh_token, access_token, last_updated FROM tokens LIMIT 1');
    return rows.length ? rows[0] : null;
};

module.exports = {
    storeTokens,
    getTokens,
};


// const pool = require('../db/api');

// // Store refresh token and access token in the database
// const storeTokens = async (refreshToken, accessToken, lastUpdated) => {
//     const query = `
//         INSERT INTO tokens (refresh_token, access_token, last_updated) 
//         VALUES (?, ?, ?)
//         ON DUPLICATE KEY UPDATE
//         access_token = VALUES(access_token),
//         last_updated = VALUES(last_updated);
//     `;
//     await pool.query(query, [refreshToken, accessToken, lastUpdated]);
// };

// // Fetch tokens from the database
// const getTokens = async () => {
//     const [rows] = await pool.query('SELECT refresh_token, access_token, last_updated FROM tokens LIMIT 1');
//     return rows.length ? rows[0] : null;
// };

// module.exports = {
//     storeTokens,
//     getTokens,
// };
