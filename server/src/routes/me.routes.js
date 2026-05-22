const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../prisma');
const { publicUser, requireAuth } = require('../auth');

const router = express.Router();

function bookResponse(book) {
  return {
    id: book.id,
    isbn: book.isbn,
    title: book.title,
    author: book.author,
    subject: book.subject,
    description: book.description,
    originalPrice: book.originalPrice,
    askingPrice: book.askingPrice,
    imageUrl: book.imageUrl,
    status: book.status,
    owner: publicUser(book.owner),
    interestCount: book._count ? book._count.interests : undefined
  };
}

router.use(requireAuth);

router.get('/profile', (req, res) => {
  return res.json(publicUser(req.user));
});

router.patch('/profile', async (req, res, next) => {
  try {
    const { name, phone, major, password } = req.body;
    const data = {};

    if (name !== undefined) {
      data.name = name;
    }

    if (phone !== undefined) {
      data.phone = phone || null;
    }

    if (major !== undefined) {
      data.major = major || null;
    }

    if (password !== undefined) {
      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters.' });
      }

      data.passwordHash = await bcrypt.hash(password, 12);
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data
    });

    return res.json(publicUser(user));
  } catch (error) {
    return next(error);
  }
});

router.get('/books', async (req, res, next) => {
  try {
    const books = await prisma.book.findMany({
      where: { ownerId: req.user.id },
      include: {
        owner: true,
        _count: {
          select: { interests: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json(books.map(bookResponse));
  } catch (error) {
    return next(error);
  }
});

router.get('/interests', async (req, res, next) => {
  try {
    const interests = await prisma.interest.findMany({
      where: { userId: req.user.id },
      include: {
        book: {
          include: {
            owner: true,
            _count: {
              select: { interests: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json(interests.map((interest) => bookResponse(interest.book)));
  } catch (error) {
    return next(error);
  }
});

router.get('/notifications', async (req, res, next) => {
  try {
    const interests = await prisma.interest.findMany({
      where: {
        book: {
          ownerId: req.user.id
        }
      },
      include: {
        user: true,
        book: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json(interests.map((interest) => ({
      id: interest.id,
      createdAt: interest.createdAt,
      user: publicUser(interest.user),
      book: {
        id: interest.book.id,
        title: interest.book.title,
        isbn: interest.book.isbn
      }
    })));
  } catch (error) {
    return next(error);
  }
});

router.post('/notifications/read', async (req, res, next) => {
  try {
    const count = await prisma.interest.count({
      where: {
        book: {
          ownerId: req.user.id
        }
      }
    });

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { interestedCount: count }
    });

    return res.json(publicUser(user));
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
