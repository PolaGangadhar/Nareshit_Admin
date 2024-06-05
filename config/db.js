const sql = require("mssql");

// Define your database configuration
const dbConfig = {
  user: process.env.SQL_UID,
  password: process.env.SQL_PWD,
  server: process.env.SQL_SERVER,
  database: process.env.SQL_DATABASE,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

let pool;

// Function to create and return the connection pool
async function getConnectionPool() {
  if (!pool) {
    try {
      pool = new sql.ConnectionPool(dbConfig);
      console.log("Connected to the database");
      return pool;
    } catch (err) {
      console.error("Database connection failed: ", err);
      throw err;
    }
  } else {
    return pool;
  }
}

// Function to get connection out of pool
async function getConnection() {
  return await (await getConnectionPool()).connect();
}

module.exports = {
  getConnectionPool,
  getConnection,
};
