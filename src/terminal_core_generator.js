/*
* **************************************************************************************************************
*
*                                              START OF FILE
*
*             This file initializes the terminal window frame and all the terminal core services.
*
* **************************************************************************************************************
* */

// function printObj(obj) {
//     console.log(
//         `{${
//             Object.keys(obj).reduce((acc, key, index) => {
//                 acc += `    ${key}: ${obj[key]}`;
//                 if (index < Object.keys(obj).length - 1) acc += ',\n';
//                 return acc;
//             }, '')
//         }}`
//     );
// }

const
    isLegalKeyNameInFileSystem = (() => {
        const reg = /^(?!\.{1,2}$)[^\/\0]{1,255}$/;
        return (x) => reg.test(x);
    })();

// Set Up System Time Object
const date = new Date();

function generateRootDirectory() {
    const fsRoot = { // FolderObject
        keyCheck: "TERMINAL FS ROOT",
        parentFolder: null, // FolderObject
        subfolders: {}, // subfolderName : folderObject
        files: {} // fileName : fileContents
    };
    fsRoot.parentFolder = fsRoot;
    return fsRoot;
}

function generateSubfolderOf(currentFolderObject) {
    return {
        parentFolder: currentFolderObject,
        subfolders: {},
        files: {}
    };
}

function shallowCombineFolderObjects(destDir, srcDir) {
    for (const fileName of Object.keys(srcDir.files)) {
        if (destDir.files[fileName] === undefined) {
            destDir.files[fileName] = srcDir.files[fileName];
        } else {
            destDir.files[`${date.getHours()}-${date.getMinutes()}'-${date.getSeconds()}'' ${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}_${fileName}`] = srcDir.files[fileName];
        }
    }
    for (const folderName of Object.keys(srcDir.subfolders)) {
        if (destDir.subfolders[folderName] === undefined) {
            destDir.subfolders[folderName] = srcDir.subfolders[folderName];
            destDir.subfolders[folderName].parentFolder = destDir; // reset parent folder directory
        } else {
            shallowCombineFolderObjects(destDir.subfolders[folderName], srcDir.subfolders[folderName]);
        }
    }
}

class TerminalFolderPointer {
    #fsRoot;
    #currentFolderObject;
    #currentFullPathStack;

    constructor(fsRoot, currentFolderObject = fsRoot, currentFullPathStack = []) {
        this.#fsRoot = fsRoot;
        this.#currentFolderObject = currentFolderObject;
        this.#currentFullPathStack = currentFullPathStack;
    }

    /*
    *  Duplication
    * */
    duplicate() {
        return new TerminalFolderPointer(
            this.#fsRoot, // shallow copy of pointer
            this.#currentFolderObject, // shallow copy of pointer
            this.#currentFullPathStack.map(x => x) // deep copy of array of strings
        )
    }

