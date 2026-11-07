import { assertConfig, config } from './config.js';
import { createApp } from './app.js';

assertConfig();
createApp().listen(config.port, () => {
  console.log(`admin-panel listening on :${config.port} (static: ${config.staticDir})`);
});
