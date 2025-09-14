const { DataSource } = require('typeorm')

class DatabaseConnection {
  static instance = null

  static async get_data_source(config, entities) {
    if (this.instance && this.instance.isInitialized) {
      return this.instance
    }

    this.instance = new DataSource({
      type: config.database.engine || 'postgres',
      host: config.database.host || 'localhost',
      port: parseInt(config.database.port || '5432'),
      username: config.database.username,
      password: config.database.password,
      database: config.database.database,
      entities,
      logging: config.database.logging || false,
    })

    await this.instance.initialize()
    return this.instance
  }

  static get_shared_data_source() {
    if (!this.instance || !this.instance.isInitialized) {
      throw new Error(
        'Database connection not initialized. Call get_data_source first.'
      )
    }
    return this.instance
  }

  static async close_connection() {
    if (this.instance && this.instance.isInitialized) {
      await this.instance.destroy()
      this.instance = null
    }
  }
}

module.exports = DatabaseConnection
