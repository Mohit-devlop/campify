const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

async function getAuthData(identifier, password) {
  const res = await fetch('http://localhost:5001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password })
  });
  return await res.json();
}

async function captureAll() {
  console.log('Fetching auth tokens...');
  const userAuth = await getAuthData('john@gmail.com', 'Password123!');
  const adminAuth = await getAuthData('admin@kilogram.com', 'AdminSecurePass123!');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1.5 });

  async function setAuth(authData) {
    await page.evaluateOnNewDocument((data) => {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
    }, authData);
  }

  // 1. Landing Page (Logged out)
  console.log('Capturing 01: Landing Page...');
  await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(outDir, '01_landing_page.png') });

  // 2. Auth Login Page
  console.log('Capturing 02: Auth Login...');
  await page.goto('http://localhost:3001/auth', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(outDir, '02_auth_login.png') });

  // 3. Auth Register Tab
  console.log('Capturing 03: Auth Register...');
  try {
    const signupBtn = await page.$('button[data-tab="register"], button:has-text("Sign Up"), button:has-text("Register")');
    if (signupBtn) {
      await signupBtn.click();
      await new Promise(r => setTimeout(r, 800));
    }
  } catch (e) {}
  await page.screenshot({ path: path.join(outDir, '03_auth_register.png') });

  // Switch to User Context
  const userPage = await browser.newPage();
  await userPage.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1.5 });
  await userPage.evaluateOnNewDocument((data) => {
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
  }, userAuth);

  // 4. Home Feed
  console.log('Capturing 04: Home Feed...');
  await userPage.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2500));
  await userPage.screenshot({ path: path.join(outDir, '04_home_feed.png') });

  // 5. Create Post Modal
  console.log('Capturing 05: Create Post Modal...');
  try {
    const createBtn = await userPage.$('button:has-text("Create"), [aria-label="Create Post"]');
    if (createBtn) await createBtn.click();
    await new Promise(r => setTimeout(r, 1000));
    await userPage.screenshot({ path: path.join(outDir, '05_create_post_modal.png') });
    await userPage.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 500));
  } catch (e) {
    console.log('Modal skip:', e.message);
  }

  // 6. Search Drawer
  console.log('Capturing 06: Search Drawer...');
  try {
    const searchBtn = await userPage.$('button:has-text("Search"), [aria-label="Search"]');
    if (searchBtn) await searchBtn.click();
    await new Promise(r => setTimeout(r, 1000));
    await userPage.screenshot({ path: path.join(outDir, '06_search_drawer.png') });
    await userPage.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 500));
  } catch (e) {}

  // 7. Explore Page
  console.log('Capturing 07: Explore Page...');
  await userPage.goto('http://localhost:3001/explore', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  await userPage.screenshot({ path: path.join(outDir, '07_explore_page.png') });

  // 8. Reels Page
  console.log('Capturing 08: Reels Page...');
  await userPage.goto('http://localhost:3001/reels', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2500));
  await userPage.screenshot({ path: path.join(outDir, '08_reels_player.png') });

  // 9. Events Page
  console.log('Capturing 09: Events Page...');
  await userPage.goto('http://localhost:3001/events', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  await userPage.screenshot({ path: path.join(outDir, '09_events_page.png') });

  // 10. Create Event Modal
  console.log('Capturing 10: Create Event Modal...');
  try {
    const createEventBtn = await userPage.$('button:has-text("Create Event"), button:has-text("Host Event"), button:has-text("New Event")');
    if (createEventBtn) await createEventBtn.click();
    await new Promise(r => setTimeout(r, 1000));
    await userPage.screenshot({ path: path.join(outDir, '10_create_event_modal.png') });
    await userPage.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 500));
  } catch (e) {}

  // 11. Communities Page
  console.log('Capturing 11: Communities Page...');
  await userPage.goto('http://localhost:3001/communities', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  await userPage.screenshot({ path: path.join(outDir, '11_communities_page.png') });

  // 12. Learning Reels
  console.log('Capturing 12: Learning Reels...');
  await userPage.goto('http://localhost:3001/learning', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  await userPage.screenshot({ path: path.join(outDir, '12_learning_reels.png') });

  // 13. Team Finder
  console.log('Capturing 13: Team Finder...');
  await userPage.goto('http://localhost:3001/team-finder', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  await userPage.screenshot({ path: path.join(outDir, '13_team_finder.png') });

  // 14. Leaderboard
  console.log('Capturing 14: Leaderboard...');
  await userPage.goto('http://localhost:3001/leaderboard', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  await userPage.screenshot({ path: path.join(outDir, '14_leaderboard.png') });

  // 15. Messages Chat
  console.log('Capturing 15: Messages Chat...');
  await userPage.goto('http://localhost:3001/messages', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  await userPage.screenshot({ path: path.join(outDir, '15_messages_chat.png') });

  // 16. Notifications
  console.log('Capturing 16: Notifications...');
  await userPage.goto('http://localhost:3001/notifications', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  await userPage.screenshot({ path: path.join(outDir, '16_notifications.png') });

  // 17. User Profile
  console.log('Capturing 17: User Profile...');
  await userPage.goto('http://localhost:3001/mohit_1511', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  await userPage.screenshot({ path: path.join(outDir, '17_user_profile.png') });

  // 18. Settings
  console.log('Capturing 18: Settings...');
  await userPage.goto('http://localhost:3001/settings', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  await userPage.screenshot({ path: path.join(outDir, '18_settings_page.png') });

  // Switch to Admin Context
  console.log('Capturing 19 & 20: Admin Dashboard...');
  const adminPage = await browser.newPage();
  await adminPage.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1.5 });
  await adminPage.evaluateOnNewDocument((data) => {
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
  }, adminAuth);

  await adminPage.goto('http://localhost:3001/admin', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2500));
  await adminPage.screenshot({ path: path.join(outDir, '20_admin_dashboard.png') });

  await browser.close();
  console.log('All screenshots captured successfully!');
}

captureAll().catch(console.error);
