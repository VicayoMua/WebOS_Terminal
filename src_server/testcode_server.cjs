
const mask = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_0123456789';

// console.log(mask.length);


const legalKeyNameInFileSystem = /^(?!\.{1,2}$)[^\/\0]{1,1024}$/;
// console.log(legalKeyNameInFileSystem.test('\r'));

class Folder {
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
}