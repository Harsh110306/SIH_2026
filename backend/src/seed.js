const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Museum = require('./models/Museum');
const Exhibition = require('./models/Exhibition');

// Load environment variables from .env file
dotenv.config();

const seedData = async () => {
  try {
    // 1. Connect to MongoDB Atlas using the existing URI from .env
    console.log('⏳ Connecting to MongoDB Atlas...');
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined in your .env file!');
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB Atlas successfully.');

    // 2. Clear old Museum and Exhibition data to avoid duplicate records
    await Museum.deleteMany({});
    await Exhibition.deleteMany({});
    console.log('🧹 Cleared previous museum and exhibition records.');

    // 3. Insert realistic dummy Museums
    const museums = await Museum.insertMany([
      {
        name: 'Metropolitan Museum of Art & History',
        location: 'Central City Square, Downtown',
        description: 'A premier institution celebrating human history, art, and cultural evolution from ancient times to modern era.',
        openingTime: '09:00 AM',
        closingTime: '06:00 PM'
      },
      {
        name: 'National Science & Innovation Centre',
        location: 'Innovation Hub, East District',
        description: 'An interactive space dedicated to space exploration, robotics, artificial intelligence, and futuristic technology.',
        openingTime: '10:00 AM',
        closingTime: '07:00 PM'
      },
      {
        name: 'Royal Heritage & Natural History Museum',
        location: 'Old Fort Road, Heritage Quarter',
        description: 'Discover prehistoric fossils, royal dynasty artifacts, and rare natural ecosystem exhibits.',
        openingTime: '09:30 AM',
        closingTime: '05:30 PM'
      }
    ]);

    console.log(`✅ Inserted ${museums.length} Museums successfully.`);

    // 4. Insert realistic dummy Exhibitions linked to those Museums via museumId
    const exhibitions = await Exhibition.insertMany([
      {
        title: 'Secrets of Ancient Egypt',
        description: 'Explore rare mummies, royal sarcophagi, and gold artifacts from the Valley of the Kings.',
        category: 'History',
        museumId: museums[0]._id, // Linked to Metropolitan Museum
        image: 'https://images.unsplash.com/photo-1503177119275-0aa32b3a9368',
        status: 'active'
      },
      {
        title: 'Renaissance Masters: Da Vinci & Michelangelo',
        description: 'An exclusive display of legendary paintings, anatomical sketches, and architectural blueprints.',
        category: 'Art',
        museumId: museums[0]._id, // Linked to Metropolitan Museum
        image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675',
        status: 'active'
      },
      {
        title: 'AI & Beyond: The Robotics Revolution',
        description: 'Hands-on experience with humanoid robots, quantum computing models, and generative AI displays.',
        category: 'Technology',
        museumId: museums[1]._id, // Linked to National Science Centre
        image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e',
        status: 'active'
      },
      {
        title: 'Deep Space & Galaxy Exploration',
        description: 'Immersive planetarium journey through black holes, distant nebulae, and lunar landings.',
        category: 'Science',
        museumId: museums[1]._id, // Linked to National Science Centre
        image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa',
        status: 'upcoming'
      }
    ]);

    console.log(`✅ Inserted ${exhibitions.length} Exhibitions linked to Museums successfully.`);

    // 5. Close MongoDB connection cleanly
    await mongoose.disconnect();
    console.log('🔒 Database connection closed. Seeding process complete!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    process.exit(1);
  }
};

seedData();
