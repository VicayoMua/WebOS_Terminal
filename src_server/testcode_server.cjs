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