/*
* **************************************************************************************************************
*
*                                              START OF FILE
*
*             This file initializes the terminal window frame and all the terminal core services.
*
* **************************************************************************************************************
* */

// import XTerm-related classes
import {Terminal} from "./js_libs/xterm.js";
import {FitAddon} from "./js_libs/xterm-addon-fit.js";
import {SerializeAddon} from "./js_libs/xterm-addon-serialize.js";
// import JSZip class
import JSZip from "./js_libs/jszip.js";

const
    /**
     * This function returns a string representing this date in the date time string format, UTC.
     * @returns {string}
     * */
    getISOTimeString = () => new Date().toISOString(),
    /**
     * This function returns a random integer between <min> and <max> (inclusive).
     * @param {number} min
     * @param {number} max
     * @returns {number}
     * */
    randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    utf8Decoder = new TextDecoder('utf-8'),
    utf8Encoder = new TextEncoder(),
    /**
     * This function converts <object> to <FormData>
     * @param {Object} object
     * @returns {FormData}
     * @throws {TypeError}
     * */
    formData = (object) => {
        if (typeof object !== 'object')
            throw new TypeError('Object must be an object.');
        const formData = new FormData();
        Object.entries(object).forEach(([key, value]) => {
            if (typeof key !== 'string')
                throw new TypeError('Object key must be a string.');
            if (typeof value !== 'string' && !(value instanceof Blob))
                throw new TypeError('Object value must be either a string or a FormData.');
            formData.append(key, value);
        });
        return formData;
    };

/**
 * This regular expression checks whether a string is a legal key-name in the file system.
 * */
const
    legalFileSystemKeyNameRegExp = /^(?!\.{1,2}$)[^\/\0\b\r]{1,1024}$/,
    legalFileSerialRegExp = /^(?:ROOT|[A-Za-z_][A-Za-z0-9_]{127,4096})$/;

/**
 * This structure represents the space, which serial numers are picked from.
 * Methods may throw Errors due to illegal inputs.
 * */
class SerialLake {
    /** @type {Set<string>} */
    #serialSet;
    /** @type {function():string} */
    #serialGenerator;

    /**
     * @param {function():string} fileSerialGenerator
     * @throws {TypeError}
     * */
    constructor(fileSerialGenerator) {
        if (typeof fileSerialGenerator !== 'function' || typeof fileSerialGenerator() !== 'string')
            throw new TypeError('fileSerialGenerator must be a function that returns a string.');
        this.#serialSet = new Set();
        this.#serialGenerator = fileSerialGenerator;
    }

    /**
     * This method recovers <serialSet> with <fileSerials>, overwriting all previously-saved information.
     * @param {string[]} fileSerials
     * @returns {SerialLake}
     * @throws {TypeError}
     * */
    recover(fileSerials) {
        if (!Array.isArray(fileSerials) || fileSerials.some((fs) => (typeof fs !== 'string' || !legalFileSerialRegExp.test(fs))))
            throw new TypeError('File serials must be an array of strings that follow the keyname requirements.');
        this.#serialSet = new Set(fileSerials);
        return this;
    }

    /**
     * @returns {string}
     * @throws {Error}
     * */
    generateNext() {
        let fileSerial = '';
        do {
            try {
                fileSerial = this.#serialGenerator(); // may throw Error
            } catch (error) {
                throw new Error(`Failed to generate the next serial number. <-- ${error}`);
            }
            if (!legalFileSerialRegExp.test(fileSerial))
                throw new Error('fileSerialGenerator must return a string that follows the keyname requirements.');
        } while (this.#serialSet.has(fileSerial));
        this.#serialSet.add(fileSerial);
        return fileSerial;
    }
}

/**
 * This structure represents a single file in the file system.
 * Methods may throw Errors due to illegal inputs.
 * Each instance can be submitted to a file server.
 * */
class File {
    /** @type {string} */
    #fileSerial;
    /** @type {ArrayBuffer} */
    #content;
    /** @type {string} */
    #created_at;
    /** @type {string} */
    #updated_at;

    /**
     * @param {string} fileSerial
     * @param {ArrayBuffer} content
     * @param {string | undefined} created_at
     * @param {string | undefined} updated_at
     * @throws {TypeError}
     * */
    constructor(fileSerial, content, created_at = undefined, updated_at = undefined) {
        if (typeof fileSerial !== 'string' || !legalFileSerialRegExp.test(fileSerial))
            throw new TypeError('File serial must be a string that follows the keyname requirements.');
        if (!(content instanceof ArrayBuffer))
            throw new TypeError('Content must be an ArrayBuffer.');
        if ((typeof created_at !== 'string' || created_at.length === 0) && created_at !== undefined)
            throw new TypeError('created_at must be either a non-empty string or undefined.');
        if ((typeof updated_at !== 'string' || updated_at.length === 0) && updated_at !== undefined)
            throw new TypeError('updated_at must be either a non-empty string or undefined.');
        this.#fileSerial = fileSerial;
        this.#content = content.slice(0);
        this.#created_at = created_at !== undefined ? created_at : getISOTimeString();
        this.#updated_at = updated_at !== undefined ? updated_at : getISOTimeString();
    }

    /**
     * @param {string} fileSerial
     * @returns {File}
     * @throws {TypeError}
     * */
    duplicate(fileSerial) {
        if (typeof fileSerial !== 'string' || !legalFileSerialRegExp.test(fileSerial))
            throw new TypeError('File serial must be a string that follows the keyname requirements.');
        return new File(fileSerial, this.#content.slice(0));
    }

    /**
     * @returns {string}
     * */
    getSerial() {
        return this.#fileSerial;
    }

    /**
     * @returns {ArrayBuffer}
     * */
    getContent() {
        return this.#content;
    }

    /**
     * @returns {number}
     * */
    getCreatedAt() {
        return this.#created_at;
    }

    /**
     * @returns {number}
     * */
    getUpdatedAt() {
        return this.#updated_at;
    }

    /**
     * @param {ArrayBuffer} newContent
     * @param {boolean} do_copy
     * @returns {File}
     * @throws {TypeError}
     * */
    setContent(newContent, do_copy) {
        if (!(newContent instanceof ArrayBuffer))
            throw new TypeError('New content must be an ArrayBuffer.');
        if (typeof do_copy !== 'boolean')
            throw new TypeError('do_copy must be a boolean.');
        this.#content = do_copy ? newContent.slice(0) : newContent;
        this.#updated_at = getISOTimeString();
        return this;
    }
}

/**
 * This structure represents a single folder in the file system.
 * Methods may throw Errors due to illegal inputs.
 * The root folder can be submitted to a file server as a getRecordsJSON file.
 * */
class Folder {
    /** @type {Folder} */
    #parentFolder;                    // NOT IN getRecordsJSON, BUILT DURING RECOVERY
    /** @type {Record<string, Folder>} */
    #subfolders;          // IN getRecordsJSON
    /** @type {Record<string, File>} */
    #files;                 // IN getRecordsJSON, name <--> fileSerial
    /** @type {string} */
    #created_at;                    // IN getRecordsJSON
    /** @type {Record<string, string>} */
    #folderLinks;         // IN getRecordsJSON
    /** @type {Record<string, string>} */
    #fileLinks;           // IN getRecordsJSON

