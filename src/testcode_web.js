import {
    File,
    formData,
    getISOTimeString,
    legalFileSerialRegExp,
    legalFileSystemKeyNameRegExp,
    RGBColor,
    utf8Decoder, utf8Encoder
} from "./terminal_core";

if (
    parameters.length === 3 &&
    parameters[0].length > 6 && parameters[0].startsWith('-ipp=') &&  // ip:port
    parameters[1].length > 5 && parameters[1].startsWith('-key=')     // user key
) {
    const
        ipp = parameters[0].substring(5),
        user_key = parameters[1].substring(5);
    if (parameters[2] === '-new') { // Command: mycloud -ipp=[ip:port] -key=[user_key] -new
        try {
            const [status, stream] = await fetch(
                `http://${ipp}/mycloud/users/register/`,
                {
                    method: 'POST',
                    body: formData({ // short enough so we can use JSON
                        user_key: user_key
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
    if (parameters[2] === '-conf') { // Command: mycloud -ipp=[ip:port] -key=[user_key] -conf
        try {
            const [status, stream] = await fetch(
                `http://${ipp}/mycloud/users/validate/`,
                {
                    method: 'POST',
                    body: formData({ // short enough so we can use JSON
                        user_key: user_key
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
            const {result: result} = stream; // stream here is a json object
            if (result !== true) {
                currentTerminalCore.printToWindow(' --> The user key does not exist.', RGBColor.yellow);
                return;
            }
            currentTerminalCore.printToWindow(
                ' --> The user key is valid.\n' +
                ' --> Generating the configuration file at /.mycloud_conf.\n',
                RGBColor.green
            );
            if (_fsRoot_.hasFile('.mycloud_conf')) { // .mycloud_conf is already existing
                _fsRoot_.getFile('.mycloud_conf').setContent(utf8Encoder.encode(`${parameters[0]}\n${parameters[1]}`).buffer, false);
            } else {
                const [file, _] = _fsRoot_.createFile(false, '.mycloud_conf', _serialLake_.generateNext());
                file.setContent(utf8Encoder.encode(`${parameters[0]}\n${parameters[1]}`).buffer, false);
            }
            currentTerminalCore.printToWindow(' --> Successfully configured MyCloud Client.', RGBColor.green);
        } catch (error) {
            currentTerminalCore.printToWindow(`${error}`, RGBColor.red);
        }
        return;
    }
}

if (parameters.length === 1) {
    // get the configuration file
    // if (!_fsRoot_.hasFile('.mycloud_conf')) {
    //     currentTerminalCore.printToWindow(` --> Fail to load the configuration file at /.mycloud_conf.`, RGBColor.red);
    //     return;
    // }
    // const
    //     confFileContent = _fsRoot_.getFile('.mycloud_conf').getContent(),
    //     confContent = utf8Decoder.decode(confFileContent),
    //     ippIndex = confContent.indexOf('-ipp='),
    //     enterIndex = confContent.indexOf('\n'),
    //     keyIndex = confContent.indexOf('-key=');
    // // check the configuration file content
    // if (
    //     ippIndex === -1 || enterIndex === -1 || keyIndex === -1 ||
    //     ippIndex + 4 >= enterIndex || enterIndex >= keyIndex || keyIndex + 4 >= confContent.length - 1
    // ) {
    //     currentTerminalCore.printToWindow(` --> The configuration file content (/.mycloud_conf) is illegal.`, RGBColor.red);
    //     return;
    // }
    const
        ipp = confContent.substring(ippIndex + 5, enterIndex),
        user_key = confContent.substring(keyIndex + 5);
    // check the content of <ipp> and <user_key>
    if (ipp.length === 0 || user_key.length === 0) {
        currentTerminalCore.printToWindow(` --> The configuration file content (/.mycloud_conf) is illegal.`, RGBColor.red);
        return;
    }
    if (parameters[0] === '-backup') { // Command: mycloud -backup
        currentTerminalCore.printToWindow(` --> Backing up the file system to ${ipp} as '${user_key.substring(0, 6)}..'\n`, RGBColor.green);
        try {
            const
                settledResults = await Promise.allSettled(_fsRoot_.getFilesAsList().map((file) =>
                    fetch(
                        `http://${ipp}/mycloud/files/backup/`,
                        {
                            method: 'POST',
                            body: formData({
                                user_key: user_key,
                                serial: file.getSerial(),
                                content: new Blob([file.getContent()], {type: 'application/octet-stream'}),
                                created_at: file.getCreatedAt(),
                                updated_at: file.getUpdatedAt()
                            })
                        }
                    ).then(
                        async (res) => [res.status, await res.json()]
                    )
                )),
                anyFailure = settledResults.some((settledResult) => {
                    if (settledResult.status === 'rejected') {
                        currentTerminalCore.printToWindow(`${settledResult.reason}\n`, RGBColor.red);
                        return true; // failure
                    }
                    if (settledResult.status === 'fulfilled') {
                        const [status, stream] = settledResult.value;
                        if (status !== 200) {
                            const {error: error} = stream; // stream here is a json object
                            currentTerminalCore.printToWindow(`${error}\n`, RGBColor.red);
                            return true; // failure
                        }
                        return false; // success
                    }
                    return true;
                });
            if (anyFailure) {
                currentTerminalCore.printToWindow(' --> Failed to back up the files.', RGBColor.red);
                return;
            }
            const [status, stream] = await fetch(
                `http://${ipp}/mycloud/files/backup/`,
                {
                    method: 'POST',
                    body: formData({
                        user_key: user_key,
                        serial: 'ROOT',
                        content: new Blob([_fsRoot_.getRecordsJSON()], {type: 'application/octet-stream'}),
                        created_at: getISOTimeString(),
                        updated_at: getISOTimeString()
                    })
                }
            ).then(
                async (res) => [res.status, await res.json()]
            );
            if (status !== 200) {
                const {error: error} = stream; // stream here is a json object
                currentTerminalCore.printToWindow(`${error}\n`, RGBColor.red);
                currentTerminalCore.printToWindow(` --> Failed to back up the ROOT map.`, RGBColor.red);
                return;
            }
            currentTerminalCore.printToWindow(' --> Successfully backed up the file system to MyCloud server.', RGBColor.green);
        } catch (error) {
            currentTerminalCore.printToWindow(`${error}`, RGBColor.red);
        }
        return;
    }
    if (parameters[0] === '-recover') { // Command: mycloud -recover
        currentTerminalCore.printToWindow(`Recovering the file system from ${ipp} as '${user_key.substring(0, 6)}..'\n`, RGBColor.green);
        try {
            // get the ROOT map
            const [statusROOT, streamROOT] = await fetch(
                `http://${ipp}/mycloud/files/recover/`,
                {
                    method: 'POST',
                    body: formData({
                        user_key: user_key,
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
                                user_key: user_key,
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
}