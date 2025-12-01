// --------------------------------------- DB ---------------------------------------
import path from 'path';
import {fileURLToPath} from 'url';
import {dirname} from 'path';
import sqlite3Module from 'sqlite3';
import {randomUUID} from 'crypto';
import {hrtime} from 'process';
import fs from 'fs';
import multer from 'multer';
import express from 'express';
import cors from 'cors';

const
    __filename = fileURLToPath(import.meta.url),
    __dirname = dirname(__filename),
    sqlite3 = sqlite3Module.verbose(),
    database = new sqlite3.Database(
        path.join(__dirname, 'MyCloud.db'),
        sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
        (error) => {
            if (error) console.error(`Failed to open the database: ${error.message}`);
        }
    );

/*
* Initialize the database
* */
database.serialize(() => {
    database.run('PRAGMA foreign_keys = ON;');
    database.run('PRAGMA journal_mode = WAL;');
    database.run(
        'CREATE TABLE IF NOT EXISTS users (' +
        '    user_key      TEXT PRIMARY KEY,                                    /* unique user key (string) */' +
        '    created_at    TEXT NOT NULL' +
        ') WITHOUT ROWID;                                                       /* good when PRIMARY KEY is not an integer */',
        (createError) => {
            if (createError) {
                console.error('Failed to read/create the users table');
                return;
            }
            console.log('Successfully located users table.');
        }
    );
});

// --------------------------------------- MULTER ---------------------------------------

class TempFileNameLake {
    #lastTime = 0n;
    #idx = 0n;

    generateNext() {
        const currentTime = hrtime.bigint() / 1_000_000n; // monotonic ms since process start
        if (currentTime === this.#lastTime) {
            this.#idx++;
        } else {
            this.#lastTime = currentTime;
            this.#idx = 0n;
        }
        return `${process.pid}-${currentTime}-${this.#idx}-${randomUUID()}`;
    }
}

const
    UPLOAD_DIR = path.join(__dirname, 'uploads'),
    tempFileNameLake = new TempFileNameLake();

if (!fs.existsSync(UPLOAD_DIR))
    fs.mkdirSync(UPLOAD_DIR, {recursive: true});

const multerUpload = multer({
    storage: multer.diskStorage({
        // where to save
        destination: (req, file, cb) => {
            cb(null, UPLOAD_DIR);
        },
        // what to name the file
        filename: (req, file, cb) => {
            cb(null, tempFileNameLake.generateNext());
        }
    })
});

// ------------------------------------- Server App -------------------------------------

const
    app = express(),
    legalUserKeyRegExp = /^[A-Za-z_][A-Za-z0-9_]{5,1048576}$/,
    legalFileSerialRegExp = /^(?:ROOT|[A-Za-z_][A-Za-z0-9_]{127,4096})$/,
    getISOTimeString = () => new Date().toISOString(),
    utf8Decoder = new TextDecoder('utf-8'),
    utf8Encoder = new TextEncoder();
// MAX_TEMP_FILE_SIZE = 1024 * 1024 * 1024 * 1024, // 1T.

app.use(express.static(path.join(__dirname, 'webpage')));

// Basic Webpage Server
{
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'webpage', 'index.html'));
    });
}

app.use(express.json());
app.use(cors());
app.use((error, req, res, next) => {
    if (error && error.type === 'entity.too.large') {
        return res.status(413).json({error: 'Payload Too Large (getRecordsJSON body limit).'});
    }
    if (error instanceof SyntaxError && 'body' in error) {
        return res.status(400).json({error: 'Invalid getRecordsJSON body.'});
    }
    next(error);
});

