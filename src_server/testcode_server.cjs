
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
    //      subfolders;          // IN JSON
    //      /** @type {Record<string, File>} */
    //      files;                 // IN JSON, name <--> serial
    //      /** @type {Record<string, string>} */
    //      folderLinks;         // IN JSON
    //      /** @type {Record<string, string>} */
    //      fileLinks;           // IN JSON
    //
    //
    //













    /**
     * @param {string} subfolderName
     * @returns {boolean}
     * @throws {TypeError}
     * */
    hasSubfolder(subfolderName) {
        if (typeof subfolderName !== 'string' || !legalKeyNameInFileSystem.test(subfolderName))
            throw new TypeError('Subfolder name must be a string and follow the keyname requirements.');
        return this.#subfolders[subfolderName] instanceof Folder;
    }

    /**
     * @param {string} subfolderName
     * @returns {Folder}
     * @throws {TypeError | Error}
     * */
    getSubfolder(subfolderName) {
        if (typeof subfolderName !== 'string' || !legalKeyNameInFileSystem.test(subfolderName))
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
        if (typeof subfolderName !== 'string' || !legalKeyNameInFileSystem.test(subfolderName))
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
        if (typeof subfolderName !== 'string' || !legalKeyNameInFileSystem.test(subfolderName))
            throw new TypeError('Subfolder name must be a string and follow the keyname requirements.');
        if (!(this.#subfolders[subfolderName] instanceof Folder))
            throw new Error(`Subfolder ${subfolderName} not found.`);
        const folder = this.#subfolders[subfolderName];
        delete this.#subfolders[subfolderName];
        return folder;
    }