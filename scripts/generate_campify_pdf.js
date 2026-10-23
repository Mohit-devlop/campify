const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const rootDir = path.resolve(__dirname, '..');
const scriptsDir = __dirname;
const screenshotsDir = path.join(scriptsDir, 'screenshots');
const sourceHtmlPath = path.join(scriptsDir, 'Kilogram_Full_Documentation.html');
const outputHtmlPath = path.join(scriptsDir, 'Campify_Full_Documentation.html');
const outputPdfPath = path.join(rootDir, 'Campify_Complete_Documentation.pdf');

function getScreenshotPath(filename) {
  const p = path.join(screenshotsDir, filename).replace(/\\/g, '/');
  return `file:///${p}`;
}

async function buildCampifyDocumentation() {
  console.log('Reading base documentation HTML...');
  let html = fs.readFileSync(sourceHtmlPath, 'utf8');

  console.log('Injecting screenshot and print styles...');
  const customStyles = `
    /* Embedded Screenshot Card Styles */
    .screenshot-card {
      background: #0f172a;
      border: 1.5px solid #334155;
      border-radius: 10px;
      overflow: hidden;
      margin: 14pt 0 18pt 0;
      page-break-inside: avoid;
      break-inside: avoid;
      box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.35);
    }
    .screenshot-card .mockup-header {
      background: #1e293b;
      padding: 7px 14px;
      display: flex;
      align-items: center;
      gap: 6px;
      border-bottom: 1px solid #334155;
    }
    .screenshot-card .mockup-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      display: inline-block;
    }
    .screenshot-card .mockup-dot.red { background: #ef4444; }
    .screenshot-card .mockup-dot.yellow { background: #f59e0b; }
    .screenshot-card .mockup-dot.green { background: #10b981; }
    .screenshot-card .mockup-url {
      margin-left: 10px;
      font-family: 'Fira Code', monospace;
      font-size: 8pt;
      color: #94a3b8;
      background: rgba(0, 0, 0, 0.4);
      padding: 3px 12px;
      border-radius: 4px;
      width: 100%;
    }
    .screenshot-wrapper {
      background: #070a12;
      padding: 10px;
      text-align: center;
    }
    .screenshot-wrapper img {
      width: 100%;
      max-width: 100%;
      height: auto;
      border-radius: 6px;
      display: block;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .screenshot-caption {
      font-size: 8.5pt;
      color: #94a3b8;
      text-align: center;
      padding: 6px 10px;
      background: #0f172a;
      border-top: 1px solid #1e293b;
      font-style: italic;
    }
  `;

  html = html.replace('</style>', `${customStyles}\n  </style>`);

  console.log('Performing Campify rebranding...');
  // Rebrand title and headers
  html = html.replace(/<title>.*?<\/title>/gi, '<title>Campify Enterprise System Documentation & Specification</title>');
  html = html.replace(/KILOGRAM/g, 'CAMPIFY');
  html = html.replace(/Kilogram Enterprise/g, 'Campify Campus Platform');
  html = html.replace(/Kilogram/g, 'Campify');
  html = html.replace(/kilogram\.app/g, 'campify.college');
  html = html.replace(/kilogram\.db/g, 'campify.db');
  html = html.replace(/kilogram/g, 'campify');

  // Mapping mockup URLs to real screenshots
  const mockupReplacements = [
    {
      url: 'campify.college/welcome',
      file: '01_landing_page.png',
      caption: 'Figure 6.1: Campify Public Welcome & Landing Page Interface with dynamic campus highlights.'
    },
    {
      url: 'campify.college/auth',
      file: '02_auth_login.png',
      caption: 'Figure 6.2a: Secure Authentication Portal - User & Student Sign-in with starry space backdrop.',
      extraHtml: `
        <div class="screenshot-card">
          <div class="mockup-header">
            <span class="mockup-dot red"></span>
            <span class="mockup-dot yellow"></span>
            <span class="mockup-dot green"></span>
            <span class="mockup-url">http://localhost:3001/auth?tab=register</span>
          </div>
          <div class="screenshot-wrapper">
            <img src="${getScreenshotPath('03_auth_register.png')}" alt="Screen 2b: Register Portal" />
          </div>
          <div class="screenshot-caption">Figure 6.2b: Campus Member Registration Portal with University Email Verification.</div>
        </div>
      `
    },
    {
      url: 'campify.college/feed',
      file: '04_home_feed.png',
      caption: 'Figure 6.3: Main Feed & Campus Stories Carousel with real-time creator updates and suggested peers.'
    },
    {
      url: 'campify.college/modal/create-post',
      file: '05_create_post_modal.png',
      caption: 'Figure 6.4: Interactive Media Creation Studio - Post, Ephemeral Story, and Video Reel Composer.'
    },
    {
      url: 'campify.college/drawer/search',
      file: '06_search_drawer.png',
      caption: 'Figure 6.5: Live Real-Time Campus Search Drawer with fast debounced autocomplete.'
    },
    {
      url: 'campify.college/reels',
      file: '08_reels_player.png',
      caption: 'Figure 6.6: Vertical Short-Form Video Reels Player with creator badge, sound track, and reactions.'
    },
    {
      url: 'campify.college/learning',
      file: '12_learning_reels.png',
      caption: 'Figure 6.7: Micro-Learning Educational Stream with interactive coding quizzes and XP rewards.'
    },
    {
      url: 'campify.college/explore',
      file: '07_explore_page.png',
      caption: 'Figure 6.8: Explore & Discovery Grid featuring trending campus hashtags, discussions, and media.'
    },
    {
      url: 'campify.college/messages',
      file: '15_messages_chat.png',
      caption: 'Figure 6.9: Real-Time Socket.io Chat Workspace with active status, presence indicator, and rich messaging.'
    },
    {
      url: 'campify.college/john_doe',
      file: '17_user_profile.png',
      caption: 'Figure 6.10: Student Creator Profile with academic portfolio, skill badges, and categorized content tabs.'
    },
    {
      url: 'campify.college/team-finder',
      file: '13_team_finder.png',
      caption: 'Figure 6.11: Project & Hackathon Team Finder Hub for skill-matched peer recruitment.'
    },
    {
      url: 'campify.college/admin',
      file: '20_admin_dashboard.png',
      caption: 'Figure 6.12: System Administration & Moderation Console for user management and audit tracking.'
    },
    {
      url: 'campify.college/notifications',
      file: '16_notifications.png',
      caption: 'Figure 6.13: Centralized Notification Stream - real-time likes, comments, team invites, and mentions.'
    },
    {
      url: 'campify.college/settings',
      file: '18_settings_page.png',
      caption: 'Figure 6.14: User Account Settings & Privacy Management - 2FA, password rotation, and profile details.'
    },
    {
      url: 'campify.college/communities',
      file: '11_communities_page.png',
      caption: 'Figure 6.15: Campus Communities & Student Clubs Directory with interactive discussions and memberships.'
    },
    {
      url: 'campify.college/events',
      file: '09_events_page.png',
      caption: 'Figure 6.16a: Campus Events & Technical Hackathons Directory with RSVP registration.',
      extraHtml: `
        <div class="screenshot-card">
          <div class="mockup-header">
            <span class="mockup-dot red"></span>
            <span class="mockup-dot yellow"></span>
            <span class="mockup-dot green"></span>
            <span class="mockup-url">http://localhost:3001/events?modal=create</span>
          </div>
          <div class="screenshot-wrapper">
            <img src="${getScreenshotPath('10_create_event_modal.png')}" alt="Screen 16b: Create Event Modal" />
          </div>
          <div class="screenshot-caption">Figure 6.16b: Event Organizer Studio - Host campus workshops, hackathons, and webinars.</div>
        </div>
      `
    },
    {
      url: 'campify.college/leaderboard',
      file: '14_leaderboard.png',
      caption: 'Figure 6.17: Campus Gamification & Student Karma Leaderboard with streaks and achievement tiers.',
      extraHtml: `
        <div class="screenshot-card">
          <div class="mockup-header">
            <span class="mockup-dot red"></span>
            <span class="mockup-dot yellow"></span>
            <span class="mockup-dot green"></span>
            <span class="mockup-url">http://localhost:3001/?drawer=ai-assistant</span>
          </div>
          <div class="screenshot-wrapper">
            <img src="${getScreenshotPath('19_ai_assistant.png')}" alt="Screen 18: Gemini AI Campus Assistant" />
          </div>
          <div class="screenshot-caption">Figure 6.18: Campify Gemini AI Copilot - AI caption generator, study notes assistant, and hashtag helper.</div>
        </div>
      `
    }
  ];

  console.log('Replacing mockups with high-resolution screenshot cards...');
  mockupReplacements.forEach(({ url, file, caption, extraHtml }) => {
    const regex = new RegExp(`<div class="mockup-frame">[\\s\\S]*?<span class="mockup-url">https?://${url.replace(/\./g, '\\.')}<\\/span>[\\s\\S]*?<\\/div>\\s*<\\/div>`, 'i');
    
    const cardHtml = `
      <div class="screenshot-card">
        <div class="mockup-header">
          <span class="mockup-dot red"></span>
          <span class="mockup-dot yellow"></span>
          <span class="mockup-dot green"></span>
          <span class="mockup-url">http://localhost:3001/${url.split('/')[1] || ''}</span>
        </div>
        <div class="screenshot-wrapper">
          <img src="${getScreenshotPath(file)}" alt="${caption}" />
        </div>
        <div class="screenshot-caption">${caption}</div>
      </div>
      ${extraHtml || ''}
    `;

    if (regex.test(html)) {
      html = html.replace(regex, cardHtml);
      console.log(`Replaced mockup for: ${url} -> ${file}`);
    } else {
      console.warn(`Could not find mockup for: ${url}`);
    }
  });

  console.log('Writing updated HTML to:', outputHtmlPath);
  fs.writeFileSync(outputHtmlPath, html, 'utf8');

  console.log('Launching headless Chrome to render PDF...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('Loading documentation HTML in Chrome...');
  await page.goto(`file:///${outputHtmlPath.replace(/\\/g, '/')}`, {
    waitUntil: 'networkidle0',
    timeout: 120000
  });

  console.log('Generating PDF with A4 pages and custom headers/footers...');
  await page.pdf({
    path: outputPdfPath,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: `
      <div style="font-family: 'Inter', -apple-system, sans-serif; font-size: 7pt; color: #94a3b8; width: 100%; padding: 0 16mm; display: flex; justify-content: space-between; border-bottom: 0.5px solid #cbd5e1; padding-bottom: 3px;">
        <span style="font-weight: 600; color: #475569;">Campify : Social Networking Platform for College Communities</span>
        <span>Software Engineering Specification (SRS & SDD)</span>
      </div>
    `,
    footerTemplate: `
      <div style="font-family: 'Inter', -apple-system, sans-serif; font-size: 7pt; color: #94a3b8; width: 100%; padding: 0 16mm; display: flex; justify-content: space-between; border-top: 0.5px solid #cbd5e1; padding-top: 3px;">
        <span>Comprehensive System Documentation & Visual Manual</span>
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
      </div>
    `,
    margin: {
      top: '18mm',
      bottom: '18mm',
      left: '15mm',
      right: '15mm'
    }
  });

  await browser.close();

  const stats = fs.statSync(outputPdfPath);
  console.log(`\n======================================================`);
  console.log(`✅ Campify PDF generated successfully!`);
  console.log(`📍 Path: ${outputPdfPath}`);
  console.log(`📦 Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`======================================================\n`);
}

buildCampifyDocumentation().catch(console.error);
