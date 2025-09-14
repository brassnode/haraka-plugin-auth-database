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
