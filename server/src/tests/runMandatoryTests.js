const aiService = require('../services/aiService');
const { initDatabase } = require('../config/db');

initDatabase();

async function runMandatory8Tests() {
  const tests = [
    { id: 1, name: "TEST 1: Baroda Museum Opening Hours", q: "What are the opening hours of Baroda Museum?" },
    { id: 2, name: "TEST 2: Non-existent Museum Opening Hours", q: "What are the opening hours of Atlantis Cyber Fake Museum?" },
    { id: 3, name: "TEST 3: Generic Discovery", q: "What museums are available?" },
    { id: 4, name: "TEST 4: Baroda Museum Location", q: "Where is Baroda Museum located?" },
    { id: 5, name: "TEST 5: Egyptian Mummy Artifact", q: "Tell me about the Egyptian Mummy." },
    { id: 6, name: "TEST 6: Sayaji Baug Zoo Animals", q: "What animals are available in Sayaji Baug Zoo?" },
    { id: 7, name: "TEST 7: Gujarati Query", q: "બડોદા મ્યુઝિયમ ક્યારે ખુલ્લું રહે છે?" },
    { id: 8, name: "TEST 8: Hindi Query", q: "बड़ौदा संग्रहालय कब खुला रहता है?" }
  ];

  console.log("========================================================================");
  console.log("🧪 EXECUTING MANDATORY 8 CHATBOT GROUNDING & ACCURACY TESTS");
  console.log(`Gemini Status: ${JSON.stringify(aiService.getStatus())}`);
  console.log("========================================================================\n");

  for (const t of tests) {
    console.log(`------------------------------------------------------------------------`);
    console.log(`📌 ${t.name}`);
    console.log(`User Query: "${t.q}"`);
    try {
      const res = await aiService.generateChatResponse({ message: t.q });
      console.log(`Detected Intent: ${res.intent} | Language: ${res.language}`);
      console.log(`Sources: ${JSON.stringify(res.sources)}`);
      console.log(`Response Output:\n${res.text}`);
    } catch (err) {
      console.error(`❌ Test Error: ${err.message}`);
    }
    console.log(`------------------------------------------------------------------------\n`);
  }

  process.exit(0);
}

runMandatory8Tests();