// MyCloud File Server POSTs
{
    /**
     * This POST request
     *      (1) Registers a <user_key> in the <users> table
     *      (2) Creates a <user_key> table
     *
     * req.body:
     *      user_key: string
     *
     * res.body:
     *      error                when failure
     * */
    app.post('/mycloud/users/register/', multerUpload.none(), (req, res) => {
        if (req.body === undefined) {
            return res.status(400).json({
                error: `Body not found.`
            });
        }
        const
            /** @type {{user_key: string}} */
            {user_key: user_key} = req.body;
        if (typeof user_key !== 'string' || !legalUserKeyRegExp.test(user_key)) {
            return res.status(400).json({
                error: `"${user_key}" must be a valid user_key. Please Use [A-Za-z_][A-Za-z0-9_]{1024,1048576}.`
            });
        }
        // language=SQL format=false
        database.run(
            'INSERT INTO users (user_key, created_at) VALUES (?, ?);',
            [user_key, getISOTimeString()],
            (insertError) => {
                if (insertError) {
                    if (insertError.code === 'SQLITE_CONSTRAINT') {
                        return res.status(400).json({
                            error: `This user_key has already been taken by others. Please try another.`
                        });
                    }
                    return res.status(500).json({
                        error: `Failed to register in the user table: ${insertError}.`
                    });
                }
                console.log(` --> Registered ${user_key} in the user table.`);
                // language=SQL format=false
                database.run(
                    `CREATE TABLE IF NOT EXISTS ${user_key} (` +
                    '    serial         TEXT PRIMARY KEY,         /* unique file serial number (string) */' +
                    '    content        BLOB NOT NULL,            /* binary-safe content */' +
                    '    created_at     TEXT NOT NULL,' +
                    '    updated_at     TEXT NOT NULL,' +
                    '    file_size      TEXT NOT NULL' +
                    ') WITHOUT ROWID;                             /* good when PRIMARY KEY is not an integer */',
                    (createError) => {
                        if (createError) {
                            console.error(` --> Failed to create a file table called ${user_key}.`)
                            database.run('DELETE FROM users WHERE user_key = ?;', [user_key]);
                            return res.status(500).json({
                                error: `Failed to create a new file table: ${createError}.`
                            });
                        }
                        console.log(` --> Created a file table called ${user_key}.`);
                        return res.status(200).json({});
                    }
                );
            }
        );
    });

    /**
     * This POST request
     *      Determines whether <user_key> is in the <users> table
     *
     * req.body:
     *      user_key: string
     *
     * res.body:
     *      error                when failure
     *      result=true/false    when success
     * */
    app.post('/mycloud/users/verify/', multerUpload.none(), (req, res) => {
        if (req.body === undefined) {
            return res.status(400).json({
                error: `Body not found.`
            });
        }
        const
            /** @type {{user_key: string}} */
            {user_key: user_key} = req.body;
        if (typeof user_key !== 'string' || !legalUserKeyRegExp.test(user_key)) {
            return res.status(400).json({
                error: `"${user_key}" must be a valid user_key. Please Use [A-Za-z_][A-Za-z0-9_]{1024,1048576}.`
            });
        }
        database.get(
            'SELECT ' +
            '   EXISTS(SELECT 1 FROM users WHERE user_key = ?) AS user_present,' +
            "   EXISTS(SELECT 1 FROM main.sqlite_schema WHERE type='table' AND name = ?) AS table_present;",
            [user_key, user_key],
            (selectError, selectRow) => {
                if (selectError || !selectRow) {
                    return res.status(500).json({
                        error: `Failed to lookup the database: ${selectError}.`
                    });
                }
                if (!selectRow.user_present) {
                    return res.status(200).json({
                        result: false
                    });
                }
                if (!selectRow.table_present) {
                    return res.status(500).json({
                        error: `Found the user, but Failed to find the user table: ${selectError2}.`
                    });
                }
                return res.status(200).json({
                    result: true
                });
            }
        );
    });

    /**
     * This POST request
     *      Create/Update <serial, content> pair to the <user_key> table (updating <updated_at>)
     *
     * req:
     *      user_key: string      ---> req.body.user_key
     *      serial: string        ---> req.body.serial
     *      content               ---> req.file
     *      (file_size)           <--- req.file
     *      created_at: string    ---> req.body.created_at
     *      updated_at: string    ---> req.body.updated_at
     *
     * res.body:
     *      error              when failure
     * */
    app.post('/mycloud/files/backup/', multerUpload.single('content'), async (req, res) => {
        if (req.body === undefined) {
            return res.status(400).json({
                error: `Body not found.`
            });
        }
        if (req.file === undefined) {
            return res.status(400).json({
                error: `File not found.`
            });
        }
        const
            /** @type {{user_key: string, serial: string, created_at: string, updated_at: string}} */
            {user_key: user_key, serial: serial, created_at: created_at, updated_at: updated_at} = req.body;
        if (typeof user_key !== 'string' || !legalUserKeyRegExp.test(user_key)) {
            return res.status(400).json({
                error: `"${user_key}" must be a valid user_key. Please Use [A-Za-z_][A-Za-z0-9_]{1024,1048576}.`
            });
        }
        if (typeof serial !== 'string' || !legalFileSerialRegExp.test(serial)) {
            return res.status(400).json({
                error: `"${user_key}" must be a valid user_key ([A-Za-z_][A-Za-z0-9_]{128,4096}). Please check the client implementation.`
            });
        }
        if (typeof created_at !== 'string' || created_at.length === 0) {
            return res.status(400).json({
                error: `created_at must be a non-empty string. Please check the client implementation.`
            });
        }
        if (typeof updated_at !== 'string') {
            return res.status(400).json({
                error: `updated_at must be a non-empty string. Please check the client implementation.`
            });
        }
        const
            /** @type {{encoding: string, mimetype: string, path: string, size: number}} */
            {encoding: fileEncoding, mimetype: fileType, path: filePath, size: fileSize} = req.file;
        if (typeof fileEncoding !== 'string' || typeof fileType !== 'string' || typeof fileSize !== 'number') {
            return res.status(400).json({
                error: `Failed to lookup the multer file record.`
            });
        }
        if (typeof filePath !== 'string') {
            return res.status(400).json({
                error: `Failed to lookup the multer file record.`
            });
        }
        const fileContent = await fs.promises.readFile(filePath).catch(_ => null);
        if (fileContent === null) {
            await fs.promises.unlink(filePath).catch(_ => undefined);
            return res.status(500).json({
                error: 'Failed to read the multer file.'
            });
        }
        // language=SQL format=false
        database.run(
            `INSERT INTO ${user_key} (serial, content, created_at, updated_at, file_size) VALUES (?, ?, ?, ?, ?)` +
            'ON CONFLICT(serial) DO UPDATE SET' +
            '    content    = excluded.content,' +
            '    updated_at = excluded.updated_at,' +
            '    file_size  = excluded.file_size',
            [serial, fileContent, created_at, updated_at, `${fileSize}`],
            async (upsertError) => {
                if (upsertError) {
                    await fs.promises.unlink(filePath).catch(_ => undefined);
                    return res.status(500).json({
                        error: `Failed to update the file content.`
                    });
                }
                if (serial === 'ROOT') { // clean up the files when ROOT updates, "content = rootFolder.getRecordsJSON()"
                    // TODO: Clean up the files when ROOT updates
                    console.log(` <-- User "${user_key.substring(0, 6)}.." made a new backup.`);
                }
                await fs.promises.unlink(filePath).catch(_ => undefined);
                return res.status(200).json({});
            }
        );
    });

    /**
     * This POST request
     *      Gets <content> by <serial> in the <user_key> table (getting <created_at> and <updated_at>)
     *
     * req.body:
     *      user_key: string
     *      serial: string
     *
     * res.header:
     *      error              when failure
     *      serial             when success     (for the convenience of client-side implementations)
     *      created_at         when success
     *      updated_at         when success
     *      file_size          when success
     *
     * res.arrayBuffer:
     *      content            when success
     * */
    app.post('/mycloud/files/recover/', multerUpload.none(), (req, res) => {
        if (req.body === undefined) {
            return res.status(400).json({
                error: `Body not found.`
            });
        }
        const
            /** @type {{user_key: string, serial: string}} */
            {user_key: user_key, serial: serial} = req.body;
        if (typeof user_key !== 'string' || !legalUserKeyRegExp.test(user_key)) {
            return res.status(400).json({
                error: `"${user_key}" must be a valid user_key. Please Use [A-Za-z_][A-Za-z0-9_]{1024,1048576}.`
            });
        }
        if (typeof serial !== 'string' || !legalFileSerialRegExp.test(serial)) {
            return res.status(400).json({
                error: `"${user_key}" must be a valid user_key ([A-Za-z_][A-Za-z0-9_]{128,4096}). Please check the client implementation.`
            });
        }
        // language=SQL format=false
        database.get(
            `SELECT content, created_at, updated_at, file_size FROM ${user_key} WHERE serial = ? LIMIT 1;`,
            [serial],
            (selectError, selectRow) => {
                if (selectError) {
                    return res.status(500).json({
                        error: 'Failed to find the file serial.'
                    });
                }
                if (serial === 'ROOT') {
                    console.log(` --> User "${user_key.substring(0, 6)}.." requested a previous backup.`);
                }
                res.set({
                    'Access-Control-Expose-Headers': 'X_serial, X_created_at, X_updated_at, X_file_size',
                    X_serial: serial,
                    X_created_at: selectRow.created_at,
                    X_updated_at: selectRow.updated_at,
                    X_file_size: selectRow.file_size
                });
                return res.status(200).send(selectRow.content);
            }
        );
    });
}

