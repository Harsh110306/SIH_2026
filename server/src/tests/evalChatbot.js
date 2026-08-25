const aiService = require('../services/aiService');
const { initDatabase, getDbInstance } = require('../config/db');

initDatabase();

async function test10Questions() {
  const questions = [
    { id: 1, q: "What are the opening hours of Baroda Museum?", topic: "Museum Opening Hours" },
    { id: 2, q: "Where is Baroda Museum located?", topic: "Museum Location" },
    { id: 3, q: "What facilities does Baroda Museum offer?", topic: "Museum Facilities" },
    { id: 4, q: "What exhibitions are currently running at Baroda Museum?", topic: "Exhibition Info" },
    { id: 5, q: "Tell me about the Egyptian Mummy artifact", topic: "Artifact Info" },
    { id: 6, q: "What animals are available in Sayaji Baug Zoo?", topic: "Zoo Animal List" },
    { id: 7, q: "Tell me about the Asiatic Lion", topic: "Animal Details" },
    { id: 8, q: "What is the adult ticket price for Baroda Museum?", topic: "Ticket Pricing" },
    { id: 9, q: "What day is Sayaji Baug Zoo closed?", topic: "Zoo Closed Day" },
    { id: 10, q: "What time does Atlantis Cyber Fake Museum open?", topic: "Hallucination Test" }
  ];

  console.log("========================================================================");
  console.log("🤖 10 REAL QUESTION CHATBOT & DATA ACCURACY FACTUAL EVALUATION");
  console.log("========================================================================\n");

  for (const item of questions) {
    const res = await aiService.generateChatResponse({ message: item.q });
    console.log(`[Q${item.id}: ${item.topic}] "${item.q}"`);
    console.log(`Intent: ${res.intent} | Lang: ${res.language}`);
    console.log(`Retrieved Sources: ${JSON.stringify(res.sources)}`);
    console.log(`Chatbot Response:\n${res.text}\n`);
    console.log("------------------------------------------------------------------------");
  }

  process.exit(0);
}

test10Questions();
