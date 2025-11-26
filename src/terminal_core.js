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
     * This function pops up an alert window.
     * If exitButtonText.length === 0, then the button will not appear!
     * @param {HTMLElement} terminalWindowFrame
     * @param {string} alertMessage
     * @param {string} exitButtonText
     * @param {(function():void) | null} callbackAfterExit
     * @returns {HTMLButtonElement}
     * @throws {TypeError}
     * */
    popupAlert = (
        terminalWindowFrame,
        alertMessage,
        exitButtonText = 'Got it',
        callbackAfterExit = null
    ) => {
        if (!(terminalWindowFrame instanceof HTMLElement))
            throw new TypeError('terminalWindowFrame must be an HTMLElement.');
        if (typeof alertMessage !== 'string' || alertMessage.length === 0)
            throw new TypeError('alertMessage must be a non-empty string.');
        if (typeof exitButtonText !== 'string' || exitButtonText.length > 32)
            throw new TypeError('exitButtonText must be a string of length between 0 and 32 (inclusive).');
        if (typeof callbackAfterExit !== 'function' && callbackAfterExit !== null)
            throw new TypeError('callbackAfterExit must be a function or null.');
        const divOverlay = document.createElement('div');
        divOverlay.classList.add('popup-overlay');
        divOverlay.addEventListener('click', () => undefined);

        const divAlertPopup = document.createElement('div');
        divAlertPopup.classList.add('alert-popup');

        const h3Title = document.createElement('h3');
        h3Title.textContent = 'Alert';
        divAlertPopup.appendChild(h3Title);

        // alertMessage container
        const divMessage = document.createElement('div');
        divMessage.classList.add('alert-popup-alertMessage');
        divMessage.textContent = alertMessage;
        divAlertPopup.appendChild(divMessage);

        // helper function to close the popup with fade-out animation
        const closePopup = () => {
            divAlertPopup.classList.add('fade-out');
            divOverlay.classList.add('fade-out');
            setTimeout(() => {
                divAlertPopup.remove();
                divOverlay.remove();
            }, 200); // Match animation duration
        };

        // exit buttons container
        const divExitButtonContainer = document.createElement('div');
        divExitButtonContainer.classList.add('alert-popup-button-container');

        const gotitButton = document.createElement('button');
        gotitButton.textContent = exitButtonText;
        gotitButton.classList.add('alert-popup-got-it-button');
        gotitButton.addEventListener('click', () => {
            closePopup();
            if (callbackAfterExit !== null)
                callbackAfterExit();
        });

        if (exitButtonText.length !== 0) {
            divExitButtonContainer.appendChild(gotitButton);
            divAlertPopup.appendChild(divExitButtonContainer);
        }

        // Append to terminalWindowFrame
        terminalWindowFrame.appendChild(divOverlay);
        terminalWindowFrame.appendChild(divAlertPopup);

        // Focus the OK button for keyboard accessibility
        if (exitButtonText.length !== 0) {
            setTimeout(() => {
                gotitButton.focus();
            }, 100);
        }

        return gotitButton;
    },
    /**
     * This function pops up the editor window for the <edit> command.
     * @param {HTMLDivElement} terminalWindowFrame
     * @param {string} fileName
     * @param {string} orginalFileContent
     * @param {function(newFileContent: string): void} callbackToSaveFile
     * @param {function():void} callbackToCancelEdit
     * @returns {void}
     * @throws {TypeError}
     * */
    popupFileEditor = (
        terminalWindowFrame,
        fileName, orginalFileContent,
        callbackToSaveFile, callbackToCancelEdit
    ) => {
        if (!(terminalWindowFrame instanceof HTMLDivElement))
            throw new TypeError('terminalWindowFrame must be an HTMLDivElement');
        if (typeof fileName !== 'string')
            throw new TypeError('fileName must be a string.');
        if (typeof orginalFileContent !== 'string')
            throw new TypeError('orginalFileContent must be a string.');
        if (typeof callbackToSaveFile !== 'function')
            throw new TypeError('callbackToSaveFile must be a function.');
        if (typeof callbackToCancelEdit !== 'function')
            throw new TypeError('callbackToCancelEdit must be a function.');
        const divAceEditorWindow = document.createElement('div');
        divAceEditorWindow.classList.add('ace-editor-window');
        {
            // the title of the editor window
            const h3Title = document.createElement('h3');
            h3Title.classList.add('ace-editor-title');
            h3Title.innerText = `Editing File: ${fileName}`;
            divAceEditorWindow.appendChild(h3Title);

            // Ace-Editor container
            const divAceEditorContainer = document.createElement('div');
            divAceEditorContainer.classList.add('ace-editor-container');
            const aceEditorObject = ace.edit(divAceEditorContainer, { // create Ace editor in the div container
                // mode: "ace/mode/javascript",
                // selectionStyle: "text"
            });
            aceEditorObject.setValue(orginalFileContent);  // set the initial content of the file
            aceEditorObject.setOptions({
                fontSize: "14px",   // set font size
                showPrintMargin: false, // disable the print margin
            });
            aceEditorObject.focus();
            divAceEditorWindow.appendChild(divAceEditorContainer);

            // exit buttons container
            const divExitButtonsContainer = document.createElement('div');
            divExitButtonsContainer.classList.add('ace-editor-exit-buttons-container');
            const saveButton = document.createElement('button');
            saveButton.classList.add('ace-editor-save-button');
            saveButton.textContent = '💾 Save';
            saveButton.addEventListener('click', () => {
                callbackToSaveFile(aceEditorObject.getValue());
                divAceEditorWindow.classList.add('fade-out');
                setTimeout(() => {
                    divAceEditorWindow.remove();
                }, 200); // Match animation duration
            });
            divExitButtonsContainer.appendChild(saveButton);
            const cancelButton = document.createElement('button');
            cancelButton.classList.add('ace-editor-cancel-button');
            cancelButton.textContent = '✖ Cancel';
            cancelButton.addEventListener('click', () => {
                callbackToCancelEdit();
                divAceEditorWindow.classList.add('fade-out');
                setTimeout(() => {
                    divAceEditorWindow.remove();
                }, 200); // Match animation duration
            });
            divExitButtonsContainer.appendChild(cancelButton);
            divAceEditorWindow.appendChild(divExitButtonsContainer);
        }
        terminalWindowFrame.appendChild(divAceEditorWindow);
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
 * This structure represents an RGB color.
 * */
class RGBColor {
    /** @type {RGBColor} */
    static white = new RGBColor(255, 255, 255);
    /** @type {RGBColor} */
    static black = new RGBColor(0, 0, 0);
    /** @type {RGBColor} */
    static red = new RGBColor(255, 100, 100);
    /** @type {RGBColor} */
    static green = new RGBColor(150, 255, 150);
    /** @type {RGBColor} */
    static blue = new RGBColor(75, 75, 255);
    /** @type {RGBColor} */
    static yellow = new RGBColor(255, 255, 0);
    /** @type {RGBColor} */
    static purple = new RGBColor(255, 0, 255);
    /** @type {RGBColor} */
    static turquoise = new RGBColor(0, 255, 255);

    /** @type {number} */
    #r;
    /** @type {number} */
    #g;
    /** @type {number} */
    #b;

    /**
     * @param {number} r
     * @param {number} g
     * @param {number} b
     * @throws {TypeError}
     * */
    constructor(r, g, b) {
        if (
            typeof r !== 'number' || typeof g !== 'number' || typeof b !== 'number' ||
            !Number.isInteger(r) || !Number.isInteger(g) || !Number.isInteger(b) ||
            r < 0 || g < 0 || b < 0 ||
            r > 255 || g > 255 || b > 255
        ) throw new TypeError('r, g, and b must be an integer between 0 and 255 (inclusive).');
        this.#r = r;
        this.#g = g;
        this.#b = b;
    }

    /**
     * @returns {[number, number, number]}
     * */
    getRGBArray() {
        return [this.#r, this.#g, this.#b];
    }

    /**
     * @returns {{r: number, g: number, b: number}}
     * */
    getRGBObject() {
        return {
            r: this.#r,
            g: this.#g,
            b: this.#b
        };
    }
}

/**
 * This structure represents the core services of the terminal, handling all the terminal interfaces.
 * */
class TerminalCore {
    /** @type {Terminal} */
    #xtermObj;
    /** @type {HTMLDivElement} */
    #terminalWindowFrame;
    /** @type {HTMLButtonElement} */
    #viewSwitchButton;
    /** @type {Folder} */
    #fsRoot;
    /** @type {Record<string, {is_async: boolean, executable: function(string[]):void, description: string}>} */
    #supportedCommands;

    /** @type {FitAddon | null} */
    #fitAddon;
    /** @type {SerializeAddon | null} */
    #serializeAddon;
    /** @type {HTMLTextAreaElement} */
    #terminalWindowFrameTextArea;
    /** @type {Object | null} */
    #currentXTermKeyboardListener;
    /** @type {Record<any, any>} */
    #cacheSpace;
    /** @type {TerminalFolderPointer} */
    #currentTerminalFolderPointer;
    /** @type {function(string): Promise<void>} */
    #defaultKeyboardListeningFunction;

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
     * @throws {TypeError}
     * */
    setNewKeyboardListener(keyboardListeningCallback) {
        if (typeof keyboardListeningCallback !== 'function')
            throw new TypeError('KeyboardListener must be a function.');
        this.clearKeyboardListener();
        this.#currentXTermKeyboardListener = this.#xtermObj.onData(keyboardListeningCallback);
    }

    /**
     * @returns {void}
     * */
    setDefaultKeyboardListener() {
        this.setNewKeyboardListener(this.#defaultKeyboardListeningFunction);
    }

    /**
     * @param {string} commandName
     * @param {string[]} commandParameters
     * @returns {Promise<void>}
     * */
    async executeCommand(commandName, commandParameters) {
        if (typeof commandName !== 'string')
            throw new TypeError('CommandName must be a string.');
        if (!Array.isArray(commandParameters) || !commandParameters.every((str) => typeof str === 'string' && str.length > 0))
            throw new TypeError('CommandParameters must be an array of non-empty strings.');
        this.clearKeyboardListener();
        // exit of kernel mode
        this.printToWindow('\n');
        const commandObject = this.#supportedCommands[commandName];
        if (commandObject === undefined) {
            this.printToWindow(`Command "${commandName}" is not found.`, RGBColor.red);
        } else {
            try {
                if (commandObject.is_async === true) { // must check "=== true"
                    await commandObject.executable(commandParameters);
                } else {
                    commandObject.executable(commandParameters);
                }
            } catch (error) {
                this.printToWindow(`Command "${commandName}" failed due to uncaught errors. <-- ${error}`, RGBColor.red);
            }
        }
        this.printToWindow('\n\n $ ', null, null, false, '');
        // enter of kernel mode
        this.setDefaultKeyboardListener();
    }

    /**
     * This method generates a unified terminal interface.
     * Because this is a basic set-up method, type-checks are omitted!!!
     * @param {Terminal} xtermObj
     * @param {HTMLDivElement} terminalWindowFrame
     * @param {HTMLButtonElement} viewSwitchButton
     * @param {Folder} fsRoot
     * @param {Record<string, {is_async: boolean, executable: function(string[]):void, description: string}>} supportedCommands
     * */
    constructor(xtermObj, terminalWindowFrame, viewSwitchButton, fsRoot, supportedCommands) {
        this.#xtermObj = xtermObj;
        this.#terminalWindowFrame = terminalWindowFrame;
        this.#viewSwitchButton = viewSwitchButton;
        this.#fsRoot = fsRoot;
        this.#supportedCommands = supportedCommands;

        // Set up an XTerminal Window to <terminalWindowFrame>
        this.#xtermObj.open(this.#terminalWindowFrame);

        // Enabled Fit Addon
        try {
            this.#fitAddon = new FitAddon();
            this.#xtermObj.loadAddon(this.#fitAddon);
        } catch (error) {
            this.#fitAddon = null;
            alert(`Failed to load the fit-addon (${error}).`);
        }

        // Enable SerializeAddon
        try {
            this.#serializeAddon = new SerializeAddon();
            this.#xtermObj.loadAddon(this.#serializeAddon);
        } catch (error) {
            this.#serializeAddon = null;
            alert(`Failed to load the serialize-addon (${error}).`);
        }

        // Initialize the terminal window textarea pointer
        const textareas = this.#terminalWindowFrame.getElementsByTagName('textarea');
        if (textareas.length > 0) this.#terminalWindowFrameTextArea = textareas[0];

        // Initialize Current Keyboard Listener
        this.#currentXTermKeyboardListener = null;

        // Initialize Terminal Cache Space
        this.#cacheSpace = {/* any additional information */};

        // Initialize Terminal Global Folder Pointer Object
        this.#currentTerminalFolderPointer = new TerminalFolderPointer(fsRoot);

        // Initialize Default Keyboard Listening Function
        let
            /** @type {string[]} */
            buffer = [];
        const
            /** @returns {string} */
            bufferToString = () => buffer.reduce((acc, char) => `${acc}${char}`, ''),
            /** @param {string} str @returns {void} */
            bufferAddString = (str) => {
                for (const ch of str) buffer.push(ch);
            },
            /** @returns {boolean} */
            bufferRemoveChar = () => {
                if (buffer.length <= 0)
                    return false;
                buffer.pop();
                return true;
            },
            /** @returns {void} */
            bufferReset = () => {
                buffer = [];
            },
            /** @returns {[string, string[]]} */
            bufferAnalyzeCommandNameParameters = () => {
                let index = 0;
                const
                    parseNextWord = () => {
                        // clear leading white spaces
                        while (index < buffer.length && buffer[index] === ' ') index++;
                        let word = '';
                        if (buffer[index] === `"` || buffer[index] === `'`) { // if quote marks makes a phase
                            const quoteIndex = index;
                            index++;
                            let hasClosingQuote = false;
                            while (index < buffer.length) {
                                if (buffer[index] === buffer[quoteIndex]) { // closing quote marks the end
                                    hasClosingQuote = true;
                                    index++;
                                    break;
                                }
                                word += buffer[index];
                                index++;
                            }
                            if (!hasClosingQuote)
                                word = buffer[quoteIndex] + word;
                            return word;
                        } else { // if the next word is common
                            while (index < buffer.length) {
                                if (buffer[index] === ' ') { // white spaces marks the end
                                    index++;
                                    break;
                                }
                                word += buffer[index];
                                index++;
                            }
                            return word;
                        }
                    },
                    commandName = parseNextWord(),
                    commandParameters = [];
                while (index < buffer.length) {
                    const param = parseNextWord();
                    if (param.length > 0) commandParameters.push(param);
                }
                return [commandName, commandParameters];
            };
        const
            /** @type {[string, string[]]} */
            previousCommands = [];
        let
            /** @type {number} */
            indexPrevComm = -1;
        this.#defaultKeyboardListeningFunction = async (keyboardInput) => {
            switch (keyboardInput) {
                case '\x1bOP': { // F1 (ignored)
                    break;
                }
                case '\x1bOQ': { // F2 (ignored)
                    break;
                }
                case '\x1bOR': { // F3 (ignored)
                    break;
                }
                case '\x1bOS': { // F4 (ignored)
                    break;
                }
                case '\x1b[15~': { // F5 (ignored)
                    break;
                }
                case '\x1b[17~': { // F6 (ignored)
                    break;
                }
                case '\x1b[18~': { // F7 (ignored)
                    break;
                }
                case '\x1b[19~': { // F8 (ignored)
                    break;
                }
                case '\x1b[20~': { // F9 (ignored)
                    break;
                }
                case '\x1b[21~': { // F10 (ignored)
                    break;
                }
                case '\x1b[23~': { // F11 (ignored)
                    break;
                }
                case '\x1b[24~': { // F12 (ignored)
                    break;
                }
                case '\x1b[C': { // Right Arrow (ignored)
                    break;
                }
                case '\x1b[D': { // Left Arrow (ignored)
                    break;
                }
                case '\t': { // TAB (ignored for now)
                    break;
                }
                case '\x1b[A': { // Up Arrow
                    if (previousCommands.length <= 0)
                        break;
                    if (indexPrevComm === -1 || indexPrevComm === 0) {
                        indexPrevComm = previousCommands.length - 1;
                    } else {
                        indexPrevComm--;
                    }
                    const
                        [commandName, commandParameters] = previousCommands[indexPrevComm],
                        command = commandParameters.reduce((acc, str) => `${acc} ${str}`, commandName);
                    this.clearLineInWindow();
                    this.printToWindow(` $ ${command}`);
                    bufferReset();
                    bufferAddString(command);
                    break;
                }
                case '\x1b[B': { // Down Arrow
                    if (previousCommands.length <= 0)
                        break;
                    if (indexPrevComm === -1 || indexPrevComm === previousCommands.length - 1) {
                        indexPrevComm = 0;
                    } else {
                        indexPrevComm++;
                    }
                    const
                        [commandName, commandParameters] = previousCommands[indexPrevComm],
                        command = commandParameters.reduce((acc, str) => `${acc} ${str}`, commandName);
                    this.clearLineInWindow();
                    this.printToWindow(` $ ${command}`);
                    bufferReset();
                    bufferAddString(command);
                    break;
                }
                case '\u007F': { // Backspace
                    if (bufferRemoveChar()) { // if the char is successfully removed from the buffer
                        this.printToWindow('\b \b');
                    }
                    break;
                }
                case '\r': { // Enter
                    if (buffer.length <= 0) break;
                    const [commandName, commandParameters] = bufferAnalyzeCommandNameParameters();
                    bufferReset();
                    previousCommands.push([commandName, commandParameters]);
                    indexPrevComm = -1;
                    await this.executeCommand(commandName, commandParameters);
                    break;
                }
                case '\u000C': { // Ctrl+L
                    this.clearAllInWindow();
                    this.printToWindow(` $ ${bufferToString()}`);
                    break;
                }
                case '\u0016': { // Ctrl+V
                    const clipText = await navigator.clipboard.readText();
                    const safeKeyboardInput = clipText.replace(/[^ -~]/g, '');
                    this.printToWindow(safeKeyboardInput);
                    bufferAddString(safeKeyboardInput);
                    break;
                }
                default: {
                    // delete every character outside the printable ASCII range
                    const safeKeyboardInput = keyboardInput.replace(/[^ -~]/g, '');
                    this.printToWindow(safeKeyboardInput);
                    bufferAddString(safeKeyboardInput);
                }
            }
        };

        // Initialize Terminal Window Display
        this.printToWindow(' $ ');

        // Initialize Default Terminal Window's Listening to Keyboard Input
        this.setDefaultKeyboardListener();
    }

    /**
     * @return {void}
     * */
    clearLineInWindow() {
        this.#xtermObj.write('\x1b[2K\r');
    }

    /**
     * @return {void}
     * */
    clearAllInWindow() {
        this.#xtermObj.write('\x1b[2J\x1b[H');
    }

    /**
     * @param {string} content
     * @param {RGBColor | null} fontColor
     * @param {RGBColor | null} backgroundColor
     * @param {boolean} prefix_first_line
     * @param {string} prefixPerLine
     * @returns {number}
     * @throws {TypeError}
     * */
    printToWindow(content, fontColor = null, backgroundColor = null, prefix_first_line = false, prefixPerLine = '   ') {
        if (typeof content !== 'string' || content.length === 0)
            throw new TypeError('content must be a non-empty string.');
        // if (content.indexOf('\r') !== -1)
        //     throw new TypeError(`content must not include '\\r'.`);
        if (typeof prefix_first_line !== 'boolean')
            throw new TypeError(`prefix_first_line must be a boolean.`);
        if (typeof prefixPerLine !== 'string')
            throw new TypeError('prefixPerLine must be a string.');
        if (prefixPerLine.indexOf('\b') !== -1 || prefixPerLine.indexOf('\r') !== -1 || prefixPerLine.indexOf('\n') !== -1)
            throw new TypeError(`prefixPerLine must not include '\\b', '\\r', or '\\n'.`);
        // prefix the content string
        content = content.replaceAll('\n', `\n\r${prefixPerLine}`);
        if (prefix_first_line) content = prefixPerLine + content;
        // read font color
        if (fontColor !== null) {
            if (!(fontColor instanceof RGBColor))
                throw new TypeError(`fontColor must be an RGBColor or null.`);
            // add fontColor as a presetting
            const [fr, fg, fb] = fontColor.getRGBArray();           // reset font color
            content = `\x1b[38;2;${fr};${fg};${fb}m` + content;
        }
        // read background color
        if (backgroundColor !== null) {
            if (!(backgroundColor instanceof RGBColor))
                throw new TypeError(`backgroundColor must be an RGBColor or null.`);
            // add backgroundColor as a presetting
            const [br, bg, bb] = backgroundColor.getRGBArray();     // reset background color
            content = `\x1b[48;2;${br};${bg};${bb}m` + content;
        }
        // reset the styles
        content = content + `\x1b[0m`;                                                       // reset to default
        // write to window object
        this.#xtermObj.write(content);
        return content.length;
    }

    /**
     * @returns {HTMLTextAreaElement}
     * */
    getWindowTextArea() {
        return this.#terminalWindowFrameTextArea;
    }

    /**
     * @returns {FitAddon | null}
     * */
    getFitAddon() {
        return this.#fitAddon;
    }

    // /**
    //  * @returns {SerializeAddon | null}
    //  * */
    // getSerializeAddon() {
    //     return this.#serializeAddon;
    // }

    /**
     * @returns {string}
     * */
    getTerminalLogAsString() {
        /** @type {string} */
        const log = this.#serializeAddon.serialize();
        return log.replace(/\x1b\[[0-9;]*m/g, ''); // Remove SGR color codes, like \x1b[38;2;255;100;100m, \x1b[0m, etc.
    }

    /**
     * @returns {HTMLDivElement}
     * */
    getWindowFrame() {
        return this.#terminalWindowFrame;
    }

    /**
     * @returns {HTMLButtonElement}
     * */
    getViewSwitchButton() {
        return this.#viewSwitchButton;
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

const
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
    },
    /**
     * @param {string} ipp
     * @param {string} userKey
     * @returns {Promise<void>}
     * @throws {TypeError | Error}
     * */
    verifyMyCloudSetup = async (ipp, userKey) => {
        if (typeof ipp !== 'string' || ipp.length < 7)
            throw new TypeError('ipp must be a string of length at least 7.');
        if (typeof userKey !== 'string' || userKey.length < 5)
            throw new TypeError('userKey must be a string of length at least 5.');
        const [status, stream] = await fetch(
            `http://${ipp}/mycloud/users/validate/`,
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
            throw new Error(`${error}`);
        }
        const {result: result} = stream; // stream here is a json object
        if (result !== true) {
            throw new Error(`The user key does not exist.`);
        }
    },
    /**
     * @param {string} ipp
     * @param {string} userKey
     * @param {Folder} fsRoot
     * @returns {Promise<void>}
     * @throws {TypeError | Error}
     * */
    uploadFSToMyCloud = async (ipp, userKey, fsRoot) => {
        if (typeof ipp !== 'string' || ipp.length < 7)
            throw new TypeError('ipp must be a string of length at least 7.');
        if (typeof userKey !== 'string' || userKey.length < 5)
            throw new TypeError('userKey must be a string of length at least 5.');
        if (!(fsRoot instanceof Folder))
            throw new TypeError('fsRoot must be a Folder.');
        const
            settledResults = await Promise.allSettled(fsRoot.getFilesAsList().map((file) =>
                fetch(
                    `http://${ipp}/mycloud/files/backup/`,
                    {
                        method: 'POST',
                        body: formData({
                            user_key: userKey,
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
                    const error = settledResult.reason;
                    return true;
                }
                if (settledResult.status === 'fulfilled') {
                    const [status, stream] = settledResult.value;
                    if (status !== 200) {
                        const {error: error} = stream; // stream here is a json object
                        return true;
                    }
                    return false;
                }
                return true;
            });
        if (anyFailure) {
            throw new Error(`Failed to backup the files.`);
        }
        const [status, stream] = await fetch(
            `http://${ipp}/mycloud/files/backup/`,
            {
                method: 'POST',
                body: formData({
                    user_key: userKey,
                    serial: 'ROOT',
                    content: new Blob([fsRoot.getRecordsJSON()], {type: 'application/octet-stream'}),
                    created_at: getISOTimeString(),
                    updated_at: getISOTimeString()
                })
            }
        ).then(
            async (res) => [res.status, await res.json()]
        );
        if (status !== 200) {
            const {error: error} = stream; // stream here is a json object
            throw new Error(`Failed to backup the ROOT map. <-- ${error}`);
        }
    },
    /**
     * @param {string} ipp
     * @param {string} userKey
     * @param {Folder} fsRoot
     * @param {SerialLake} serialLake
     * @returns {Promise<void>}
     * @throws {TypeError | Error}
     * */
    recoverFSFromMyCloud = async (ipp, userKey, fsRoot, serialLake) => {
        if (typeof ipp !== 'string' || ipp.length < 7)
            throw new TypeError('ipp must be a string of length at least 7.');
        if (typeof userKey !== 'string' || userKey.length < 5)
            throw new TypeError('userKey must be a string of length at least 5.');
        if (!(fsRoot instanceof Folder))
            throw new TypeError('fsRoot must be a Folder.');
        if (!(serialLake instanceof SerialLake))
            throw new TypeError('serialLake must be a SerialLake.');
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
            throw new Error('Failed to recover the ROOT map.');
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
                        const error = settledResult.reason;
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
                            return [true, fm]; // failure
                        }
                        if (serial.length > 0 && created_at.length > 0 && updated_at.length > 0) {
                            fm[serial] = new File(serial, stream, created_at, updated_at); // stream here is an arrayBuffer
                        }
                        return [af, fm]; // success
                    }
                    return [true, fm];
                },
                [false, {}]
            );
        if (anyFailure) {
            throw new Error('Failed to recover the files.');
        }
        // recover <_serialLake_> with <fileSerials>
        serialLake.recover(fileSerials);
        // recover fsRoot with <plainRootFolderObject> and <filesMap>
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
            })(plainRootFolderObject, fsRoot.clear());
        }
    };

export {
    Terminal,
    FitAddon,
    SerializeAddon,
    // JSZip,
    getISOTimeString,
    randomInt,
    utf8Decoder,
    utf8Encoder,
    popupAlert,
    popupFileEditor,
    legalFileSystemKeyNameRegExp,
    legalFileSerialRegExp,
    SerialLake,
    File,
    Folder,
    extractDirAndKeyName,
    TerminalFolderPointer,
    RGBColor,
    TerminalCore,
    formData,
    verifyMyCloudSetup,
    uploadFSToMyCloud,
    recoverFSFromMyCloud
};