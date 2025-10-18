/*
* **************************************************************************************************************
*
*                                              START OF FILE
*
*             This file initializes the terminal window frame and all the terminal core services.
*
* **************************************************************************************************************
* */

/*
* This is the system Date-and-Time utils.
* */
const
    getTimeNumber = () => new Date().getTime(),
    getHumanReadableTime = () => new Date().toISOString();

/**
 * This regular expression checks whether a string is a legal key-name in the file system.
 * */
const legalKeyNameInFileSystem = /^(?!\.{1,2}$)[^\/\0]{1,1024}$/;

class SerialLake {
    /** @type {Set<string>} */
    #serialSet;

    /**
     * @param {string[]} init
     * */
    constructor(init) {
        this.#serialSet = new Set(init);
    }

    /**
     * @returns {string}
     * */
    generateNext() {
        let s;
        do {
            s = Math.random();
        } while (this.#serialSet.has(`${s}`));
        this.#serialSet.add(`${s}`);
        return `${s}`;
    }
}

/*
* This structure represents a single file in the file system.
* Each instance is submitted to the file server.
* */
class File {
    /** @type {string} */
    #serial;
    /** @type {string} */
    #content;
    /** @type {number} */
    #created_at;
    /** @type {number} */
    #updated_at;

    // JSON(){
    //     throw new Error('Not implemented');
    // }

    /**
     * @param {string} serial
     * @param {string} content
     * @throws {TypeError}
     * */
    constructor(serial, content) {
        if (typeof serial !== 'string' || typeof content !== 'string')
            throw new TypeError('Parameters must have correct data types');
        this.#serial = serial;
        this.#content = content;
        this.#created_at = getTimeNumber();
        this.#updated_at = getTimeNumber();
    }

    /**
     * @param {string} serial
     * @returns {File}
     * */
    copy(serial) {
        return new File(serial, this.#content);
    }

    /**
     * @returns {string}
     * */
    getSerial() {
        return this.#serial;
    }

    /**
     * @returns {string}
     * */
    getContent() {
        return this.#content;
    }

    /**
     * @param {string} newContent
     * @returns {void}
     * */
    setContent(newContent) {
        this.#content = newContent;
        this.#updated_at = getTimeNumber();
    }
}

/*
* This structure represents a single folder in the file system.
* The root folder is submitted to the file server as a JSON file.
* */
class Folder {
    /** @type {Folder} */
    parentFolder;                    // NOT IN JSON, BUILT DURING RECOVERY
    /** @type {Record<string, Folder>} */
    subfolders;          // IN JSON
    /** @type {Record<string, File>} */
    files;                 // IN JSON, name <--> serial
    /** @type {number} */
    #created_at;                    // IN JSON
    /** @type {Record<string, string>} */
    folderLinks;         // IN JSON
    /** @type {Record<string, string>} */
    fileLinks;           // IN JSON

    /**
     * @returns {string}
     * This function converts the current Folder object to a JSON string
     * */
    JSON() {
        /**
         * @param {Folder} folder
         * @returns {{subfolder, files, created_at, folderLinks, fileLinks}}
         * */
        function toPlainObject(folder) {
            return {
                subfolder: Object.entries(folder.subfolders).reduce(
                    (acc, [name, subfolder]) => {
                        acc[name] = toPlainObject(subfolder);
                        return acc;
                    },
                    {}
                ),
                files: Object.entries(folder.files).reduce(
                    (acc, [name, file]) => {
                        acc[name] = file.getSerial();
                        return acc;
                    },
                    {}
                ),
                created_at: folder.getCreatedAt(),
                folderLinks: Object.entries(folder.folderLinks).reduce(
                    (acc, [name, folderLink]) => {
                        acc[name] = folderLink;
                        return acc;
                    },
                    {}
                ),
                fileLinks: Object.entries(folder.fileLinks).reduce(
                    (acc, [name, fileLink]) => {
                        acc[name] = fileLink;
                        return acc;
                    },
                    {}
                )
            };
        }

        return JSON.stringify(toPlainObject(this));
    }

    /**
     * @param {boolean} is_root
     * @param {Folder} parentFolder
     * @throws {TypeError | Error}
     * */
    constructor(is_root, parentFolder) {
        // parameter check
        if (typeof is_root !== 'boolean')
            throw new TypeError('Parameters must have correct data types');
        if (is_root && parentFolder !== undefined) {
            throw new Error('The parent folder cannot be specified when creating a root');
        }
        if (!is_root && parentFolder !== null && !(parentFolder instanceof Folder)) {
            throw new Error('The parent folder must be specified when creating a regular folder');
        }
        // process data
        this.parentFolder = is_root ? this : parentFolder;
        this.subfolders = {};
        this.files = {};
        this.#created_at = getTimeNumber();
        this.folderLinks = {};
        this.fileLinks = {};
    }

