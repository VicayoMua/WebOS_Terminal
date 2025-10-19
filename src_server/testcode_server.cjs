// post.js
// Node 18+ has global fetch. If you're on Node 16, run: npm i node-fetch && import it.

// const BASE_URL = "http://127.0.0.1:80"; // match your server port
// const SERIAL = "demo-file-1";
//
// async function main() {
//     // Example payload: "Hello, World!"
//     const contentBase64 = Buffer.from("Hello, World!").toString("base64");
//
//     const res = await fetch(
//         `${BASE_URL}/api/files/${encodeURIComponent(SERIAL)}`,
//         {
//             method: "POST",
//             headers: {"Content-Type": "application/json"},
//             body: JSON.stringify({
//                 encoding: "base64",
//                 content: contentBase64,
//             })
//         }
//     );
//
//     const text = await res.text(); // handle non-JSON errors too
//     console.log("Status:", res.status);
//     try {
//         console.log(JSON.parse(text));
//     } catch {
//         console.log(text);
//     }
// }
//
// main().catch(err => {
//     console.error(err);
//     process.exit(1);
// });

const o = {};
o[1] = 6566;
console.log();