    /**
     * @returns {Folder}
     * */
    getParentFolder() {
        return this.#parentFolder;
    }

    /**
     * @param {Folder} newParentFolder
     * @param {boolean} override_root
     * @returns {Folder}
     * @throws {TypeError | Error}
     * */
    setParentFolder(newParentFolder, override_root = false) {
        if (!(newParentFolder instanceof Folder))
            throw new TypeError('New parent folder must be a Folder.');
        if (typeof override_root !== 'boolean')
            throw new TypeError('override_root must be a boolean.');
        if (!override_root && this.#parentFolder === this)
            throw new Error('Root cannot be overridden when override_root is false.');
        this.#parentFolder = newParentFolder;
        return this;
    }

    /**
     * @returns {Record<string, Folder>}
     * */
    getSubfolders() {
        return this.#subfolders;
    }

    /**
     * @param {string} subfolderName
     * @returns {boolean}
     * @throws {TypeError}
     * */
    hasSubfolder(subfolderName) {
        if (typeof subfolderName !== 'string' || !legalFileSystemKeyNameRegExp.test(subfolderName))
            throw new TypeError('Subfolder name must be a string and follow the keyname requirements.');
        return this.#subfolders[subfolderName] instanceof Folder;
    }

    /**
     * @param {string} subfolderName
     * @returns {Folder}
     * @throws {TypeError | Error}
     * */
    getSubfolder(subfolderName) {
        if (typeof subfolderName !== 'string' || !legalFileSystemKeyNameRegExp.test(subfolderName))
            throw new TypeError('Subfolder name must be a string and follow the keyname requirements.');
        const subfolder = this.#subfolders[subfolderName];
        if (!(subfolder instanceof Folder))
            throw new Error(`Subfolder ${subfolderName} not found.`);
        return subfolder;
    }

    /**
     * @param {boolean} fix_duplicated_subfolderName
     * @param {string} subfolderName
     * @returns {Folder}
     * @throws {TypeError | Error}
     * */
    createSubfolder(fix_duplicated_subfolderName, subfolderName) {
        if (typeof fix_duplicated_subfolderName !== 'boolean')
            throw new TypeError('fix_duplicated_subfolderName must be a boolean.');
        if (typeof subfolderName !== 'string' || !legalFileSystemKeyNameRegExp.test(subfolderName))
            throw new TypeError('Subfolder name must be a string and follow the keyname requirements.');
        if (this.#subfolders[subfolderName] instanceof Folder) { // keep this low level implementation to boost runtime
            if (!fix_duplicated_subfolderName)
                throw new Error(`Subfolder ${subfolderName} already existing.`);
            let i = 2;
            while (this.#subfolders[`${subfolderName} ${i}`] instanceof Folder)
                i++;
            subfolderName = `${subfolderName} ${i}`;
        }
        return (this.#subfolders[subfolderName] = new Folder(false, this));
    }

    /**
     * @param {string} subfolderName
     * @returns {Folder}
     * @throws {TypeError | Error}
     * */
    deleteSubfolder(subfolderName) {
        if (typeof subfolderName !== 'string' || !legalFileSystemKeyNameRegExp.test(subfolderName))
            throw new TypeError('Subfolder name must be a string and follow the keyname requirements.');
        if (!(this.#subfolders[subfolderName] instanceof Folder))
            throw new Error(`Subfolder ${subfolderName} not found.`);
        const folder = this.#subfolders[subfolderName];
        delete this.#subfolders[subfolderName];
        return folder;
    }

    /**
     * @returns {Record<string, File>}
     * */
    getFiles() {
        return this.#files;
    }

    /**
     * @param {string} fileName
     * @returns {boolean}
     * @throws {TypeError}
     * */
    hasFile(fileName) {
        if (typeof fileName !== 'string' || !legalFileSystemKeyNameRegExp.test(fileName))
            throw new TypeError('File name must be a string and follow the keyname requirements.');
        return this.#files[fileName] instanceof File;
    }

    /**
     * @param {string} fileName
     * @returns {File}
     * @throws {TypeError | Error}
     * */
    getFile(fileName) {
        if (typeof fileName !== 'string' || !legalFileSystemKeyNameRegExp.test(fileName))
            throw new TypeError('File name must be a string and follow the keyname requirements.');
        const file = this.#files[fileName];
        if (!(file instanceof File))
            throw new Error(`File ${fileName} not found.`);
        return file;
    }

    /**
     * @param {boolean} fix_duplicated_filename
     * @param {string} fileName
     * @param {string} fileSerial
     * @returns {[File, string]}
     * @throws {TypeError | Error}
     * */
    createFile(fix_duplicated_filename, fileName, fileSerial) {
        if (typeof fix_duplicated_filename !== 'boolean')
            throw new TypeError('fix_duplicated_filename must be a boolean.');
        if (typeof fileName !== 'string' || !legalFileSystemKeyNameRegExp.test(fileName))
            throw new TypeError('File name must be a string and follow the keyname requirements.');
        if (typeof fileSerial !== 'string' || !legalFileSerialRegExp.test(fileSerial))
            throw new TypeError('File serial must be a string that follows the keyname requirements.');
        if (this.#files[fileName] instanceof File) { // keep this low level implementation to boost runtime
            if (!fix_duplicated_filename)
                throw new Error(`File ${fileName} already existing.`);
            let i = 2;
            while (this.#files[`${fileName} ${i}`] instanceof File)
                i++;
            fileName = `${fileName} ${i}`;
        }
        return [(this.#files[fileName] = new File(fileSerial, new ArrayBuffer(0))), fileName];
    }

    /**
     * This method is VERY DANGEROUS to use, designed for developers.
     * This method adds <file> to <.files> and assumes that <file> is a valid File, and that <fileName> does not exists.
     * @param {string} fileName
     * @param {File} file
     * @returns void
     * @throws {TypeError}
     * */
    createFileDangerous(fileName, file) {
        if (typeof fileName !== 'string' || !legalFileSystemKeyNameRegExp.test(fileName))
            throw new TypeError('File name must be a string and follow the keyname requirements.');
        if (!(file instanceof File))
            throw new TypeError('File must be a File.');
        this.#files[fileName] = file;
    }

    /**
     * @param {string} fileName
     * @returns {File}
     * @throws {TypeError | Error}
     * */
    deleteFile(fileName) {
        if (typeof fileName !== 'string' || !legalFileSystemKeyNameRegExp.test(fileName))
            throw new TypeError('File name must be a string and follow the keyname requirements.');
        if (!(this.#files[fileName] instanceof File))
            throw new Error(`File ${fileName} not found.`);
        const file = this.#files[fileName];
        delete this.#files[fileName];
        return file;
    }

    /**
     * @returns {string}
     * */
    getCreatedAt() {
        return this.#created_at;
    }

    /**
     * @param {string} created_at
     * @returns {Folder}
     * @throws {TypeError}
     * */
    setCreatedAt(created_at) {
        if (typeof created_at !== 'string' || created_at.length === 0)
            throw new TypeError('created_at must be a non-empty string.');
        this.#created_at = created_at;
        return this;
    }

    /**
     * @returns {Record<string, string>}
     * */
    getFolderLinks() {
        return this.#folderLinks;
    }

    /**
     * @param {string} folderLinkName
     * @returns {boolean}
     * @throws {TypeError}
     * */
    hasFolderLink(folderLinkName) {
        if (typeof folderLinkName !== 'string' || !legalFileSystemKeyNameRegExp.test(folderLinkName))
            throw new TypeError('Folder link name must be a string and follow the keyname requirements.');
        return typeof this.#folderLinks[folderLinkName] === 'string';
    }

    /**
     * @param {string} folderLinkName
     * @returns {string}
     * @throws {TypeError | Error}
     * */
    getFolderLink(folderLinkName) {
        if (typeof folderLinkName !== 'string' || !legalFileSystemKeyNameRegExp.test(folderLinkName))
            throw new TypeError('Folder link name must be a string and follow the keyname requirements.');
        const folderLink = this.#folderLinks[folderLinkName];
        if (typeof folderLink !== 'string')
            throw new Error(`Folder link ${folderLinkName} not found.`);
        return folderLink;
    }

    /**
     * @param {string} folderLinkName
     * @param {string} link
     * @returns {string}
     * @throws {TypeError | Error}
     * */
    createFolderLink(folderLinkName, link) {
        if (typeof folderLinkName !== 'string' || !legalFileSystemKeyNameRegExp.test(folderLinkName))
            throw new TypeError('Folder link name must be a string and follow the keyname requirements.');
        if (typeof link !== 'string' || link.length === 0)
            throw new TypeError('Link must be a non-empty string.');
        if (typeof this.#folderLinks[folderLinkName] === 'string')
            throw new Error(`Folder link ${folderLinkName} already existing.`);
        return (this.#folderLinks[folderLinkName] = link);
    }

    /**
     * @param {string} folderLinkName
     * @param {string} newLink
     * @returns {void}
     * @throws {TypeError | Error}
     * */
    setFolderLink(folderLinkName, newLink) {
        if (typeof folderLinkName !== 'string' || !legalFileSystemKeyNameRegExp.test(folderLinkName))
            throw new TypeError('Folder link name must be a string and follow the keyname requirements.');
        if (typeof newLink !== 'string' || newLink.length === 0)
            throw new TypeError('New link must be a non-empty string.');
        if (typeof this.#folderLinks[folderLinkName] !== 'string')
            throw new Error(`Folder link ${folderLinkName} not found.`);
        this.#folderLinks[folderLinkName] = newLink;
    }

    /**
     * @param {string} folderLinkName
     * @returns {string}
     * @throws {TypeError | Error}
     * */
    deleteFolderLink(folderLinkName) {
        if (typeof folderLinkName !== 'string' || !legalFileSystemKeyNameRegExp.test(folderLinkName))
            throw new TypeError('Folder link name must be a string and follow the keyname requirements.');
        const folderLink = this.#folderLinks[folderLinkName];
        if (typeof folderLink !== 'string')
            throw new Error(`Folder link ${folderLinkName} not found.`);
        delete this.#folderLinks[folderLinkName];
        return folderLink;
    }

    /**
     * @returns {Record<string, string>}
     * */
    getFileLinks() {
        return this.#fileLinks;
    }

    /**
     * @param {string} fileLinkName
     * @returns {boolean}
     * @throws {TypeError}
     * */
    hasFileLink(fileLinkName) {
        if (typeof fileLinkName !== 'string' || !legalFileSystemKeyNameRegExp.test(fileLinkName))
            throw new TypeError('File link name must be a string and follow the keyname requirements.');
        return typeof this.#fileLinks[fileLinkName] === 'string';
    }

    /**
     * @param {string} fileLinkName
     * @returns {string}
     * @throws {TypeError | Error}
     * */
    getFileLink(fileLinkName) {
        if (typeof fileLinkName !== 'string' || !legalFileSystemKeyNameRegExp.test(fileLinkName))
            throw new TypeError('File link name must be a string and follow the keyname requirements.');
        const fileLink = this.#fileLinks[fileLinkName];
        if (typeof fileLink !== 'string')
            throw new Error(`File link ${fileLinkName} not found.`);
        return fileLink;
    }

    /**
     * @param {string} fileLinkName
     * @param {string} link
     * @returns {string}
     * @throws {TypeError | Error}
     * */
    createFileLink(fileLinkName, link) {
        if (typeof fileLinkName !== 'string' || !legalFileSystemKeyNameRegExp.test(fileLinkName))
            throw new TypeError('File link name must be a string and follow the keyname requirements.');
        if (typeof link !== 'string' || link.length === 0)
            throw new Error('Link must be a non-empty string.');
        if (typeof this.#fileLinks[fileLinkName] === 'string')
            throw new Error(`File link ${fileLinkName} already existing.`);
        return (this.#fileLinks[fileLinkName] = link);
    }

    /**
     * @param {string} fileLinkName
     * @param {string} newLink
     * @returns {void}
     * @throws {TypeError | Error}
     * */
    setFileLink(fileLinkName, newLink) {
        if (typeof fileLinkName !== 'string' || !legalFileSystemKeyNameRegExp.test(fileLinkName))
            throw new TypeError('File link name must be a string and follow the keyname requirements.');
        if (typeof newLink !== 'string' || newLink.length === 0)
            throw new TypeError('New link must be a non-empty string.');
        if (typeof this.#fileLinks[fileLinkName] !== 'string')
            throw new Error(`File link ${fileLinkName} not found.`);
        this.#fileLinks[fileLinkName] = newLink;
    }

    /**
     * @param {string} fileLinkName
     * @returns {string}
     * @throws {TypeError | Error}
     * */
    deleteFileLink(fileLinkName) {
        if (typeof fileLinkName !== 'string' || !legalFileSystemKeyNameRegExp.test(fileLinkName))
            throw new TypeError('File link name must be a string and follow the keyname requirements.');
        const fileLink = this.#fileLinks[fileLinkName];
        if (typeof fileLink !== 'string')
            throw new Error(`File link ${fileLinkName} not found.`);
        delete this.#fileLinks[fileLinkName];
        return fileLink;
    }

    /**
     * This method clears all the contents previously-saved in <this> folder.
     * Also used for initialization in <constructor>
     * @returns {Folder}
     * */
    clear() {
        this.#subfolders = {};
        this.#files = {};
        this.#folderLinks = {};
        this.#fileLinks = {};
        return this;
    }

    /**
     * @param {boolean} is_root
     * @param {Folder | undefined} parentFolder
     * @throws {TypeError}
     * */
    constructor(is_root, parentFolder = undefined) {
        // parameter check
        if (typeof is_root !== 'boolean')
            throw new TypeError('is_root must be a boolean.');
        if (is_root && parentFolder !== undefined) {
            throw new TypeError('The parent folder cannot be specified when creating a root.');
        }
        if (!is_root && !(parentFolder instanceof Folder)) {
            throw new TypeError('The parent folder must be a folder when creating a regular folder.');
        }
        // process data
        this.#parentFolder = is_root ? this : parentFolder;
        this.#created_at = getISOTimeString();
        this.clear();
    }

    /**
     * @returns {boolean}
     * */
    isRoot() {
        return (this.#parentFolder === this);
    }

    /**
     * @returns {string}
     * */
    getContentListAsString() {
        let contents = '';
        const
            folderNames = Object.keys(this.#subfolders),
            fileNames = Object.keys(this.#files),
            folderLinkNames = Object.keys(this.#folderLinks),
            fileLinkNames = Object.keys(this.#fileLinks);
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
     * This method recursively collects all the File objects and generates a list.
     * @returns {File[]}
     * */
    getFilesAsList() {
        const files = [];

        /**
         * @param {Folder} folder
         * @returns {void}
         * */
        const getFiles = (folder) => {
            Object.values(folder.getFiles()).forEach((file) => {
                files.push(file);
            });
            Object.values(folder.getSubfolders()).forEach((subfolder) => {
                getFiles(subfolder);
            });
        };

        getFiles(this);
        return files;
    }

    /**
     * This method converts the current Folder object to a "RecordsJSON" string.
     * In the "RecordsJSON" string, files are converted to name-to-fileSerial pairs.
     * @returns {string}
     * @throws {TypeError}
     * */
    getRecordsJSON() {
        /**
         * @param {Folder} folder
         * @returns {{subfolder, files, created_at, folderLinks, fileLinks}}
         * */
        const toPlainFolderObject = (folder) => ({
            subfolders: Object.entries(folder.getSubfolders()).reduce(
                (acc, [name, subfolder]) => {
                    acc[name] = toPlainFolderObject(subfolder);
                    return acc;
                },
                {}
            ),
            files: Object.entries(folder.getFiles()).reduce(
                (acc, [name, file]) => {
                    acc[name] = file.getSerial();
                    return acc;
                },
                {}
            ),
            created_at: folder.getCreatedAt(),
            folderLinks: Object.entries(folder.getFolderLinks()).reduce(
                (acc, [name, folderLink]) => {
                    acc[name] = folderLink;
                    return acc;
                },
                {}
            ),
            fileLinks: Object.entries(folder.getFileLinks()).reduce(
                (acc, [name, fileLink]) => {
                    acc[name] = fileLink;
                    return acc;
                },
                {}
            )
        });

        return JSON.stringify(toPlainFolderObject(this));
    }

    /**
     * This method converts <this> folder to a zip blob using JSZip.
     * @returns {Promise<Blob>}
     * */
    getZipBlob() {
        /**
         * This method helps recursively add folder content to the zip file
         * @param {Folder} folderObject
         * @param {Object} zipObject
         * @returns {void}
         * */
        const addFolderToZip = (folderObject, zipObject) => {
            Object.entries(folderObject.getFiles()).forEach(([fileName, file]) => {
                zipObject.file(fileName, file.getContent(), {binary: true});
            });
            Object.entries(folderObject.getSubfolders()).forEach(([subfolderName, subfolderObject]) => {
                addFolderToZip(subfolderObject, zipObject.folder(subfolderName));
            });
        };

        // Create a new JSZip instance to generate the .zip file
        const zip = new JSZip();
        // Start the process from the current folder
        addFolderToZip(this, zip); // '' means root of the zip
        // Generate the zip file as a Blob
        return zip.generateAsync({type: 'blob'});
    }
}

/**
 * This function extracts the directory-path and key-name from <path>.
 * @param {string} path
 * @returns {[string, string]}
 * */
function extractDirAndKeyName(path) {
    const index = path.lastIndexOf('/');
    if (index === -1) // <path> is a single filename
        return ['.', path];
    if (index === 0) // file is in the ROOT
        return ['/', path.slice(1)];
    //     [   parent directory path, immediate key name   ]
    return [path.substring(0, index), path.substring(index + 1)];
}

/**
 * This structure represents an advanced browsing tool on the file system.
 * Methods may throw Errors due to illegal inputs.
 * */
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
        if (!(fsRoot instanceof Folder))
            throw new TypeError('fsRoot must be a Folder.');
        if (!(currentFolder instanceof Folder))
            throw new TypeError('Current folder must be a Folder.');
        if (!(currentFullPathStack instanceof Array))
            throw new TypeError('Current full path stack must be an array.');
        this.#fsRoot = fsRoot;
        this.#currentFolder = currentFolder;
        this.#currentFolderTrackingStack = currentFullPathStack;
    }

    /**
     * This method duplicates the current terminal folder pointer.
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
     * This method recovers the current terminal folder pointer.
     * @param {TerminalFolderPointer} another
     * @param {boolean} deep_copy_stack
     * @returns {TerminalFolderPointer}
     * @throws {TypeError}
     * */
    recover(another, deep_copy_stack) {
        if (!(another instanceof TerminalFolderPointer))
            throw new TypeError('Another must be a TerminalFolderPointer.');
        if (typeof deep_copy_stack !== 'boolean')
            throw new TypeError('deep_copy_stack must be a boolean.');
        // this.#fsRoot = another.#fsRoot; // this should always be the same.
        this.#currentFolder = another.#currentFolder;
        this.#currentFolderTrackingStack = deep_copy_stack ?
            another.#currentFolderTrackingStack.map(x => x) :
            another.#currentFolderTrackingStack;
        return this;
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
        return this.#currentFolderTrackingStack.length === 0 ?
            '/' : this.#currentFolderTrackingStack.reduce((acc, elem) => `${acc}/${elem}`, '');
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
        return (this.#currentFolder = this.#currentFolder.getParentFolder());
    }

    /**
     * @param {string} subfolderName
     * @param {boolean} include_link
     * @returns {Folder}
     * @throws {TypeError | Error}
     * */
    #gotoSubfolder(subfolderName, include_link = false) {
        if (typeof include_link !== 'boolean')
            throw new TypeError('include_link must be a boolean.');
        if (typeof subfolderName !== 'string' || !legalFileSystemKeyNameRegExp.test(subfolderName))
            throw new TypeError('Subfolder name must be a string and follow the keyname requirements.');

        if (this.#currentFolder.hasSubfolder(subfolderName)) {
            this.#currentFolderTrackingStack.push(subfolderName);
            return (this.#currentFolder = this.#currentFolder.getSubfolder(subfolderName));
        }

        if (include_link && this.#currentFolder.hasFolderLink(subfolderName)) {
            const
                fp = this.duplicate(),
                folderLink = this.#currentFolder.getFolderLink(subfolderName);
            try {
                this.#currentFolder.setFolderLink(subfolderName, '\0\0\0'); // avoid dead loop: block
                fp.gotoPath(folderLink, include_link); // this may throw error.
                this.#currentFolder.setFolderLink(subfolderName, folderLink); // avoid dead loop: back
                this.recover(fp, false);
                return this.#currentFolder;
            } catch (_) {
                this.#currentFolder.setFolderLink(subfolderName, folderLink); // avoid dead loop: back
            }
        }

        throw new Error(`Folder ${subfolderName} not found.`);
    }

    /**
     * @param {string} path
     * @param {boolean} include_link
     * @returns {Folder}
     * @throws {TypeError | Error}
     * */
    gotoPath(path, include_link = false) {
        if (typeof path !== 'string' || path.length === 0)
            throw new TypeError('Path must be a non-empty string.');
        if (typeof include_link !== 'boolean')
            throw new TypeError('include_link must be a boolean.');
        const fp = this.duplicate();
        if (path.startsWith('/')) {
            fp.gotoRoot();
        }
        const pathStack = path.split('/').filter((s) => s.length > 0);
        try {
            pathStack.forEach((folderName) => {
                switch (folderName) {
                    case '.': {
                        // do nothing (stay in the current folder)
                        break;
                    }
                    case '..': {
                        fp.gotoParentFolder();
                        break;
                    }
                    default: {
                        fp.#gotoSubfolder(folderName, true);
                        break;
                    }
                }
            });
            this.recover(fp, false);
            return this.#currentFolder;
        } catch (error) {
            throw new Error(`Path ${path} not found. <-- ${error}`);
        }
    }

    /**
     * @param {string} path
     * @param {boolean} goto_new_folder
     * @returns {Folder}
     * @throws {TypeError | Error}
     * */
    createPath(path, goto_new_folder = false) {
        if (typeof path !== 'string' || path.length === 0)
            throw new TypeError('Path must be a non-empty string.');
        if (typeof goto_new_folder !== 'boolean')
            throw new TypeError('goto_new_folder must be a boolean.');
        const fp = this.duplicate();
        if (path.startsWith('/')) {
            fp.gotoRoot();
        }
        const pathStack = path.split('/').filter((s) => s.length > 0);
        // check the availability of path for creation; otherwise, need to reverse all the edits
        if (pathStack.some((folderName) => folderName !== '.' && folderName !== '..' && !legalFileSystemKeyNameRegExp.test(folderName)))
            throw new Error(`Path ${path} must follow the keyname requirements.`);
        try {
            // do the creation of path
            pathStack.forEach((folderName) => {
                switch (folderName) {
                    case '.': {
                        // do nothing (goto the current folder)
                        break;
                    }
                    case '..': {
                        fp.gotoParentFolder();
                        break;
                    }
                    default: {
                        fp.#currentFolder = fp.#currentFolder.hasSubfolder(folderName) ?
                            fp.#currentFolder.getSubfolder(folderName) : fp.#currentFolder.createSubfolder(false, folderName);
                        fp.#currentFolderTrackingStack.push(folderName);
                        break;
                    }
                }
            });
            if (goto_new_folder)
                this.recover(fp, false);
            return this.#currentFolder;
        } catch (error) {
            throw new Error(`Failed to create ${path}. <-- ${error}`);
        }
    }

    /**
     * @param {'file' | 'directory'} type
     * @param {string} oldPath
     * @param {string} newPath
     * @param {boolean} include_link
     * @returns {TerminalFolderPointer}
     * @throws {Error}
     * */
    movePath(type, oldPath, newPath, include_link = false) {
        /*
        *  When moving a single file, if the destination is already existing, then the copy will stop.
        *
        *  When moving a folder, if a destination folder is already existing, then the folders will be merged;
        *                        if a destination file is already existing, then the file will be renamed and copied.
        * */
        if (type !== 'file' && type !== 'directory')
            throw new TypeError('Type must be either "file" or "directory".');
        if (typeof oldPath !== 'string' || oldPath.length === 0)
            throw new TypeError('Old path must be a non-empty string.');
        if (typeof newPath !== 'string' || newPath.length === 0)
            throw new TypeError('New path must be a non-empty string.');
        if (typeof include_link !== 'boolean')
            throw new TypeError('include_link must be a boolean.');
        if (type === 'file') {
            // analyze file paths
            const
                [oldFileDir, oldFileName] = extractDirAndKeyName(oldPath),
                [newFileDir, newFileName] = extractDirAndKeyName(newPath);
            // check the old file status
            const oldDir = this.duplicate().gotoPath(oldFileDir, include_link);
            if (!oldDir.hasFile(oldFileName))
                throw new Error(`Old file ${oldPath} not found.`);
            // check the new file status
            const newDir = this.duplicate().createPath(newFileDir, true);
            if (newDir.hasFile(newFileName))
                throw new Error(`New file ${newPath} already existing.`);
            // do the movement
            newDir.createFileDangerous(newFileName, oldDir.deleteFile(oldFileName));
            return this;
        }
        if (type === 'directory') {
            if (oldPath === '/')
                throw new Error('ROOT cannot be moved.');

            /**
             * This function shallow-moves <srcFolder> to <destFolder>.
             * Before the movement, <destFolder> should be set up.
             * After the movement, <srcFolder> should be __discarded__ (to avoid shared object pointers).
             * __Low-level__implementation__ is applied to boost runtime.
             * @param {Folder} destFolder
             * @param {Folder} srcFolder
             * @returns {void}
             * */
            const shallowMoveFolder = (destFolder, srcFolder) => {
                const
                    destFolderFiles = destFolder.getFiles(),
                    destFolderFileLinks = destFolder.getFileLinks(),
                    destFolderSubfolders = destFolder.getSubfolders(),
                    destFolderFolderLinks = destFolder.getFolderLinks();
                Object.entries(srcFolder.getFiles()).forEach(([fileName, file]) => {
                    if (destFolderFiles[fileName] instanceof File) {
                        let i = 2;
                        while (destFolderFiles[`${fileName} ${i}`] instanceof File)
                            i++;
                        fileName = `${fileName} ${i}`;
                    }
                    destFolderFiles[fileName] = file;
                });
                Object.entries(srcFolder.getFileLinks()).forEach(([fileLinkName, fileLink]) => {
                    if (typeof destFolderFileLinks[fileLinkName] === 'string') {
                        let i = 2;
                        while (typeof destFolderFileLinks[`${fileLinkName} ${i}`] === 'string')
                            i++;
                        fileLinkName = `${fileLinkName} ${i}`;
                    }
                    destFolderFileLinks[fileLinkName] = fileLink;
                });
                Object.entries(srcFolder.getSubfolders()).forEach(([subfolderName, subfolder]) => {
                    if (destFolderSubfolders[subfolderName] instanceof Folder) {
                        shallowMoveFolder(destFolderSubfolders[subfolderName], subfolder);
                    } else {
                        destFolderSubfolders[subfolderName] = subfolder;
                        subfolder.setParentFolder(destFolder); // reset parent folder
                    }
                });
                Object.entries(srcFolder.getFolderLinks()).forEach(([folderLinkName, folderLink]) => {
                    if (typeof destFolderFolderLinks[folderLinkName] === 'string') {
                        let i = 2;
                        while (typeof destFolderFolderLinks[`${folderLinkName} ${i}`] === 'string')
                            i++;
                        folderLinkName = `${folderLinkName} ${i}`;
                    }
                    destFolderFolderLinks[folderLinkName] = folderLink;
                });
            };

            // analyze dir paths
            const
                [oldDirParentPath, oldDirName] = extractDirAndKeyName(oldPath),
                oldDirParent = this.duplicate().gotoPath(oldDirParentPath, include_link),
                oldDir = oldDirParent.getSubfolder(oldDirName),
                newDir = this.duplicate().createPath(newPath, true);
            // do the movement
            shallowMoveFolder(newDir, oldDir);
            oldDirParent.deleteSubfolder(oldDirName);
            return this;
        }
        return this;
    }

    /**
     * @param {'file' | 'directory'} type
     * @param {string} oldPath
     * @param {string} newPath
     * @param {SerialLake} serialLake
     * @param {boolean} include_link
     * @returns {TerminalFolderPointer}
     * @throws {Error}
     * */
    copyPath(type, oldPath, newPath, serialLake, include_link = false) {
        /*
        *  When copying a single file, if the destination is already existing, then the copy will stop.
        *  When copying a folder, if a destination folder is already existing, then the folders will be merged;
        *                         if a destination file is already existing, then the file will be renamed and copied.
        * */
        if (type !== 'file' && type !== 'directory')
            throw new TypeError('Type must be either "file" or "directory".');
        if (typeof oldPath !== 'string' || oldPath.length === 0)
            throw new TypeError('Old path must be a non-empty string.');
        if (typeof newPath !== 'string' || newPath.length === 0)
            throw new TypeError('New path must be a non-empty string.');
        if (!(serialLake instanceof SerialLake))
            throw new TypeError('Serial lake must be a SerialLake.');
        if (typeof include_link !== 'boolean')
            throw new TypeError('include_link must be a boolean.');
        if (type === 'file') {
            // analyze file paths
            const
                [oldFileDir, oldFileName] = extractDirAndKeyName(oldPath),
                [newFileDir, newFileName] = extractDirAndKeyName(newPath);
            // check the old file status
            const oldDir = this.duplicate().gotoPath(oldFileDir, include_link);
            if (!oldDir.hasFile(oldFileName))
                throw new Error(`Old file ${oldPath} not found.`);
            // check the new file status
            const newDir = this.duplicate().createPath(newFileDir, true);
            if (newDir.hasFile(newFileName))
                throw new Error(`New file ${newPath} already existing.`);
            // do the deep copy
            newDir.createFileDangerous(newFileName, oldDir.getFile(oldFileName).duplicate(serialLake.generateNext()));
            return this;
        }
        if (type === 'directory') {
            /**
             * This function deep-copies <srcFolder> to <destFolder>.
             * Before the movement, <destFolder> should be set up.
             * After the movement, <srcFolder> is still valid.
             * __Low-level__implementation__ is applied to boost runtime.
             * @param {Folder} destFolder
             * @param {Folder} srcFolder
             * @returns {void}
             * */
            const deepCopyFolder = (destFolder, srcFolder) => {
                const
                    destFolderFiles = destFolder.getFiles(),
                    destFolderFileLinks = destFolder.getFileLinks(),
                    destFolderSubfolders = destFolder.getSubfolders(),
                    destFolderFolderLinks = destFolder.getFolderLinks();
                Object.entries(srcFolder.getFiles()).forEach(([fileName, file]) => {
                    if (destFolderFiles[fileName] instanceof File) {
                        let i = 2;
                        while (destFolderFiles[`${fileName} ${i}`] instanceof File)
                            i++;
                        fileName = `${fileName} ${i}`;
                    }
                    destFolderFiles[fileName] = file.duplicate(serialLake.generateNext());
                });
                Object.entries(srcFolder.getFileLinks()).forEach(([fileLinkName, fileLink]) => {
                    if (typeof destFolderFileLinks[fileLinkName] === 'string') {
                        let i = 2;
                        while (typeof destFolderFileLinks[`${fileLinkName} ${i}`] === 'string')
                            i++;
                        fileLinkName = `${fileLinkName} ${i}`;
                    }
                    destFolderFileLinks[fileLinkName] = fileLink;
                });
                Object.entries(srcFolder.getSubfolders()).forEach(([subfolderName, subfolder]) => {
                    if (destFolderSubfolders[subfolderName] instanceof Folder) {
                        deepCopyFolder(destFolderSubfolders[subfolderName], subfolder);
                    } else {
                        deepCopyFolder(destFolderSubfolders[subfolderName] = new Folder(false, destFolder), subfolder);
                    }
                });
                Object.entries(srcFolder.getFolderLinks()).forEach(([folderLinkName, folderLink]) => {
                    if (typeof destFolderFolderLinks[folderLinkName] === 'string') {
                        let i = 2;
                        while (typeof destFolderFolderLinks[`${folderLinkName} ${i}`] === 'string')
                            i++;
                        folderLinkName = `${folderLinkName} ${i}`;
                    }
                    destFolderFolderLinks[folderLinkName] = folderLink;
                });
            };

            // analyze dir paths
            const
                oldDir = this.duplicate().gotoPath(oldPath, include_link),
                newDir = this.duplicate().createPath(newPath, true);
            // do the deep copy
            deepCopyFolder(newDir, oldDir);
            return this;
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
        if (type !== 'file' && type !== 'directory')
            throw new TypeError('Type must be either "file" or "directory".');
        if (typeof path !== 'string' || path.length === 0)
            throw new TypeError('Path must be a non-empty string.');
        if (type === 'file') {
            // analyze file path
            const [fileDir, fileName] = extractDirAndKeyName(path);
            // check the file status
            const dir = this.duplicate().gotoPath(fileDir);
            if (!dir.hasFile(fileName))
                throw new Error(`File ${path} not found.`);
            // delete the file
            dir.deleteFile(fileName);
            return this;
        }
        if (type === 'directory') {
            if (path === '/') {
                this.#fsRoot.clear();
            } else {
                // analyze dir path
                const [dirParentPath, dirName] = extractDirAndKeyName(path);
                // check the dir status
                const dirParent = this.duplicate().gotoPath(dirParentPath);
                if (!dirParent.hasSubfolder(dirName))
                    throw new Error(`Folder ${path} not found.`);
                // delete the dir
                dirParent.deleteSubfolder(dirName);
            }
            return this;
        }
        return this;
    }
}

/**
 * This structure represents the "stdin" for the command window.
 * SHOULD BE UPDATED TO BETTER SUPPORT USER INPUT HANDLERS.
 * */
class CommandInputHandler {
    /** @type {Record<string, {is_async: boolean, executable: function(string[]):void, description: string}>} */
    #supportedCommands;
    /** @type {string[]} */
    #buffer;

    /**
     * @param {Record<string, {is_async: boolean, executable: function(string[]):void, description: string}>} supportedCommands
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

/**
 * This structure represents the records of all minimized windows in a tab.
 * All its instances should appear in a terminal core.
 * */
class MinimizedWindowRecords {
    /** @type {Record<number, [string, function():void]>} */
    #records; // description: windowRecoverCallback
    /** @type {number} */
    #addCount;
    /** @type {number} */
    #deleteCount;

    constructor() {
        this.#records = {};
        this.#addCount = 0;
        this.#deleteCount = 0;
    }

    /**
     * @param {string} description
     * @param {function():void} windowRecoverCallback
     * @returns {void}
     * @throws {TypeError}
     * */
    add(description, windowRecoverCallback) {
        if (typeof description !== 'string' || description.length === 0)
            throw new TypeError('Description should be a non-empty string.');
        if (typeof windowRecoverCallback !== 'function')
            throw new TypeError('windowRecoverCallback should be a function.');
        this.#addCount++;
        this.#records[this.#addCount] = [description, windowRecoverCallback];
    }

    /**
     * @param {number} index
     * @returns {null | boolean} whether records are re-factored.
     * @throws {TypeError}
     * */
    recoverWindow(index) {
        if (typeof index !== 'number' || !Number.isInteger(index) || index < 0)
            throw new TypeError('Index must be a natural number.');
        if (this.#records[index] === undefined)
            return null;
        const [_, windowRecoverCallback] = this.#records[index];
        windowRecoverCallback();
        this.#deleteCount++;
        delete this.#records[index];
        if (this.#deleteCount > 100000) {
            const
                oldEntries = Object.entries(this.#records),
                newRecords = {};
            for (this.#addCount = 0; this.#addCount < oldEntries.length; this.#addCount++) {
                const [_, [description, windowRecoverCallback]] = oldEntries[this.#addCount];
                newRecords[this.#addCount + 1] = [description, windowRecoverCallback];
            }
            this.#deleteCount = 0;
            this.#records = newRecords;
            return true;
        }
        return false;
    }

    /**
     * @returns {[number, string][]}
     * */
    getList() {
        return Object.entries(this.#records).reduce(
            (acc, [index, [description, _]]) => {
                acc.push([index, description]);
                return acc;
            },
            []
        );
    }
}

/**
 * This structure represents the core services of the terminal, handling all the terminal interfaces.
 * */
class TerminalCore {
    /** @type {Terminal} */
    #xtermObj;
    /** @type {HTMLDivElement} */
    #terminalWindowTab;
    /** @type {Folder} */
    #fsRoot;

    /** @type {SerializeAddon | null} */
    #serializeAddon;
    /** @type {FitAddon | null} */
    #fitAddon;
    /** @type {Object | null} */
    #currentXTermKeyboardListener;
    /** @type {CommandInputHandler} */
    #commandInputHandler;
    /** @type {MinimizedWindowRecords} */
    #minimizedWindowRecords;
    /** @type {Record<any, any>} */
    #cacheSpace;
    /** @type {TerminalFolderPointer} */
    #currentTerminalFolderPointer;

    /**
     * @returns {void}
     * */
    clearKeyboardListener() {
        if (this.#currentXTermKeyboardListener !== null)
            this.#currentXTermKeyboardListener.dispose();
    }

    /**
     * @param {function(string):Promise<void | undefined>} keyboardListeningCallback
     * @returns {void}
     * */
    setNewKeyboardListener(keyboardListeningCallback) {
        this.clearKeyboardListener();
        this.#currentXTermKeyboardListener = this.#xtermObj.onData(keyboardListeningCallback);
    }

    /**
     * @returns {void}
     * */
    setDefaultKeyboardListener() {
        this.setNewKeyboardListener(async (keyboardInput) => {
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
                case '\u000C': { // Ctrl+L
                    this.#xtermObj.write(`\x1b[2J\x1b[H $ `);
                    this.#xtermObj.write(this.#commandInputHandler.toString());
                    break;
                }
                case '\u007F': { // Backspace
                    if (this.#commandInputHandler.removeChar()) { // if the char is successfully removed from the buffer
                        this.#xtermObj.write('\b \b');
                    }
                    break;
                }
                case '\r': { // Enter
                    this.clearKeyboardListener();
                    this.#xtermObj.write('\n\r   ');
                    const [statusCode, commandName] = await this.#commandInputHandler.execute();
                    switch (statusCode) {
                        case 0: {
                            // success execution
                            break;
                        }
                        case 1: {
                            this.#xtermObj.write(`${commandName}: command not found`);
                            break;
                        }
                        case 2: {
                            this.#xtermObj.write(`${commandName}: command failed due to uncaught errors in the command implementation`);
                            break;
                        }
                        default: {
                        }
                    }
                    this.#commandInputHandler.clear();
                    this.#xtermObj.write('\n\n\r $ ');
                    this.setDefaultKeyboardListener();
                    break;
                }
                default: { // paste from the clipboard
                    for (const char of keyboardInput) {
                        // if (char >= String.fromCharCode(0x20) && char <= String.fromCharCode(0x7E) || char >= '\u00a0') {
                        this.#commandInputHandler.addChar(char);
                        this.#xtermObj.write(char);
                        // }
                    }
                }
            }
        });
    }

    /**
     * This method generates a unified terminal interface.
     * Because this is a basic set-up method, type-checks are omitted!!!
     * @param {Terminal} xtermObj
     * @param {HTMLDivElement} terminalWindowTab
     * @param {Folder} fsRoot
     * @param {Record<string, {is_async: boolean, executable: function(string[]):void, description: string}>} supportedCommands
     * */
    constructor(xtermObj, terminalWindowTab, fsRoot, supportedCommands) {
        this.#xtermObj = xtermObj;
        this.#terminalWindowTab = terminalWindowTab;
        this.#fsRoot = fsRoot;

        // Set up an XTerminal Window to <terminalWindowTab>
        this.#xtermObj.open(this.#terminalWindowTab);

        // Enable SerializeAddon
        try {
            this.#serializeAddon = new SerializeAddon();
            this.#xtermObj.loadAddon(this.#serializeAddon);
        } catch (error) {
            this.#serializeAddon = null;
            alert(`Failed to load the serialize-addon (${error}).`);
        }

        // Enabled Fit Addon
        try {
            this.#fitAddon = new FitAddon();
            this.#xtermObj.loadAddon(this.#fitAddon);
        } catch (error) {
            this.#fitAddon = null;
            alert(`Failed to load the fit-addon (${error}).`);
        }

        // Initialize Current Keyboard Listener
        this.#currentXTermKeyboardListener = null;

        // Initialize Command Input Handler
        this.#commandInputHandler = new CommandInputHandler(supportedCommands);

        // Initialize Default Terminal Window's Listening to Keyboard Input
        this.setDefaultKeyboardListener();

        // Initialize Terminal Minimized-Window Records
        this.#minimizedWindowRecords = new MinimizedWindowRecords();

        // Initialize Terminal Cache Space
        this.#cacheSpace = {/* any additional information */};

        // Initialize Terminal Global Folder Pointer Object
        this.#currentTerminalFolderPointer = new TerminalFolderPointer(fsRoot);

        // Initialize Terminal Window Display
        this.#xtermObj.write(` $ `);
    }

    /**
     * @param {string} sentence
     * @param {boolean} if_print_raw_to_window
     * @param {'white' | 'red' | 'green' | 'blue' | 'yellow'} color
     * @returns {void}
     * @throws {TypeError}
     * */
    printToWindow(sentence, if_print_raw_to_window, color = 'white') { // (string, boolean, boolean) => void
        if (typeof sentence !== 'string')
            throw new TypeError('Sentence must be a string.');
        if (typeof if_print_raw_to_window !== 'boolean')
            throw new TypeError('if_print_raw_to_window must be a boolean.');
        // type check for color is not decided yet!!!
        if (if_print_raw_to_window) {
            this.#xtermObj.write(sentence); // leave <sentence> as it was
        } else {
            this.#xtermObj.write(sentence.replaceAll('\n', '\n\r   ')); // replace all '\n' in <sentence> with '\n\r   '
        }
    }

    // /**
    //  * @returns {SerializeAddon | null}
    //  * */
    // getSerializeAddon() {
    //     return this.#serializeAddon;
    // }

    /**
     * @returns {FitAddon | null}
     * */
    getFitAddon() {
        return this.#fitAddon;
    }

    /**
     * @returns {string}
     * */
    getTerminalLogAsString() {
        return this.#serializeAddon.serialize();
    }

    /**
     * @returns {HTMLDivElement}
     * */
    getWindowTab() {
        return this.#terminalWindowTab;
    }

    /**
     * @returns {MinimizedWindowRecords}
     * */
    getMinimizedWindowRecords() {
        return this.#minimizedWindowRecords;
    }

    /**
     * @returns {Record<any,any>}
     * */
    getCacheSpace() {
        return this.#cacheSpace;
    }

    /**
     * @returns {TerminalFolderPointer}
     * */
    getCurrentFolderPointer() {
        return this.#currentTerminalFolderPointer;
    }
}

export {
    Terminal,
    FitAddon,
    SerializeAddon,
    // JSZip,
    getISOTimeString,
    randomInt,
    utf8Decoder,
    utf8Encoder,
    formData,
    legalFileSystemKeyNameRegExp,
    legalFileSerialRegExp,
    SerialLake,
    File,
    Folder,
    extractDirAndKeyName,
    TerminalFolderPointer,
    CommandInputHandler,
    MinimizedWindowRecords,
    TerminalCore
};