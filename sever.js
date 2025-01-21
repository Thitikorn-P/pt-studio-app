const express = require("express");
const chokidar = require("chokidar");
const fs = require("fs");
const path = require("path");
const fsExtra = require("fs-extra");

const app = express();
const PORT = 3000;

// โฟลเดอร์ที่ใช้งาน
const syncFolder = path.join(__dirname, "sync-folder");
const uploadDir = path.join(__dirname, "uploads");
const modelDir = path.join(__dirname, "models");
const publicDir = path.join(__dirname, "public");

// สร้างโฟลเดอร์หากยังไม่มี
if (!fs.existsSync(syncFolder)) fs.mkdirSync(syncFolder);
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(modelDir)) fs.mkdirSync(modelDir);

// ตั้งค่า Chokidar ให้จับตาดู sync-folder
const allowedExtensions = [".jpg", ".png"]; // กำหนดไฟล์ที่อนุญาต
const watcher = chokidar.watch(syncFolder, { persistent: true });

watcher.on("add", (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  if (!allowedExtensions.includes(ext)) return;

  const fileName = path.basename(filePath); // ชื่อไฟล์
  const destPath = path.join(uploadDir, fileName); // ที่อยู่ปลายทาง

  // คัดลอกไฟล์จาก sync-folder ไปยัง uploads
  fsExtra.copy(filePath, destPath, (err) => {
    if (err) {
      console.error(`Error copying file: ${err}`);
    } else {
      console.log(`File copied to uploads: ${fileName}`);
      io.emit('new-file', fileName); // ส่งการอัปเดตไปยังไคลเอนต์
    }
  });
});

// API สำหรับดึงไฟล์จาก uploads
app.get("/files", (req, res) => {
  fs.readdir(uploadDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: "Failed to retrieve files" });
    }
    res.json(files); // ส่งรายการไฟล์กลับไปยังไคลเอนต์
  });
});

  
// ให้บริการไฟล์ static (uploads, models, public)
app.use("/uploads", express.static(uploadDir));
app.use("/models", express.static(modelDir));
app.use(express.static(publicDir));
app.use("/models", express.static(path.join(__dirname, "models")));

// รันเซิร์ฟเวอร์
const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// ตั้งค่า Socket.IO
const socketIo = require("socket.io");
const io = socketIo(server);

