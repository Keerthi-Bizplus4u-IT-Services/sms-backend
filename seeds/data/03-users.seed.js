/**
 * Seed: Users & Persons
 * Creates user accounts for every role, each with a linked Person record.
 * All passwords: "Password@123" (bcrypt-hashed by the User model hook)
 */
const { sequelize, User, Person, School, Role } = require('../../src/models');

const DEFAULT_PASSWORD = 'Password@123';
const BASELINE_ROLES_PER_SCHOOL = ['admin', 'teacher', 'student'];

const USERS = [
  // Super Admin (no school)
  {
    email: 'superadmin@sms.local',
    roleName: 'super_admin',
    schoolCode: null,
    person: {
      first_name: 'Super', last_name: 'Admin', gender: 'male',
      date_of_birth: '1985-03-15', phone: '9000000001',
      address_line1: '1 Admin Street', city: 'Hyderabad', state: 'Telangana', country: 'India'
    }
  },
  // School 1 - Admin
  {
    email: 'admin@springfield.sms.local',
    roleName: 'admin',
    schoolCode: 'SMS-001',
    person: {
      first_name: 'Rajesh', last_name: 'Kumar', gender: 'male',
      date_of_birth: '1980-07-20', phone: '9000000002', blood_group: 'B+',
      address_line1: '12 MG Road', city: 'Bangalore', state: 'Karnataka', country: 'India'
    }
  },
  // School 1 - Teachers
  {
    email: 'anita.sharma@springfield.sms.local',
    roleName: 'teacher',
    schoolCode: 'SMS-001',
    person: {
      first_name: 'Anita', last_name: 'Sharma', gender: 'female',
      date_of_birth: '1988-11-05', phone: '9000000010', blood_group: 'A+',
      address_line1: '45 Koramangala', city: 'Bangalore', state: 'Karnataka', country: 'India'
    }
  },
  {
    email: 'suresh.nair@springfield.sms.local',
    roleName: 'teacher',
    schoolCode: 'SMS-001',
    person: {
      first_name: 'Suresh', last_name: 'Nair', gender: 'male',
      date_of_birth: '1985-04-18', phone: '9000000011', blood_group: 'O+',
      address_line1: '78 Indiranagar', city: 'Bangalore', state: 'Karnataka', country: 'India'
    }
  },
  {
    email: 'priya.menon@springfield.sms.local',
    roleName: 'teacher',
    schoolCode: 'SMS-001',
    person: {
      first_name: 'Priya', last_name: 'Menon', gender: 'female',
      date_of_birth: '1990-08-22', phone: '9000000012', blood_group: 'B-',
      address_line1: '33 Jayanagar', city: 'Bangalore', state: 'Karnataka', country: 'India'
    }
  },
  // School 1 - Students
  {
    email: 'arjun.patel@springfield.sms.local',
    roleName: 'student',
    schoolCode: 'SMS-001',
    person: {
      first_name: 'Arjun', last_name: 'Patel', gender: 'male',
      date_of_birth: '2012-05-14', phone: '9000000020', blood_group: 'A+',
      address_line1: '5 Brigade Road', city: 'Bangalore', state: 'Karnataka', country: 'India'
    }
  },
  {
    email: 'meera.reddy@springfield.sms.local',
    roleName: 'student',
    schoolCode: 'SMS-001',
    person: {
      first_name: 'Meera', last_name: 'Reddy', gender: 'female',
      date_of_birth: '2011-09-30', phone: '9000000021', blood_group: 'O-',
      address_line1: '17 Whitefield', city: 'Bangalore', state: 'Karnataka', country: 'India'
    }
  },
  {
    email: 'rohit.singh@springfield.sms.local',
    roleName: 'student',
    schoolCode: 'SMS-001',
    person: {
      first_name: 'Rohit', last_name: 'Singh', gender: 'male',
      date_of_birth: '2012-01-22', phone: '9000000022', blood_group: 'AB+',
      address_line1: '8 Electronic City', city: 'Bangalore', state: 'Karnataka', country: 'India'
    }
  },
  {
    email: 'kavya.iyer@springfield.sms.local',
    roleName: 'student',
    schoolCode: 'SMS-001',
    person: {
      first_name: 'Kavya', last_name: 'Iyer', gender: 'female',
      date_of_birth: '2013-03-10', phone: '9000000023', blood_group: 'B+',
      address_line1: '22 Yelahanka', city: 'Bangalore', state: 'Karnataka', country: 'India'
    }
  },
  {
    email: 'dev.kulkarni@springfield.sms.local',
    roleName: 'student',
    schoolCode: 'SMS-001',
    person: {
      first_name: 'Dev', last_name: 'Kulkarni', gender: 'male',
      date_of_birth: '2011-07-18', phone: '9000000024', blood_group: 'A-',
      address_line1: '14 HSR Layout', city: 'Bangalore', state: 'Karnataka', country: 'India'
    }
  },
  // School 1 - Parents
  {
    email: 'vikram.patel@springfield.sms.local',
    roleName: 'parent',
    schoolCode: 'SMS-001',
    person: {
      first_name: 'Vikram', last_name: 'Patel', gender: 'male',
      date_of_birth: '1978-12-01', phone: '9000000030', blood_group: 'A+',
      address_line1: '5 Brigade Road', city: 'Bangalore', state: 'Karnataka', country: 'India'
    }
  },
  {
    email: 'lakshmi.reddy@springfield.sms.local',
    roleName: 'parent',
    schoolCode: 'SMS-001',
    person: {
      first_name: 'Lakshmi', last_name: 'Reddy', gender: 'female',
      date_of_birth: '1982-06-15', phone: '9000000031', blood_group: 'O-',
      address_line1: '17 Whitefield', city: 'Bangalore', state: 'Karnataka', country: 'India'
    }
  },
  {
    email: 'ravi.singh@springfield.sms.local',
    roleName: 'parent',
    schoolCode: 'SMS-001',
    person: {
      first_name: 'Ravi', last_name: 'Singh', gender: 'male',
      date_of_birth: '1975-10-28', phone: '9000000032', blood_group: 'AB+',
      address_line1: '8 Electronic City', city: 'Bangalore', state: 'Karnataka', country: 'India'
    }
  },
  // School 1 - Accounts
  {
    email: 'accounts@springfield.sms.local',
    roleName: 'accounts',
    schoolCode: 'SMS-001',
    person: {
      first_name: 'Deepa', last_name: 'Rao', gender: 'female',
      date_of_birth: '1987-02-14', phone: '9000000040',
      address_line1: '90 JP Nagar', city: 'Bangalore', state: 'Karnataka', country: 'India'
    }
  },
  // School 1 - Library
  {
    email: 'library@springfield.sms.local',
    roleName: 'library',
    schoolCode: 'SMS-001',
    person: {
      first_name: 'Ganesh', last_name: 'Hegde', gender: 'male',
      date_of_birth: '1983-09-20', phone: '9000000041',
      address_line1: '32 Malleshwaram', city: 'Bangalore', state: 'Karnataka', country: 'India'
    }
  },
  // School 1 - Management
  {
    email: 'management@springfield.sms.local',
    roleName: 'management',
    schoolCode: 'SMS-001',
    person: {
      first_name: 'Sunita', last_name: 'Deshpande', gender: 'female',
      date_of_birth: '1976-05-10', phone: '9000000042',
      address_line1: '7 Sadashivanagar', city: 'Bangalore', state: 'Karnataka', country: 'India'
    }
  },
  // School 1 - Transport
  {
    email: 'transport@springfield.sms.local',
    roleName: 'transport',
    schoolCode: 'SMS-001',
    person: {
      first_name: 'Manoj', last_name: 'Gowda', gender: 'male',
      date_of_birth: '1989-04-25', phone: '9000000043',
      address_line1: '66 Rajajinagar', city: 'Bangalore', state: 'Karnataka', country: 'India'
    }
  },
  // School 1 - Principal
  {
    email: 'principal@springfield.sms.local',
    roleName: 'principal',
    schoolCode: 'SMS-001',
    person: {
      first_name: 'Venkatesh', last_name: 'Murthy', gender: 'male',
      date_of_birth: '1972-08-05', phone: '9000000044',
      address_line1: '11 Basavanagudi', city: 'Bangalore', state: 'Karnataka', country: 'India'
    }
  },
  // School 1 - Exam Incharge
  {
    email: 'exam.incharge@springfield.sms.local',
    roleName: 'exam_incharge',
    schoolCode: 'SMS-001',
    person: {
      first_name: 'Kavitha', last_name: 'Srinivasan', gender: 'female',
      date_of_birth: '1986-03-18', phone: '9000000045',
      address_line1: '29 BTM Layout', city: 'Bangalore', state: 'Karnataka', country: 'India'
    }
  },
  // School 1 - Curriculum Incharge
  {
    email: 'curriculum.incharge@springfield.sms.local',
    roleName: 'curriculum_incharge',
    schoolCode: 'SMS-001',
    person: {
      first_name: 'Ramesh', last_name: 'Babu', gender: 'male',
      date_of_birth: '1984-11-12', phone: '9000000046',
      address_line1: '53 Vijayanagar', city: 'Bangalore', state: 'Karnataka', country: 'India'
    }
  },
  // School 2 - Admin
  {
    email: 'admin@oakridge.sms.local',
    roleName: 'admin',
    schoolCode: 'SMS-002',
    person: {
      first_name: 'Sanjay', last_name: 'Gupta', gender: 'male',
      date_of_birth: '1979-08-12', phone: '9000000050',
      address_line1: '15 Park Street', city: 'Hyderabad', state: 'Telangana', country: 'India'
    }
  },
  // School 2 - Teacher
  {
    email: 'neha.joshi@oakridge.sms.local',
    roleName: 'teacher',
    schoolCode: 'SMS-002',
    person: {
      first_name: 'Neha', last_name: 'Joshi', gender: 'female',
      date_of_birth: '1991-01-30', phone: '9000000051', blood_group: 'A+',
      address_line1: '28 Banjara Hills', city: 'Hyderabad', state: 'Telangana', country: 'India'
    }
  },
  // School 2 - Student
  {
    email: 'aarav.mehta@oakridge.sms.local',
    roleName: 'student',
    schoolCode: 'SMS-002',
    person: {
      first_name: 'Aarav', last_name: 'Mehta', gender: 'male',
      date_of_birth: '2012-11-08', phone: '9000000060', blood_group: 'B+',
      address_line1: '3 Jubilee Hills', city: 'Hyderabad', state: 'Telangana', country: 'India'
    }
  },
  // School 2 - Parent
  {
    email: 'amit.mehta@oakridge.sms.local',
    roleName: 'parent',
    schoolCode: 'SMS-002',
    person: {
      first_name: 'Amit', last_name: 'Mehta', gender: 'male',
      date_of_birth: '1980-04-20', phone: '9000000061', blood_group: 'B+',
      address_line1: '3 Jubilee Hills', city: 'Hyderabad', state: 'Telangana', country: 'India'
    }
  },
];

