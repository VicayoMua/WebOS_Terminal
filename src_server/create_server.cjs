// --- DB ---
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

// --- Server App ---
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
 * This post request:
 *      (1) Registers a <user_key> in the <users> table;
 *      (2) Creates a <user_key> table.
 * req.params:
 *      user_key: string
 * res.body:
 *      connection=true    everytime
 *      error              when failure
 *      NOTHING            when success
 * */
app.post('/api/users/:user_key', (req, res) => {
    const user_key = req.params.user_key;
    if (typeof user_key !== 'string' || !validUserKeyRegEx.test(user_key)) {
        return res.status(400).json({
            connection: true,
            error: `"${user_key}" is an invalid user_key. Please Use [A-Za-z_][A-Za-z0-9_]{1024,1048576}.`
        });
    }
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
});

/**
 * This get request:
 *      Determine whether <user_key> is in the <users> table.
 * req.params:
 *      user_key: string
 * res.body:
 *      connection=true      everytime
 *      error                when failure
 *      result=true/false    when success
 * */
app.get('/api/users/:user_key', (req, res) => {
    const user_key = req.params.user_key;
    if (typeof user_key !== 'string' || !validUserKeyRegEx.test(user_key)) {
        return res.status(400).json({
            connection: true,
            error: `"${user_key}" is an invalid user_key. Please Use [A-Za-z_][A-Za-z0-9_]{1024,1048576}.`
        });
    }
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
* Create/Update one file by serial
* req.params:
*       serial: string
* req.body:
*       encoding: string
*       content: string
* */
// app.post('/api/files/:serial', (req, res) => {
//     // check if serial is valid
//     const serial = String(req.params.serial || ''); // we can do this because serial cannot be an empty string.
//     if (serial.length <= 0) return res.status(400).json({error: 'Serial cannot be empty.'});
//     // check if encoding is valid
//     const encoding = String(req.body?.encoding || '').toLowerCase();
//     if (!allowedEncodings.has(encoding)) return res.status(400).json({error: `Unsupported encoding: ${encoding}.`});
//     // check if content is valid
//     if (!('content' in req.body)) return res.status(400).json({error: 'Content Not Found.'});
//     let content = String(req.body.content);
//     // check if the length of content is valid
//     if (content.length > MAX_CONTENT_CHARS)
//         return res.status(413).json({
//             error: 'Payload Too Large.',
//             limit: MAX_CONTENT_CHARS
//         });
//     // try to decode <content> as a blob via <encoding>
//     try {
//         const contentBuffer = Buffer.from(content, encoding);
//         if (content.length > 0 && contentBuffer.length <= 0)
//             return res.status(400).json({error: `Mismatch in original and decoded contents as ${encoding}`});
//         content = contentBuffer;
//     } catch (e) {
//         return res.status(400).json({error: `Failed to decode content as ${encoding}.`});
//     }
//     // language=SQL format=false
//     db.run( // create (serial, encoding, content, created_at, updated_at)
//         `
//             INSERT INTO files (serial, encoding, content)
//             VALUES (?, ?, ?)
//             ON CONFLICT(serial) DO UPDATE SET
//                 encoding   = excluded.encoding,
//                 content    = excluded.content,
//                 updated_at = CURRENT_TIMESTAMP
//         `,
//         [serial, encoding, content],
//         (upsertError) => {
//             // if upsert failed
//             if (upsertError) return res.status(500).json({error: upsertError.message});
//             // double-check the upserted data
//             db.get(
//                 `
//                     SELECT serial, created_at, updated_at FROM files WHERE serial = ?
//                     LIMIT 1
//                 `,
//                 [serial],
//                 (getError, getRow) => {
//                     if (getError) return res.status(500).json({error: getError.message});
//                     if (!getRow) return res.status(500).json({error: 'Row missing after upsert (Unexpected Error).'});
//                     const behavior = (getRow.created_at === getRow.updated_at) ? 'create' : 'update';
//                     // Use 201 for creates, 200 for updates
//                     return res.status(behavior === 'create' ? 201 : 200).json({
//                         serial: serial,
//                         bytes: content.length,
//                         created_at: getRow.created_at,
//                         updated_at: getRow.updated_at,
//                         behavior: behavior
//                     });
//                 }
//             );
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
