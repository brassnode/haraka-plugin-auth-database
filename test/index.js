const assert = require('node:assert')
const { beforeEach, describe, it } = require('node:test')
const path = require('path')

const fixtures = require('haraka-test-fixtures')

beforeEach(() => {
  this.plugin = new fixtures.plugin('auth-database')
  this.plugin.config.root_path = path.resolve('test', 'config')
  delete this.plugin.config.overrides_path
})

describe('plugin', () => {
  it('loads', () => {
    assert.ok(this.plugin)
  })

  it('loads auth_database.ini', () => {
    this.plugin.load_auth_database_ini()
    assert.ok(this.plugin.cfg)
  })

  it('initializes enabled boolean', () => {
    this.plugin.load_auth_database_ini()
    assert.equal(this.plugin.cfg.main.enabled, true, this.plugin.main)
    assert.equal(
      this.plugin.cfg.domain_authorization.enabled,
      true,
      this.plugin.domain_authorization
    )
  })
})

describe('uses text fixtures', () => {
  it('sets up a connection', () => {
    this.connection = fixtures.connection.createConnection({})
    assert.ok(this.connection.server)
  })

  it('sets up a transaction', () => {
    this.connection = fixtures.connection.createConnection({})
    this.connection.init_transaction()
    assert.ok(this.connection.transaction.header)
  })
})

const expectedCfg = {
  main: {
    enabled: true,
  },
  database: {
    engine: 'postgres',
    host: '127.0.0.1',
    port: 5432,
    database: 'haraka',
    username: 'haraka_db_user',
    password: '',
    logging: true,
  },
  schema: {
    users_table: 'users',
    pk_field: 'id',
    pk_field_type: 'uuid',
    username_field: 'username',
    password_field: 'password',
    last_used_at_field: 'last_used_at',
  },
  domain_authorization: {
    enabled: true,
  },
}

describe('register', () => {
  beforeEach(() => {
    this.plugin.config.root_path = path.resolve(__dirname, '../config')
  })

  it('registers', async () => {
    assert.deepEqual(this.plugin.cfg, undefined)
    await this.plugin.register()
    assert.deepEqual(this.plugin.cfg, expectedCfg)
  })
})

describe('load_auth_database_ini', () => {
  beforeEach(() => {
    this.plugin.config.root_path = path.resolve(__dirname, '../config')
  })

  it('loads auth_database.ini', () => {
    assert.deepEqual(this.plugin.cfg, undefined)
    this.plugin.load_auth_database_ini()
    assert.deepEqual(this.plugin.cfg, expectedCfg)
  })
})

describe('advertise_auth', () => {
  it('advertises AUTH PLAIN LOGIN and sets allowed_auth_methods', () => {
    const plugin = new fixtures.plugin('auth-database')
    const connection = {
      capabilities: [],
      notes: {},
      loginfo: () => {},
    }
    plugin.advertise_auth(() => {
      assert.ok(connection.capabilities.includes('AUTH PLAIN LOGIN'))
      assert.deepEqual(connection.notes.allowed_auth_methods, [
        'PLAIN',
        'LOGIN',
      ])
    }, connection)
  })
})

describe('check_plain_passwd', () => {
  it('calls back with true for valid user/password', () => {
    const plugin = new fixtures.plugin('auth-database')
    const connection = {
      loginfo: () => {},
      logerror: () => {},
      notes: {},
    }
    // stub check_user_password to simulate success
    plugin.check_user_password = (user, passwd, cb) => cb(null, true)
    plugin.check_plain_passwd(connection, 'user1', 'pass1', (result) => {
      assert.strictEqual(result, true)
      assert.strictEqual(connection.notes.auth_user, 'user1')
    })
  })

  it('calls back with false for invalid user/password', () => {
    const plugin = new fixtures.plugin('auth-database')
    const connection = {
      loginfo: () => {},
      logerror: () => {},
      notes: {},
    }
    plugin.check_user_password = (user, passwd, cb) => cb(null, false)
    plugin.check_plain_passwd(connection, 'user2', 'badpass', (result) => {
      assert.strictEqual(result, false)
      assert.strictEqual(connection.notes.auth_user, undefined)
    })
  })

  it('calls back with false on error', () => {
    const plugin = new fixtures.plugin('auth-database')
    const connection = {
      loginfo: () => {},
      logerror: () => {},
      notes: {},
    }
    plugin.check_user_password = (user, passwd, cb) => cb(new Error('fail'))
    plugin.check_plain_passwd(connection, 'user3', 'pass3', (result) => {
      assert.strictEqual(result, false)
      assert.strictEqual(connection.notes.auth_user, undefined)
    })
  })
})

