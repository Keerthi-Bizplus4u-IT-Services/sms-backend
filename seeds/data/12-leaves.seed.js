/**
 * Seed: Leave Policies & Leave Requests
 * Creates leave policies for each school and sample leave requests from teachers.
 */
const { sequelize, LeavePolicy, LeaveRequest, School, User, Role } = require('../../src/models');

async function seed() {
  const schools = await School.findAll();
  let policyCount = 0;
  let requestCount = 0;

  for (const school of schools) {
    // Create leave policies for 2025 and 2026
    for (const year of [2025, 2026]) {
      const [policy] = await LeavePolicy.findOrCreate({
        where: { school_id: school.id, year },
        defaults: {
          school_id: school.id,
          year,
          casual_leaves: 12,
          sick_leaves: 10,
          special_leaves: 5,
          is_active: year === 2026,
        }
      });
      policyCount++;

      // Create sample leave requests from teachers for the active year
      if (year === 2026) {
        const teacherRole = await Role.findOne({
          where: sequelize.where(
            sequelize.fn('LOWER', sequelize.col('name')),
            'teacher'
          )
        });

        const adminRole = await Role.findOne({
          where: sequelize.where(
            sequelize.fn('LOWER', sequelize.col('name')),
            'admin'
          )
        });

        if (!teacherRole) continue;

        const teachers = await User.findAll({
          where: { role_id: teacherRole.id, school_id: school.id },
          limit: 3
        });

        const admin = await User.findOne({
          where: { role_id: adminRole.id, school_id: school.id }
        });

        const leaveRequests = [
          {
            leave_type: 'casual',
            start_date: '2026-02-10',
            end_date: '2026-02-11',
            total_days: 2,
            reason: 'Personal work - family function',
            status: 'approved',
          },
          {
            leave_type: 'sick',
            start_date: '2026-03-05',
            end_date: '2026-03-07',
            total_days: 3,
            reason: 'Fever and cold, doctor advised rest',
            status: 'approved',
          },
          {
            leave_type: 'casual',
            start_date: '2026-03-25',
            end_date: '2026-03-25',
            total_days: 1,
            reason: 'Attending a wedding ceremony',
            status: 'pending',
          },
          {
            leave_type: 'special',
            start_date: '2026-04-10',
            end_date: '2026-04-12',
            total_days: 3,
            reason: 'Attending education conference',
            status: 'pending',
          },
        ];

        for (let i = 0; i < teachers.length && i < leaveRequests.length; i++) {
          const lr = leaveRequests[i];
          await LeaveRequest.findOrCreate({
            where: {
              user_id: teachers[i].id,
              policy_id: policy.id,
              start_date: lr.start_date,
            },
            defaults: {
              ...lr,
              school_id: school.id,
              user_id: teachers[i].id,
              policy_id: policy.id,
              approver_id: lr.status === 'approved' && admin ? admin.id : null,
              decided_at: lr.status === 'approved' ? new Date() : null,
              comments: lr.status === 'approved' ? 'Approved by admin' : null,
            }
          });
          requestCount++;
        }
      }
    }
  }

  console.log(`   Seeded ${policyCount} leave policies and ${requestCount} leave requests`);
}

module.exports = seed;
