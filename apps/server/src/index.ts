import { app } from "./app";

const port = Number(process.env.SERVER_PORT) || 17_382;

export default {
  port,
  fetch: app.fetch
};

console.log(`Server starting on port ${port}`);
