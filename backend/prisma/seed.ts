import { PrismaClient, LearningMode, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.quizSession.deleteMany();
  await prisma.learningMaterial.deleteMany();
  await prisma.quizQuestion.deleteMany();
  await prisma.demoResult.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.user.deleteMany();

  // Create admin user
  const hashedPassword = await bcrypt.hash('Admin@1234', 12);
  await prisma.user.create({
    data: {
      name: 'Admin',
      email: 'admin@autismlearn.com',
      password: hashedPassword,
      role: Role.ADMIN
    }
  });

  // Seed Questions (30 total: 10 TEXT, 10 AUDIO, 10 VISUAL)
  const questions = [
    // TEXT Mode
    { subject: 'math', question: 'What is 5 + 3?', options: ['6', '7', '8', '9'], answer: '8', learningMode: LearningMode.TEXT },
    { subject: 'math', question: 'What is 10 - 4?', options: ['4', '5', '6', '7'], answer: '6', learningMode: LearningMode.TEXT },
    { subject: 'science', question: 'Which planet is known as the Red Planet?', options: ['Earth', 'Mars', 'Jupiter', 'Venus'], answer: 'Mars', learningMode: LearningMode.TEXT },
    { subject: 'animals', question: 'Which animal is known as the king of the jungle?', options: ['Tiger', 'Lion', 'Elephant', 'Bear'], answer: 'Lion', learningMode: LearningMode.TEXT },
    { subject: 'colors', question: 'What color do you get by mixing red and yellow?', options: ['Green', 'Orange', 'Purple', 'Brown'], answer: 'Orange', learningMode: LearningMode.TEXT },
    { subject: 'shapes', question: 'How many sides does a triangle have?', options: ['2', '3', '4', '5'], answer: '3', learningMode: LearningMode.TEXT },
    { subject: 'math', question: 'What is 2 x 4?', options: ['6', '8', '10', '12'], answer: '8', learningMode: LearningMode.TEXT },
    { subject: 'science', question: 'What do plants need to grow?', options: ['Fire', 'Water', 'Salt', 'Ice'], answer: 'Water', learningMode: LearningMode.TEXT },
    { subject: 'animals', question: 'Which bird can swim but not fly?', options: ['Eagle', 'Penguin', 'Parrot', 'Sparrow'], answer: 'Penguin', learningMode: LearningMode.TEXT },
    { subject: 'shapes', question: 'Which shape is round?', options: ['Square', 'Triangle', 'Circle', 'Rectangle'], answer: 'Circle', learningMode: LearningMode.TEXT },

    // AUDIO Mode
    { subject: 'math', question: 'Listen and solve: If you have 2 apples and get 3 more, how many do you have?', options: ['4', '5', '6', '7'], answer: '5', learningMode: LearningMode.AUDIO, audioText: 'If you have two apples and get three more, how many do you have?' },
    { subject: 'animals', question: 'Which animal makes a "moo" sound?', options: ['Dog', 'Cat', 'Cow', 'Sheep'], answer: 'Cow', learningMode: LearningMode.AUDIO, audioText: 'Which animal makes a moo sound?' },
    { subject: 'colors', question: 'What is the color of the sky?', options: ['Green', 'Blue', 'Red', 'Yellow'], answer: 'Blue', learningMode: LearningMode.AUDIO, audioText: 'What is the color of the sky?' },
    { subject: 'shapes', question: 'What shape has four equal sides?', options: ['Circle', 'Square', 'Triangle', 'Oval'], answer: 'Square', learningMode: LearningMode.AUDIO, audioText: 'What shape has four equal sides?' },
    { subject: 'science', question: 'What gives us heat and light during the day?', options: ['Moon', 'Stars', 'Sun', 'Earth'], answer: 'Sun', learningMode: LearningMode.AUDIO, audioText: 'What gives us heat and light during the day?' },
    { subject: 'math', question: 'What is 6 minus 2?', options: ['2', '3', '4', '5'], answer: '4', learningMode: LearningMode.AUDIO, audioText: 'What is six minus two?' },
    { subject: 'animals', question: 'Which animal barks?', options: ['Cat', 'Dog', 'Bird', 'Fish'], answer: 'Dog', learningMode: LearningMode.AUDIO, audioText: 'Which animal barks?' },
    { subject: 'colors', question: 'What color is a banana?', options: ['Red', 'Yellow', 'Blue', 'Purple'], answer: 'Yellow', learningMode: LearningMode.AUDIO, audioText: 'What color is a banana?' },
    { subject: 'shapes', question: 'What shape looks like an egg?', options: ['Square', 'Oval', 'Circle', 'Triangle'], answer: 'Oval', learningMode: LearningMode.AUDIO, audioText: 'What shape looks like an egg?' },
    { subject: 'science', question: 'What falls from clouds when it storms?', options: ['Rocks', 'Rain', 'Leaves', 'Sand'], answer: 'Rain', learningMode: LearningMode.AUDIO, audioText: 'What falls from clouds when it storms?' },

    // VISUAL Mode
    { subject: 'animals', question: 'Identify this animal:', options: ['Lion', 'Elephant', 'Giraffe', 'Zebra'], answer: 'Elephant', learningMode: LearningMode.VISUAL, imageUrl: 'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46' },
    { subject: 'colors', question: 'What color is this apple?', options: ['Red', 'Green', 'Yellow', 'Blue'], answer: 'Red', learningMode: LearningMode.VISUAL, imageUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6fac6' },
    { subject: 'shapes', question: 'Identify this shape:', options: ['Square', 'Triangle', 'Circle', 'Star'], answer: 'Circle', learningMode: LearningMode.VISUAL, imageUrl: 'https://images.unsplash.com/photo-1517524285303-d6fc683dddf8' },
    { subject: 'science', question: 'What planet is this?', options: ['Earth', 'Mars', 'Jupiter', 'Saturn'], answer: 'Earth', learningMode: LearningMode.VISUAL, imageUrl: 'https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4' },
    { subject: 'math', question: 'Count the items:', options: ['3', '4', '5', '6'], answer: '4', learningMode: LearningMode.VISUAL, imageUrl: 'https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3' },
    { subject: 'animals', question: 'Identify this bird:', options: ['Penguin', 'Parrot', 'Eagle', 'Owl'], answer: 'Penguin', learningMode: LearningMode.VISUAL, imageUrl: 'https://images.unsplash.com/photo-1598439210625-5067c578f3f6' },
    { subject: 'colors', question: 'What color is this leaf?', options: ['Red', 'Green', 'Brown', 'Yellow'], answer: 'Green', learningMode: LearningMode.VISUAL, imageUrl: 'https://images.unsplash.com/photo-1536882240095-0379873feb4e' },
    { subject: 'shapes', question: 'Identify this shape:', options: ['Square', 'Triangle', 'Circle', 'Rectangle'], answer: 'Triangle', learningMode: LearningMode.VISUAL, imageUrl: 'https://images.unsplash.com/photo-1563242034-706f9bd47702' },
    { subject: 'science', question: 'What weather is shown?', options: ['Sunny', 'Rainy', 'Snowy', 'Cloudy'], answer: 'Snowy', learningMode: LearningMode.VISUAL, imageUrl: 'https://images.unsplash.com/photo-1517260739337-6799d239ce83' },
    { subject: 'math', question: 'How many fingers are held up?', options: ['1', '2', '3', '4'], answer: '2', learningMode: LearningMode.VISUAL, imageUrl: 'https://images.unsplash.com/photo-1506869640319-a1b65e90a9ab' },
  ];

  for (const q of questions) {
    await prisma.quizQuestion.create({
      data: {
        subject: q.subject,
        question: q.question,
        options: q.options,
        answer: q.answer,
        learningMode: q.learningMode,
        audioText: q.audioText || null,
        imageUrl: q.imageUrl || null
      }
    });
  }

  // Seed Learning Materials (5 total)
  const materials = [
    { title: 'Introduction to Numbers', subject: 'math', type: 'article', learningMode: LearningMode.TEXT, content: { text: 'Numbers are used to count things...' } },
    { title: 'Sounds of the Zoo', subject: 'animals', type: 'audio', learningMode: LearningMode.AUDIO, content: { url: 'https://example.com/zoo-sounds.mp3' } },
    { title: 'Shapes all around us', subject: 'shapes', type: 'video', learningMode: LearningMode.VISUAL, content: { videoUrl: 'https://example.com/shapes.mp4' } },
    { title: 'Colors of the Rainbow', subject: 'colors', type: 'interactive', learningMode: LearningMode.VISUAL, content: { gameId: 'rainbow_game_123' } },
    { title: 'Solar System Exploration', subject: 'science', type: 'ar', learningMode: LearningMode.AR, content: { arModelUrl: 'https://example.com/solar-system.glb' } }
  ];

  for (const m of materials) {
    await prisma.learningMaterial.create({
      data: {
        title: m.title,
        subject: m.subject,
        type: m.type,
        learningMode: m.learningMode,
        content: m.content
      }
    });
  }

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
