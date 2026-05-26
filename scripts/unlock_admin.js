
require('dotenv').config({ path: '../.env' }); // Load env from parent directory
const { User } = require('../src/models');

async function unlockAdmin() {
    try {
        const email = 'admin@sms.local';
        console.log(`Searching for user: ${email}...`);

        const user = await User.findOne({ where: { email } });

        if (!user) {
            console.error('User not found!');
            process.exit(1);
        }

        console.log(`User found. Current status: locked_until=${user.locked_until}, failed_login_attempts=${user.failed_login_attempts}`);

        await user.update({
            locked_until: null,
            failed_login_attempts: 0
        });

        console.log('✅ User account unlocked successfully!');
        console.log('You can now login with:');
        console.log(`Email: ${email}`);
        console.log('Password: admin123');

    } catch (error) {
        console.error('Error unlocking user:', error);
    } finally {
        process.exit();
    }
}

unlockAdmin();