    /**
     * @param {Folder} parentFolder
     * @returns {Folder}
     * */
    deepCopyTo(parentFolder) {
        const dcFolder = new Folder(false, parentFolder);
        for (const fileKey in this.files)
            dcFolder.files[fileKey] = this.files[fileKey];
        dcFolder.#created_at = getTimeNumber();
        for (const folderLinkKey in this.folderLinks)
            dcFolder.folderLinks[folderLinkKey] = this.folderLinks[folderLinkKey];
        for (const fileLinkKey in this.fileLinks)
            dcFolder.fileLinks[fileLinkKey] = this.fileLinks[fileLinkKey];
        for (const subfolderKey in this.subfolders)
            dcFolder.subfolders[subfolderKey] = this.subfolders[subfolderKey].deepCopyTo(dcFolder);
        return dcFolder;
    }

    /**
     * @returns {number}
     * */
    getCreatedAt() {
        return this.#created_at;
    }

    /**
     * @returns {string}
     * */
    getContentListAsString() {
        let contents = '';
        const
            folderNames = Object.keys(this.subfolders),
            fileNames = Object.keys(this.files),
            folderLinkNames = Object.keys(this.folderLinks),
            fileLinkNames = Object.keys(this.fileLinks);
        if (folderNames.length > 0)
            contents += 'Folders:' + folderNames.reduce(
                (acc, elem) => `${acc}\n            ${elem}`,
                ''
            );
        if (contents.length > 0 && fileNames.length > 0)
            contents += '\n';
        if (fileNames.length > 0)
            contents += 'Files:' + fileNames.reduce(
                (acc, elem) => `${acc}\n            ${elem}`,
                ''
            );
        if (contents.length > 0 && folderLinkNames.length > 0)
            contents += '\n';
        if (folderLinkNames.length > 0)
            contents += 'Folder Links:' + folderLinkNames.reduce(
                (acc, elem) => `${acc}\n            ${elem}`,
                ''
            );
        if (contents.length > 0 && fileLinkNames.length > 0)
            contents += '\n';
        if (fileLinkNames.length > 0)
            contents += 'File Links:' + fileLinkNames.reduce(
                (acc, elem) => `${acc}\n            ${elem}`,
                ''
            );
        return contents.length === 0 ? 'No file or folder existing here...' : contents;
    }

    /**
     * @param {string} fileName
     * @returns {boolean}
     * */
    hasFile(fileName) {
        return (legalKeyNameInFileSystem.test(fileName) && this.files[fileName] instanceof File);
    }

    /**
     * @param {string} subfolderName
     * @returns {boolean}
     * */
    hasSubfolder(subfolderName) {
        return (legalKeyNameInFileSystem.test(subfolderName) && this.subfolders[subfolderName] instanceof Folder);
    }

    /**
     * @param {string} fileName
     * @returns {File}
     * @throws {Error}
     * */
    getFile(fileName) {
        if (!legalKeyNameInFileSystem.test(fileName))
            throw new Error(`File name is illegal`);
        const file = this.files[fileName];
        if (file instanceof File)
            return file;
        throw new Error(`File ${fileName} not found`);
    }

    /**
     * @param {boolean} fix_duplicated_filename
     * @param {string} fileName
     * @param {string} fileSerial
     * @returns {[File, string]}
     * @throws {Error}
     * */
    createNewFile(fix_duplicated_filename, fileName, fileSerial) {
        if (!legalKeyNameInFileSystem.test(fileName))
            throw new Error(`File name is illegal`);
        if (typeof fileSerial !== 'string' || fileSerial.length === 0)
            throw new Error(`File Serial is illegal`);
        if (this.files[fileName] instanceof File) {
            if (!fix_duplicated_filename)
                throw new Error(`File ${fileName} is already existing`);
            let i = 2;
            while (this.files[`${fileName} ${i}`] instanceof File)
                i++;
            fileName = `${fileName} ${i}`;
        }
        return [(this.files[fileName] = new File(fileSerial, '')), fileName];
    }

    /**
     * @param {string} oldFileName
     * @param {string} newFileName
     * @returns {File}
     * @throws {Error}
     * */
    renameExistingFile(oldFileName, newFileName) {
        if (!legalKeyNameInFileSystem.test(oldFileName) || !legalKeyNameInFileSystem.test(newFileName))
            throw new Error(`File name is illegal`);
        if (!(this.files[oldFileName] instanceof File))
            throw new Error(`File ${oldFileName} not found`);
        if (this.files[newFileName] instanceof File)
            throw new Error(`File ${newFileName} already exists`);
        this.files[newFileName] = this.files[oldFileName];
        delete this.files[oldFileName];
        return this.files[newFileName];
    }

    /**
     * @param {string} fileName
     * @returns {void}
     * @throws {Error}
     * */
    deleteFile(fileName) {
        if (!legalKeyNameInFileSystem.test(fileName))
            throw new Error(`File name is illegal`);
        if (!(this.files[fileName] instanceof File))
            throw new Error(`File ${fileName} not found`);
        delete this.files[fileName];
    }

