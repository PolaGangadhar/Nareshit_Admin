
const sql = require("mssql");

// Define your database configuration
const dbConfig = {
  user: "sa",
  password: "Password@123",
  server: "localhost",
  database: "cmdexamdb",
  options: {
    encrypt: true, // Use encryption (for Azure SQL Database, set to true)
    trustServerCertificate: true, // Change to true for local dev / self-signed certs
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// Function to create and return the connection pool
async function getConnectionPool() {
  try {
    const pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();
    console.log("Connected to the database");
    return pool;
  } catch (err) {
    console.error("Database connection failed: ", err);
    throw err;
  }
}

module.exports = {
  getConnectionPool,
};