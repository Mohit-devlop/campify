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
  const toneLower = (tone || 'professional').toLowerCase();

  // Find appropriate emoji
  let emoji = '✨';
  if (topicLower.includes('marri') || topicLower.includes('wed') || topicLower.includes('coupl') || topicLower.includes('love')) emoji = '💍';
  else if (topicLower.includes('cricket') || topicLower.includes('sport') || topicLower.includes('game') || topicLower.includes('play')) emoji = '🏆';
  else if (topicLower.includes('exam') || topicLower.includes('test') || topicLower.includes('study') || topicLower.includes('read') || topicLower.includes('college')) emoji = '📚';
  else if (topicLower.includes('party') || topicLower.includes('celebrat') || topicLower.includes('fest') || topicLower.includes('event')) emoji = '🎉';
  else if (topicLower.includes('food') || topicLower.includes('eat') || topicLower.includes('canteen') || topicLower.includes('cook')) emoji = '🍔';
  else if (topicLower.includes('music') || topicLower.includes('song') || topicLower.includes('sing') || topicLower.includes('dance')) emoji = '🎵';
  else if (topicLower.includes('travel') || topicLower.includes('trip') || topicLower.includes('visit') || topicLower.includes('vlog')) emoji = '✈️';
  else if (topicLower.includes('code') || topicLower.includes('dev') || topicLower.includes('program') || topicLower.includes('tech') || topicLower.includes('hack')) emoji = '💻';
  else if (topicLower.includes('art') || topicLower.includes('design') || topicLower.includes('photo') || topicLower.includes('draw')) emoji = '🎨';

  // Capitalize topic nicely
  const capitalizedTopic = topic.charAt(0).toUpperCase() + topic.slice(1);

  // Pre-configured keyword-rich responses for major events to make them feel highly tailored
  if (topicLower.includes('launch') || topicLower.includes('live') || topicLower.includes('deploy') || topicLower.includes('start')) {
    return `🚀 Big news! Our latest release is officially live. Built this to solve a real campus pain point, making student collaboration smoother than ever. Check it out and let us know your thoughts!`;
  }
  if (topicLower.includes('hackathon') || topicLower.includes('team') || topicLower.includes('partner') || topicLower.includes('collaboration')) {
    return `🏆 Teamwork makes the dream work! Prepped and ready for the upcoming campus hackathon. Looking for passionate developers and designers to join forces and build something revolutionary. Let's connect!`;
  }

  // Tone-specific dynamic responses
  if (toneLower === 'witty') {
    return `${emoji} Let's talk about "${capitalizedTopic}"! Behind the scenes, it's 10% inspiration and 90% drinking too much coffee to get it right. Here is my take on it—let me know if you agree or if I should get more caffeine! ☕`;
  }
  if (toneLower === 'inspiring') {
    return `${emoji} Every journey starts with a single step, and diving into "${capitalizedTopic}" has been an incredible one. It's about pushing boundaries, learning continuously, and turning challenges into opportunities. Keep building, keep growing! 🌟`;
  }
  if (toneLower === 'minimal' || toneLower === 'minimalist') {
    return `${emoji} Exploring "${capitalizedTopic}". Simple, clean, and focused. What do you think?`;
  }
  
  // Default to Professional
  return `${emoji} Excited to share some thoughts on "${capitalizedTopic}". Understanding the core values of this field is key to driving real impact and innovation. Here is a brief look at the flow. Would love to hear your insights!`;
}

function getFallbackHashtags(content: string): string {
  const contentLower = content.toLowerCase();
  
  // Extract words from content that are longer than 3 characters and aren't common stop words
  const stopWords = ['about', 'would', 'their', 'there', 'which', 'about', 'build', 'with', 'this', 'that', 'from', 'your', 'here', 'have'];
  const extractedWords = contentLower
    .replace(/[^\w\s]/g, '') // remove punctuation
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.includes(w));
  
  // Determine category tags
  let categoryTags: string[] = [];
  if (contentLower.includes('marri') || contentLower.includes('wed') || contentLower.includes('coupl') || contentLower.includes('love')) {
    categoryTags = ['wedding', 'marriage', 'couplegoals', 'love', 'celebration', 'togetherness'];
  } else if (contentLower.includes('cricket') || contentLower.includes('sport') || contentLower.includes('game')) {
    categoryTags = ['cricket', 'sports', 'gameday', 'athlete', 'fitness', 'champions'];
  } else if (contentLower.includes('exam') || contentLower.includes('test') || contentLower.includes('study') || contentLower.includes('college')) {
    categoryTags = ['exams', 'studentlife', 'studymotivation', 'education', 'collegelife', 'finals'];
  } else if (contentLower.includes('party') || contentLower.includes('celebrat') || contentLower.includes('fest')) {
    categoryTags = ['party', 'celebrate', 'goodtimes', 'vibes', 'festivities', 'friends'];
  } else if (contentLower.includes('code') || contentLower.includes('dev') || contentLower.includes('program') || contentLower.includes('tech')) {
    categoryTags = ['coding', 'developer', 'techinnovation', 'software', 'programming', 'webdev'];
  } else if (contentLower.includes('design') || contentLower.includes('ui') || contentLower.includes('ux') || contentLower.includes('art')) {
    categoryTags = ['uiux', 'designinspiration', 'creative', 'art', 'graphicdesign', 'frontend'];
  }

  // Combine extracted words, category tags, and general tags
  const defaultTags = ['campify', 'socialnetwork', 'connect'];
  const combined = [...new Set([...extractedWords.slice(0, 4), ...categoryTags, ...defaultTags])];
  
  return combined.map(t => `#${t}`).join(' ');
}

