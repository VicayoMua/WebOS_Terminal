
const mask = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_0123456789';

// console.log(mask.length);


const legalKeyNameInFileSystem = /^(?!\.{1,2}$)[^\/\0]{1,1024}$/;
// console.log(legalKeyNameInFileSystem.test('\r'));

let s = 'a';
s += 'b';
console.log(s);