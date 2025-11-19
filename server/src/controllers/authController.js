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

module.exports = {
  handleLogin
};
