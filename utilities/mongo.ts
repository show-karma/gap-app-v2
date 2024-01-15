const { MongoClient } = require("mongodb");
require("dotenv").config();

// Connection URL
const client = new MongoClient(process.env.MONGODB_URL);

const db = client.db(process.env.MONGODB_NAME || "neocast");

// Export db and client
export { db, client };
