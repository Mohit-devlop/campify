const BANNED_KEYWORDS = [
  'kill yourself',
  'hate speech',
  'nigga',
  'faggot',
  'scammer',
  'buy cheap followers',
  'crypto double your money',
  'hack account',
  'free pharmacy',
];

interface ModerationResult {
  isToxic: boolean;
  score: number; // 0 to 1
  reason: string | null;
}

export function analyzeContent(text: string): ModerationResult {
  if (!text) {
    return { isToxic: false, score: 0, reason: null };
  }

  const lowercaseText = text.toLowerCase();

  // Check for exact banned keywords
  for (const keyword of BANNED_KEYWORDS) {
    if (lowercaseText.includes(keyword)) {
      return {
        isToxic: true,
        score: 0.95,
        reason: `Contains forbidden terms matching '${keyword}'`,
      };
    }
  }

  // Simple spam heuristics: excessive caps, URLs containing suspicious terms
  const uppercaseRatio = text.length > 10 ? (text.replace(/[^A-Z]/g, '').length / text.length) : 0;
  if (uppercaseRatio > 0.8) {
    return {
      isToxic: true,
      score: 0.75,
      reason: 'Excessive capital letters detected (possible screaming/spam)',
    };
  }

  const spamPatterns = [
    /https?:\/\/[^\s]*\b(crypto|free-money|win-iphone|cash-now)\b/i,
    /dm me to win/i,
    /send \d+ btc/i,
  ];

  for (const pattern of spamPatterns) {
    if (pattern.test(lowercaseText)) {
      return {
        isToxic: true,
        score: 0.85,
        reason: 'Matches known automated spam pattern',
      };
    }
  }

  return { isToxic: false, score: 0.05, reason: null };
}
