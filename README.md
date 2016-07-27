# Big Poppa

*Big Poppa is a notorious manager who keeps track of all his users. He knows who owes him money and when it is due. He also stores other attributes for his users and only gives out this information to those he deems worthy.*

## Setup

### Postgresql

The first step is to install postgres. From the command-line (on Mac OSX) run
the following:

1. `brew install postgresql` - Installs postgresql locally
2. `initdb /usr/local/var/postgres -E utf8` - Initializes a postgres cluster
3. `ln -sfv /usr/local/opt/postgresql/*.plist ~/Library/LaunchAgents` -
   instruct OSX to automatically launch postgres on login.
4. `launchctl load ~/Library/LaunchAgents/homebrew.mxcl.postgresql.plist`  -
   start postgres on your computer.

Once you have installed postgres you'll need to run the following from the
big-poppa project repository directory:

1. `npm run init-db`

This script creates a super user named `big-poppa` and two databases on your machine:
`big-poppa` (used for local development) and `big-poppa-test` (used by the test suite).

### Running Migrations

big-poppa uses [knex](https://www.npmjs.com/package/knex) to access the postgresql
database. The first thing you'll need to do after installing postgres is to
run the knex migrations to create the database schema. From the big-poppa project
repository directory run the following:

1. `npm install` - Install required libraries
2. `npm run migrate` - Migrates the test and local development databases.

### RabbitMQ
In order to fully test the codebase you will need to install RabbitMQ locally
on your machine. Run the following commands to do so:

* `brew update`
* `brew install rabbitmq`

Once installed, brew should instruct you on how to ensure that RabbitMQ is
launched at reboot and login. Copy the commands from the brew output and execute
them on your machine.

For more information see:
[RabbitMQ Homebrew Install Instructions](https://www.rabbitmq.com/install-homebrew.html)

## Creating Migrations

The infrastructure data model may change over time due to new constraints. When
the schema needs to change you'll have to write your own migrations in order to
update the database. While a full treatment of how to write db migrations is
outside the scope of this document, we will cover the basic commands you'll need
to know in order to do so.

Here is a list of the relevant commands:

* `knex migrate:latest` - Update the database schema to the latest migration.
* `knex migrate:rollback` - Rolls the last migration back to the previous state.
* `knex migrate:make <name>` - Creates a new migration with the given name in
  the `migrations/` directory in the project repository.

The database environment affected is chosen by setting the `NODE_ENV`
environment variable. By default the development database is changed, here are
the other options for `NODE_ENV`:

* `test` - Apply migration changes to the test database
* `production` - Apply migration changes to the production database

Note that the `production` environment is not available when developing.

For more information on how to build migrations, take a look at the source code
for the existing migrations in the `migrations/` directory and read the
[knex schema documentation](http://knexjs.org/#Schema).

## Testing

### Testing Environments

There are two testing environments:

- `test`: Routes all Github API requests through [mehpi](https://github.com/Runnable/mehpi)
- `test-integration`: Uses a token to make real Github API calls

### Testing commands

There are several testing commands:

- `npm test`: Lints code and runs unit and functional tests
- `npm run test-unit`: Runs only unit tests.
- `npm run test-functional`: Runs only functional tests.
- `npm run test-integration`: Runs only integration tests.
- `npm run test-integration-env`: Lints code and runs unit and functional test for all services with real GithubAPI calls (`test-integration` ENV)

### Testing Definitions

There are three types of tests in this project:

- Unit tests: Tests units of codes and stubs out any external code.
- Functional tests: Tests the complete functionality of a method and only stubs out HTTP calls. Should interact with the database.
