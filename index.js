require("dotenv").config();
const { Client } = require("pg");
const { spawn } = require("child_process");

// Create a new PostgreSQL client using environment variables
const client = new Client({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

// Function to generate vectors using Python script
async function generateVectors(text) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn("python3", ["generate_vectors.py", text]);

    let result = "";

    pythonProcess.stdout.on("data", (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      console.error(`Python Error: ${data}`);
    });

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Python process exited with code ${code}`));
        return;
      }
      try {
        const vector = JSON.parse(result.trim());
        resolve(vector);
      } catch (error) {
        reject(new Error(`Failed to parse vector result: ${error.message}`));
      }
    });
  });
}

// Connect to the PostgreSQL database
client
  .connect()
  .then(async () => {
    console.log("Connected to PostgreSQL database");

    // Create a table using FLOAT[] instead of vector type
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS lynx_contacts (
        id SERIAL PRIMARY KEY,
        name TEXT,
        position TEXT,
        company TEXT,
        location TEXT,
        experience INTEGER,
        revenue BIGINT,
        position_vector FLOAT[],
        company_vector FLOAT[]
      );
    `;

    await client.query(createTableQuery);
    console.log("Table created successfully");

    // Example data
    const name = "John Doe";
    const position = "Software Engineer";
    const company = "TechCorp";
    const location = "New York";
    const experience = 5;
    const revenue = 1000000;

    try {
      // Generate vectors for position and company
      console.log("Generating vectors...");
      const positionVector = await generateVectors(position);
      const companyVector = await generateVectors(company);

      // Insert data into the table
      const insertDataQuery = `
        INSERT INTO lynx_contacts (
          name, position, company, location, experience, revenue, 
          position_vector, company_vector
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
      `;

      await client.query(insertDataQuery, [
        name,
        position,
        company,
        location,
        experience,
        revenue,
        positionVector,
        companyVector,
      ]);
      console.log("Data inserted successfully");

      // Retrieve and display the inserted data
      const selectQuery = `
        SELECT 
          name, position, company, location,
          array_length(position_vector, 1) as position_vector_length,
          array_length(company_vector, 1) as company_vector_length
        FROM lynx_contacts
        ORDER BY id DESC
        LIMIT 1;
      `;

      const result = await client.query(selectQuery);
      console.log("\nInserted Data:");
      console.log(result.rows[0]);
    } catch (error) {
      console.error("Error:", error.message);
      throw error;
    }
  })
  .catch((err) => {
    console.error("Error executing query", err);
  })
  .finally(() => {
    // Close the database connection
    client.end();
  });
