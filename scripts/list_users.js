
require('dotenv').config({ path: '../.env' });
const { User, Role } = require('../src/models');

async function listUsers() {
    try {
        const users = await User.findAll({
            include: [
                {
                    model: Role,
                    as: 'role',
                    attributes: ['name']
                }
            ],
            attributes: ['email', 'password_hash'],
            raw: true,
            nest: true
        });

        console.log('\n--- All Users ---');
        users.forEach(user => {
            console.log(`Role: ${user.role.name.padEnd(10)} | Email: ${user.email}`);
            // Only verifying known passwords, not printing hashes for security (and uselessness)
            // I can add a check if hash matches 'admin123' or '123456' common defaults if I wanted, but for now just listing emails is good.
        });
        console.log('-----------------\n');

    } catch (error) {
        console.error('Error fetching users:', error);
    } finally {
        process.exit();
    }
}

listUsers();
