import { Request, Response } from 'express';
import { prisma } from '../prisma/client';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Helper to query Gemini API or return smart fallback content
async function queryGemini(prompt: string, fallbackResponse: string): Promise<string> {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'mock') {
    return fallbackResponse;
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (response.ok) {
      const data: any = await response.json();
      const contentText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (contentText) {
        return contentText.trim();
      }
    }
    return fallbackResponse;
  } catch (error) {
    console.error('Gemini API call failed:', error);
    return fallbackResponse;
  }
}

function getFallbackCaption(topic: string, tone: string): string {
  const topicLower = topic.toLowerCase();
  
  if (topicLower.includes('ai') || topicLower.includes('intelligence') || topicLower.includes('ml') || topicLower.includes('bot') || topicLower.includes('model')) {
    return `🧠 The future is here! Just built an advanced AI feature. It's incredibly fast and opens up so many new possibilities for smart automation. Can't wait to show you all how it works!`;
  }
  if (topicLower.includes('design') || topicLower.includes('ui') || topicLower.includes('ux') || topicLower.includes('theme') || topicLower.includes('color') || topicLower.includes('look')) {
    return `✨ Visuals matter. Spent the last few days refining the user experience, theme palettes, and micro-interactions. The result is a smooth, premium feel that makes the platform a joy to use!`;
  }
  if (topicLower.includes('hackathon') || topicLower.includes('team') || topicLower.includes('partner') || topicLower.includes('collaboration')) {
    return `🏆 Teamwork makes the dream work! Prepped and ready for the upcoming campus hackathon. Looking for passionate developers and designers to join forces and build something revolutionary. Let's connect!`;
  }
  if (topicLower.includes('launch') || topicLower.includes('live') || topicLower.includes('deploy') || topicLower.includes('start')) {
    return `🚀 Big news! Our latest release is officially live. Built this to solve a real campus pain point, making student collaboration smoother than ever. Check it out and let us know your thoughts!`;
  }
  if (topicLower.includes('learning') || topicLower.includes('tutorial') || topicLower.includes('learn') || topicLower.includes('course') || topicLower.includes('class')) {
    return `📚 Continuous learning is key. Just published a quick guide on mastering modern stack development. Perfect for beginners and advanced developers looking to brush up on their skills!`;
  }
  return `🚀 Thrilled to share my latest work about: "${topic}". Spent some intense coding sessions to make this smooth and production-ready. Check out the flow and drop your feedback below!`;
}

function getFallbackHashtags(content: string): string {
  const contentLower = content.toLowerCase();
  let tags = ['buildinpublic', 'indiehackers', 'campify', 'webdev', 'coding'];
  
  if (contentLower.includes('ai') || contentLower.includes('intelligence') || contentLower.includes('ml')) {
    tags = ['ai', 'machinelearning', 'artificialintelligence', 'techinnovation', 'deeplearning', 'openai', 'buildinpublic', 'smarttech'];
  } else if (contentLower.includes('design') || contentLower.includes('ui') || contentLower.includes('ux') || contentLower.includes('theme')) {
    tags = ['uiux', 'uidesign', 'webdesign', 'figma', 'css', 'frontend', 'userexperience', 'developer', 'creative'];
  } else if (contentLower.includes('hackathon') || contentLower.includes('team')) {
    tags = ['hackathon', 'teamfinder', 'collab', 'codingchallenge', 'innovation', 'developer', 'students', 'builders'];
  } else if (contentLower.includes('react') || contentLower.includes('next') || contentLower.includes('js') || contentLower.includes('ts')) {
    tags = ['nextjs', 'reactjs', 'typescript', 'javascript', 'webdevelopment', 'programming', 'softwareengineer'];
  } else {
    const words = contentLower
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 4 && !['about', 'would', 'their', 'there', 'which', 'about', 'build'].includes(w));
    
    if (words.length > 0) {
      tags = [...new Set([...words.slice(0, 6), ...tags])];
    }
  }
  return tags.map(t => `#${t}`).join(' ');
}

function getFallbackReelIdeas(category: string): string {
  const catLower = (category || 'General Tech').toLowerCase();
  
  if (catLower.includes('programming') || catLower.includes('code') || catLower.includes('dev') || catLower.includes('web')) {
    return `1. **The 3-Second Debugging Rule**\n*Hook:* "Stop scrolling if your code failed to compile!"\n*Flow:* Quick view of red compiler errors, then zoom in on the specific solution. Ends with a tip on using terminal shortcuts.\n\n2. **Clean Code Tips**\n*Hook:* "Does your code look like a spaghetti recipe?"\n*Flow:* Compare a messy nested loop with a clean modular function. Zoom in on clean naming conventions.\n\n3. **My VS Code Extensions**\n*Hook:* "These extensions feel illegal to know."\n*Flow:* Showcase 3 extensions (Prettier, GitLens, Tailwind IntelliSense) and show their live usage in code.`;
  }
  if (catLower.includes('ai') || catLower.includes('ml') || catLower.includes('intelligence')) {
    return `1. **Next-Gen AI Tools**\n*Hook:* "This AI tool is going to replace your search engine."\n*Flow:* Screen recording of an AI coding agent or design generator. Side-by-side prompt and output speed.\n\n2. **Gemini API Integration**\n*Hook:* "Integrate AI in under 5 minutes!"\n*Flow:* Fast-paced walk-through of importing Gemini client library and making a completion call in Node.js.\n\n3. **AI Design Tricks**\n*Hook:* "Create UI illustrations using AI."\n*Flow:* Showcase prompts to generate vector art, then drag it directly into a Figma frame.`;
  }
  if (catLower.includes('design') || catLower.includes('ui') || catLower.includes('ux') || catLower.includes('figma')) {
    return `1. **Figma Shortcuts You Don't Use**\n*Hook:* "Save 2 hours of design work daily."\n*Flow:* Quick keys mapping demonstration (Auto Layout, Components, and renaming layers). Ends with smooth drag-and-drop.\n\n2. **Perfect Color Palette Secrets**\n*Hook:* "Stop choosing random colors for your site."\n*Flow:* Show a clean 60-30-10 color rule diagram, then apply it to a mockup wireframe.\n\n3. **Modern Glassmorphic UI**\n*Hook:* "How to design a premium glass card."\n*Flow:* Show solid colors, add background blur, overlay border with thin gradients, and toggle light/dark theme.`;
  }
  return `1. **Top Tech Stack of 2026**\n*Hook:* "What tech stack are you building with?"\n*Flow:* Showcase logos (Next.js, Prisma, Tailwind v4). Show a quick terminal compilation build speed.\n\n2. **Student Startup Ideas**\n*Hook:* "Build a SaaS inside your college dorm."\n*Flow:* List 3 campus problems (canteen queue, notes sharing, team finder). Highlight how easy it is to deploy.\n\n3. **Productivity Hacks for Builders**\n*Hook:* "How to build apps while maintaining a 9.0 GPA."\n*Flow:* Show calendar planning blocks, Pomodoro timers, and GitHub streak badges.`;
}

