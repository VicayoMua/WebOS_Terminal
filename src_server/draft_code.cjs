const sqlite3 = require('sqlite3').verbose();

// connect to database
const db = new sqlite3.Database(
    './MyCloud.db',
    sqlite3.OPEN_READWRITE,
    (error) => {
        if (error !== null)
            return console.error(error.message);
    }
);

// create a table
db.run(`-- CREATE TABLE users(id INTEGER PRIMARY KEY, first_name, last_name, username, password, email)`);

// drop table
db.run(`DROP TABLE users`);

// insert data into table
db.run(
    `INSERT INTO users(first_name, last_name, username, password, email)
     VALUES (?, ?, ?, ?, ?)`,
    ['Lexie', 'King', 'lele', 'll2002', 'lele@gmail.com'],
    (error) => {
        if (error !== null)
            return console.error(error.message);
    }
);

// update data
db.run(
    `UPDATE users
     SET first_name = ?
     WHERE id = ?`,
    ['Pipi', 3],
    (error) => {
        if (error !== null)
            return console.error(error.message);
    }
);

// delete data
db.run(
    `DELETE
     FROM users
     WHERE id = ?`,
    [1],
    (error) => {
        if (error !== null)
            return console.error(error.message);
    }
);

// query the database
db.all(
    `SELECT *
     FROM users`,
    [],
    (error, rows) => {
        if (error !== null)
            return console.error(error.message);
        rows.forEach((row) => {
            console.log(row);
        });
    }
);
