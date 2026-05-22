const bcrypt = require('bcryptjs');
const express = require('express');
const prisma = require('../prisma');
const { publicUser, signToken } = require('../auth');

const router = express.Router();

router.post('/register', async (req, res, next) => {
  try {
    const { username, email, password, name, phone, major } = req.body;

    if (!username || !email || !password || !name) {
      return res.status(400).json({ error: 'Username, email, name, and password are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Username or email is already in use.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        name,
        phone: phone || null,
        major: major || null
      }
    });

    return res.status(201).json({
      user: publicUser(user),
      token: signToken(user)
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;

    if (!passwordMatches) {
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    }

    return res.json({
      user: publicUser(user),
      token: signToken(user)
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
