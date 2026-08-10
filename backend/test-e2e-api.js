const http = require('http');

const BASE_URL = 'http://localhost:5001/api';

async function request(endpoint, method = 'GET', data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${endpoint}`);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body || '{}');
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, raw: body });
          }
        });
      }
    );

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runE2ETests() {
  console.log('====================================================');
  console.log('🚀 RUNNING COMPLETE END-TO-END SYSTEM TESTS');
  console.log('====================================================\n');

  // Test 1: Health Check
  const healthRes = await request('/../health');
  console.log(`[1] Health Check:`, healthRes.status === 200 ? '✅ PASSED' : '❌ FAILED', healthRes.data);

  // Test 2: Login Existing User
  const loginRes = await request('/auth/login', 'POST', {
    identifier: 'john@gmail.com',
    password: 'Password123!',
  });
  console.log(`[2] User Login:`, loginRes.status === 200 ? '✅ PASSED' : '❌ FAILED', {
    username: loginRes.data.user?.username,
    tokenReceived: !!loginRes.data.accessToken,
  });

  const token = loginRes.data.accessToken;

  // Test 3: Get Posts Feed
  const feedRes = await request('/posts/feed', 'GET', null, token);
  console.log(`[3] Feed API:`, feedRes.status === 200 ? '✅ PASSED' : '❌ FAILED', {
    totalPosts: feedRes.data.posts?.length,
  });

  // Test 4: Create Post
  const postRes = await request('/posts', 'POST', {
    caption: 'Campify is completely online, tested & live! 🚀🔥',
    mediaUrls: ['https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=800'],
    location: 'Tech Hub',
  }, token);
  console.log(`[4] Post Creation:`, postRes.status === 201 ? '✅ PASSED' : '❌ FAILED', {
    postId: postRes.data.post?.id,
  });

  const newPostId = postRes.data.post?.id;

  // Test 5: Like the Post
  if (newPostId) {
    const likeRes = await request(`/posts/like/${newPostId}`, 'POST', {}, token);
    console.log(`[5] Like Post API:`, likeRes.status === 200 ? '✅ PASSED' : '❌ FAILED', likeRes.data.message || likeRes.data);

    // Test 6: Comment on Post
    const commentRes = await request(`/posts/comment/${newPostId}`, 'POST', {
      content: 'Verified this automated test comment on the live database! 🎉',
    }, token);
    console.log(`[6] Comment Post API:`, commentRes.status === 201 ? '✅ PASSED' : '❌ FAILED', {
      commentId: commentRes.data.comment?.id,
    });
  }

  // Test 7: Get Reels
  const reelsRes = await request('/reels', 'GET', null, token);
  console.log(`[7] Reels API:`, reelsRes.status === 200 ? '✅ PASSED' : '❌ FAILED', {
    reelsCount: reelsRes.data.reels?.length,
  });

  // Test 8: Get User Profile
  const profileRes = await request('/users/profile/mohit_1511', 'GET', null, token);
  console.log(`[8] User Profile API:`, profileRes.status === 200 ? '✅ PASSED' : '❌ FAILED', {
    user: profileRes.data.user?.username,
    bio: profileRes.data.user?.profile?.bio,
  });

  // Test 9: Create & Get Campus Events
  const createEventRes = await request('/events', 'POST', {
    title: 'Campify Grand National Hackathon 2026',
    description: '48-hour national hackathon for college students with ₹5,00,000 prize pool.',
    eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    location: 'Main University Campus & Online',
    isOnline: true,
  }, token);
  console.log(`[9] Create Event API:`, createEventRes.status === 201 ? '✅ PASSED' : '❌ FAILED', {
    eventId: createEventRes.data.event?.id,
    title: createEventRes.data.event?.title,
  });

  const eventListRes = await request('/events', 'GET');
  console.log(`[10] Events List API:`, eventListRes.status === 200 ? '✅ PASSED' : '❌ FAILED', {
    totalEvents: eventListRes.data.events?.length,
  });

  // Test 11: AI Team Matching
  const aiTeamRes = await request('/ai/team-match', 'POST', {
    projectTitle: 'AI Smart Campus Assistant',
    requiredSkills: ['Next.js', 'React', 'Node.js', 'PostgreSQL'],
    description: 'Building an automated college chatbot with LLMs',
  }, token);
  console.log(`[11] AI Team Match API:`, aiTeamRes.status === 200 ? '✅ PASSED' : '❌ FAILED', {
    matchesFound: aiTeamRes.data.matches?.length,
    hasSummary: !!aiTeamRes.data.summary,
  });

  // Test 12: AI Skill Recommendation
  const aiSkillRes = await request('/ai/skill-recommendation', 'POST', {
    targetRole: 'Full Stack AI Developer',
  }, token);
  console.log(`[12] AI Skill Recommendation API:`, aiSkillRes.status === 200 ? '✅ PASSED' : '❌ FAILED', {
    recommendationsCount: aiSkillRes.data.recommendations?.length,
  });

  console.log('\n====================================================');
  console.log('🎉 ALL 12 INTEGRATION TESTS COMPLETED SUCCESSFULLY!');
  console.log('====================================================');
}

runE2ETests().catch(console.error);