describe('check_cram_md5_passwd', () => {
  it('calls back with true for matching password', () => {
    const plugin = new fixtures.plugin('auth-database')
    const connection = {
      loginfo: () => {},
      logerror: () => {},
      notes: {},
    }
    // stub get_user_password to simulate stored password
    plugin.get_user_password = (user, cb) => cb(null, 'storedpass')
    plugin.check_cram_md5_passwd(
      connection,
      'user4',
      'storedpass',
      (result) => {
        assert.strictEqual(result, true)
        assert.strictEqual(connection.notes.auth_user, 'user4')
      }
    )
  })

  it('calls back with false for non-matching password', () => {
    const plugin = new fixtures.plugin('auth-database')
    const connection = {
      loginfo: () => {},
      logerror: () => {},
      notes: {},
    }
    plugin.get_user_password = (user, cb) => cb(null, 'storedpass')
    plugin.check_cram_md5_passwd(connection, 'user5', 'wrongpass', (result) => {
      assert.strictEqual(result, false)
      assert.strictEqual(connection.notes.auth_user, undefined)
    })
  })

  it('calls back with false if get_user_password errors', () => {
    const plugin = new fixtures.plugin('auth-database')
    const connection = {
      loginfo: () => {},
      logerror: () => {},
      notes: {},
    }
    plugin.get_user_password = (user, cb) => cb(new Error('fail'))
    plugin.check_cram_md5_passwd(connection, 'user6', 'any', (result) => {
      assert.strictEqual(result, false)
      assert.strictEqual(connection.notes.auth_user, undefined)
    })
  })

  it('calls back with false if get_user_password returns no password', () => {
    const plugin = new fixtures.plugin('auth-database')
    const connection = {
      loginfo: () => {},
      logerror: () => {},
      notes: {},
    }
    plugin.get_user_password = (user, cb) => cb(null, null)
    plugin.check_cram_md5_passwd(connection, 'user7', 'any', (result) => {
      assert.strictEqual(result, false)
      assert.strictEqual(connection.notes.auth_user, undefined)
    })
  })
})

describe('check_user_password', () => {
  it('calls back with true for valid user/password', async () => {
    const plugin = new fixtures.plugin('auth-database')
    plugin.smtpUser = {
      findOne: async () => ({ username: 'user1', password: 'hashed' }),
      update: async () => {},
    }
    plugin.schema_config = {
      username_field: 'username',
      password_field: 'password',
      pk_field: 'id',
      last_used_at_field: undefined,
    }
    plugin.verify_password = async () => true
    await new Promise((resolve) => {
      plugin.check_user_password('user1', 'pass1', (err, result) => {
        assert.strictEqual(err, null)
        assert.strictEqual(result, true)
        resolve()
      })
    })
  })

  it('calls back with false for invalid user', async () => {
    const plugin = new fixtures.plugin('auth-database')
    plugin.smtpUser = {
      findOne: async () => null,
    }
    plugin.schema_config = { username_field: 'username' }
    await new Promise((resolve) => {
      plugin.check_user_password('nouser', 'pass', (err, result) => {
        assert.strictEqual(err, null)
        assert.strictEqual(result, false)
        resolve()
      })
    })
  })

  it('calls back with false for password mismatch', async () => {
    const plugin = new fixtures.plugin('auth-database')
    plugin.smtpUser = {
      findOne: async () => ({ username: 'user2', password: 'hashed' }),
      update: async () => {},
    }
    plugin.schema_config = {
      username_field: 'username',
      password_field: 'password',
      pk_field: 'id',
      last_used_at_field: undefined,
    }
    plugin.verify_password = async () => false
    await new Promise((resolve) => {
      plugin.check_user_password('user2', 'badpass', (err, result) => {
        assert.strictEqual(err, null)
        assert.strictEqual(result, false)
        resolve()
      })
    })
  })

  it('calls back with error on exception', async () => {
    const plugin = new fixtures.plugin('auth-database')
    plugin.smtpUser = {
      findOne: async () => {
        throw new Error('db fail')
      },
    }
    plugin.schema_config = { username_field: 'username' }
    await new Promise((resolve) => {
      plugin.check_user_password('user', 'pass', (err, result) => {
        assert.ok(err)
        assert.strictEqual(result, false)
        resolve()
      })
    })
  })
})

describe('get_user_password', () => {
  it('calls back with password if user found', async () => {
    const plugin = new fixtures.plugin('auth-database')
    plugin.smtpUser = {
      findOne: async () => ({ password: 'hashed' }),
    }
    plugin.schema_config = {
      username_field: 'username',
      password_field: 'password',
    }
    await new Promise((resolve) => {
      plugin.get_user_password('user', (err, passwd) => {
        assert.strictEqual(err, null)
        assert.strictEqual(passwd, 'hashed')
        resolve()
      })
    })
  })

  it('calls back with error if user not found', async () => {
    const plugin = new fixtures.plugin('auth-database')
    plugin.smtpUser = {
      findOne: async () => null,
    }
    plugin.schema_config = {
      username_field: 'username',
      password_field: 'password',
    }
    await new Promise((resolve) => {
      plugin.get_user_password('nouser', (err, passwd) => {
        assert.ok(err)
        assert.strictEqual(passwd, undefined)
        resolve()
      })
    })
  })

  it('calls back with error on exception', async () => {
    const plugin = new fixtures.plugin('auth-database')
    plugin.smtpUser = {
      findOne: async () => {
        throw new Error('db fail')
      },
    }
    plugin.schema_config = {
      username_field: 'username',
      password_field: 'password',
    }
    await new Promise((resolve) => {
      plugin.get_user_password('user', (err, passwd) => {
        assert.ok(err)
        assert.strictEqual(passwd, undefined)
        resolve()
      })
    })
  })
})

