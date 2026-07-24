import { PrismaClient, LearningMode, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data - children first, in FK-safe order
  await prisma.tutorial.deleteMany();
  await prisma.syllabusDocument.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.classroomJoinRequest.deleteMany();
  await prisma.enrolment.deleteMany();
  await prisma.admissionCriteria.deleteMany();
  await prisma.classroom.deleteMany();
  await prisma.assessmentAttempt.deleteMany();
  await prisma.studentProgress.deleteMany();
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

  // Demo teacher, pre-approved
  const teacherPassword = await bcrypt.hash('Teacher@1234', 12);
  const demoTeacher = await prisma.user.create({
    data: {
      name: 'Ms. Sharma',
      email: 'teacher@neurolearn.com',
      password: teacherPassword,
      role: Role.TEACHER,
      teacherStatus: 'APPROVED'
    }
  });

  // A second, still-pending teacher
  const pendingPassword = await bcrypt.hash('Teacher@1234', 12);
  await prisma.user.create({
    data: {
      name: 'Mr. Gurung',
      email: 'pending.teacher@neurolearn.com',
      password: pendingPassword,
      role: Role.TEACHER,
      teacherStatus: 'PENDING'
    }
  });

  const demoClassroom = await prisma.classroom.create({
    data: {
      name: 'Adaptive Learners - Grade 3',
      description: 'A classroom tuned for visual and audio learners who benefit from shorter, high-feedback sessions. Focuses on foundational skills in Nepal.',
      teacherId: demoTeacher.id,
      admissionCriteria: {
        create: {
          minAttentionSpanScore: 0,
          preferredModes: JSON.stringify(['VISUAL', 'AUDIO'])
        }
      }
    }
  });

  const mathSubject = await prisma.subject.create({
    data: { classroomId: demoClassroom.id, name: 'Mathematics' }
  });
  const scienceSubject = await prisma.subject.create({
    data: { classroomId: demoClassroom.id, name: 'Basic Science & Environment' }
  });
  const nepalHistorySubject = await prisma.subject.create({
    data: { classroomId: demoClassroom.id, name: 'Our Community (Nepal)' }
  });

  await prisma.unit.createMany({
    data: [
      { subjectId: mathSubject.id, title: 'Unit 1 - Numbers and Counting', order: 1 },
      { subjectId: mathSubject.id, title: 'Unit 2 - Shapes and Patterns', order: 2 },
      { subjectId: scienceSubject.id, title: 'Unit 1 - Living and Non-living Things', order: 1 },
      { subjectId: scienceSubject.id, title: 'Unit 2 - Our Environment in Nepal', order: 2 },
      { subjectId: nepalHistorySubject.id, title: 'Unit 1 - Festivals of Nepal', order: 1 },
      { subjectId: nepalHistorySubject.id, title: 'Unit 2 - Geography of Nepal', order: 2 }
    ]
  });

  // A second, pre-approved teacher with a stricter classroom
  const secondTeacherPassword = await bcrypt.hash('Teacher@1234', 12);
  const secondTeacher = await prisma.user.create({
    data: {
      name: 'Mr. Thapa',
      email: 'teacher2@neurolearn.com',
      password: secondTeacherPassword,
      role: Role.TEACHER,
      teacherStatus: 'APPROVED'
    }
  });
  await prisma.classroom.create({
    data: {
      name: 'Focused Readers - Advanced Track',
      description: 'A faster-paced, text-first classroom for students who read attentively and are already scoring well. Specialized in English and Social Studies.',
      teacherId: secondTeacher.id,
      admissionCriteria: {
        create: {
          minAttentionSpanScore: 60,
          minScorePercent: 70,
          preferredModes: JSON.stringify(['TEXT'])
        }
      }
    }
  });

  // Seed Students
  const studentPassword = await bcrypt.hash('Student@1234', 12);
  await prisma.user.create({
    data: {
      name: 'Aarav Karki',
      email: 'aarav@student.com',
      password: studentPassword,
      role: Role.STUDENT,
      disabilityType: 'AUTISM',
      enrolments: {
        create: {
          classroomId: demoClassroom.id
        }
      }
    }
  });

  await prisma.user.create({
    data: {
      name: 'Sita Rai',
      email: 'sita@student.com',
      password: studentPassword,
      role: Role.STUDENT,
      disabilityType: 'DEAFNESS',
      enrolments: {
        create: {
          classroomId: demoClassroom.id
        }
      }
    }
  });

  // Comprehensive Seed Questions
  const questions = [
    // TEXT Mode - Math & Science
    { subject: 'math', question: 'What is 5 + 3?', options: ['6', '7', '8', '9'], answer: '8', learningMode: LearningMode.TEXT },
    { subject: 'math', question: 'What is 10 - 4?', options: ['4', '5', '6', '7'], answer: '6', learningMode: LearningMode.TEXT },
    { subject: 'math', question: 'If you have 15 apples and give 5 away, how many are left?', options: ['5', '10', '15', '20'], answer: '10', learningMode: LearningMode.TEXT },
    { subject: 'science', question: 'Which planet is known as the Red Planet?', options: ['Earth', 'Mars', 'Jupiter', 'Venus'], answer: 'Mars', learningMode: LearningMode.TEXT },
    { subject: 'science', question: 'What gas do plants absorb from the atmosphere?', options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Helium'], answer: 'Carbon Dioxide', learningMode: LearningMode.TEXT },
    { subject: 'animals', question: 'Which animal is known as the king of the jungle?', options: ['Tiger', 'Lion', 'Elephant', 'Bear'], answer: 'Lion', learningMode: LearningMode.TEXT },
    { subject: 'colors', question: 'What color do you get by mixing red and yellow?', options: ['Green', 'Orange', 'Purple', 'Brown'], answer: 'Orange', learningMode: LearningMode.TEXT },
    { subject: 'shapes', question: 'How many sides does a triangle have?', options: ['2', '3', '4', '5'], answer: '3', learningMode: LearningMode.TEXT },
    
    // TEXT Mode - Nepal Context
    { subject: 'nepal', question: 'What is the capital of Nepal?', options: ['Pokhara', 'Lalitpur', 'Kathmandu', 'Bhaktapur'], answer: 'Kathmandu', learningMode: LearningMode.TEXT },
    { subject: 'nepal', question: 'Which is the highest mountain in the world located in Nepal?', options: ['K2', 'Mount Everest', 'Makalu', 'Annapurna'], answer: 'Mount Everest', learningMode: LearningMode.TEXT },
    { subject: 'nepal', question: 'What is the national animal of Nepal?', options: ['Tiger', 'Cow', 'Elephant', 'Rhino'], answer: 'Cow', learningMode: LearningMode.TEXT },
    { subject: 'nepal', question: 'Which festival is known as the festival of lights in Nepal?', options: ['Dashain', 'Tihar', 'Holi', 'Teej'], answer: 'Tihar', learningMode: LearningMode.TEXT },

    // AUDIO Mode
    { subject: 'math', question: 'Listen and solve: If you have 2 apples and get 3 more, how many do you have?', options: ['4', '5', '6', '7'], answer: '5', learningMode: LearningMode.AUDIO, audioText: 'If you have two apples and get three more, how many do you have?' },
    { subject: 'animals', question: 'Which animal makes a "moo" sound?', options: ['Dog', 'Cat', 'Cow', 'Sheep'], answer: 'Cow', learningMode: LearningMode.AUDIO, audioText: 'Which animal makes a moo sound?' },
    { subject: 'colors', question: 'What is the color of the sky?', options: ['Green', 'Blue', 'Red', 'Yellow'], answer: 'Blue', learningMode: LearningMode.AUDIO, audioText: 'What is the color of the sky?' },
    { subject: 'nepal', question: 'Which instrument is known as a traditional Nepali drum?', options: ['Guitar', 'Madal', 'Piano', 'Flute'], answer: 'Madal', learningMode: LearningMode.AUDIO, audioText: 'Which instrument is known as a traditional Nepali drum?' },
    { subject: 'science', question: 'What gives us heat and light during the day?', options: ['Moon', 'Stars', 'Sun', 'Earth'], answer: 'Sun', learningMode: LearningMode.AUDIO, audioText: 'What gives us heat and light during the day?' },
    { subject: 'math', question: 'What is 6 minus 2?', options: ['2', '3', '4', '5'], answer: '4', learningMode: LearningMode.AUDIO, audioText: 'What is six minus two?' },
    { subject: 'nepal', question: 'What is the main language spoken in Nepal?', options: ['Hindi', 'Nepali', 'English', 'Newari'], answer: 'Nepali', learningMode: LearningMode.AUDIO, audioText: 'What is the main language spoken in Nepal?' },

    // VISUAL Mode
    { subject: 'animals', question: 'Identify this animal:', options: ['Lion', 'Elephant', 'Giraffe', 'Zebra'], answer: 'Elephant', learningMode: LearningMode.VISUAL, imageUrl: 'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46' },
    { subject: 'colors', question: 'What color is this apple?', options: ['Red', 'Green', 'Yellow', 'Blue'], answer: 'Red', learningMode: LearningMode.VISUAL, imageUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6fac6' },
    { subject: 'shapes', question: 'Identify this shape:', options: ['Square', 'Triangle', 'Circle', 'Star'], answer: 'Circle', learningMode: LearningMode.VISUAL, imageUrl: 'https://images.unsplash.com/photo-1517524285303-d6fc683dddf8' },
    { subject: 'nepal', question: 'Identify this famous monument in Kathmandu:', options: ['Swayambhunath', 'Pashupatinath', 'Boudhanath', 'Lumbini'], answer: 'Swayambhunath', learningMode: LearningMode.VISUAL, imageUrl: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa' },
    { subject: 'science', question: 'What planet is this?', options: ['Earth', 'Mars', 'Jupiter', 'Saturn'], answer: 'Earth', learningMode: LearningMode.VISUAL, imageUrl: 'https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4' },
    { subject: 'math', question: 'Count the items:', options: ['3', '4', '5', '6'], answer: '4', learningMode: LearningMode.VISUAL, imageUrl: 'https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3' },
    { subject: 'nepal', question: 'What are these colorful flags called?', options: ['Prayer Flags', 'National Flags', 'Festive Banners', 'Kites'], answer: 'Prayer Flags', learningMode: LearningMode.VISUAL, imageUrl: 'https://images.unsplash.com/photo-1553557202-698e47f9f30b' },
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

  // Seed Learning Materials (Comprehensive Set)
  const materials = [
    { title: 'Introduction to Numbers', subject: 'math', type: 'article', learningMode: LearningMode.TEXT, content: { text: 'Numbers are used to count things...' } },
    { title: 'Sounds of the Zoo', subject: 'animals', type: 'audio', learningMode: LearningMode.AUDIO, content: { url: 'https://example.com/zoo-sounds.mp3' } },
    { title: 'Shapes all around us', subject: 'shapes', type: 'video', learningMode: LearningMode.VISUAL, content: { videoUrl: 'https://example.com/shapes.mp4' } },
    { title: 'Colors of the Rainbow', subject: 'colors', type: 'interactive', learningMode: LearningMode.VISUAL, content: { gameId: 'rainbow_game_123' } },
    { title: 'Solar System Exploration', subject: 'science', type: 'ar', learningMode: LearningMode.AR, content: { arModelUrl: 'https://example.com/solar-system.glb' } },
    { title: 'History of Mount Everest', subject: 'nepal', type: 'article', learningMode: LearningMode.TEXT, content: { text: 'Mount Everest, known as Sagarmatha in Nepal, is the highest peak in the world...' } },
    { title: 'Nepali Traditional Music', subject: 'nepal', type: 'audio', learningMode: LearningMode.AUDIO, content: { url: 'https://example.com/nepali-music.mp3' } },
    { title: 'Festivals of Nepal', subject: 'nepal', type: 'video', learningMode: LearningMode.VISUAL, content: { videoUrl: 'https://example.com/nepal-festivals.mp4' } }
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
