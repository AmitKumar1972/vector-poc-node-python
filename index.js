require("dotenv").config();
const { Client } = require("pg");
const axios = require("axios");

// Create a new PostgreSQL client using environment variables
const client = new Client({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

// Function to generate vectors using Hugging Face API
async function generateVectors(text) {
  const response = await axios.post(
    "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2",
    {
      inputs: [text],
      options: {
        wait_for_model: true,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.HUGGING_FACE_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data[0];
}

// Connect to the PostgreSQL database
client
  .connect()
  .then(async () => {
    console.log("Connected to PostgreSQL database");

    // Create a table with company, location, company_vector, and location_vector
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS company_data (
        id SERIAL PRIMARY KEY,
        company VARCHAR(255),
        location VARCHAR(255),
        company_vector FLOAT8[],
        location_vector FLOAT8[]
      );
    `;

    await client.query(createTableQuery);
    console.log("Table created successfully");

    // Example data
    const company = "TechCorp";
    const location = "New York";

    try {
      // Generate vectors for company and location
      console.log("Generating vectors...");
      const companyVector = await generateVectors(company);
      const locationVector = await generateVectors(location);

      // Insert data into the table
      const insertDataQuery = `
        INSERT INTO company_data (company, location, company_vector, location_vector)
        VALUES ($1, $2, $3, $4);
      `;

      await client.query(insertDataQuery, [
        company,
        location,
        companyVector,
        locationVector,
      ]);
      console.log("Data inserted successfully");

      // Retrieve and display the inserted data
      const selectQuery = `
        SELECT company, location, 
               array_length(company_vector, 1) as company_vector_length,
               array_length(location_vector, 1) as location_vector_length
        FROM company_data
        ORDER BY id DESC
        LIMIT 1;
      `;

      const result = await client.query(selectQuery);
      console.log("\nInserted Data:");
      console.log(result.rows[0]);
    } catch (error) {
      console.error(
        "Error details:",
        error.response ? error.response.data : error.message
      );
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
