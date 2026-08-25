const http = require('http');
const { app } = require('../../server');
const { initDatabase } = require('../config/db');

console.log('========================================================================');
console.log('🤖 RUNNING CHATBOT MULTI-QUERY REAL PIPELINE TEST SUITE');
console.log('========================================================================\n');

initDatabase();
const PORT = 5099;

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

const server = app.listen(PORT, async () => {
  let passed = 0;
  let failed = 0;

  const testQueries = [
    {
      id: 1,
      question: "What museums can I explore in Gujarat?",
      expectedCheck: (res) => res.status === 200 && res.body.message && (res.body.message.includes('Baroda') || res.body.message.includes('Sayaji') || res.body.message.includes('Calico'))
    },
    {
      id: 2,
      question: "Tell me about the Patola Silk Saree artifact.",
      expectedCheck: (res) => res.status === 200 && res.body.message && (res.body.message.includes('Patola') || res.body.message.includes('Textiles') || res.body.message.includes('Saree') || res.body.message.includes('Silk'))
    },
    {
      id: 3,
      question: "Which museum is closed on Wednesday?",
      expectedCheck: (res) => res.status === 200 && Boolean(res.body.message)
    },
    {
      id: 4,
      question: "How can I book a ticket?",
      expectedCheck: (res) => res.status === 200 && res.body.actionButtons && res.body.actionButtons.some(b => b.route === '/museums')
    },
    {
      id: 5,
      question: "What should I do if I want to report a problem?",
      expectedCheck: (res) => res.status === 200 && res.body.actionButtons && res.body.actionButtons.some(b => b.route === '/submit-complaint')
    },
    {
      id: 6,
      question: "Give me information about the Asiatic Lion.",
      expectedCheck: (res) => res.status === 200 && res.body.message && (res.body.message.includes('Lion') || res.body.message.includes('Asiatic') || res.body.message.includes('Sayaji'))
    },
    {
      id: 7,
      question: "What is the entry ticket fee for foreign visitors at Baroda Museum?",
      expectedCheck: (res) => res.status === 200 && res.body.message && (res.body.message.includes('Baroda') || res.body.message.includes('Fee') || res.body.message.includes('Adult'))
    },
    {
      id: 8,
      question: "What time does Atlantis Cyber Fake Museum open?",
      expectedCheck: (res) => res.status === 200 && (res.body.message.includes("couldn't find") || res.body.message.includes("verified record"))
    }
  ];

  try {
    for (const item of testQueries) {
      console.log(`Testing Query ${item.id}: "${item.question}"...`);
      const startTime = Date.now();
      const res = await makeRequest({
        hostname: 'localhost', port: PORT, path: '/api/chat', method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, { message: item.question });
      const elapsed = Date.now() - startTime;

      const isPass = item.expectedCheck(res);
      if (isPass) {
        passed++;
        console.log(` [PASS ✅] Query ${item.id} (${elapsed}ms) | Intent: ${res.body.intent} | Response length: ${res.body.message?.length || 0} chars`);
        console.log(`    Snippet: "${res.body.message?.substring(0, 120).replace(/\n/g, ' ')}..."\n`);
      } else {
        failed++;
        console.error(` [FAIL ❌] Query ${item.id} (${elapsed}ms) | Status: ${res.status}`);
        console.error(`    Body:`, res.body, '\n');
      }
    }

    console.log('========================================================================');
    console.log(`📊 CHATBOT MULTI-QUERY TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================\n');

    server.close();
    process.exit(failed === 0 ? 0 : 1);
  } catch (err) {
    console.error('Chatbot Test Error:', err);
    server.close();
    process.exit(1);
  }
});
