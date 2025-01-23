import express from "express";
import bodyParser from "body-parser";
import chokidar from "chokidar";
import fs from "fs";
import path from "path";
import fsExtra from "fs-extra";
import { Server } from "socket.io";
import multer from "multer";

// ตั้งค่า Express
const app = express();
const PORT = 3000;

// ตั้งค่าการอัปโหลดไฟล์ด้วย Multer
const storage = multer.memoryStorage();  // ใช้ storage แบบ in-memory
const upload = multer({ storage: storage });

// สร้างโฟลเดอร์หากยังไม่มี
const __dirname = path.resolve();
const syncFolder = path.join(__dirname, "sync-folder");
const uploadDir = path.join(__dirname, "uploads");
const modelDir = path.join(__dirname, "models");
const publicDir = path.join(__dirname, "public");

if (!fs.existsSync(syncFolder)) fs.mkdirSync(syncFolder);
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(modelDir)) fs.mkdirSync(modelDir);

// ตั้งค่า Chokidar ให้จับตาดู sync-folder
const allowedExtensions = [".jpg", ".png"];
const watcher = chokidar.watch(syncFolder, { persistent: true });

watcher.on("add", (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  if (!allowedExtensions.includes(ext)) return;

  const fileName = path.basename(filePath);
  const destPath = path.join(uploadDir, fileName);

  // คัดลอกไฟล์จาก sync-folder ไปยัง uploads
  fsExtra.copy(filePath, destPath, (err) => {
    if (err) {
      console.error(`Error copying file: ${err}`);
    } else {
      console.log(`File copied to uploads: ${fileName}`);

      // ส่งการอัปเดตไปยังไคลเอนต์
      io.emit("new-file", fileName);
    }
  });
});

// API สำหรับอัปโหลดไฟล์
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    // ตัวอย่างการบันทึกไฟล์ลงในโฟลเดอร์ uploads
    const filePath = path.join(uploadDir, req.file.originalname);
    fs.writeFileSync(filePath, req.file.buffer);
    res.status(200).json({ message: 'File uploaded successfully', fileName: req.file.originalname });
  } catch (error) {
    return res.status(500).json({ error: 'Upload failed' });
  }
});

// API สำหรับดึงไฟล์จาก uploads
app.get("/files", (req, res) => {
  fs.readdir(uploadDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: "Failed to retrieve files" });
    }
    res.json(files);
  });
});

// ให้บริการไฟล์ static
app.use("/uploads", express.static(uploadDir));
app.use("/models", express.static(modelDir));
app.use(express.static(publicDir));

// รันเซิร์ฟเวอร์
const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// ตั้งค่า Socket.IO
const io = new Server(server);

io.on("connection", (socket) => {
  console.log("A user connected");

  // ตัวอย่างการส่งข้อความไปยังไคลเอนต์
  socket.emit("welcome", "Welcome to the server!");
});
