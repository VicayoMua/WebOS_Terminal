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
        '    created_at    TEXT NOT NULL' +
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
    validSerialRegEx = /^(?:ROOT|[A-Za-z_][A-Za-z0-9_]{127,4096})$/,
    cors = require('cors'),
    getISOTimeString = () => new Date().toISOString(),
    // MAX_CONTENT_CHARS = 1024 * 1024 * 1024 * 1024, // 1T.
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
            error: `"${user_key}" is not a valid user_key. Please Use [A-Za-z_][A-Za-z0-9_]{1024,1048576}.`
        });
    }
    if (aim === 'new_account') {
        // language=SQL format=false
        db.run(
            'INSERT INTO users (user_key, created_at) VALUES (?, ?);',
            [user_key, getISOTimeString()],
            (insertError) => {
                if (insertError) {
                    // console.log(insertError.code);
                    if (insertError.code === 'SQLITE_CONSTRAINT') {
                        return res.status(400).json({ // should check error.code here!!!!!!
                            connection: true,
                            error: `This user_key has already been taken by others. Please try another.`
                        });
                    }
                    return res.status(500).json({ // should check error.code here!!!!!!
                        connection: true,
                        error: `Failed to register in the user table: ${insertError}.`
                    });
                }
                console.log(` --> Registered ${user_key} in the user table`);
                db.run(
                    `CREATE TABLE IF NOT EXISTS ${user_key} (` +
                    '    serial         TEXT PRIMARY KEY,         /* unique file serial number (string) */' +
                    '    content        BLOB NOT NULL,            /* binary-safe content */' +
                    '    created_at     TEXT NOT NULL,' +
                    '    updated_at     TEXT NOT NULL' +
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
                        });
                    }
                );
            }
        );
        return;
    }
    if (aim === 'conf_account') {
        db.get(
            'SELECT ' +
            '   EXISTS(SELECT 1 FROM users WHERE user_key = ?) AS user_present,' +
            "   EXISTS(SELECT 1 FROM main.sqlite_schema WHERE type='table' AND name = ?) AS table_present;",
            [user_key, user_key],
            (selectError, selectRow) => {
                if (selectError || !selectRow) {
                    return res.status(500).json({
                        connection: true,
                        error: `Failed to lookup the database: ${selectError}.`
                    });
                }
                if (!selectRow.user_present) {
                    return res.status(200).json({
                        connection: true,
                        result: false
                    });
                }
                if (!selectRow.table_present) {
                    return res.status(500).json({
                        connection: true,
                        error: `Found the user, but Failed to find the user table: ${selectError2}.`
                    });
                }
                return res.status(200).json({
                    connection: true,
                    result: true
                });
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
 *          Create/Update <serial, content> pair to the <user_key> table (updating <updated_at>)
 *      when aim='recover':
 *          Gets <content> by <serial> in the <user_key> table (getting <created_at> and <updated_at>)
 *
 * req.body:
 *      aim: 'backup' | 'recover'
 *      user_key: string
 *      serial: string
 *      content: string     ONLY when aim='backup'
 *      created_at: string  ONLY when aim='backup'
 *      updated_at: string  ONLY when aim='backup'
 *
 * res.body:
 *      connection=true      every time
 *      error                when failure
 *      content              when success and aim='recover'
 *      created_at           when success and aim='recover'
 *      updated_at           when success and aim='recover'
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
            error: `"${user_key}" is not a valid user_key. Please Use [A-Za-z_][A-Za-z0-9_]{1024,1048576}.`
        });
    }
    if (typeof serial !== 'string' || !validSerialRegEx.test(serial)) {
        return res.status(400).json({
            connection: true,
            error: `"${user_key}" is not a valid user_key ([A-Za-z_][A-Za-z0-9_]{128,4096}). Please check the client implementation.`
        });
    }
    if (aim === 'backup') {
        const
            /** @type {string} */
            content = req.body.content,
            /** @type {string} */
            created_at = req.body.created_at,
            /** @type {string} */
            updated_at = req.body.updated_at;
        if (typeof content !== 'string') {
            return res.status(400).json({
                connection: true,
                error: `content is not a string. Please check the client implementation.`
            });
        }
        if (typeof created_at !== 'string') {
            return res.status(400).json({
                connection: true,
                error: `created_at is not a string. Please check the client implementation.`
            });
        }
        if (typeof updated_at !== 'string') {
            return res.status(400).json({
                connection: true,
                error: `updated_at is not a string. Please check the client implementation.`
            });
        }
        // language=SQL format=false
        db.run(
            `INSERT INTO ${user_key} (serial, content, created_at, updated_at) VALUES (?, ?, ?, ?)` +
            'ON CONFLICT(serial) DO UPDATE SET' +
            '    content    = excluded.content,' +
            '    updated_at = excluded.updated_at',
            [serial, Buffer.from(content, 'utf8'), created_at, updated_at],
            (upsertError) => {
                if (upsertError) {
                    return res.status(500).json({
                        connection: true,
                        error: `Failed to update the file content.`
                    });
                }
                if (serial === 'ROOT') { // clean up the files when ROOT updates, "content = rootFolder.JSON()"
                    // TODO: Clean up the files when ROOT updates
                }
                return res.status(200).json({
                    connection: true,
                });
            }
        );
        return;
    }
    if (aim === 'recover') {
        // language=SQL format=false
        db.get(
            `SELECT content, created_at, updated_at FROM ${user_key} WHERE serial = ? LIMIT 1;`,
            [serial],
            (selectError, selectRow) => {
                if (selectError) {
                    return res.status(500).json({
                        connection: true,
                        error: `Failed to find the serial from the user_id files.`
                    });
                }
                return res.status(200).json({
                    connection: true,
                    content: selectRow.content.toString('utf8'),
                    created_at: selectRow.created_at,
                    updated_at: selectRow.updated_at
                });
            }
        );
        return;
    }
    return res.status(400).json({
        connection: true,
        error: `"${aim}" is not a valid aim (file operation). Please check the client implementation.`
    });
});

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
