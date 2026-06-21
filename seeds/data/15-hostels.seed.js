/**
 * Seed: Hostel Buildings & Rooms
 * Creates hostel buildings with rooms for each school.
 */
const { HostelBuilding, HostelRoom, School } = require('../../src/models');

const BUILDINGS = [
  {
    building_name: 'Boys Hostel - Block A',
    building_type: 'male',
    is_active: true,
    rooms: [
      { room_number: 'BA-101', capacity: 4, occupied_beds: 2, monthly_rent: 5000, status: 'available' },
      { room_number: 'BA-102', capacity: 4, occupied_beds: 4, monthly_rent: 5000, status: 'full' },
      { room_number: 'BA-103', capacity: 2, occupied_beds: 1, monthly_rent: 7000, status: 'available' },
      { room_number: 'BA-104', capacity: 4, occupied_beds: 3, monthly_rent: 5000, status: 'available' },
      { room_number: 'BA-201', capacity: 4, occupied_beds: 0, monthly_rent: 5500, status: 'available' },
      { room_number: 'BA-202', capacity: 2, occupied_beds: 0, monthly_rent: 7500, status: 'maintenance' },
    ]
  },
  {
    building_name: 'Girls Hostel - Block B',
    building_type: 'female',
    is_active: true,
    rooms: [
      { room_number: 'BB-101', capacity: 4, occupied_beds: 3, monthly_rent: 5000, status: 'available' },
      { room_number: 'BB-102', capacity: 4, occupied_beds: 4, monthly_rent: 5000, status: 'full' },
      { room_number: 'BB-103', capacity: 2, occupied_beds: 0, monthly_rent: 7000, status: 'available' },
      { room_number: 'BB-104', capacity: 4, occupied_beds: 2, monthly_rent: 5000, status: 'available' },
      { room_number: 'BB-201', capacity: 2, occupied_beds: 1, monthly_rent: 7500, status: 'available' },
    ]
  },
  {
    building_name: 'Co-Ed Hostel - Block C',
    building_type: 'co_ed',
    is_active: true,
    rooms: [
      { room_number: 'BC-101', capacity: 2, occupied_beds: 2, monthly_rent: 8000, status: 'full' },
      { room_number: 'BC-102', capacity: 2, occupied_beds: 0, monthly_rent: 8000, status: 'available' },
      { room_number: 'BC-103', capacity: 1, occupied_beds: 0, monthly_rent: 10000, status: 'available' },
      { room_number: 'BC-104', capacity: 1, occupied_beds: 1, monthly_rent: 10000, status: 'full' },
    ]
  },
];

async function seed() {
  const schools = await School.findAll();
  let buildingCount = 0;
  let roomCount = 0;

  for (const school of schools) {
    for (const buildingData of BUILDINGS) {
      const { rooms, ...buildingFields } = buildingData;

      const [building] = await HostelBuilding.findOrCreate({
        where: {
          school_id: school.id,
          building_name: buildingFields.building_name,
        },
        defaults: {
          ...buildingFields,
          school_id: school.id,
        }
      });
      buildingCount++;

      for (const roomData of rooms) {
        await HostelRoom.findOrCreate({
          where: {
            building_id: building.id,
            room_number: roomData.room_number,
          },
          defaults: {
            ...roomData,
            building_id: building.id,
          }
        });
        roomCount++;
      }
    }
  }

  console.log(`   Seeded ${buildingCount} hostel buildings with ${roomCount} rooms`);
}

module.exports = seed;
