import express from "express";
import path from "path";

const app = express();
app.use(express.json());

// Mock database for media
let mediaItems = [
  {
    id: "1",
    title: "Neon Cityscape",
    type: "photo",
    url: "https://picsum.photos/seed/neon1/800/600",
    thumbnail: "https://picsum.photos/seed/neon1/400/300",
    category: "Urban"
  },
  {
    id: "2",
    title: "Cyberpunk Motion",
    type: "video",
    url: "https://www.w3schools.com/html/mov_bbb.mp4",
    thumbnail: "https://picsum.photos/seed/video1/400/300",
    category: "Abstract"
  },
  {
    id: "3",
    title: "Synthwave Beats",
    type: "audio",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    thumbnail: "https://picsum.photos/seed/audio1/400/300",
    category: "Music"
  },
  {
    id: "4",
    title: "Deep Space",
    type: "photo",
    url: "https://picsum.photos/seed/space/800/600",
    thumbnail: "https://picsum.photos/seed/space/400/300",
    category: "Nature"
  }
];

// Admin keys
const ADMIN_KEYS = ["EDJJ01", "MEDIAX", "ADMIN9", "KEY777"];

// API Routes
app.get("/api/media", (req, res) => {
  res.json(mediaItems);
});

app.post("/api/auth/verify", (req, res) => {
  const { key } = req.body;
  if (ADMIN_KEYS.includes(key)) {
    res.json({ success: true, token: "mock-session-token-" + Date.now() });
  } else {
    res.status(401).json({ success: false, message: "Clé invalide" });
  }
});

app.post("/api/media", (req, res) => {
  const newItem = { ...req.body, id: Date.now().toString() };
  mediaItems.push(newItem);
  res.json(newItem);
});

app.delete("/api/media/:id", (req, res) => {
  mediaItems = mediaItems.filter(item => item.id !== req.params.id);
  res.json({ success: true });
});

app.put("/api/media/:id", (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  mediaItems = mediaItems.map(item => item.id === id ? { ...item, ...updates } : item);
  res.json({ success: true });
});

export default app;