    /**
     * @param {string} subfolderName
     * @returns {Folder}
     * @throws {Error}
     * */
    createSubfolder(subfolderName) {
        if (!legalKeyNameInFileSystem.test(subfolderName))
            throw new Error(`Subfolder name is illegal`);
        if (this.subfolders[subfolderName] instanceof Folder)
            throw new Error(`Subfolder ${subfolderName} is already existing`);
        return (this.subfolders[subfolderName] = new Folder(false, this));
    }

    /**
     * @returns {Object}
     * */
    getZipBlob() {
        /**
         * This function helps recursively add folder content to the zip file
         * @param {Folder} folderObject
         * @param {Object} zipObject
         * @returns {void}
         * */
        function addFolderToZip(folderObject, zipObject) {
            for (const [fileName, file] of Object.entries(folderObject.files))
                zipObject.file(fileName, file.getContent(), {binary: true});
            for (const [subfolderName, subfolderObject] of Object.entries(folderObject.subfolders))
                addFolderToZip(subfolderObject, zipObject.folder(subfolderName));
        }

        // Create a new JSZip instance to generate the .zip file
        const zip = new JSZip();
        // Start the process from the current folder
        addFolderToZip(this, zip); // '' means root of the zip
        // Generate the zip file as a Blob
        return zip.generateAsync({type: 'blob'});
    }
}

/**
 * This function shallow-moves <.files> and <.subfolders> from <srcFolder> to <destFolder>.
 * Before the movement, <destFolder> should be set up.
 * After the movement, <srcFolder> should be __discarded__ (to avoid shared object pointers).
 * @param {Folder} destFolder
 * @param {Folder} srcFolder
 * @returns {void}
 * @throws {TypeError}
 * */
function shallowMoveFolders(destFolder, srcFolder) {
    // check the data type
    if (!(destFolder instanceof Folder) || !(srcFolder instanceof Folder))
        throw new TypeError('Parameters must have correct data types');
    // process the data
    for (const fileKey in srcFolder.files) {
        if (!(destFolder.files[fileKey] instanceof File)) {
            destFolder.files[fileKey] = srcFolder.files[fileKey];
        } else {
            destFolder.files[`${getHumanReadableTime()}_${fileKey}`] = srcFolder.files[fileKey];
        }
    }
    for (const folderLinkKey in srcFolder.folderLinks) {
        if (typeof destFolder.folderLinks[folderLinkKey] !== 'string') {
            destFolder.folderLinks[folderLinkKey] = srcFolder.folderLinks[folderLinkKey];
        } else {
            destFolder.folderLinks[`${getHumanReadableTime()}_${folderLinkKey}`] = srcFolder.folderLinks[folderLinkKey];
        }
    }
    for (const fileLinkKey in srcFolder.fileLinks) {
        if (typeof destFolder.fileLinks[fileLinkKey] !== 'string') {
            destFolder.fileLinks[fileLinkKey] = srcFolder.fileLinks[fileLinkKey];
        } else {
            destFolder.fileLinks[`${getHumanReadableTime()}_${fileLinkKey}`] = srcFolder.fileLinks[fileLinkKey];
        }
    }
    for (const folderKey in destFolder.subfolders) {
        if (!(destFolder.subfolders[folderKey] instanceof Folder)) {
            destFolder.subfolders[folderKey] = srcFolder.subfolders[folderKey];
            destFolder.subfolders[folderKey].parentFolder = destFolder; // reset parent folder
        } else {
            shallowMoveFolders(destFolder.subfolders[folderKey], srcFolder.subfolders[folderKey]);
        }
    }
}

class TerminalFolderPointer {
    /** @type {Folder} */
    #fsRoot;
    /** @type {Folder} */
    #currentFolder;
    /** @type {string[]} */
    #currentFolderTrackingStack;

    /**
     * @param {Folder} fsRoot
     * @param {Folder} currentFolder
     * @param {string[]} currentFullPathStack
     * @throws {TypeError}
     * */
    constructor(fsRoot, currentFolder = fsRoot, currentFullPathStack = []) {
        if (!(fsRoot instanceof Folder) || !(currentFolder instanceof Folder) || !(currentFullPathStack instanceof Array))
            throw new TypeError('Parameters must have correct data types');
        this.#fsRoot = fsRoot;
        this.#currentFolder = currentFolder;
        this.#currentFolderTrackingStack = currentFullPathStack;
    }

    /**
     * @returns {TerminalFolderPointer}
     * @throws {TypeError}
     * */
    duplicate() {
        return new TerminalFolderPointer(
            this.#fsRoot, // shallow copy
            this.#currentFolder, // shallow copy
            this.#currentFolderTrackingStack.map(x => x) // deep copy
        )
    }

    /**
     * @returns {Folder}
     * */
    getCurrentFolder() {
        return this.#currentFolder;
    }