const slugify = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const toTitleCase = (value) => String(value || '')
  .split(/[_\s-]+/)
  .filter(Boolean)
  .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
  .join(' ');

async function ensureBaselineUsersForAllSchools() {
  const [schools, roles] = await Promise.all([
    School.findAll({ attributes: ['id', 'code', 'name'] }),
    Role.findAll()
  ]);

  const roleByName = new Map(
    roles.map((role) => [String(role.name || '').toLowerCase(), role])
  );

  let created = 0;

  for (const school of schools) {
    const schoolSlug = slugify(school.code || school.name || school.id);

    for (const roleName of BASELINE_ROLES_PER_SCHOOL) {
      const role = roleByName.get(roleName);
      if (!role) {
        continue;
      }

      const existing = await User.findOne({
        where: {
          school_id: school.id,
          role_id: role.id
        }
      });

      if (existing) {
        continue;
      }

      const email = `seed.${roleName}.${schoolSlug}@sms.local`;
      const firstName = toTitleCase(roleName);

      const [user] = await User.findOrCreate({
        where: { email },
        defaults: {
          email,
          password_hash: DEFAULT_PASSWORD,
          role_id: role.id,
          school_id: school.id,
          is_active: true,
        }
      });

      await Person.findOrCreate({
        where: { user_id: user.id },
        defaults: {
          user_id: user.id,
          first_name: firstName,
          last_name: `Seed ${school.code || school.id}`,
          gender: roleName === 'teacher' ? 'female' : 'male',
          date_of_birth: roleName === 'student' ? '2012-01-15' : '1986-01-15',
          phone: null,
          city: null,
          state: null,
          country: 'India'
        }
      });

      created += 1;
    }
  }

  return created;
}

