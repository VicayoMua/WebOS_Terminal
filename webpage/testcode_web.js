// import {
//     File,
//     formData,
//     getISOTimeString,
//     legalFileSerialRegExp,
//     legalFileSystemKeyNameRegExp,
//     RGBColor,
//     utf8Decoder, utf8Encoder
// } from "./terminal_core";

class Tester {
    /** @type {Array<{input: any, output: any}>} */
    #IOs;
    /** @type {function(input: any): any} */
    #testedFunc;
    /** @type {function(tfOutput: any, stdOutput: any): boolean} */
    #outputComparer;

    /**
     * @param {Array<{input: any, output: any}>} IOs
     * @param {function(input: any): any} testedFunc
     * @param {function(tfOutput: any, stdOutput: any): boolean} outputComparer
     * */
    constructor(IOs, testedFunc, outputComparer) {
        this.#IOs = IOs;
        this.#testedFunc = testedFunc;
        this.#outputComparer = outputComparer;
    }

    /**
     * @param {number} seconds
     * @returns {Promise<void>}
     * */
    async testAll(seconds) {
        const result = await Promise.all(
            this.#IOs.map(
                /** @type {function(IO: {input: any, output: any}): Promise<('Timed Out' | 'Correct Answer' | 'Wrong Answer')>} */
                ({input: stdInput, output: stdOutput}) => new Promise((resolve) => {
                    const timeoutID = setTimeout(
                        () => {
                            resolve('Timed Out');
                        },
                        Math.floor(seconds*1000)
                    );
                    const tfOutput = this.#testedFunc(stdInput);
                    clearTimeout(timeoutID);
                    if (this.#outputComparer(tfOutput, stdOutput)) {
                        resolve('Correct Answer');
                    } else {
                        resolve('Wrong Answer');
                    }
                })
            )
        );
        console.log(result);
    }
}

const tester = new Tester(
    [
        {input: 1, output: 2},
        {input: 3, output: 6},
        {input: 9, output: 10},
        {input: 2, output: 4}
    ],
    (x) => {
        let s = 0;
        for (let i = 0; i < 100000000; i++) {
            s *= i;
            s %= 10;
        }
        return 2*x;
    },
    (x, y) => x === y
);

await tester.testAll(0.001);