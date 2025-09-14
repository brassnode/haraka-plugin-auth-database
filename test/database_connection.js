const assert = require('node:assert')
const { beforeEach, afterEach, describe, it } = require('node:test')
const sinon = require('sinon')
const { DataSource } = require('typeorm')
const DatabaseConnection = require('../lib/database_connection')

describe('DatabaseConnection', () => {
  let dataSourceStub
  let initializeStub
  let destroyStub

  beforeEach(() => {
    // Reset singleton instance
    DatabaseConnection.instance = null

    // Create stubs for DataSource methods
    initializeStub = sinon.stub().resolves()
    destroyStub = sinon.stub().resolves()

    // Create a mock DataSource instance
    dataSourceStub = {
      isInitialized: false,
      initialize: initializeStub,
      destroy: destroyStub,
    }

    // Stub the DataSource constructor
    sinon.stub(DataSource.prototype, 'constructor').returns(dataSourceStub)
    sinon.stub(DataSource.prototype, 'initialize').callsFake(async function () {
      this.isInitialized = true
      return Promise.resolve()
    })
    sinon.stub(DataSource.prototype, 'destroy').callsFake(async function () {
      this.isInitialized = false
      return Promise.resolve()
    })
  })

  afterEach(() => {
    sinon.restore()
    DatabaseConnection.instance = null
  })

  describe('get_data_source', () => {
    const mockConfig = {
      database: {
        engine: 'postgres',
        host: 'localhost',
        port: '5432',
        username: 'testuser',
        password: 'testpass',
        database: 'testdb',
        logging: false,
      },
    }

    const mockEntities = ['User', 'Domain']

    it('creates new DataSource on first call', async () => {
      const result = await DatabaseConnection.get_data_source(
        mockConfig,
        mockEntities
      )

      assert.ok(result, 'should return DataSource instance')
      assert.equal(result.isInitialized, true, 'should be initialized')
      assert.equal(DatabaseConnection.instance, result, 'should store instance')
    })

    it('returns existing instance on subsequent calls', async () => {
      const first = await DatabaseConnection.get_data_source(
        mockConfig,
        mockEntities
      )
      const second = await DatabaseConnection.get_data_source(
        mockConfig,
        mockEntities
      )

      assert.equal(first, second, 'should return same instance')
      assert.equal(
        DataSource.prototype.initialize.callCount,
        1,
        'should only initialize once'
      )
    })

    it('handles different database engines', async () => {
      const mysqlConfig = {
        database: {
          engine: 'mysql',
          host: 'localhost',
          port: '3306',
          username: 'root',
          password: '',
          database: 'testdb',
        },
      }

      const result = await DatabaseConnection.get_data_source(
        mysqlConfig,
        mockEntities
      )
      assert.ok(result, 'should handle mysql engine')
    })

    it('uses default values when config is incomplete', async () => {
      const minimalConfig = {
        database: {
          username: 'user',
          password: 'pass',
          database: 'db',
        },
      }

      const result = await DatabaseConnection.get_data_source(
        minimalConfig,
        mockEntities
      )
      assert.ok(result, 'should work with defaults')
    })
  })

  describe('get_shared_data_source', () => {
    it('throws error when not initialized', () => {
      assert.throws(() => DatabaseConnection.get_shared_data_source(), {
        name: 'Error',
        message:
          'Database connection not initialized. Call get_data_source first.',
      })
    })

    it('returns instance when initialized', async () => {
      const mockConfig = {
        database: {
          username: 'user',
          password: 'pass',
          database: 'db',
        },
      }

      await DatabaseConnection.get_data_source(mockConfig, [])
      const shared = DatabaseConnection.get_shared_data_source()

      assert.ok(shared, 'should return shared instance')
      assert.equal(
        shared,
        DatabaseConnection.instance,
        'should be same as stored instance'
      )
    })
  })

  describe('close_connection', () => {
    it('does nothing when no connection exists', async () => {
      await assert.doesNotReject(
        DatabaseConnection.close_connection(),
        'should not throw when no connection'
      )
    })

    it('closes and clears existing connection', async () => {
      const mockConfig = {
        database: {
          username: 'user',
          password: 'pass',
          database: 'db',
        },
      }

      await DatabaseConnection.get_data_source(mockConfig, [])
      assert.ok(
        DatabaseConnection.instance,
        'should have instance before close'
      )

      await DatabaseConnection.close_connection()

      assert.equal(DatabaseConnection.instance, null, 'should clear instance')
      assert.equal(
        DataSource.prototype.destroy.callCount,
        1,
        'should call destroy'
      )
    })

    it('handles errors during close', async () => {
      const mockConfig = {
        database: {
          username: 'user',
          password: 'pass',
          database: 'db',
        },
      }

      await DatabaseConnection.get_data_source(mockConfig, [])

      // Make destroy throw an error
      DataSource.prototype.destroy.rejects(new Error('Close failed'))

      await assert.rejects(DatabaseConnection.close_connection(), {
        message: 'Close failed',
      })
    })
  })
})
