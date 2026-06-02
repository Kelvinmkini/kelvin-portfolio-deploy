require("dotenv").config();

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { Pool } = require("pg");

const app = express();
const port = process.env.PORT || 10000;

const allowedOrigin = process.env.FRONTEND_URL || "*";

app.use(cors({
  origin: allowedOrigin === "*" ? "*" : allowedOrigin,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files are allowed"));
      return;
    }

    cb(null, true);
  }
});

function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    return res.status(401).json({
      message: "Login required"
    });
  }

  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET || "change-this-secret");
    next();
  } catch (error) {
    res.status(401).json({
      message: "Invalid or expired login"
    });
  }
}

async function setupDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS portfolio_content (
      id SERIAL PRIMARY KEY,
      section VARCHAR(50) NOT NULL,
      title VARCHAR(150) NOT NULL,
      description TEXT NOT NULL,
      image VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const count = await pool.query("SELECT COUNT(*) FROM portfolio_content");

  if (Number(count.rows[0].count) === 0) {
    await pool.query(`
      INSERT INTO portfolio_content (section, title, description, image) VALUES
      ('profile', 'Personal Profile', 'My name is Kelvin Mkini. I am a data scientist and web developer interested in cloud computing and modern technology.', ''),
      ('skill', 'Data Analysis', 'Working with data, insights, and modern analysis tools.', ''),
      ('qualification', 'Cloud Computing Student', 'Learning frontend deployment, backend deployment, databases, and cloud platforms.', ''),
      ('project', 'Kelvin Portfolio Website', 'A portfolio website connected to an online backend API and PostgreSQL database.', '');
    `);
  }
}

app.get("/", (req, res) => {
  res.json({
    message: "Kelvin portfolio backend is running"
  });
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  const adminUsername = process.env.ADMIN_USERNAME || "kelvin mkini";
  const adminPassword = process.env.ADMIN_PASSWORD || "kelvy003";

  if (username !== adminUsername || password !== adminPassword) {
    return res.status(401).json({
      message: "Wrong username or password"
    });
  }

  const token = jwt.sign(
    { username },
    process.env.JWT_SECRET || "change-this-secret",
    { expiresIn: "8h" }
  );

  res.json({
    token,
    username
  });
});

app.get("/api/content", async (req, res) => {
  const result = await pool.query("SELECT * FROM portfolio_content ORDER BY section, id DESC");
  res.json(result.rows);
});

app.post("/api/content", authRequired, upload.single("image"), async (req, res) => {
  const { section, title, description } = req.body;

  const image = req.file
    ? `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`
    : "";

  const result = await pool.query(
    "INSERT INTO portfolio_content (section, title, description, image) VALUES ($1, $2, $3, $4) RETURNING *",
    [section, title, description, image]
  );

  res.status(201).json(result.rows[0]);
});

app.put("/api/content/:id", authRequired, upload.single("image"), async (req, res) => {
  const { id } = req.params;
  const { section, title, description, oldImage } = req.body;

  const image = req.file
    ? `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`
    : oldImage || "";

  const result = await pool.query(
    "UPDATE portfolio_content SET section = $1, title = $2, description = $3, image = $4 WHERE id = $5 RETURNING *",
    [section, title, description, image, id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({
      message: "Content not found"
    });
  }

  res.json(result.rows[0]);
});

app.delete("/api/content/:id", authRequired, async (req, res) => {
  const result = await pool.query(
    "DELETE FROM portfolio_content WHERE id = $1",
    [req.params.id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({
      message: "Content not found"
    });
  }

  res.json({
    message: "Content deleted"
  });
});

app.post("/api/messages", async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({
      message: "All fields are required"
    });
  }

  const result = await pool.query(
    "INSERT INTO messages (name, email, message) VALUES ($1, $2, $3) RETURNING *",
    [name, email, message]
  );

  res.status(201).json(result.rows[0]);
});

app.get("/api/messages", authRequired, async (req, res) => {
  const result = await pool.query("SELECT * FROM messages ORDER BY created_at DESC");
  res.json(result.rows);
});

app.delete("/api/messages/:id", authRequired, async (req, res) => {
  const result = await pool.query(
    "DELETE FROM messages WHERE id = $1",
    [req.params.id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({
      message: "Message not found"
    });
  }

  res.json({
    message: "Message deleted"
  });
});

setupDatabase()
  .then(() => {
    app.listen(port, "0.0.0.0", () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Database setup failed:", error);
    process.exit(1);
  });