'use strict'

exports.register = function () {
  this.load_auth_database_ini()

  // register hooks here. More info at https://haraka.github.io/core/Plugins/
  // this.register_hook('data_post', 'do_stuff_with_message')
}

exports.load_auth_database_ini = function () {
  this.cfg = this.config.get(
    'auth_database.ini',
    {
      booleans: [
        '+enabled', // this.cfg.main.enabled=true
        '-disabled', // this.cfg.main.disabled=false
        '+feature_section.yes', // this.cfg.feature_section.yes=true
      ],
    },
    () => {
      this.load_auth_database_ini()
    }
  )
}
