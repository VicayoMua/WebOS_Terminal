// const o = {
//     '1234': 0,
//     'abc': 1
// };
//
// console.log(123 in o);

// `
//             CREATE TABLE IF NOT EXISTS files (
//                 serial         TEXT PRIMARY KEY,         -- unique file serial number (string)
//                 encoding       TEXT NOT NULL,            -- encoding of the blob
//                 content        BLOB NOT NULL,            -- binary-safe content
//                 created_at     DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
//                 updated_at     DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP)
//             ) WITHOUT ROWID;                          -- good when PRIMARY KEY is not an integer
//         `;

/*
* Get one file by serial
* req.params:
*       serial: string
* */
// app.get

/*
* Create/Update one file by serial
* req.params:
*       serial: string
* req.body:
*       encoding: string
*       content: string
* */
// app.post

/*
* Delete one file by serial
* req.params:
*       serial: string
* */
// app.delete