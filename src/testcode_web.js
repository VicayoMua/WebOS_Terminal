import {
    File,
    formData,
    getISOTimeString,
    legalFileSerialRegExp,
    legalFileSystemKeyNameRegExp,
    RGBColor,
    utf8Decoder, utf8Encoder
} from "./terminal_core";


const
    ipp = parameters[0].substring(5),
    userKey = parameters[1].substring(5);
if (parameters[2] === '-new') { // Command: mycloud -ipp=[ip:port] -key=[userKey] -new
    try {
        const [status, stream] = await fetch(
            `http://${ipp}/mycloud/users/register/`,
            {
                method: 'POST',
                body: formData({ // short enough so we can use JSON
                    user_key: userKey
                })
            }
        ).then(
            async (res) => [res.status, await res.json()]
        );
        if (status !== 200) {
            const {error: error} = stream; // stream here is a json object
            currentTerminalCore.printToWindow(`${error}`, RGBColor.red);
            return;
        }
        currentTerminalCore.printToWindow(' --> Registered a user key.', RGBColor.green);
    } catch (error) {
        currentTerminalCore.printToWindow(`${error}`, RGBColor.red);
    }
    return;
}


if (parameters[0] === '-recover') { // Command: mycloud -recover
    currentTerminalCore.printToWindow(`Recovering the file system from ${ipp} as '${userKey.substring(0, 6)}..'\n`, RGBColor.green);
    try {
        // get the ROOT map
        const [statusROOT, streamROOT] = await fetch(
            `http://${ipp}/mycloud/files/recover/`,
            {
                method: 'POST',
                body: formData({
                    user_key: userKey,
                    serial: 'ROOT'
                })
            }
        ).then(
            async (res) => {
                const status = res.status;
                return [status, status === 200 ? await res.arrayBuffer() : await res.json()];
            }
        );
        if (statusROOT !== 200) {
            const {error: error} = streamROOT; // stream here is a json object
            currentTerminalCore.printToWindow(`${error}\n`, RGBColor.red);
            currentTerminalCore.printToWindow(` --> Failed to recover the ROOT map.`, RGBColor.red);
            return;
        }
        const
            /** @type {Object} */
            plainRootFolderObject = JSON.parse(utf8Decoder.decode(streamROOT)), // stream here is an arrayBuffer
            /** @type {string[]} */
            fileSerials = [];
        // check the information in <plainRootFolderObject>, while getting all file serials
        {
            /**
             * This implementation maximizes the compatibility of received JSON.
             * This function is ONLY immediately-called.
             * @param {Object} plainFolderObject
             * @returns {void}
             * @throws {TypeError}
             * */
            (function checkPlainFolderObject_gettingFileSerials(plainFolderObject) {
                if (typeof plainFolderObject.subfolders === 'object') { // {name: plainFolderObject}
                    Object.entries(plainFolderObject.subfolders).forEach(([subfolderName, psfo]) => {
                        if (typeof subfolderName !== 'string' || !legalFileSystemKeyNameRegExp.test(subfolderName))
                            throw new TypeError('Subfolder name in the plain folder object must be legal.');
                        if (typeof psfo !== 'object')
                            throw new TypeError('Plain subfolder object in the plain folder object must be an object.');
                        checkPlainFolderObject_gettingFileSerials(psfo);
                    });
                }
                if (typeof plainFolderObject.files === 'object') { // {name: fileSerial}
                    Object.entries(plainFolderObject.files).forEach(([fileName, fileSerial]) => {
                        if (typeof fileName !== 'string' || !legalFileSystemKeyNameRegExp.test(fileName))
                            throw new TypeError('File name in the plain folder object must be legal.');
                        if (typeof fileSerial !== 'string' || !legalFileSerialRegExp.test(fileSerial))
                            throw new TypeError('File serial in the plain folder object must be legal.');
                        fileSerials.push(fileSerial);
                    });
                }
                if (typeof plainFolderObject.created_at === 'string') { // string
                    if (plainFolderObject.created_at.length === 0)
                        throw new TypeError('created_at in the plain folder object must be a non-empty string.');
                }
                if (typeof plainFolderObject.folderLinks === 'object') { // {name: link}
                    Object.entries(plainFolderObject.folderLinks).forEach(([folderLinkName, folderLink]) => {
                        if (typeof folderLinkName !== 'string' || !legalFileSystemKeyNameRegExp.test(folderLinkName))
                            throw new TypeError('Folder link name in the plain folder object must be legal');
                        if (typeof folderLink !== 'string' || folderLink.length === 0)
                            throw new TypeError('Folder link in the plain folder object must be a non-empty string.');
                    });
                }
                if (typeof plainFolderObject.fileLinks === 'object') { // {name: link}
                    Object.entries(plainFolderObject.fileLinks).forEach(([fileLinkName, fileLink]) => {
                        if (typeof fileLinkName !== 'string' || !legalFileSystemKeyNameRegExp.test(fileLinkName))
                            throw new TypeError('File link name in the plain folder object must be legal.');
                        if (typeof fileLink !== 'string' || fileLink.length === 0)
                            throw new TypeError('File link in the plain folder object must be a non-empty string.');
                    });
                }
            })(plainRootFolderObject);
        }
        // get the files and construct files map
        const
            settledResults = await Promise.allSettled(fileSerials.map((fileSerial) =>
                fetch( // {error, content, created_at, updated_at}
                    `http://${ipp}/mycloud/files/recover/`,
                    {
                        method: 'POST',
                        body: formData({
                            user_key: userKey,
                            serial: fileSerial
                        })
                    }
                ).then(
                    async (res) => {
                        const status = res.status;
                        const headers = {
                            serial: res.headers.get('X_serial'),
                            created_at: res.headers.get('X_created_at'),
                            updated_at: res.headers.get('X_updated_at'),
                            file_size: res.headers.get('X_file_size')
                        };
                        return [status, headers, status === 200 ? await res.arrayBuffer() : await res.json()];
                    }
                )
            )),
            [anyFailure, filesMap] = settledResults.reduce(
                ([af, fm], settledResult) => {
                    if (settledResult.status === 'rejected') {
                        currentTerminalCore.printToWindow(`${settledResult.reason}\n`, RGBColor.red);
                        return [true, fm]; // failure
                    }
                    if (settledResult.status === 'fulfilled') {
                        const [
                            status,
                            {serial, created_at, updated_at, file_size},
                            stream
                        ] = settledResult.value;
                        if (status !== 200) {
                            const {error: error} = stream; // stream here is a json object
                            currentTerminalCore.printToWindow(`${error}\n`, RGBColor.red);
                            return [true, fm]; // failure
                        }
                        if (serial.length === 0 || created_at.length === 0 || updated_at.length === 0) {
                            currentTerminalCore.printToWindow(' --> There is an illegal file.\n', RGBColor.red);
                            return [true, fm]; // failure
                        }
                        fm[serial] = new File(serial, stream, created_at, updated_at); // stream here is an arrayBuffer
                        return [af, fm]; // success
                    }
                    return [true, fm];
                },
                [false, {}]
            );
        if (anyFailure) {
            currentTerminalCore.printToWindow(' --> Failed to recover the files.', RGBColor.red);
            return;
        }
        // recover <_serialLake_> with <fileSerials>
        _serialLake_.recover(fileSerials);
        // recover _fsRoot_ with <plainRootFolderObject> and <filesMap>
        {
            /**
             * This implementation maximizes the compatibility of received JSON.
             * This function is ONLY immediately-called.
             * @param {Object} plainFolderObject
             * @param {Folder} destFolder
             * @returns {void}
             * @throws {TypeError | Error}
             * */
            (function recoverFSRoot(plainFolderObject, destFolder) {
                if (typeof plainFolderObject.subfolders === 'object') { // {name: plainFolderObject}
                    Object.entries(plainFolderObject.subfolders).forEach(([subfolderName, psfo]) => {
                        recoverFSRoot(psfo, destFolder.createSubfolder(false, subfolderName));
                    });
                }
                if (typeof plainFolderObject.files === 'object') { // {name: fileSerial}
                    Object.entries(plainFolderObject.files).forEach(([fileName, fileSerial]) => {
                        destFolder.createFileDangerous(fileName, filesMap[fileSerial]);
                    });
                }
                if (typeof plainFolderObject.created_at === 'string') { // string
                    destFolder.setCreatedAt(plainFolderObject.created_at);
                }
                if (typeof plainFolderObject.folderLinks === 'object') { // {name: link}
                    Object.entries(plainFolderObject.folderLinks).forEach(([folderLinkName, folderLink]) => {
                        destFolder.createFolderLink(folderLinkName, folderLink);
                    });
                }
                if (typeof plainFolderObject.fileLinks === 'object') { // {name: link}
                    Object.entries(plainFolderObject.fileLinks).forEach((fileLinkName, fileLink) => {
                        destFolder.createFileLink(fileLinkName, fileLink);
                    });
                }
            })(plainRootFolderObject, _fsRoot_.clear());
        }
        currentTerminalCore.printToWindow(' --> Successfully recovered the file system from MyCloud server.', RGBColor.green);
    } catch (error) {
        currentTerminalCore.printToWindow(`${error}`, RGBColor.red);
    }
    return;
}
