const bcrypt = require('bcryptjs');
const User = require('../models/User');

const ensureAdminUser = async () => {
  const adminEmail = process.env.ADMIN_EMAIL || 'ADMIN';
  const adminName = process.env.ADMIN_NAME || 'ADMIN';
  const adminPassword = process.env.ADMIN_PASSWORD || 'ADMIN1234';

  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  const existingUser = await User.findOne({ email: adminEmail });

  if (existingUser) {
    existingUser.name = adminName;
    existingUser.password = hashedPassword;
    existingUser.role = 'admin';
    await existingUser.save();
    console.log(`Admin user updated: ${adminEmail}`);
    return;
  }

  await User.create({
    email: adminEmail,
    name: adminName,
    password: hashedPassword,
    role: 'admin',
  });

  console.log(`Admin user created: ${adminEmail}`);
};

module.exports = ensureAdminUser;
