const { sequelize, Sequelize } = require('../../../config/database');
const { QueryTypes } = Sequelize;

class UserRepository {
    /**
     * Get all users with their names and role types for messaging dropdown
     * Joins users -> persons -> roles to return {id, name, type}
     */
    async findAllForMessaging() {
        const rows = await sequelize.query(
            `SELECT 
                u.id,
                CONCAT(p.first_name, ' ', p.last_name) AS name,
                r.name AS type
            FROM users u
            INNER JOIN persons p ON p.user_id = u.id
            INNER JOIN roles r ON r.id = u.role_id
            WHERE u.is_active = 1
              AND u.deleted_at IS NULL
              AND p.deleted_at IS NULL
            ORDER BY r.name ASC, p.first_name ASC`,
            { type: QueryTypes.SELECT }
        );
        return rows.map(row => ({
            id: String(row.id),
            name: row.name,
            type: row.type
        }));
    }

}

module.exports = new UserRepository();
