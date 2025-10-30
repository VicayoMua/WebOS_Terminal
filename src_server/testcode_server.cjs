
const mask = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_0123456789';

// console.log(mask.length);


const legalKeyNameInFileSystem = /^(?!\.{1,2}$)[^\/\0]{1,1024}$/;
// console.log(legalKeyNameInFileSystem.test('\r'));


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
    return [path.substring(0, index), path.substring(index + 1)];
}

    //
    //
    //
    //
    //      /** @type {Record<string, Folder>} */
    //      subfolders;          // IN getRecordsJSON
    //      /** @type {Record<string, File>} */
    //      files;                 // IN getRecordsJSON, name <--> serial
    //      /** @type {Record<string, string>} */
    //      folderLinks;         // IN getRecordsJSON
    //      /** @type {Record<string, string>} */
    //      fileLinks;           // IN getRecordsJSON
    //
    //
    //

// const a = [];
// console.log(Array.isArray(a));