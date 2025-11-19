const User = require('../models/User');
const { getLoginViewData } = require('./viewController');

const buildFormData = (name, email) => ({
  name: name || '',
  email: email || ''
});

const handleLogin = async (req, res) => {
  const name = req.body?.name?.trim();
  const email = req.body?.email?.trim()?.toLowerCase();
  const password = req.body?.password?.trim();
  const formData = buildFormData(name, email);

  if (!name || !email || !password) {
    return res.status(400).render(
      'pages/login',
      getLoginViewData({
        error: 'Please complete all fields before continuing.',
        formData
      })
    );
  }

  if (password.length < 6) {
    return res.status(400).render(
      'pages/login',
      getLoginViewData({
        error: 'Passwords need to be at least 6 characters long.',
        formData
      })
    );
  }

  try {
    await User.findOneAndUpdate(
      { email },
      { name, password },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );

    return res.redirect('/index');
  } catch (error) {
    const isDuplicate = error.code === 11000;
    const isValidationError = error.name === 'ValidationError';
    let errorMessage = 'Unable to save your information right now. Please try again.';

    if (isDuplicate) {
      errorMessage = 'That email is already registered. Please use another or continue with the existing one.';
    } else if (isValidationError) {
      const firstError = Object.values(error.errors || {})[0];
      errorMessage = firstError?.message || 'Please double-check your details and try again.';
    }

    const status = isDuplicate || isValidationError ? 400 : 500;

    return res.status(status).render(
      'pages/login',
      getLoginViewData({
        error: errorMessage,
        formData
      })
    );
  }
};

const handleLoginNew = async (req, res) => {
  const name = req.body?.name?.trim();
  const email = req.body?.email?.trim()?.toLowerCase();
  const password = req.body?.password?.trim();
  const authType = req.body?.authType || 'login';

  const formData = { name, email, authType };

  // Validation
  if (!email || !password) {
    return res.status(400).render('pages/login-new', getLoginViewData({
      error: 'Please provide both email and password.',
      formData
    }));
  }

  if (authType === 'signup' && !name) {
    return res.status(400).render('pages/login-new', getLoginViewData({
      error: 'Please provide your full name for sign up.',
      formData
    }));
  }

  if (password.length < 6) {
    return res.status(400).render('pages/login-new', getLoginViewData({
      error: 'Password must be at least 6 characters long.',
      formData
    }));
  }

  try {
    const user = await User.findOne({ email });

    if (authType === 'login') {
      // LOGIN LOGIC
      if (!user) {
        return res.status(400).render('pages/login-new', getLoginViewData({
          error: 'No account found with this email. Please sign up.',
          formData
        }));
      }

      // Simple password check (In production, use bcrypt.compare)
      // Since the original code stored plain text or didn't specify hashing, we assume direct comparison for now
      // or we update the user if they are logging in? No, user requested "verify".
      // IMPORTANT: The previous implementation was "upsert" (create or update).
      // Now we must verify.

      if (user.password !== password) {
        return res.status(401).render('pages/login-new', getLoginViewData({
          error: 'Incorrect password.',
          formData
        }));
      }

      // Login successful
      return res.redirect('/index');

    } else {
      // SIGNUP LOGIC
      if (user) {
        return res.status(400).render('pages/login-new', getLoginViewData({
          error: 'Account already exists. Please sign in.',
          formData
        }));
      }

      // Create new user
      await User.create({
        name,
        email,
        password // In a real app, hash this!
      });

      return res.redirect('/index');
    }

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).render('pages/login-new', getLoginViewData({
      error: 'An unexpected error occurred. Please try again.',
      formData
    }));
  }
};

module.exports = {
  handleLogin,
  handleLoginNew
};
