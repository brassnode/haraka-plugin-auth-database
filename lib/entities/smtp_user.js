const { EntitySchema } = require('typeorm')

module.exports = new EntitySchema({
  name: 'SmtpUser',
  tableName: 'sending_domain_smtp_users',
  columns: {
    id: {
      primary: true,
      type: 'uuid',
      generated: 'uuid',
    },
    username: {
      type: 'varchar',
      length: 255,
      unique: true,
      nullable: false,
    },
    password: {
      type: 'varchar',
      length: 255,
      nullable: false,
    },
    last_used_at: {
      type: 'timestamp',
      nullable: true,
    },
    created_at: {
      type: 'timestamp',
      nullable: true,
    },
    updated_at: {
      type: 'timestamp',
      nullable: true,
    },
  },
})
