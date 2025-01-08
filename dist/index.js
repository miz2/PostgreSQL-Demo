"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const bcrypt_1 = __importDefault(require("bcrypt"));
const client = new pg_1.Client({
    connectionString: "postgresql://firstdb_owner:7NcXZRkQ3xrf@ep-old-smoke-a55wj53d.us-east-2.aws.neon.tech/firstdb?sslmode=require",
});
// Connect to the database
async function connectToDatabase() {
    try {
        await client.connect();
        console.log("Connected to the database!");
    }
    catch (error) {
        console.error("Database connection error:", error);
    }
}
// Create the users and addresses tables
async function createUsersTable() {
    try {
        // Create users table
        await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
        // Create addresses table with foreign key to users
        await client.query(`
      CREATE TABLE IF NOT EXISTS addresses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        city VARCHAR(100) NOT NULL,
        country VARCHAR(100) NOT NULL,
        street VARCHAR(255) NOT NULL,
        pincode VARCHAR(20),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
        console.log("Users and addresses tables created (if they didn't exist).");
    }
    catch (error) {
        console.error("Error creating tables:", error);
    }
}
// Insert data into the users table
async function insertData(username, email, password) {
    try {
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const result = await client.query(`
      INSERT INTO users (username, email, password)
      VALUES ($1, $2, $3)
      RETURNING *;
      `, [username, email, hashedPassword]);
        console.log("Data inserted successfully:", result.rows[0]);
    }
    catch (error) {
        console.error("Error inserting data:", error);
    }
}
// Insert data into the addresses table
async function insertAddressData(userId, city, country, street, pincode) {
    try {
        const result = await client.query(`
      INSERT INTO addresses (user_id, city, country, street, pincode)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
      `, [userId, city, country, street, pincode]);
        console.log("Address inserted successfully:", result.rows[0]);
    }
    catch (error) {
        console.error("Error inserting address:", error);
    }
}
// View all the users in the database
async function selectAllUsers() {
    try {
        const res = await client.query("SELECT * FROM users;");
        console.log("Users in DB:", res.rows);
    }
    catch (e) {
        console.log("Error:", e);
    }
}
// Function to get user details along with address based on userId
async function getUserDetailsWithAddress(userId) {
    try {
        const query = `
      SELECT u.id, u.username, u.email, a.city, a.country, a.street, a.pincode
      FROM users u
      JOIN addresses a ON u.id = a.user_id
      WHERE u.id = $1
    `;
        const result = await client.query(query, [userId]);
        if (result.rows.length > 0) {
            console.log('User and address found:', result.rows[0]);
            return result.rows[0];
        }
        else {
            console.log('No user or address found with the given ID.');
            return null;
        }
    }
    catch (error) {
        console.error('Error fetching user details with address:', error);
        return null;
    }
}
// Demo Transaction
async function demoTransaction() {
    const clientTransaction = new pg_1.Client({
        connectionString: "postgresql://firstdb_owner:7NcXZRkQ3xrf@ep-old-smoke-a55wj53d.us-east-2.aws.neon.tech/firstdb?sslmode=require",
    });
    try {
        await clientTransaction.connect();
        await clientTransaction.query('BEGIN'); // Start the transaction
        // Example: Insert a new user and their address
        const resultUser = await clientTransaction.query(`
      INSERT INTO users (username, email, password)
      VALUES ($1, $2, $3)
      RETURNING id;
      `, ["mary_jones", "mary.jones@example.com", await bcrypt_1.default.hash("marypassword", 10)]);
        const userId = resultUser.rows[0].id;
        await clientTransaction.query(`
      INSERT INTO addresses (user_id, city, country, street, pincode)
      VALUES ($1, $2, $3, $4, $5);
      `, [userId, "Paris", "France", "789 Rue de Paris", "75001"]);
        console.log("User and address inserted successfully!");
        // Commit the transaction
        await clientTransaction.query('COMMIT');
    }
    catch (error) {
        console.error("Error during transaction:", error);
        // If there's an error, roll back the transaction
        await clientTransaction.query('ROLLBACK');
    }
    finally {
        await clientTransaction.end();
    }
}
// Main function to run the database operations
async function main() {
    await connectToDatabase();
    await createUsersTable();
    // Example of inserting users and addresses
    await insertData("john_doe", "john.doe@example.com", "password123");
    await insertData("jane_smith", "jane.smith@example.com", "password456");
    await insertData("alice_johnson", "alice.johnson@example.com", "password789");
    await insertData("bob_martin", "bob.martin@example.com", "password101");
    await insertAddressData(1, "New York", "USA", "123 Main St", "10001");
    await insertAddressData(1, "Los Angeles", "USA", "456 Elm St", "90001");
    await insertAddressData(2, "London", "UK", "789 Oak Rd", "E1 6AN");
    await insertAddressData(3, "Toronto", "Canada", "321 Maple Ave", "M5H 2N2");
    await insertAddressData(4, "Sydney", "Australia", "654 Pine St", "2000");
    // View all users
    await selectAllUsers();
    // Fetch user details with address for userId 1
    await getUserDetailsWithAddress('1');
    // Demo Transaction example
    await demoTransaction();
}
main();