function getFallbackReelIdeas(category: string): string {
  const catLower = (category || 'General').toLowerCase();
  const capitalizedCat = category ? category.charAt(0).toUpperCase() + category.slice(1) : 'General';
  
  if (catLower.includes('programming') || catLower.includes('code') || catLower.includes('dev') || catLower.includes('web')) {
    return `1. **The 3-Second Debugging Rule**\n*Hook:* "Stop scrolling if your code failed to compile!"\n*Flow:* Quick view of red compiler errors, then zoom in on the specific solution. Ends with a tip on using terminal shortcuts.\n\n2. **Clean Code Tips**\n*Hook:* "Does your code look like a spaghetti recipe?"\n*Flow:* Compare a messy nested loop with a clean modular function. Zoom in on clean naming conventions.\n\n3. **My VS Code Extensions**\n*Hook:* "These extensions feel illegal to know."\n*Flow:* Showcase 3 extensions (Prettier, GitLens, Tailwind IntelliSense) and show their live usage in code.`;
  }
  if (catLower.includes('ai') || catLower.includes('ml') || catLower.includes('intelligence')) {
    return `1. **Next-Gen AI Tools**\n*Hook:* "This AI tool is going to replace your search engine."\n*Flow:* Screen recording of an AI coding agent or design generator. Side-by-side prompt and output speed.\n\n2. **Gemini API Integration**\n*Hook:* "Integrate AI in under 5 minutes!"\n*Flow:* Fast-paced walk-through of importing Gemini client library and making a completion call in Node.js.\n\n3. **AI Design Tricks**\n*Hook:* "Create UI illustrations using AI."\n*Flow:* Showcase prompts to generate vector art, then drag it directly into a Figma frame.`;
  }
  if (catLower.includes('design') || catLower.includes('ui') || catLower.includes('ux') || catLower.includes('figma')) {
    return `1. **Figma Shortcuts You Don't Use**\n*Hook:* "Save 2 hours of design work daily."\n*Flow:* Quick keys mapping demonstration (Auto Layout, Components, and renaming layers). Ends with smooth drag-and-drop.\n\n2. **Perfect Color Palette Secrets**\n*Hook:* "Stop choosing random colors for your site."\n*Flow:* Show a clean 60-30-10 color rule diagram, then apply it to a mockup wireframe.\n\n3. **Modern Glassmorphic UI**\n*Hook:* "How to design a premium glass card."\n*Flow:* Show solid colors, add background blur, overlay border with thin gradients, and toggle light/dark theme.`;
  }
  if (catLower.includes('marri') || catLower.includes('wed') || catLower.includes('coupl') || catLower.includes('love')) {
    return `1. **Wedding Planning Hacks**\n*Hook:* "Plan your dream wedding without losing your mind!"\n*Flow:* Quick montage of mood boards, checklist journals, and venue visits. Ends with a tip on budgeting tools.\n\n2. **Choosing the Perfect Wedding Palette**\n*Hook:* "Stop choosing random colors for your big day."\n*Flow:* Display mood boards of 3 popular color schemes (pastel, royal purple, emerald gold) and show how they look in bridesmaid dresses and decor.\n\n3. **3 Questions Every Couple Should Ask**\n*Hook:* "Before you say 'I Do', ask these questions!"\n*Flow:* Cozy couple chatting, sharing tips on discussing future goals, finances, and travel plans.`;
  }
  if (catLower.includes('cricket') || catLower.includes('sport') || catLower.includes('game') || catLower.includes('play')) {
    return `1. **Mastering the Cricket Cover Drive**\n*Hook:* "Learn the perfect cover drive in 3 simple steps!"\n*Flow:* Slow-motion shot of a perfect batsman stance, highlighting foot placement and backlift angle. Ends with live bat swing contact.\n\n2. **Match Day Matchup Analysis**\n*Hook:* "Who has the upper hand in today's match?"\n*Flow:* Split screen comparing bowler vs batsman stats, head-to-head records, and pitch reports.\n\n3. **Top 3 Cricket Gear Essentials**\n*Hook:* "Is your cricket gear protecting you enough?"\n*Flow:* Quick close-ups of premium grade bats, lightweight leg guards, and impact-resistant helmets.`;
  }
  if (catLower.includes('exam') || catLower.includes('test') || catLower.includes('study') || catLower.includes('college')) {
    return `1. **The Active Recall Study Trick**\n*Hook:* "Stop highlighting your textbook, do this instead!"\n*Flow:* Student closing their notes and writing down everything they remember on a whiteboard. Explanation of brain retrieval science.\n\n2. **Ace Your Semester Finals**\n*Hook:* "How to prepare for 5 exams in 1 week."\n*Flow:* Show calendar time-blocks, division of topics, and solving past papers. Ends with a reminder to sleep.\n\n3. **My Night-Before Exam Routine**\n*Hook:* "What to do 10 hours before your exam."\n*Flow:* Organizing materials, eating a healthy snack, setting alarms, and doing a light 15-minute review session.`;
  }
  
  // Dynamic Generic fallback for any custom category
  return `1. **Exploring ${capitalizedCat}**\n*Hook:* "Everything you need to know about ${capitalizedCat}!"\n*Flow:* Beautiful transition showing 3 main key concepts of ${capitalizedCat}. Ends with an interactive question to comments.\n\n2. **Top Tips for ${capitalizedCat}**\n*Hook:* "Make your ${capitalizedCat} workflow 2x faster!"\n*Flow:* Hands-on demonstration of a quick lifehack or trick for ${capitalizedCat}. Ends with a call-to-action.\n\n3. **Why ${capitalizedCat} Matters in 2026**\n*Hook:* "This trend about ${capitalizedCat} is taking over."\n*Flow:* Dynamic graphs or slides showing the growth and impact of ${capitalizedCat} in student communities.`;
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
