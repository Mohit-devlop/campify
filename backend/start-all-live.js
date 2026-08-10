const localtunnel = require('localtunnel');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('Starting Live Public Tunnels for Frontend and Backend...');
  
  try {
    const backendTunnel = await localtunnel({ port: 5001 });
    console.log(`✅ Backend Live Tunnel: ${backendTunnel.url}`);
    
    const frontendTunnel = await localtunnel({ port: 3001 });
    console.log(`✅ Frontend Live Tunnel: ${frontendTunnel.url}`);
    
    const urls = {
      frontendLocal: 'http://localhost:3001',
      frontendLive: frontendTunnel.url,
      backendLocal: 'http://localhost:5001',
      backendLive: backendTunnel.url,
      healthEndpointLocal: 'http://localhost:5001/health',
      healthEndpointLive: `${backendTunnel.url}/health`,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(path.join(__dirname, 'LIVE_URLS.json'), JSON.stringify(urls, null, 2));
    console.log('Saved to LIVE_URLS.json');

    backendTunnel.on('error', (err) => console.error('Backend Tunnel error:', err));
    frontendTunnel.on('error', (err) => console.error('Frontend Tunnel error:', err));
  } catch (err) {
    console.error('Tunnel setup error:', err);
  }
}

main();