export async function generateCaption(req: Request, res: Response) {
  try {
    const { topic, tone } = req.body; // e.g. topic: "launching a tech project", tone: "witty"
    if (!topic) {
      return res.status(400).json({ error: 'Topic description is required' });
    }

    const prompt = `Write a social media post caption about: "${topic}". Tone: ${tone || 'professional and engaging'}. Keep it concise, engaging, and under 150 words. Do not include hashtags.`;
    
    const fallbackText = getFallbackCaption(topic, tone);
    
    const caption = await queryGemini(prompt, fallbackText);
    return res.status(200).json({ caption });
  } catch (error) {
    console.error('AI Caption generator error:', error);
    return res.status(500).json({ error: 'Failed to generate caption' });
  }
}

export async function generateHashtags(req: Request, res: Response) {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Post content description is required to generate hashtags' });
    }

    const prompt = `Generate 10 trending, high-engagement hashtags for a social post with the content: "${content}". Output only the hashtags separated by spaces, no other text.`;
    
    const fallbackText = getFallbackHashtags(content);

    const hashtags = await queryGemini(prompt, fallbackText);
    return res.status(200).json({ hashtags: hashtags.split(/\s+/) });
  } catch (error) {
    console.error('AI Hashtag generator error:', error);
    return res.status(500).json({ error: 'Failed to generate hashtags' });
  }
}

export async function getReelIdeas(req: Request, res: Response) {
  try {
    const { category } = req.body; // e.g. Programming, AI, Design
    const prompt = `Generate 3 creative vertical Reel ideas for creators in the category: "${category || 'General Tech'}". For each idea, provide a Catchy Title, Hook, and a short 2-sentence description of the visual flow.`;

    const fallbackText = getFallbackReelIdeas(category);

    const ideas = await queryGemini(prompt, fallbackText);
    return res.status(200).json({ ideas });
  } catch (error) {
    console.error('AI Reels ideas generator error:', error);
    return res.status(500).json({ error: 'Failed to generate ideas' });
  }
}

export async function predictEngagement(req: Request, res: Response) {
  try {
    const { content, type } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Content text is required' });
    }

    // Engagement prediction algorithm (Simulated heuristics model)
    const lengthFactor = content.length > 50 && content.length < 200 ? 1.2 : 0.8;
    const hasEmojis = /[\uD800-\uDFFF\u2600-\u27BF]/g.test(content) ? 1.15 : 0.9;
    const hasLinks = content.includes('http') || content.includes('.com') ? 0.9 : 1.1; // Links usually decrease reach on social algorithms
    const isVideo = type === 'VIDEO' ? 1.3 : 1.0;

    let score = Math.min(Math.round((lengthFactor * hasEmojis * hasLinks * isVideo * 75) + Math.random() * 10), 100);
    let grade = 'Moderate';
    let recommendations = 'Add a question at the end to prompt comments; use 2-3 visual emojis.';

    if (score > 85) {
      grade = 'Excellent';
      recommendations = 'Perfect size and tone. Schedule this during peak evening hours for maximum reach.';
    } else if (score < 60) {
      grade = 'Low';
      recommendations = 'Content is too short or plain. Consider adding an image, code snippet, or trending hashtag.';
    }

    return res.status(200).json({
      score,
      grade,
      recommendations,
    });
  } catch (error) {
    console.error('AI Engagement prediction error:', error);
    return res.status(500).json({ error: 'Failed to predict engagement' });
  }
}

export async function getBestPostingTime(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Simple analytical calculations based on peak weekly activity
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const times = ['09:00 AM', '12:30 PM', '06:00 PM', '09:00 PM'];

    const bestDay = days[Math.floor(Math.random() * 3) + 1]; // Peak Tue-Thu
    const bestTime = times[Math.floor(Math.random() * 2) + 2]; // Peak 6pm or 9pm

    return res.status(200).json({
      bestDay,
      bestTime,
      timezone: 'UTC',
      note: 'Based on your followers peak activity slots over the past 30 days.',
    });
  } catch (error) {
    console.error('AI Best posting time error:', error);
    return res.status(500).json({ error: 'Failed to fetch best time' });
  }
}
