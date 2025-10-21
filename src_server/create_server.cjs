// ------------------------------------- DB -------------------------------------
const
    sqlite3 = require('sqlite3').verbose(),
    db = new sqlite3.Database(
        './MyCloud.db',
        sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
        (error) => {
            if (error) console.error(`DB open error: ${error.message}`);
        }
    );

/*
* Initialize the database
* */
db.serialize(() => {
    db.run('PRAGMA foreign_keys = ON;');
    db.run('PRAGMA journal_mode = WAL;');
    db.run(
        'CREATE TABLE IF NOT EXISTS users (' +
        '    user_key      TEXT PRIMARY KEY,                                    /* unique user key (string) */' +
        '    created_at    DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP)' +
        ') WITHOUT ROWID;                                                       /* good when PRIMARY KEY is not an integer */',
        (createError) => {
            if (createError) {
                console.error('Failed to read/create the users table');
                return;
            }
            console.log('Successfully located users table');
        }
    );
});


// ------------------------------------- Server App -------------------------------------
const
    express = require('express'),
    app = express(),
    validUserKeyRegEx = /^[A-Za-z_][A-Za-z0-9_]{5,1048576}$/,
    cors = require('cors'),
    MAX_CONTENT_CHARS = 1024 * 1024 * 1024 * 1024, // 1T.
    // path = require('path');
    HOST = '127.0.0.1',
    PORT = 80;

app.use(express.json());
app.use(cors()); // ok for dev. lock this down in prod.
app.use((error, req, res, next) => {
    if (error && error.type === 'entity.too.large') {
        return res.status(413).json({error: 'Payload Too Large (JSON body limit).'});
    }
    if (error instanceof SyntaxError && 'body' in error) {
        return res.status(400).json({error: 'Invalid JSON body.'});
    }
    next(error);
});

/**
 * This POST request
 *      when aim='new_account':
 *          (1) Registers a <user_key> in the <users> table
 *          (2) Creates a <user_key> table
 *      when aim='conf_account':
 *          Determines whether <user_key> is in the <users> table
 *
 * req.body:
 *      aim: 'new_account' | 'conf_account'
 *      user_key: string
 *
 * res.body:
 *      connection=true      every time
 *      error                when failure
 *      NOTHING              when success and aim='new_account'
 *      result=true/false    when success and aim='conf_account'
 * */
app.post('/mycloud/users/', (req, res) => {
    const
        /** @type {'new_account' | 'conf_account'} */
        aim = req.body.aim,
        /** @type {string} */
        user_key = req.body.user_key;
    if (typeof user_key !== 'string' || !validUserKeyRegEx.test(user_key)) {
        return res.status(400).json({
            connection: true,
            error: `"${user_key}" is an invalid user_key. Please Use [A-Za-z_][A-Za-z0-9_]{1024,1048576}.`
        });
    }
    if (aim === 'new_account') {
        // language=SQL format=false
        db.run(
            'INSERT INTO users (user_key) VALUES (?);',
            [user_key],
            (insertError) => {
                if (insertError) {
                    return res.status(400).json({
                        connection: true,
                        error: `Failed to register in the user table: ${insertError}.`
                    });
                }
                console.log(` --> Registered ${user_key} in the user table`);
                db.run(
                    `CREATE TABLE IF NOT EXISTS "${user_key}" (` +
                    '    serial         TEXT PRIMARY KEY,         /* unique file serial number (string) */' +
                    '    content        BLOB NOT NULL,            /* binary-safe content */' +
                    '    created_at     DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),' +
                    '    updated_at     DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP)' +
                    ') WITHOUT ROWID;                             /* good when PRIMARY KEY is not an integer */',
                    (createError) => {
                        if (createError) {
                            db.run(
                                'DELETE FROM users WHERE user_key = ?;',
                                [user_key],
                                (deleteError) => {
                                }
                            );
                            return res.status(500).json({
                                connection: true,
                                error: `Failed to create a new file table: ${createError}.`
                            });
                        }
                        console.log(` --> Created a file table called ${user_key}`);
                        return res.status(200).json({
                            connection: true,
                            // ok: true
                        });
                    }
                );
            }
        );
        return;
    }
    if (aim === 'conf_account') {
        db.get(
            'SELECT 1 AS present FROM users WHERE user_key = ? LIMIT 1;',
            [user_key],
            (selectError, selectRow) => {
                if (selectError) {
                    return res.status(500).json({
                        connection: true,
                        error: `Failed to find the user: ${selectError}.`
                    });
                }
                if (!selectRow || !selectRow.present) {
                    return res.status(200).json({
                        connection: true,
                        result: false
                    });
                }
                db.get(
                    'SELECT 1 AS present FROM main.sqlite_schema WHERE type = ? AND name = ? LIMIT 1;',
                    ['table', user_key],
                    (selectError2, selectRow2) => {
                        if (selectError2) {
                            return res.status(500).json({
                                connection: true,
                                error: `Found the user, but Failed to find the user table: ${selectError2}.`
                            });
                        }
                        if (!selectRow2 || !selectRow2.present) {
                            return res.status(500).json({
                                connection: true,
                                error: `Found the user, but Failed to find the user table.`
                            });
                        }
                        return res.status(200).json({
                            connection: true,
                            result: true
                        });
                    }
                );
            }
        );
        return;
    }
    return res.status(400).json({
        connection: true,
        error: `"${aim}" is not a valid aim (user operation). Please check the client implementation.`
    });
});

