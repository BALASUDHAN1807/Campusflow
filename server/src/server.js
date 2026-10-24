import app from "./app.js";

const PORT = process.env.PORT || 5000;

// Start server (local / traditional hosting). On Vercel the app is served by api/index.js instead.
const server = app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(` CAMPUSFLOW Backend Service Running`);
  console.log(` Port:    http://localhost:${PORT}`);
  console.log(` Health:  http://localhost:${PORT}/api/health`);
  console.log(` Mode:    ${process.env.NODE_ENV || "development"}`);
  console.log(`=========================================`);
});

export default server;