    /*
    *  Directory Information Getters
    * */
    getContentListAsString() {
        let contents = '';
        const
            folderNames = Object.keys(this.#currentFolderObject.subfolders),
            fileNames = Object.keys(this.#currentFolderObject.files);
        if (folderNames.length > 0) {
            contents += 'Folders:' + folderNames.reduce(
                (acc, elem) => `${acc}\n            ${elem}`,
                ''
            );
        }
        if (folderNames.length > 0 && fileNames.length > 0)
            contents += '\n';
        if (fileNames.length > 0) {
            contents += 'Files:' + fileNames.reduce(
                (acc, elem) => `${acc}\n            ${elem}`,
                ''
            );
        }
        return contents.length === 0 ? 'No file or folder existing here...' : contents;
    }

    getZipBlobOfFolder() {
        // Helper function to recursively add folder content to the zip file
        function addFolderToZip(folderObject, zipObject) {
            for (const [fileName, fileContent] of Object.entries(folderObject.files))
                zipObject.file(fileName, fileContent, {binary: true});
            for (const [subfolderName, subfolderObject] of Object.entries(folderObject.subfolders))
                addFolderToZip(subfolderObject, zipObject.folder(subfolderName));
        }

        // Create a new JSZip instance to generate the .zip file
        const zip = new JSZip();
        // Start the process from the current folder
        addFolderToZip(this.#currentFolderObject, zip); // '' means root of the zip
        // Generate the zip file as a Blob
        return zip.generateAsync({type: 'blob'});
    }

    getFullPath() {
        return this.#currentFullPathStack.length === 0 ? '/' :
            this.#currentFullPathStack.reduce((acc, elem) => `${acc}/${elem}`, '');
    }

    getSubfolderNames() {
        return Object.keys(this.#currentFolderObject.subfolders);
    }

    getFileNames() {
        return Object.keys(this.#currentFolderObject.files);
    }

    haveFile(fileName) {
        return (isLegalKeyNameInFileSystem(fileName) && this.#currentFolderObject.files[fileName] !== undefined);
    }

    haveSubfolder(subfolderName) {
        return (isLegalKeyNameInFileSystem(subfolderName) && this.#currentFolderObject.subfolders[subfolderName] !== undefined);
    }

    /*
    *  Directory Pointer Controllers
    * */
    gotoRoot() {
        this.#currentFolderObject = this.#fsRoot;
        this.#currentFullPathStack = [];
    }

    gotoSubfolder(subfolderName) {
        if (!isLegalKeyNameInFileSystem(subfolderName))
            throw new Error(`Subfolder name is illegal`);
        if (this.#currentFolderObject.subfolders[subfolderName] === undefined)
            throw new Error(`Folder ${subfolderName} not found`);
        this.#currentFolderObject = this.#currentFolderObject.subfolders[subfolderName];
        this.#currentFullPathStack.push(subfolderName);
    }

    gotoParentFolder() {
        this.#currentFolderObject = this.#currentFolderObject.parentFolder;
        if (this.#currentFullPathStack.length > 0)
            this.#currentFullPathStack.pop();
    }

    gotoPath(path) {
        if (path.length === 0) return;
        if (!path.startsWith('/') && !path.startsWith('./') && !path.startsWith('../'))
            path = './' + path;
        const pathStack = path.split('/');
        if (pathStack[pathStack.length - 1] === '') pathStack.pop();
        let firstEmptyFolderName = true;
        const tempFolderPointer = this.duplicate();
        for (const folderName of pathStack) {
            switch (folderName) {
                case '': {
                    if (!firstEmptyFolderName)
                        throw new Error(`Path name is illegal`);
                    tempFolderPointer.gotoRoot();
                    firstEmptyFolderName = false;
                    break;
                }
                case '.': {
                    // do nothing (goto the current folder)
                    break;
                }
                case '..': {
                    tempFolderPointer.gotoParentFolder();
                    break;
                }
                default: {
                    tempFolderPointer.gotoSubfolder(folderName);
                    break;
                }
            }
        }
        this.#currentFolderObject = tempFolderPointer.#currentFolderObject;
        this.#currentFullPathStack = tempFolderPointer.#currentFullPathStack;
    }

    /*
    *  Directory File Controllers
    * */
    getFileContent(fileName) {
        if (!isLegalKeyNameInFileSystem(fileName))
            throw new Error(`File name is illegal`);
        const fileContent = this.#currentFolderObject.files[fileName];
        if (fileContent === undefined)
            throw new Error(`File ${fileName} not found`);
        return fileContent;
    }

    changeFileContent(fileName, newContent) {
        if (!isLegalKeyNameInFileSystem(fileName))
            throw new Error(`File name is illegal`);
        this.#currentFolderObject.files[fileName] = newContent;
    }

    createNewFile(fileName) {
        if (!isLegalKeyNameInFileSystem(fileName))
            throw new Error(`File name is illegal`);
        if (this.#currentFolderObject.files[fileName] !== undefined)
            throw new Error(`File ${fileName} is already existing`);
        this.#currentFolderObject.files[fileName] = "";
    }

    renameExistingFile(oldFileName, newFileName) {
        if (!isLegalKeyNameInFileSystem(oldFileName) || !isLegalKeyNameInFileSystem(newFileName))
            throw new Error(`File name is illegal`);
        if (this.#currentFolderObject.files[oldFileName] === undefined)
            throw new Error(`File ${oldFileName} not found`);
        if (this.#currentFolderObject.files[newFileName] !== undefined)
            throw new Error(`File ${newFileName} already exists`);
        this.#currentFolderObject.files[newFileName] = this.#currentFolderObject.files[oldFileName];
        delete this.#currentFolderObject.files[oldFileName];
    }

    deleteFile(fileName) {
        if (!isLegalKeyNameInFileSystem(fileName))
            throw new Error(`File name is illegal`);
        if (this.#currentFolderObject.files[fileName] === undefined)
            throw new Error(`File ${fileName} not found.`);
        delete this.#currentFolderObject.files[fileName];
    }

    /*
    *  Unified Path Controllers
    * */

    createPath(path, gotoNewFolder = false) {
        if (path.length === 0) return;
        if (!path.startsWith('/') && !path.startsWith('./') && !path.startsWith('../'))
            path = './' + path;
        const pathStack = path.split('/');
        if (pathStack[pathStack.length - 1] === '') pathStack.pop();
        let firstEmptyFolderName = true;
        // check the availability of path for creation
        for (const folderName of pathStack) {
            switch (folderName) {
                case '': {
                    if (!firstEmptyFolderName)
                        throw new Error(`Path name is illegal`);
                    firstEmptyFolderName = false;
                    break;
                }
                case '.': {
                    break;
                }
                case '..': {
                    break;
                }
                default: {
                    if (!isLegalKeyNameInFileSystem(folderName))
                        throw new Error(`Path name is illegal`);
                    break;
                }
            }
        }
        // do the creation of path
        const tempFolderPointer = this.duplicate();
        for (const folderName of pathStack) {
            switch (folderName) {
                case '': {
                    tempFolderPointer.gotoRoot();
                    break;
                }
                case '.': {
                    // do nothing (goto the current folder)
                    break;
                }
                case '..': {
                    tempFolderPointer.gotoParentFolder();
                    break;
                }
                default: {
                    if (tempFolderPointer.#currentFolderObject.subfolders[folderName] === undefined)
                        tempFolderPointer.#currentFolderObject.subfolders[folderName] = generateSubfolderOf(tempFolderPointer.#currentFolderObject);
                    tempFolderPointer.#currentFolderObject = tempFolderPointer.#currentFolderObject.subfolders[folderName];
                    tempFolderPointer.#currentFullPathStack.push(folderName);
                    break;
                }
            }
        }
        if (gotoNewFolder === true) {
            this.#currentFolderObject = tempFolderPointer.#currentFolderObject;
            this.#currentFullPathStack = tempFolderPointer.#currentFullPathStack;
        }
    }

    movePath(type, oldPath, newPath) {
        /*
        *  When moving a single file, if the destination is already existing, then the copy will stop.
        *  When moving a directory, if a destination folder is already existing, then the folders will be merged;
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
                if (!isLegalKeyNameInFileSystem(oldFileName))
                    throw new Error(`The old file name is illegal`);
                // analyze the new file path
                index = newPath.lastIndexOf('/');
                const [newFileDir, newFileName] = (() => {
                    if (index === -1) return ['.', newPath];
                    if (index === 0) return ['/', newPath.slice(1)];
                    return [newPath.substring(0, index), newPath.slice(index + 1)];
                })();
                if (!isLegalKeyNameInFileSystem(newFileName))
                    throw new Error(`The new file name is illegal`);
                // check the old file status
                const fp_old = this.duplicate();
                fp_old.gotoPath(oldFileDir);
                const oldFile = fp_old.#currentFolderObject.files[oldFileName];
                if (oldFile === undefined)
                    throw new Error(`The old file is not found`);
                // check the new file status
                const fp_new = this.duplicate();
                fp_new.createPath(newFileDir, true);
                if (fp_new.#currentFolderObject.files[newFileName] !== undefined)
                    throw new Error(`The new file is already existing`);
                // do the movement
                delete fp_old.#currentFolderObject.files[oldFileName];
                fp_new.#currentFolderObject.files[newFileName] = oldFile;
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
                if (!isLegalKeyNameInFileSystem(oldDirName))
                    throw new Error(`The old directory name is illegal`);
                // analyze the new dir path
                index = newPath.lastIndexOf('/');
                const [newDirParent, newDirName] = (() => {
                    if (index === -1) return ['.', newPath];
                    if (index === 0) return ['/', newPath.slice(1)];
                    return [newPath.substring(0, index), newPath.slice(index + 1)];
                })();
                if (!isLegalKeyNameInFileSystem(newDirName))
                    throw new Error(`The new directory name is illegal`);
                // check the old dir status
                const fp_old = this.duplicate();
                fp_old.gotoPath(oldDirParent);
                const oldDir = fp_old.#currentFolderObject.subfolders[oldDirName];
                if (oldDir === undefined)
                    throw new Error(`The old directory is not found`);
                // check the new dir status
                const fp_new = this.duplicate();
                fp_new.createPath(newDirParent, true);
                // do the movement
                if (fp_new.#currentFolderObject.subfolders[newDirName] === undefined) {
                    // directly deposit the folder directory
                    fp_new.#currentFolderObject.subfolders[newDirName] = oldDir;
                    oldDir.parentFolder = fp_new.#currentFolderObject;
                } else {
                    // combine two folder directories (shallow copying)
                    shallowCombineFolderObjects(fp_new.#currentFolderObject.subfolders[newDirName], oldDir);
                }
                // delete the moved folder directory
                delete fp_old.#currentFolderObject.subfolders[oldDirName];
                break;
            }
            default: {
                throw new Error(`Path type is illegal`);
            }
        }
    }

    copyPath(type, oldPath, newPath) {
        /*
        *  When copying a single file, if the destination is already existing, then the copy will stop.
        *  When copying a directory, if a destination folder is already existing, then the folders will be merged;
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
                if (!isLegalKeyNameInFileSystem(oldFileName))
                    throw new Error(`The old file name is illegal`);
                // analyze the new file path
                index = newPath.lastIndexOf('/');
                const [newFileDir, newFileName] = (() => {
                    if (index === -1) return ['.', newPath];
                    if (index === 0) return ['/', newPath.slice(1)];
                    return [newPath.substring(0, index), newPath.slice(index + 1)];
                })();
                if (!isLegalKeyNameInFileSystem(newFileName))
                    throw new Error(`The new file name is illegal`);
                // check the old file status
                const fp_old = this.duplicate();
                fp_old.gotoPath(oldFileDir);
                const oldFile = fp_old.#currentFolderObject.files[oldFileName];
                if (oldFile === undefined)
                    throw new Error(`The old file is not found`);
                // check the new file status
                const fp_new = this.duplicate();
                fp_new.createPath(newFileDir, true);
                if (fp_new.#currentFolderObject.files[newFileName] !== undefined)
                    throw new Error(`The new file is already existing`);
                // deep-copy the file
                fp_new.#currentFolderObject.files[newFileName] = `${oldFile}`; // deep copy of the string
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
                if (!isLegalKeyNameInFileSystem(oldDirName))
                    throw new Error(`The old directory name is illegal`);
                // analyze the new dir path
                index = newPath.lastIndexOf('/');
                const [newDirParent, newDirName] = (() => {
                    if (index === -1) return ['.', newPath];
                    if (index === 0) return ['/', newPath.slice(1)];
                    return [newPath.substring(0, index), newPath.slice(index + 1)];
                })();
                if (!isLegalKeyNameInFileSystem(newDirName))
                    throw new Error(`The new directory name is illegal`);
                // check the old dir status
                const fp_old = this.duplicate();
                fp_old.gotoPath(oldDirParent);
                const oldDir = fp_old.#currentFolderObject.subfolders[oldDirName];
                if (oldDir === undefined)
                    throw new Error(`The old directory is not found`);
                // check the new dir status
                const fp_new = this.duplicate();
                fp_new.createPath(newDirParent, true);

                // make a deep-copy of oldDri (named oldDirName), and append it to newParentOfOldDir
                function deepCopyOfFolderObject(oldFolderObject, newFolderName, newParentOfOldFolderObject) {
                    // create a new dir with the same name as the old dir
                    const newDir = generateSubfolderOf(newParentOfOldFolderObject);
                    for (const fileName of Object.keys(oldFolderObject.files))
                        newDir.files[fileName] = `${oldFolderObject.files[fileName]}`;
                    for (const subfolderName of Object.keys(oldFolderObject.subfolders))
                        deepCopyOfFolderObject(oldFolderObject.subfolders[subfolderName], subfolderName, newDir);
                    newParentOfOldFolderObject.subfolders[newFolderName] = newDir;
                }

                if (fp_new.#currentFolderObject.subfolders[newDirName] === undefined) {
                    // deep-copy the directory
                    deepCopyOfFolderObject(oldDir, newDirName, fp_new.#currentFolderObject);
                } else {
                    const emptyFolderObject = generateSubfolderOf(null);
                    deepCopyOfFolderObject(oldDir, newDirName, emptyFolderObject);
                    shallowCombineFolderObjects(fp_new.#currentFolderObject.subfolders[newDirName], emptyFolderObject.subfolders[newDirName]);
                }
                break;
            }
            default: {
                throw new Error(`Path type is illegal`);
            }
        }
    }

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
                if (!isLegalKeyNameInFileSystem(fileName))
                    throw new Error(`The file name is illegal`);
                // check the file status
                const fp = this.duplicate();
                fp.gotoPath(fileDir);
                // delete the file
                if (fp.#currentFolderObject.files[fileName] === undefined)
                    throw new Error(`The file is not found`);
                delete fp.#currentFolderObject.files[fileName];
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
                if (!isLegalKeyNameInFileSystem(dirName))
                    throw new Error(`The directory name is illegal`);
                // check the dir status
                const fp = this.duplicate();
                fp.gotoPath(dirParent);
                // delete the file
                if (fp.#currentFolderObject.subfolders[dirName] === undefined)
                    throw new Error(`The directory is not found`);
                delete fp.#currentFolderObject.subfolders[dirName];
                break;
            }
            default: {
                throw new Error(`Path type is illegal`);
            }
        }
    }

}

class MinimizedWindowRecords {
    #records;

    constructor() {
        this.#records = {};
    }

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

    getDescriptions() {
        return Object.keys(this.#records);
    }

    recoverWindow(description) {
        if (this.#records[description] !== undefined) {
            this.#records[description]();
            delete this.#records[description];
            return true;
        }
        return false;
    }
}

function generateTerminalCore(xtermObj, HTMLDivElement_TerminalWindowContainer, fsRoot, supportedCommands) {
    // Put Terminal Window to Webpage Container
    xtermObj.open(HTMLDivElement_TerminalWindowContainer);

    // const isWebglEnabled = (() => {
    //     try {
    //         const webgl = new window.WebglAddon.WebglAddon(); // Load the WebGL Addon
    //         xtermObj.loadAddon(webgl); // Add the WebGL Addon to xtermObj frame
    //         return true;
    //     } catch (e) {
    //         console.warn('WebGL addon threw an exception during load', e);
    //         return false;
    //     }
    // })();

    // Enabled Fit Addons
    const fitAddon = (() => { // every fit-addon can be subcribed to exactly ONE XTerm object!!!
        try {
            const fitAddon = new window.FitAddon.FitAddon(); // Load the Fit Addon
            xtermObj.loadAddon(fitAddon); // Add the Fit Addon to xtermObj frame
            return fitAddon;
        } catch (error) {
            alert(`Failed to load the fit-addon (${error})`);
            return null;
        }
    })();

    // Create Terminal Global Folder Pointer Object
    const currentTerminalFolderPointer = new TerminalFolderPointer(fsRoot);

    // Create Terminal Log Array
    let terminalLog = [];

    // Initialize Current Keyboard Listener
    let currentKeyboardListenerCallback = null;
    let currentXTermKeyboardListener = null;

    // Function to Set New Keyboard Listener
    function setNewTerminalKeyboardListener(keyboard_listening_callback) {
        if (currentXTermKeyboardListener !== null)
            currentXTermKeyboardListener.dispose();
        currentXTermKeyboardListener = xtermObj.onData(currentKeyboardListenerCallback = keyboard_listening_callback);
    }

    // Initialize Command Buffer & Handler
    let commandInputBuffer = []; // command buffer: char[]
    const commandInputBufferHandler = {
        addChar: (newChar) => { // returns void
            commandInputBuffer.push(newChar);
        },
        removeChar: () => { // returns whether the last char is successfully removed
            if (commandInputBuffer.length > 0) {
                commandInputBuffer.pop();
                return true;
            }
            return false;
        },
        execute: () => { // returns [status_code, command_name]
            if (commandInputBuffer.length === 0) return [-1, '']; // Error: (Empty) Command is not supported.

            let index = 0;

            function parsingHelper() { // returns string
                let block = '';
                while (index < commandInputBuffer.length && commandInputBuffer[index] === ` `)
                    index++;
                if (commandInputBuffer[index] === `"` || commandInputBuffer[index] === `'`) {
                    const quoteIndex = index++;
                    let quoteNotClosed = true;
                    while (index < commandInputBuffer.length) {
                        if (commandInputBuffer[index] === commandInputBuffer[quoteIndex]) {
                            index++;
                            quoteNotClosed = false;
                            break;
                        }
                        block += commandInputBuffer[index++];
                    }
                    if (quoteNotClosed)
                        block = commandInputBuffer[quoteIndex] + block;
                } else {
                    while (index < commandInputBuffer.length) {
                        if (commandInputBuffer[index] === ` `) {
                            index++;
                            break;
                        }
                        block += commandInputBuffer[index++];
                    }
                }
                return block;
            }

            const
                commandName = parsingHelper(),
                commandParameters = [];
            while (index < commandInputBuffer.length) {
                const param = parsingHelper();
                if (param.length > 0) commandParameters.push(param);
            }
            if (supportedCommands[commandName] === undefined)
                return [1, commandName]; // Error: Command is not supported.
            try {
                supportedCommands[commandName].executable(commandParameters);
                return [0, commandName]; // Success!
            } catch (e) { // Error: Command exists but throws exceptions.
                // alert(`generateTerminalCore: commandInputBufferHandler: ${e}.`);
                return [2, commandName];
            }
        },
        clear: () => { // returns void
            commandInputBuffer = [];
        }
    };

    // Function to Initialize Default Terminal Window's Listening to Keyboard Input
    const defaultTerminalKeyboardLinstenerCallback = (keyboardInput) => {
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
                commandInputBufferHandler.clear();
                xtermObj.write('^C\n\n\r $ ');
                terminalLog.push('^C\n\n $ ');
                break;
            }
            case '\u000C': { // Ctrl+L
                // commandInputBufferHandler.clear();
                xtermObj.write(`\x1b[2J\x1b[H $ `);
                for (const char of commandInputBuffer)
                    xtermObj.write(char);
                break;
            }
            case '\u007F': { // Backspace
                if (commandInputBufferHandler.removeChar()) { // if the char is successfully removed from the buffer
                    xtermObj.write('\b \b');
                    terminalLog.pop(); // because commandInputBufferHandler.removeChar() is success!!
                }
                break;
            }
            case '\r': { // Enter
                xtermObj.write('\n\r   ');
                terminalLog.push('\n   ');
                {
                    const [statusCode, commandName] = commandInputBufferHandler.execute();
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
                            xtermObj.write(`${commandName}: command failed due to uncaught errors`);
                            terminalLog.push(`${commandName}: command failed due to uncaught errors`);
                            break;
                        }
                        default: {
                        }
                    }
                }
                commandInputBufferHandler.clear();
                xtermObj.write('\n\n\r $ ');
                terminalLog.push('\n\n $ ');
                break;
            }
            default: { // allowing proper copy and paste from the clipboard
                for (const char of keyboardInput) {
                    if (char >= String.fromCharCode(0x20) && char <= String.fromCharCode(0x7E) || char >= '\u00a0') {
                        commandInputBufferHandler.addChar(char);
                        xtermObj.write(char);
                        terminalLog.push(char);
                    }
                }
            }
        }
    };
    // Initialize Default Terminal Window's Listening to Keyboard Input
    setNewTerminalKeyboardListener(defaultTerminalKeyboardLinstenerCallback);

    // Initialize Terminal Window Display
    xtermObj.write(` $ `);
    terminalLog.push(` $ `);

    const terminalMinimizedWindowRecords = new MinimizedWindowRecords();

    const terminalCacheSpace = {};

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
            setNewTerminalKeyboardListener(defaultTerminalKeyboardLinstenerCallback);
        },
        setNewKeyboardListener: (keyboard_listener_callback) => { // returns void
            setNewTerminalKeyboardListener(keyboard_listener_callback);
        },


        /*
        *  Terminal Status/Content Getters
        * */
        getFitAddon: () => fitAddon,
        getTerminalLogString: () => terminalLog.reduce((acc, elem) => acc + elem, ''),
        getHTMLDivForTerminalWindow: () => HTMLDivElement_TerminalWindowContainer,
        getCacheSpace: () => terminalCacheSpace,
        getMinimizedWindowRecords: () => terminalMinimizedWindowRecords,

        /*
        *  Terminal File System Ports
        * */
        getCurrentFolderPointer: () => currentTerminalFolderPointer,
        getNewFolderPointer: () => new TerminalFolderPointer(fsRoot),
    };
}