/**
 * This POST request
 *      when aim='backup':
 *          Saves <serial, content> pair to the <user_key> table
 *      when aim='recover':
 *          Gets <content> by <serial> in the <user_key> table
 *
 * req.body:
 *      aim: 'backup' | 'recover'
 *      user_key: string
 *      serial: string
 *      content: string     ONLY when aim='backup'
 *
 * res.body:
 *      connection=true      every time
 *      error                when failure
 *      result=true/false    when success and aim='backup'
 *      content              when success and aim='recover'
 * */
app.post('/mycloud/files/', (req, res) => {
    const
        /** @type {'backup' | 'recover'} */
        aim = req.body.aim,
        /** @type {string} */
        user_key = req.body.user_key,
        /** @type {string} */
        serial = req.body.serial;
    if (typeof user_key !== 'string' || !validUserKeyRegEx.test(user_key)) {
        return res.status(400).json({
            connection: true,
            error: `"${user_key}" is an invalid user_key. Please Use [A-Za-z_][A-Za-z0-9_]{1024,1048576}.`
        });
    }
    if (typeof serial !== 'string' || serial.length === 0) {
        return res.status(400).json({
            connection: true,
            error: `serial must be a non-empty string. Please check the client implementation.`
        });
    }
    if (aim === 'backup') {
        db.run();
        return;
    }
    if (aim === 'recover') {
        db.get();
        return;
    }
    return res.status(400).json({
        connection: true,
        error: `"${aim}" is not a valid aim (file operation). Please check the client implementation.`
    });
});



/*
* Get one file by serial
* req.params:
*       serial: string
* */
// app.get('/api/files/:serial', (req, res) => {
//     // check if serial is valid
//     const serial = String(req.params.serial || '');
//     if (serial.length <= 0) return res.status(400).json({error: 'Serial cannot be empty.'});
//     // language=SQL format=false
//     db.get( // get (serial, encoding, content, created_at, updated_at)
//         `
//             SELECT serial, encoding, content, created_at, updated_at FROM files WHERE serial = ?
//             LIMIT 1              -- unique file serial number (string)
//         `,
//         [serial],
//         (getError, getRow) => {
//             if (getError) return res.status(500).json({error: getError.message});
//             if (!getRow) return res.status(404).json({error: 'File Not Found.'});
//             if (!Buffer.isBuffer(getRow.content)) return res.status(500).json({error: 'Content is not a blob buffer.'});
//             if (!allowedEncodings.has(getRow.encoding)) return res.status(500).json({error: 'Corrupted Encoding (Unexpected Error).'});
//             res.status(200).json({
//                 serial: getRow.serial,
//                 encoding: getRow.encoding,
//                 content: getRow.content.toString(getRow.encoding), // row.content is a __Buffer__ (BLOB).
//                 created_at: getRow.created_at,
//                 updated_at: getRow.updated_at,
//             });
//         }
//     );
// });

/*
* Delete one file by serial
* req.params:
*       serial: string
* */
// app.delete('/api/files/:serial', (req, res) => {
//     // check if serial is valid
//     const serial = String(req.params.serial || ''); // we can do this because serial cannot be an empty string.
//     if (serial.length <= 0) return res.status(400).json({error: 'Serial cannot be empty.'});
//     // language=SQL format=false
//     db.run( // delete (serial)
//         `DELETE FROM files WHERE serial = ?`,
//         [serial],
//         function (deleteError) {
//             if (deleteError) {
//                 return res.status(500).json({error: deleteError.message});
//             }
//             if (this.changes === 0) {
//                 return res.status(404).json({error: 'File Not Found.'});
//             }
//             // Successfully deleted
//             return res.status(200).json({
//                 serial: serial,
//                 changes: this.changes // number of rows affected (should be 1)
//             });
//         }
//     );
// });

const server = app.listen(
    PORT,
    HOST,
    () => console.log(`Server listening on http://${HOST}:${PORT}`)
);

function shutdownServer(signal) {
    console.log(`\n${signal} received: shutting down...`);
    server.close(() => {
        db.close((error) => {
            if (error) {
                console.error('Error closing DB:', error.message);
            } else {
                console.log('DB connection closed.');
            }
            process.exit(0);
        });
    });
}

process.on('SIGINT', () => shutdownServer('SIGINT'));
process.on('SIGTERM', () => shutdownServer('SIGTERM'));