async function seed() {
  let seededUsers = 0;

  for (const userData of USERS) {
    const { email, roleName, schoolCode, person: personData } = userData;

    // Resolve role
    const role = await Role.findOne({
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('name')),
        roleName.toLowerCase()
      )
    });
    if (!role) {
      console.warn(`   Role '${roleName}' not found, skipping user: ${email}`);
      continue;
    }

    // Resolve school (null for super_admin)
    let schoolId = null;
    if (schoolCode) {
      const school = await School.findOne({ where: { code: schoolCode } });
      if (school) schoolId = school.id;
    }

    // Create user
    const [user] = await User.findOrCreate({
      where: { email },
      defaults: {
        email,
        password_hash: DEFAULT_PASSWORD,
        role_id: role.id,
        school_id: schoolId,
        is_active: true,
      }
    });

    // Create person linked to user
    await Person.findOrCreate({
      where: { user_id: user.id },
      defaults: {
        ...personData,
        user_id: user.id,
      }
    });

    seededUsers += 1;
  }

  const baselineCreated = await ensureBaselineUsersForAllSchools();
  console.log(`   Seeded ${seededUsers} users with person profiles`);
  console.log(`   Backfilled ${baselineCreated} baseline school users (admin, teacher, student)`);
}

module.exports = seed;
