import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

  return app;
}

const appPromise = startServer();
export default async (req: any, res: any) => {
  const app = await appPromise;
  return app(req, res);
};
