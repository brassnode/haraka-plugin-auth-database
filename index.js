'use strict'

const { verify_password_hash } = require('./lib/password_parser')
const DatabaseConnection = require('./lib/database_connection')
const SmtpUserFactory = require('./lib/entities/smtp_user')

exports.register = function () {
  this.inherits('auth/auth_base')
  this.load_auth_database_ini()
  this.register_hook('capabilities', 'advertise_auth')
  this.register_hook('mail', 'check_domain_authorization')
  this.initialize_database()
}

exports.load_auth_database_ini = function () {
  this.cfg = this.config.get(
    'auth_database.ini',
    {
      booleans: [
        '+main.enabled',
        '+database.logging',
        '+domain_authorization.enabled',
      ],
    },
    () => {
      this.load_auth_database_ini()
    }
  )
}

exports.initialize_database = async function () {
  this.schema_config = {
    users_table: this.cfg.schema.users_table || 'users',
    pk_field: this.cfg.schema.pk_field || 'id',
    pk_field_type: this.cfg.schema.pk_field_type || 'int',
    username_field: this.cfg.schema.username_field || 'username',
    password_field: this.cfg.schema.password_field || 'password',
    last_used_at_field: this.cfg.schema.last_used_at_field || undefined,
  }

  const SmtpUser = SmtpUserFactory(this.schema_config)
  const entities = [SmtpUser]

  try {
    this.data_source = await DatabaseConnection.get_data_source(
      this.cfg,
      entities
    )
    this.smtpUser = this.data_source.getRepository(SmtpUser)
    this.loginfo(
      `connected to database at ${this.cfg.database.host}:${this.cfg.database.port}`
    )
  } catch (error) {
    this.logerror(`failed to initialize database: ${error.message}`)
  }
}

exports.advertise_auth = function (next, connection) {
  this.loginfo('Advertising AUTH capabilities')
  connection.capabilities.push('AUTH PLAIN LOGIN')
  connection.notes.allowed_auth_methods = ['PLAIN', 'LOGIN']
  next()
}

exports.check_plain_passwd = function (connection, user, passwd, cb) {
  connection.loginfo(this, `check_plain_passwd called for user: ${user}`)
  this.check_user_password(user, passwd, (err, result) => {
    if (err) {
      connection.logerror(this, `auth error: ${err.message}`)
      return cb(false)
    }
    if (result) {
      // Store authenticated user in connection notes for other plugins
      connection.notes.auth_user = user
    }
    connection.loginfo(this, `auth result for ${user}: ${result}`)
    cb(result)
  })
}

exports.check_cram_md5_passwd = function (connection, user, passwd, cb) {
  connection.loginfo(this, `check_cram_md5_passwd called for user: ${user}`)
  this.get_user_password(user, (err, stored_passwd) => {
    if (err || !stored_passwd) {
      connection.logerror(this, `Failed to get password for ${user}`)
      return cb(false)
    }
    const result = passwd === stored_passwd
    if (result) {
      // Store authenticated user in connection notes for other plugins
      connection.notes.auth_user = user
    }
    cb(result)
  })
}

exports.check_user_password = async function (username, password, callback) {
  this.loginfo(`checking username: ${username}`)

  try {
    const user = await this.smtpUser.findOne({
      where: {
        [this.schema_config.username_field]: username,
      },
    })

    if (!user) {
      this.loginfo(`user not found: ${username}`)
      return callback(null, false)
    }

    this.loginfo(`user found: ${username}, checking password...`)

    const passwordMatch = await this.verify_password(
      password,
      user[this.schema_config.password_field]
    )

    if (passwordMatch) {
      // Only update last_used_at if the field is configured
      if (this.schema_config.last_used_at_field) {
        await this.smtpUser.update(
          {
            [this.schema_config.pk_field]: user[this.schema_config.pk_field],
          },
          { [this.schema_config.last_used_at_field]: new Date() }
        )
      }
      this.loginfo(`authentication successful for ${username}`)
    } else {
      this.loginfo(`authentication failed for ${username}`)
    }

    callback(null, passwordMatch)
  } catch (error) {
    this.logerror(`database error: ${error.message}`)
    callback(error, false)
  }
}

exports.get_user_password = async function (username, callback) {
  try {
    const user = await this.smtpUser.findOne({
      where: {
        [this.schema_config.username_field]: username,
      },
      select: [this.schema_config.password_field],
    })

    if (!user) {
      return callback(new Error('user not found'))
    }

    callback(null, user[this.schema_config.password_field])
  } catch (error) {
    callback(error)
  }
}

exports.verify_password = async function (plain_password, hashed_password) {
  try {
    const passed = await verify_password_hash(plain_password, hashed_password)
    return passed
  } catch (error) {
    this.logerror(`password verification error: ${error.message}`)
    return false
  }
}

exports.check_domain_authorization = function (next, connection, params) {
  const txn = connection.transaction
  if (!txn) return next()

  const mail_from = params[0].address() // MAIL FROM
  const mail_domain = mail_from.split('@')[1]

  const auth_user = connection.notes.auth_user
  if (!auth_user) {
    txn.results.add(this, { fail: 'unauthenticated user trying to send mail' })
    return next(DENY, 'Authentication required')
  }

  if (!this.cfg.domain_authorization.enabled) {
    connection.loginfo(this, 'Domain authorization not enabled, allowing send')
    return next()
  }

  // enforce that the sender domain matches the authenticated domain
  const user_domain = auth_user.split('@')[1]
  if (mail_domain.toLowerCase() !== user_domain.toLowerCase()) {
    txn.results.add(this, { fail: 'sender domain does not match auth domain' })
    return next(DENY, 'You are not allowed to send as this domain')
  }

  return next()
}

exports.shutdown = function () {
  this.loginfo('plugin shutting down')
  DatabaseConnection.close_connection().catch((err) => {
    this.logerror(`error closing database connection: ${err.message}`)
  })
}
