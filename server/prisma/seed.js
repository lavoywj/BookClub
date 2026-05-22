const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  await prisma.interest.deleteMany();
  await prisma.book.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 12);

  const alice = await prisma.user.create({
    data: {
      username: 'alice',
      email: 'alice@example.edu',
      passwordHash,
      name: 'Alice Walker',
      major: 'Computer Science',
      phone: '555-0101'
    }
  });

  const ben = await prisma.user.create({
    data: {
      username: 'ben',
      email: 'ben@example.edu',
      passwordHash,
      name: 'Ben Carter',
      major: 'Business',
      phone: '555-0112'
    }
  });

  const maya = await prisma.user.create({
    data: {
      username: 'maya',
      email: 'maya@example.edu',
      passwordHash,
      name: 'Maya Singh',
      major: 'Biology',
      phone: '555-0123'
    }
  });

  await prisma.book.createMany({
    data: [
      {
        isbn: '9780134685991',
        title: 'Effective Java',
        author: 'Joshua Bloch',
        subject: 'Computer Science',
        description: 'A clean copy with light highlighting in two chapters.',
        originalPrice: 54.99,
        askingPrice: 30,
        imageUrl: 'https://covers.openlibrary.org/b/isbn/9780134685991-L.jpg',
        ownerId: alice.id
      },
      {
        isbn: '9780132350884',
        title: 'Clean Code',
        author: 'Robert C. Martin',
        subject: 'Software Engineering',
        description: 'Paperback edition used for a software engineering course.',
        originalPrice: 49.99,
        askingPrice: 25,
        imageUrl: 'https://covers.openlibrary.org/b/isbn/9780132350884-L.jpg',
        ownerId: ben.id
      },
      {
        isbn: '9780321834577',
        title: 'Campbell Biology',
        author: 'Lisa A. Urry',
        subject: 'Biology',
        description: 'Older edition, still useful for intro biology.',
        originalPrice: 199.99,
        askingPrice: 65,
        imageUrl: 'https://covers.openlibrary.org/b/isbn/9780321834577-L.jpg',
        ownerId: maya.id
      },
      {
        isbn: '9780131103627',
        title: 'The C Programming Language',
        author: 'Brian W. Kernighan and Dennis M. Ritchie',
        subject: 'Computer Science',
        description: 'Classic text, compact and in good shape.',
        originalPrice: 74.99,
        askingPrice: 35,
        imageUrl: 'https://covers.openlibrary.org/b/isbn/9780131103627-L.jpg',
        ownerId: alice.id
      }
    ]
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
