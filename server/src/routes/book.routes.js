const express = require('express');
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
    createdAt: book.createdAt,
    owner: publicUser(book.owner),
    interestCount: book._count ? book._count.interests : undefined
  };
}

function searchWhere(query) {
  const { type, value, q } = query;
  const searchValue = value || q;

  if (!searchValue) {
    return {};
  }

  const contains = { contains: searchValue };

  if (type === 'ISBN') {
    return { isbn: contains };
  }

  if (type === 'Title') {
    return { title: contains };
  }

  if (type === 'Author') {
    return { author: contains };
  }

  return {
    OR: [
      { isbn: contains },
      { title: contains },
      { author: contains },
      { subject: contains }
    ]
  };
}

router.get('/', async (req, res, next) => {
  try {
    const books = await prisma.book.findMany({
      where: searchWhere(req.query),
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

router.get('/:id', async (req, res, next) => {
  try {
    const book = await prisma.book.findUnique({
      where: { id: req.params.id },
      include: {
        owner: true,
        _count: {
          select: { interests: true }
        }
      }
    });

    if (!book) {
      return res.status(404).json({ error: 'Book not found.' });
    }

    return res.json(bookResponse(book));
  } catch (error) {
    return next(error);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { isbn, title, author, subject, description, originalPrice, askingPrice, imageUrl } = req.body;

    if (!isbn || !title || !author) {
      return res.status(400).json({ error: 'ISBN, title, and author are required.' });
    }

    const book = await prisma.book.create({
      data: {
        isbn,
        title,
        author,
        subject: subject || null,
        description: description || null,
        originalPrice: originalPrice === undefined || originalPrice === '' ? null : originalPrice,
        askingPrice: askingPrice === undefined || askingPrice === '' ? null : askingPrice,
        imageUrl: imageUrl || null,
        ownerId: req.user.id
      },
      include: {
        owner: true,
        _count: {
          select: { interests: true }
        }
      }
    });

    return res.status(201).json(bookResponse(book));
  } catch (error) {
    return next(error);
  }
});

router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const existingBook = await prisma.book.findUnique({ where: { id: req.params.id } });

    if (!existingBook) {
      return res.status(404).json({ error: 'Book not found.' });
    }

    if (existingBook.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Only the owner can edit this book.' });
    }

    const { isbn, title, author, subject, description, originalPrice, askingPrice, imageUrl, status } = req.body;
    const book = await prisma.book.update({
      where: { id: req.params.id },
      data: {
        isbn,
        title,
        author,
        subject,
        description,
        originalPrice,
        askingPrice,
        imageUrl,
        status
      },
      include: {
        owner: true,
        _count: {
          select: { interests: true }
        }
      }
    });

    return res.json(bookResponse(book));
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const existingBook = await prisma.book.findUnique({ where: { id: req.params.id } });

    if (!existingBook) {
      return res.status(404).json({ error: 'Book not found.' });
    }

    if (existingBook.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Only the owner can delete this book.' });
    }

    await prisma.book.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/interests', requireAuth, async (req, res, next) => {
  try {
    const book = await prisma.book.findUnique({
      where: { id: req.params.id },
      include: { owner: true }
    });

    if (!book) {
      return res.status(404).json({ error: 'Book not found.' });
    }

    if (book.ownerId === req.user.id) {
      return res.status(400).json({ error: 'You cannot mark your own book as interesting.' });
    }

    await prisma.interest.upsert({
      where: {
        userId_bookId: {
          userId: req.user.id,
          bookId: book.id
        }
      },
      update: {},
      create: {
        userId: req.user.id,
        bookId: book.id
      }
    });

    return res.status(201).json({
      book: bookResponse(book),
      owner: publicUser(book.owner)
    });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id/interests', requireAuth, async (req, res, next) => {
  try {
    await prisma.interest.delete({
      where: {
        userId_bookId: {
          userId: req.user.id,
          bookId: req.params.id
        }
      }
    });

    return res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Interested book entry not found.' });
    }

    return next(error);
  }
});

module.exports = router;
