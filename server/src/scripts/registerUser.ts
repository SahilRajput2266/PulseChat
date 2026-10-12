import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { User } from '../models/User';
import { logger } from '../utils/logger';

async function register() {
  const email = (process.argv[2] || 'user@gmail.com').toLowerCase();
  const password = process.argv[3] || 'user1234';
  const name = process.argv[4] || 'User';

  console.log(`\n========================================`);
  console.log(`Registering account: ${email}`);
  console.log(`========================================\n`);

  try {
    await connectDatabase();

    let user = await User.findOne({ email });
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    if (user) {
      console.log(`ℹ️ User ${email} already exists. Updating password...`);
      user.passwordHash = passwordHash;
      user.isVerified = true;
      await user.save();
      console.log(`✅ Password successfully updated for: ${email}`);
    } else {
      user = await User.create({
        name,
        email,
        passwordHash,
        role: 'user',
        isVerified: true,
        themePreference: 'dark'
      });
      console.log(`✅ Successfully registered new user:`);
      console.log(`   ID:    ${user._id}`);
      console.log(`   Name:  ${user.name}`);
      console.log(`   Email: ${user.email}`);
    }

    console.log(`\nCredentials:`);
    console.log(`   Email:    ${email}`);
    console.log(`   Password: ${password}\n`);

    await disconnectDatabase();
    process.exit(0);
  } catch (err) {
    console.error('❌ Registration failed:', err);
    process.exit(1);
  }
}

register();
