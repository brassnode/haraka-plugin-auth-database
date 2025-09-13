const { DataSource } = require('typeorm')
const SmtpUser = require('./entities/smtp_user')

class DatabaseConnection {
  static instance = null

  static async get_data_source(config) {
    if (this.instance && this.instance.isInitialized) {
      return this.instance
    }

    this.instance = new DataSource({
      type: config.engine || 'postgres',
      host: config.host || 'localhost',
      port: parseInt(config.port || '5432'),
      username: config.username,
      password: config.password,
      database: config.database,
      entities: [SmtpUser],
      logging: config.logging || false,
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