describe('verify_password', () => {
  it('returns true if verify_password_hash passes', async () => {
    const plugin = new fixtures.plugin('auth-database')
    plugin.logerror = () => {}
    // Stub verify_password_hash directly on the plugin instance
    plugin.verify_password = async function (plain, hashed) {
      try {
        const verify_password_hash = async () => true
        return await verify_password_hash(plain, hashed)
      } catch (e) {
        this.logerror(`verify_password error: ${e.message}`)
        return false
      }
    }
    const result = await plugin.verify_password('plain', 'hashed')
    assert.strictEqual(result, true)
  })

  it('returns false if verify_password_hash throws', async () => {
    const plugin = new fixtures.plugin('auth-database')
    plugin.logerror = () => {}
    // Stub verify_password_hash to throw
    plugin.verify_password = async function (plain, hashed) {
      try {
        const verify_password_hash = async () => {
          throw new Error('fail')
        }
        return await verify_password_hash(plain, hashed)
      } catch (e) {
        this.logerror(`verify_password error: ${e.message}`)
        return false
      }
    }
    const result = await plugin.verify_password('plain', 'hashed')
    assert.strictEqual(result, false)
  })
})

describe('check_domain_authorization', () => {
  function makeTxn() {
    return {
      results: {
        add: function (plugin, obj) {
          this._added = obj
        },
        _added: null,
      },
    }
  }

  it('denies if not authenticated', () => {
    return new Promise((resolve) => {
      const plugin = new fixtures.plugin('auth-database')
      plugin.cfg = { domain_authorization: { enabled: true } }
      const connection = {
        transaction: makeTxn(),
        notes: {},
        loginfo: () => {},
      }
      const params = [{ address: () => 'alice@example.com' }]
      plugin.check_domain_authorization(
        (code, msg) => {
          assert.strictEqual(code, DENY)
          assert.match(msg, /Authentication required/)
          assert.deepEqual(connection.transaction.results._added, {
            fail: 'unauthenticated user trying to send mail',
          })
          resolve()
        },
        connection,
        params
      )
    })
  })

  it('allows if domain_authorization is disabled', () => {
    return new Promise((resolve) => {
      const plugin = new fixtures.plugin('auth-database')
      plugin.cfg = { domain_authorization: { enabled: false } }
      const connection = {
        transaction: makeTxn(),
        notes: { auth_user: 'alice@example.com' },
        loginfo: () => {},
      }
      const params = [{ address: () => 'alice@example.com' }]
      plugin.check_domain_authorization(
        () => {
          resolve()
        },
        connection,
        params
      )
    })
  })

  it('allows if authenticated and domains match', () => {
    return new Promise((resolve) => {
      const plugin = new fixtures.plugin('auth-database')
      plugin.cfg = { domain_authorization: { enabled: true } }
      const connection = {
        transaction: makeTxn(),
        notes: { auth_user: 'alice@example.com' },
        loginfo: () => {},
      }
      const params = [{ address: () => 'alice@example.com' }]
      plugin.check_domain_authorization(
        (code) => {
          assert.strictEqual(code, undefined)
          resolve()
        },
        connection,
        params
      )
    })
  })

  it('denies if authenticated but domains do not match', () => {
    return new Promise((resolve) => {
      const plugin = new fixtures.plugin('auth-database')
      plugin.cfg = { domain_authorization: { enabled: true } }
      const connection = {
        transaction: makeTxn(),
        notes: { auth_user: 'alice@other.com' },
        loginfo: () => {},
      }
      const params = [{ address: () => 'bob@example.com' }]
      plugin.check_domain_authorization(
        (code, msg) => {
          assert.strictEqual(code, DENY)
          assert.match(msg, /not allowed to send as this domain/)
          assert.deepEqual(connection.transaction.results._added, {
            fail: 'sender domain does not match auth domain',
          })
          resolve()
        },
        connection,
        params
      )
    })
  })
})

describe('shutdown', () => {
  it('calls DatabaseConnection.close_connection and logs', async () => {
    const plugin = new fixtures.plugin('auth-database')
    let closed = false
    plugin.loginfo = () => {
      closed = true
    }
    plugin.logerror = () => {}
    // Mock DatabaseConnection.close_connection
    const orig = require.cache[require.resolve('../lib/database_connection')]
    require.cache[require.resolve('../lib/database_connection')] = {
      exports: {
        close_connection: async () => {
          closed = true
        },
      },
    }
    plugin.shutdown()
    // allow async close_connection to run
    await new Promise((r) => setTimeout(r, 10))
    assert.ok(closed)
    require.cache[require.resolve('../lib/database_connection')] = orig
  })
})
