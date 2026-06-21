
require('dotenv').config({ path: '../.env' });
const { User } = require('../src/models');
const bcrypt = require('bcrypt');

async function verifyPassword() {
    try {
        const email = 'admin@sms.local';
        const password = 'admin123';

        console.log(`Checking password for: ${email}`);
        const user = await User.findOne({ where: { email } });

        if (!user) {
            console.error('User not found!');
            return;
        }

        console.log(`Stored Hash: ${user.password_hash}`);

        const isValid = await bcrypt.compare(password, user.password_hash);

        if (isValid) {
            console.log('✅ Password matches!');
        } else {
            console.log('❌ Password DOES NOT match!');

            // Allow force reset
            console.log('Resetting password to "admin123"...');
            const newHash = await bcrypt.hash(password, 10);
            await user.update({ password_hash: newHash });
            console.log('✅ Password reset successful.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

verifyPassword();