    /**
     * @returns {string}
     * */
    getFullPath() {
        return this.#currentFolderTrackingStack.length === 0 ? '/' :
            this.#currentFolderTrackingStack.reduce((acc, elem) => `${acc}/${elem}`, '');
    }

    /**
     * @returns {Folder}
     * */
    gotoRoot() {
        this.#currentFolder = this.#fsRoot;
        this.#currentFolderTrackingStack = [];
        return this.#fsRoot;
    }

    /**
     * @returns {Folder}
     * */
    gotoParentFolder() {
        if (this.#currentFolderTrackingStack.length > 0)
            this.#currentFolderTrackingStack.pop()
        return (this.#currentFolder = this.#currentFolder.parentFolder);
    }

    /**
     * @param {boolean} include_link
     * @param {string} subfolderName
     * @returns {Folder}
     * @throws {Error}
     * */
    gotoSubfolder(include_link, subfolderName) {
        if (!legalKeyNameInFileSystem.test(subfolderName))
            throw new Error(`Subfolder name is illegal`);
        const nextFolder = this.#currentFolder.subfolders[subfolderName];
        if (nextFolder instanceof Folder) {
            this.#currentFolderTrackingStack.push(subfolderName);
            return (this.#currentFolder = nextFolder);
        }
        const nextFolderLink = this.#currentFolder.folderLinks[subfolderName];
        if (include_link && typeof nextFolderLink === 'string') {
            const pointer2 = this.duplicate();
            pointer2.gotoPath(nextFolderLink);
            this.#currentFolderTrackingStack = pointer2.#currentFolderTrackingStack;
            return (this.#currentFolder = pointer2.#currentFolder);
        }
        throw new Error(`Folder ${subfolderName} not found`);
    }

    /**
     * @param {string} path
     * @returns {Folder}
     * @throws {Error}
     * */
    gotoPath(path) {
        if (path.length === 0)
            throw new Error('Path cannot be empty');
        const
            pathStack = path.split('/').filter((s) => s.length > 0),
            tfp = this.duplicate();
        if (path.startsWith('/')) {
            tfp.gotoRoot();
        }
        for (const folderName of pathStack) {
            switch (folderName) {
                case '.': {
                    // do nothing (goto the current folder)
                    break;
                }
                case '..': {
                    tfp.gotoParentFolder();
                    break;
                }
                default: {
                    tfp.gotoSubfolder(false, folderName);
                    break;
                }
            }
        }
        this.#currentFolderTrackingStack = tfp.#currentFolderTrackingStack;
        return (this.#currentFolder = tfp.#currentFolder);
    }

    /**
     * @param {string} path
     * @param {boolean} goto_new_folder
     * @returns {TerminalFolderPointer}
     * @throws {Error}
     * */
    createPath(path, goto_new_folder = false) {
        if (path.length === 0)
            throw new Error('Path cannot be empty');
        const
            pathStack = path.split('/').filter((s) => s.length > 0),
            tfp = this.duplicate();
        if (path.startsWith('/')) {
            tfp.gotoRoot();
        }
        // check the availability of path for creation
        for (const folderName of pathStack) {
            switch (folderName) {
                case '.': {
                    break;
                }
                case '..': {
                    break;
                }
                default: {
                    if (!legalKeyNameInFileSystem.test(folderName))
                        throw new Error(`Path name is illegal`);
                    break;
                }
            }
        }
        // do the creation of path
        for (const folderName of pathStack) {
            switch (folderName) {
                case '.': {
                    // do nothing (goto the current folder)
                    break;
                }
                case '..': {
                    tfp.gotoParentFolder();
                    break;
                }
                default: {
                    if (!(tfp.#currentFolder.subfolders[folderName] instanceof Folder))
                        tfp.#currentFolder.createSubfolder(folderName);
                    tfp.#currentFolder = tfp.#currentFolder.subfolders[folderName];
                    tfp.#currentFolderTrackingStack.push(folderName);
                    break;
                }
            }
        }
        if (goto_new_folder) {
            this.#currentFolder = tfp.#currentFolder;
            this.#currentFolderTrackingStack = tfp.#currentFolderTrackingStack;
        }
        return this;
    }

    /**
     * @param {'file' | 'directory'} type
     * @param {string} oldPath
     * @param {string} newPath
     * @returns {TerminalFolderPointer}
     * @throws {Error}
     * */
    movePath(type, oldPath, newPath) {
        /*
        *  When moving a single file, if the destination is already existing, then the copy will stop.
        *
        *  When moving a folder, if a destination folder is already existing, then the folders will be merged;
        *                            if a destination file is already existing, then the file will be renamed and copied.
        * */
        switch (type) {
            case 'file': {
                // analyze the old file path
                let index = oldPath.lastIndexOf('/');
                const [oldFileDir, oldFileName] = (() => {
                    if (index === -1) return ['.', oldPath];
                    if (index === 0) return ['/', oldPath.slice(1)];
                    return [oldPath.substring(0, index), oldPath.slice(index + 1)];
                })();
                if (!legalKeyNameInFileSystem.test(oldFileName))
                    throw new Error(`The old file name is illegal`);
                // analyze the new file path
                index = newPath.lastIndexOf('/');
                const [newFileDir, newFileName] = (() => {
                    if (index === -1) return ['.', newPath];
                    if (index === 0) return ['/', newPath.slice(1)];
                    return [newPath.substring(0, index), newPath.slice(index + 1)];
                })();
                if (!legalKeyNameInFileSystem.test(newFileName))
                    throw new Error(`The new file name is illegal`);
                // check the old file status
                const fp_old = this.duplicate();
                fp_old.gotoPath(oldFileDir);
                const oldFile = fp_old.#currentFolder.files[oldFileName];
                if (!(oldFile instanceof File))
                    throw new Error(`The old file is not found`);
                // check the new file status
                const fp_new = this.duplicate();
                fp_new.createPath(newFileDir, true);
                if (fp_new.#currentFolder.files[newFileName] instanceof File)
                    throw new Error(`The new file is already existing`);
                // do the movement
                delete fp_old.#currentFolder.files[oldFileName];
                fp_new.#currentFolder.files[newFileName] = oldFile;
                break;
            }
            case 'directory': {
                // analyze the old dir path
                let index = oldPath.lastIndexOf('/');
                const [oldDirParent, oldDirName] = (() => {
                    if (index === -1) return ['.', oldPath];
                    if (index === 0) return ['/', oldPath.slice(1)];
                    return [oldPath.substring(0, index), oldPath.slice(index + 1)];
                })();
                if (!legalKeyNameInFileSystem.test(oldDirName))
                    throw new Error(`The old directory name is illegal`);
                // analyze the new dir path
                index = newPath.lastIndexOf('/');
                const [newDirParent, newDirName] = (() => {
                    if (index === -1) return ['.', newPath];
                    if (index === 0) return ['/', newPath.slice(1)];
                    return [newPath.substring(0, index), newPath.slice(index + 1)];
                })();
                if (!legalKeyNameInFileSystem.test(newDirName))
                    throw new Error(`The new directory name is illegal`);
                // check the old dir status
                const fp_old = this.duplicate();
                fp_old.gotoPath(oldDirParent);
                const oldDir = fp_old.#currentFolder.subfolders[oldDirName];
                if (!(oldDir instanceof Folder))
                    throw new Error(`The old directory is not found`);
                // check the new dir status
                const fp_new = this.duplicate();
                fp_new.createPath(newDirParent, true);
                // do the movement
                if (!(fp_new.#currentFolder.subfolders[newDirName] instanceof Folder)) {
                    // directly deposit the folder directory
                    fp_new.#currentFolder.subfolders[newDirName] = oldDir;
                    oldDir.parentFolder = fp_new.#currentFolder;
                } else {
                    // combine two folder directories (shallow copying)
                    shallowMoveFolders(fp_new.#currentFolder.subfolders[newDirName], oldDir);
                }
                // delete the moved folder directory
                delete fp_old.#currentFolder.subfolders[oldDirName];
                break;
            }
            default: {
                throw new Error(`Path type is illegal`);
            }
        }
        return this;
    }

    /**
     * @param {'file' | 'directory'} type
     * @param {string} oldPath
     * @param {string} newPath
     * @param {string} serial
     * @returns {TerminalFolderPointer}
     * @throws {Error}
     * */
    copyPath(type, oldPath, newPath, serial) {
        /*
        *  When copying a single file, if the destination is already existing, then the copy will stop.
        *  When copying a folder, if a destination folder is already existing, then the folders will be merged;
        *                            if a destination file is already existing, then the file will be renamed and copied.
        * */
        switch (type) {
            case 'file': {
                if (typeof fileSerial !== 'string' || fileSerial.length === 0)
                    throw new Error(`File Serial is illegal`);
                // analyze the old file path
                let index = oldPath.lastIndexOf('/');
                const [oldFileDir, oldFileName] = (() => {
                    if (index === -1) return ['.', oldPath];
                    if (index === 0) return ['/', oldPath.slice(1)];
                    return [oldPath.substring(0, index), oldPath.slice(index + 1)];
                })();
                if (!legalKeyNameInFileSystem.test(oldFileName))
                    throw new Error(`The old file name is illegal`);
                // analyze the new file path
                index = newPath.lastIndexOf('/');
                const [newFileDir, newFileName] = (() => {
                    if (index === -1) return ['.', newPath];
                    if (index === 0) return ['/', newPath.slice(1)];
                    return [newPath.substring(0, index), newPath.slice(index + 1)];
                })();
                if (!legalKeyNameInFileSystem.test(newFileName))
                    throw new Error(`The new file name is illegal`);
                // check the old file status
                const fp_old = this.duplicate();
                fp_old.gotoPath(oldFileDir);
                const oldFile = fp_old.#currentFolder.files[oldFileName];
                if (!(oldFile instanceof File))
                    throw new Error(`The old file is not found`);
                // check the new file status
                const fp_new = this.duplicate();
                fp_new.createPath(newFileDir, true);
                if (fp_new.#currentFolder.files[newFileName] instanceof File)
                    throw new Error(`The new file is already existing`);
                // deep-copy the file
                fp_new.#currentFolder.files[newFileName] = oldFile.copy(serial); // deep copy of the string
                break;
            }
            case 'directory': {
                if (serial !== undefined)
                    throw new Error(`Serial should not be specified when copying a directory`);
                // analyze the old dir path
                let index = oldPath.lastIndexOf('/');
                const [oldDirParent, oldDirName] = (() => {
                    if (index === -1) return ['.', oldPath];
                    if (index === 0) return ['/', oldPath.slice(1)];
                    return [oldPath.substring(0, index), oldPath.slice(index + 1)];
                })();
                if (!legalKeyNameInFileSystem.test(oldDirName))
                    throw new Error(`The old directory name is illegal`);
                // analyze the new dir path
                index = newPath.lastIndexOf('/');
                const [newDirParent, newDirName] = (() => {
                    if (index === -1) return ['.', newPath];
                    if (index === 0) return ['/', newPath.slice(1)];
                    return [newPath.substring(0, index), newPath.slice(index + 1)];
                })();
                if (!legalKeyNameInFileSystem.test(newDirName))
                    throw new Error(`The new directory name is illegal`);
                // check the old dir status
                const fp_old = this.duplicate();
                fp_old.gotoPath(oldDirParent);
                const oldDir = fp_old.#currentFolder.subfolders[oldDirName];
                if (!(oldDir instanceof Folder))
                    throw new Error(`The old directory is not found`);
                // check the new dir status
                const fp_new = this.duplicate();
                fp_new.createPath(newDirParent, true);
                if (!(fp_new.#currentFolder.subfolders[newDirName] instanceof Folder)) {
                    fp_new.#currentFolder.subfolders[newDirName] = oldDir.deepCopyTo(fp_new.#currentFolder);
                } else {
                    shallowMoveFolders(fp_new.#currentFolder.subfolders[newDirName], oldDir.deepCopyTo(null));
                }
                break;
            }
            default: {
                throw new Error(`Path type is illegal`);
            }
        }
        return this;
    }

    /**
     * @param {'file' | 'directory'} type
     * @param {string} path
     * @returns {TerminalFolderPointer}
     * @throws {Error}
     * */
    deletePath(type, path) {
        switch (type) {
            case 'file': {
                // analyze the file path
                const index = path.lastIndexOf('/');
                const [fileDir, fileName] = (() => {
                    if (index === -1) return ['.', path];
                    if (index === 0) return ['/', path.slice(1)];
                    return [path.substring(0, index), path.slice(index + 1)];
                })();
                if (!legalKeyNameInFileSystem.test(fileName))
                    throw new Error(`The file name is illegal`);
                // check the file status
                const tfp = this.duplicate();
                tfp.gotoPath(fileDir);
                // delete the file
                if (!(tfp.#currentFolder.files[fileName] instanceof File))
                    throw new Error(`The file is not found`);
                delete tfp.#currentFolder.files[fileName];
                break;
            }
            case 'directory': {
                // analyze the dir path
                const index = path.lastIndexOf('/');
                const [dirParent, dirName] = (() => {
                    if (index === -1) return ['.', path];
                    if (index === 0) return ['/', path.slice(1)];
                    return [path.substring(0, index), path.slice(index + 1)];
                })();
                if (!legalKeyNameInFileSystem.test(dirName))
                    throw new Error(`The directory name is illegal`);
                // check the dir status
                const fp = this.duplicate();
                fp.gotoPath(dirParent);
                // delete the file
                if (!(fp.#currentFolder.subfolders[dirName] instanceof Folder))
                    throw new Error(`The directory is not found`);
                delete fp.#currentFolder.subfolders[dirName];
                break;
            }
            default: {
                throw new Error(`Path type is illegal`);
            }
        }
        return this;
    }
}

class CommandInputHandler {
    /** @type {Record<string, {is_async: boolean, executable: function, description: string}>} */
    #supportedCommands;
    /** @type {string[]} */
    #buffer;

    /**
     * @param {Record<string, {is_async: boolean, executable: function, description: string}>} supportedCommands
     * */
    constructor(supportedCommands) {
        this.#supportedCommands = supportedCommands;
        this.#buffer = [];
    }

    /**
     * @returns {string}
     * */
    toString() {
        return this.#buffer.reduce((acc, char) => `${acc}${char}`, '');
    }

    /**
     * @returns {void}
     * */
    clear() {
        this.#buffer = [];
    }

    /**
     * @param {string} newChar
     * @returns {void}
     * */
    addChar(newChar) { // returns void
        this.#buffer.push(newChar);
    }

    /**
     * @returns {boolean}
     * */
    removeChar() {
        if (this.#buffer.length > 0) {
            this.#buffer.pop();
            return true;
        }
        return false;
    }

    /**
     * possible returns:
     *       [ -1, ''          ] ---> Error: (Empty) Command is not executable.
     *       [  0, commandName ] ---> Success!
     *       [  1, commandName ] ---> Error: Command is not supported.
     *       [  2, commandName ] ---> Error: Command exists but throws exceptions during execution.
     * @returns {Promise<[number, string]>}
     * */
    async execute() {
        // check the buffer length
        if (this.#buffer.length === 0)
            return [-1, '']; // Error: (Empty) Command is not executable.
        let index = 0;
        /**
         * @returns {string}
         * */
        const parseNextWord = () => { // returns string
            let word = '';
            while (index < this.#buffer.length && this.#buffer[index] === ` `)
                index++;
            if (this.#buffer[index] === `"` || this.#buffer[index] === `'`) { // if quote marks makes a phase
                const quoteIndex = index;
                index++;
                let hasClosingQuote = false;
                while (index < this.#buffer.length) {
                    if (this.#buffer[index] === this.#buffer[quoteIndex]) {
                        hasClosingQuote = true;
                        index++;
                        break;
                    }
                    word += this.#buffer[index];
                    index++;
                }
                if (!hasClosingQuote) // if no closing quote
                    word = this.#buffer[quoteIndex] + word; // recover the beginning quote
                return word;
            } else { // if the next word is common
                while (index < this.#buffer.length) {
                    if (this.#buffer[index] === ` `) {
                        index++;
                        break;
                    }
                    word += this.#buffer[index];
                    index++;
                }
                return word;
            }
        };
        // get command name
        const commandName = parseNextWord();
        if (commandName.length === 0)
            return [-1, '']; // Error: (Empty) Command is not executable.
        // get command parameters
        const commandParameters = [];
        while (index < this.#buffer.length) {
            const param = parseNextWord();
            if (param.length > 0) commandParameters.push(param);
        }
        // try to execute the command
        const commandObject = this.#supportedCommands[commandName];
        if (commandObject === undefined)
            return [1, commandName]; // Error: Command is not supported.
        try {
            if (commandObject.is_async === true) {
                await commandObject.executable(commandParameters);
            } else {
                commandObject.executable(commandParameters);
            }
            return [0, commandName]; // Success!
        } catch (_) {
            return [2, commandName]; // Error: Command exists but throws exceptions.
        }
    }
}

class MinimizedWindowRecords {
    /** @type {Record<string, function():void>} */
    #records; // description: windowRecoverCallback

    constructor() {
        this.#records = {};
    }

    /**
     * @param {string} description
     * @param {function():void} windowRecoverCallback
     * @returns {void}
     * */
    add(description, windowRecoverCallback) {
        if (this.#records[description] === undefined) {
            this.#records[description] = windowRecoverCallback;
        } else {
            let index = 2;
            let newDescription = null;
            while (this.#records[newDescription = `${description} (${index})`] !== undefined)
                index++;
            this.#records[newDescription] = windowRecoverCallback;
        }
    }

    /**
     * @returns {string[]}
     * */
    getDescriptions() {
        return Object.keys(this.#records);
    }

    /**
     * @param {string} description
     * @returns {boolean}
     * */
    recoverWindow(description) {
        if (this.#records[description] !== undefined) {
            this.#records[description]();
            delete this.#records[description];
            return true;
        }
        return false;
    }
}

/**
 * This function generates a unified terminal interface.
 * @param {window.Terminal} xtermObj
 * @param {HTMLDivElement} terminalWindowContainer
 * @param {Folder} fsRoot
 * @param {Record<string, {is_async: boolean, executable: function, description: string}>} supportedCommands
 * @returns {Object}
 * */
function generateTerminalCore(xtermObj, terminalWindowContainer, fsRoot, supportedCommands) {
    // Put Terminal Window to Webpage Container
    xtermObj.open(terminalWindowContainer);
    // Create Terminal Log Array
    const terminalLog = [];
    // Initialize Terminal Window Display
    xtermObj.write(` $ `);
    terminalLog.push(` $ `);

    // Enabled Fit Addon
    const fitAddon = (() => { // every fit-addon can be subscribed to exactly ONE XTerm object!!!
        if ('FitAddon' in window && 'FitAddon' in window.FitAddon) {
            try {
                const fitAddon = new window.FitAddon.FitAddon(); // Load the Fit Addon
                xtermObj.loadAddon(fitAddon); // Add the Fit Addon to xtermObj frame
                return fitAddon;
            } catch (error) {
                alert(`Failed to load the fit-addon (${error})`);
                return null;
            }
        }
        console.warn('window.FitAddon.FitAddon does not exist.');
        return null;
    })();

    // Initialize Current Keyboard Listener
    let currentXTermKeyboardListener = null;
    let currentKeyboardListenerCallback = null;

    // Function to Set New Keyboard Listener
    function setNewTerminalKeyboardListener(keyboard_listening_callback) {
        if (currentXTermKeyboardListener !== null)
            currentXTermKeyboardListener.dispose();
        currentXTermKeyboardListener = xtermObj.onData(currentKeyboardListenerCallback = keyboard_listening_callback);
    }

    // Initialize Command Input Handler
    const commandInputHandler = new CommandInputHandler(supportedCommands);
    // Function to Initialize Default Terminal Window's Listening to Keyboard Input
    const defaultTerminalKeyboardListenerCallback = async (keyboardInput) => {
        switch (keyboardInput) {
            case '\x1b[A': { // Up arrow
                break;
            }
            case '\x1b[B': { // Down arrow
                break;
            }
            case '\x1b[C': { // Right arrow
                break;
            }
            case '\x1b[D': { // Left arrow
                break;
            }
            case '\u0003': { // Ctrl+C
                commandInputHandler.clear();
                xtermObj.write('^C\n\n\r $ ');
                terminalLog.push('^C\n\n $ ');
                break;
            }
            case '\u000C': { // Ctrl+L
                // commandInputHandler.clear();
                xtermObj.write(`\x1b[2J\x1b[H $ `);
                xtermObj.write(commandInputHandler.toString());
                break;
            }
            case '\u007F': { // Backspace
                if (commandInputHandler.removeChar()) { // if the char is successfully removed from the buffer
                    xtermObj.write('\b \b');
                    terminalLog.pop(); // because commandInputHandler.removeChar() is success!!
                }
                break;
            }
            case '\r': { // Enter
                xtermObj.write('\n\r   ');
                terminalLog.push('\n   ');
                {
                    const [statusCode, commandName] = await commandInputHandler.execute();
                    switch (statusCode) {
                        case 0: {
                            // success execution
                            break;
                        }
                        case 1: {
                            xtermObj.write(`${commandName}: command not found`);
                            terminalLog.push(`${commandName}: command not found`);
                            break;
                        }
                        case 2: {
                            xtermObj.write(`${commandName}: command failed due to uncaught errors in the command implementation`);
                            terminalLog.push(`${commandName}: command failed due to uncaught errors in the command implementation`);
                            break;
                        }
                        default: {
                        }
                    }
                }
                commandInputHandler.clear();
                xtermObj.write('\n\n\r $ ');
                terminalLog.push('\n\n $ ');
                break;
            }
            default: { // allowing proper copy and paste from the clipboard
                for (const char of keyboardInput) {
                    if (char >= String.fromCharCode(0x20) && char <= String.fromCharCode(0x7E) || char >= '\u00a0') {
                        commandInputHandler.addChar(char);
                        xtermObj.write(char);
                        terminalLog.push(char);
                    }
                }
            }
        }
    };
    // Initialize Default Terminal Window's Listening to Keyboard Input
    setNewTerminalKeyboardListener(defaultTerminalKeyboardListenerCallback);

    // Initialize Terminal Minimized-Window Records
    const terminalMinimizedWindowRecords = new MinimizedWindowRecords();
    // Initialize Terminal Cache Space
    const terminalCacheSpace = {/* any additional information */};
    // Initialize Terminal Global Folder Pointer Object
    const currentTerminalFolderPointer = new TerminalFolderPointer(fsRoot);

    // Securely Release the Terminal APIs
    return {
        /*
        *  Terminal Output Ports
        * */
        printToWindow: (sentence, if_print_raw_to_window, if_print_to_log) => { // (string, boolean, boolean) => void
            if (if_print_to_log)
                terminalLog.push(sentence);
            if (if_print_raw_to_window) {
                xtermObj.write(sentence); // leave <sentence> as it was
            } else {
                xtermObj.write(sentence.replaceAll('\n', '\n\r   ')); // replace all '\n' in <sentence> with '\n\r   '
            }
        },


        /*
        *  Terminal Keyboard Listener Controllers
        * */
        setDefaultKeyboardListener: () => { // returns void
            setNewTerminalKeyboardListener(defaultTerminalKeyboardListenerCallback);
        },
        setNewKeyboardListener: (keyboard_listener_callback) => { // returns void
            setNewTerminalKeyboardListener(keyboard_listener_callback);
        },


        /*
        *  Terminal Status/Content Getters
        * */
        getFitAddon: () => fitAddon,
        getTerminalLogString: () => terminalLog.reduce((acc, elem) => acc + elem, ''),
        getHTMLDivForTerminalWindow: () => terminalWindowContainer,
        getMinimizedWindowRecords: () => terminalMinimizedWindowRecords,
        getCacheSpace: () => terminalCacheSpace,

        /*
        *  Terminal File System Ports
        * */
        getCurrentFolderPointer: () => currentTerminalFolderPointer,
        getNewFolderPointer: () => new TerminalFolderPointer(fsRoot),
    };
}
