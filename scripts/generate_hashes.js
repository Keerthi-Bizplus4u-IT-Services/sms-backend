const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const users = [
    { email: 'admin@sms.local', password: 'admin123' },
    { email: 'student@sms.local', password: 'student123' },
    { email: 'parent@sms.local', password: 'parent123' },
    { email: 'teacher@sms.local', password: 'teacher123' },
    { email: 'library@sms.local', password: 'library123' },
    { email: 'subjects@sms.local', password: 'subjects123' },
    { email: 'accounts@sms.local', password: 'accounts123' },
    { email: 'exam@sms.local', password: 'exam123' },
    { email: 'transport@sms.local', password: 'transport123' },
    { email: 'management@sms.local', password: 'management123' },
];

async function generateHashes() {
    console.log('Generating hashes...');
    const results = [];
    for (const user of users) {
        const hash = await bcrypt.hash(user.password, 10);
        results.push({ ...user, hash });
    }

    fs.writeFileSync(path.join(__dirname, 'hashes.json'), JSON.stringify(results, null, 2));
    console.log('Hashes saved to hashes.json');
}

generateHashes();
