const { EntitySchema } = require('typeorm')

module.exports = function (schema_config) {
  return new EntitySchema({
    name: 'SmtpUser',
    tableName: schema_config.users_table,
    columns: {
      [schema_config.pk_field]: {
        primary: true,
        type: schema_config.pk_field_type,
      },
      [schema_config.username_field]: {
        type: 'varchar',
      },
      [schema_config.password_field]: {
        type: 'varchar',
      },
      ...(schema_config.last_used_at_field && {
        [schema_config.last_used_at_field]: {
          type: 'timestamp',
          nullable: true,
        },
      }),
    },
  })
}
