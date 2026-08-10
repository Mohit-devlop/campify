const localtunnel = require('localtunnel');
const fs = require('fs');
const path = require('path');

(async () => {
  try {
    const tunnel = await localtunnel({ port: 5001 });
    const liveUrl = tunnel.url;
    console.log(`========================================`);
    console.log(`🚀 BACKEND IS LIVE AT: ${liveUrl}`);
    console.log(`========================================`);
    
    fs.writeFileSync(path.join(__dirname, 'LIVE_BACKEND_URL.txt'), liveUrl);

    tunnel.on('close', () => {
      console.log('Tunnel closed');
    });

    tunnel.on('error', (err) => {
      console.error('Tunnel error:', err);
    });
  } catch (err) {
    console.error('Failed to create tunnel:', err);
  }
})();