// MyCloud Compilation Server POSTs
{
    /**
     * This POST request
     *      compiles .js/.c/.cpp/.py file to .wasm file/////
     *
     * req:
     *      content            ---> req.file
     *      (file_size)        <--- req.file
     *
     * res.body:
     *      error              when failure
     *
     * res.arrayBuffer:
     *      content            when success
     * */
    app.post('/mycloud/compile/javascript', multerUpload.single('content'), async (req, res) => {

    });
}

const
    HOST = '0.0.0.0',
    PORT = 80,
    server = app.listen(PORT, HOST, () => {
        console.log(`Server listening on http://${HOST}:${PORT}.`);
    }),
    shutdownServer = (signal) => {
        console.log(`\n${signal} received: shutting down...`);
        server.close((serverCloseError) => {
            if (serverCloseError) {
                console.error(`Failed to close the server. <-- ${serverCloseError}`);
                process.exit(1);
                return;
            }
            console.log('The server is closed.');
            database.close((databaseCloseError) => {
                if (databaseCloseError) {
                    console.error(`Failed to close the database. <-- ${databaseCloseError}`);
                    process.exit(1);
                    return;
                }
                console.log('The database is closed.');
                process.exit(0);
            });
        });
    };

process.on('SIGINT', () => shutdownServer('SIGINT'));
process.on('SIGTERM', () => shutdownServer('SIGTERM'));