const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "userData.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

// Create User API

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `
    SELECT 
        * 
    FROM 
        user 
    WHERE 
        username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    //Create User  in user table
    const createUserQuery = `
        INSERT INTO
            user (username, name, password, gender, location)
        VALUES
            (
            '${username}',
            '${name}',
            '${hashedPassword}',
            '${gender}',
            '${location}'  
            );`;
    if (password.length > 4) {
      await db.run(createUserQuery);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    //send invalid username as response
    response.status(400);
    response.send("User already exists");
  }
});

//Create login API

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `
  SELECT 
    * 
  FROM 
    user 
  WHERE 
    username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    //user doesn't exists
    response.status(400);
    response.send("Invalid user");
  } else {
    //compare password and hashed password
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

// Change password

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const selectUserQuery = `
  SELECT 
    * 
  FROM 
    user 
  WHERE 
    username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  const isPasswordMatched = await bcrypt.compare(oldPassword, dbUser.password);

  if (isPasswordMatched === true) {
    if (newPassword.length > 4) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const updatePasswordQuery = `
              UPDATE 
                  user 
              SET 
                  password = '${hashedPassword}'
              WHERE 
                  username = '${username}';`;

      await db.run(updatePasswordQuery);
      response.send("Password updated");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("Invalid current password");
  }
});

module.exports = app;
