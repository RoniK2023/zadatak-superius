import { createApp } from './app.js';
import { config } from './config.js';

const app = createApp();
app.listen(config.port, () => {
  console.log(`Mandrač Loyalty API listening on :${config.port}`);
});
