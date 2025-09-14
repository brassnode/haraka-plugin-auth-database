# haraka-plugin-auth-database

A Haraka plugin that provides SMTP authentication using a database backend (PostgreSQL, MySQL, or SQLite).

## Overview

This plugin implements SMTP authentication (AUTH) with support for multiple database backends, making it ideal for applications that already maintain user credentials in a database.

### Key Features

- Support for PostgreSQL, MySQL, and SQLite databases
- Configurable database schema mapping
- Password hash verification
- Timestamps for authentication tracking
- Domain-based authorization controls
- Connection pooling and error handling

## Install

```sh
cd /path/to/local/haraka
npm install @brassnode/haraka-plugin-auth-database
echo "auth-database" >> config/plugins
service haraka restart
```

## Database Configuration

### Prerequisites

1. A supported database server (PostgreSQL, MySQL, or SQLite)
2. Database user with appropriate permissions
3. Database schema with user credentials table

### Schema Requirements

The database must have a table containing at least:

- A primary key field
- Username field
- Password field (hashed)
- Optional last_used_at timestamp field

Example PostgreSQL schema:

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    last_used_at TIMESTAMP,
);
```

## Plugin Configuration

### auth_database.ini

```ini
[main]
enabled=true

[database]
engine=postgres
host=127.0.0.1
port=5432
database=haraka
username=haraka_db_user
password=your_password
logging=true

[schema]
users_table=users
pk_field=id
pk_field_type=uuid
username_field=username
password_field=password
last_used_at_field=last_used_at

[domain_authorization]
enabled=true
```

### Main Configuration Notes

- `enabled`: Set to `true` to enable the plugin

### Database Configuration Notes

- `engine`: Database type ('postgres', 'mysql', or 'sqlite')
- `host`: Database server hostname
- `port`: Database server port
- `database`: Database name
- `username`: Database user
- `password`: Database password
- `logging`: Enable SQL query logging

### Schema Configuration Notes

- `users_table`: Name of the table containing user credentials
- `pk_field`: Primary key field name
- `pk_field_type`: Primary key data type ('uuid', 'int', etc.)
- `username_field`: Field containing usernames
- `password_field`: Field containing hashed passwords
- `last_used_at_field`: Optional field for tracking last authentication

### Domain Authorization Notes

- `enabled`: When true, users can only send from their own domain

## Authentication Methods

The plugin supports these authentication mechanisms:

- PLAIN
- LOGIN

## Password Hashing

The plugin expects passwords to be stored as hashes. Supported formats:

- Argon2 (recommended)
- bcrypt
- PBKDF2
- Scrypt

Example hash formats:

```txt
# Argon2
$argon2id$v=19$m=65536,t=3,p=4$salt$hash

# bcrypt
$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LdiZbYF9i/Hnx.t.W
```

## Security Considerations

1. Always use TLS for SMTP connections
2. Store only hashed passwords
3. Use strong password hashing algorithms
4. Limit database user permissions
5. Enable domain authorization when possible

## Troubleshooting

### Common Issues

1. **Database connection errors**: Check credentials and network connectivity
2. **Authentication failures**: Verify password hash format
3. **Schema mismatches**: Confirm table and field names
4. **Permission issues**: Verify database user privileges

### Testing Authentication

```sh
swaks --auth-user user@example.com --auth-password secret \
      --server localhost --port 25 --auth PLAIN
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Top contributors

![Contributors](https://contrib.rocks/image?repo=brassnode/haraka-plugin-auth-database)

## License

Distributed under the Unlicense License. See [LICENSE](https://github.com/brassnode/haraka-plugin-auth-database/blob/master/LICENSE) for more information.

## Contact

Abdulmatin Sanni - [@abdulmatinsanni](https://linkedin.com/in/abdulmatinsanni) - <abdulmatin@brassnode.com>
