import { createApp } from './app.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3001;
const app = createApp();

app.listen(PORT, () => {
  console.log(`[Server] Bonnie-Snipbox Backend running at http://localhost:${PORT}`);
});
