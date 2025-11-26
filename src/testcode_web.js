import {
    File,
    formData,
    getISOTimeString,
    legalFileSerialRegExp,
    legalFileSystemKeyNameRegExp,
    RGBColor,
    utf8Decoder, utf8Encoder
} from "./terminal_core";


const [status, stream] = await fetch(
    `http://${ipp}/mycloud/users/register/`,
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
    currentTerminalCore.printToWindow(`${error}`, RGBColor.red);
    return;
}
currentTerminalCore.printToWindow(' --> Registered a user key.', RGBColor.green);


