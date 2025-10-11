// document.getElementById('button_to_open_new_terminal_tab').onclick = (() => {
//         const divTerminalContainer = document.getElementById('terminal-container');
//         const navViewNavigation = document.getElementById('view-navigation');
//         const terminalHTMLDivElements = [];
//         const terminalHTMLButtonElements = [];
//         let tabCount = 0;
//         return () => {
//             if (tabCount >= 8) {
//                 alert('You can open at most 8 terminal tabs.');
//                 return;
//             }
//             tabCount++;
//             const divNewTerminalHTMLDivElement = document.createElement('div');
//             divNewTerminalHTMLDivElement.setAttribute('class', 'terminal-tab');
//             divNewTerminalHTMLDivElement.setAttribute('id', `terminal-tab-${tabCount}`);
//             divNewTerminalHTMLDivElement.style.display = 'none';
//             divTerminalContainer.appendChild(divNewTerminalHTMLDivElement);
//             terminalHTMLDivElements.push(divNewTerminalHTMLDivElement);
//             const newXtermObject = new window.Terminal({
//                 fontFamily: '"Fira Code", monospace',
//                 cursorBlink: true,
//                 allowProposedApi: true,
//                 theme: {
//                     foreground: '#f1f1f0',
//                     background: 'black',
//                     selection: '#97979b33',
//                     black: '#282a36',
//                     brightBlack: '#686868',
//                     red: '#ff5c57',
//                     brightRed: '#ff5c57',
//                     green: '#5af78e',
//                     brightGreen: '#5af78e',
//                     yellow: '#f3f99d',
//                     brightYellow: '#f3f99d',
//                     blue: '#57c7ff',
//                     brightBlue: '#57c7ff',
//                     magenta: '#ff6ac1',
//                     brightMagenta: '#ff6ac1',
//                     cyan: '#9aedfe',
//                     brightCyan: '#9aedfe',
//                     white: '#f1f1f0',
//                     brightWhite: '#eff0eb'
//                 },
//             });
//             const newTerminalCore = generateTerminalCore(
//                 newXtermObject,
//                 divNewTerminalHTMLDivElement,
//                 fsRoot,
//                 supportedCommands
//             );
//             window.addEventListener('resize', () => {
//                 if (currentTerminalCore !== newTerminalCore) // if the current terminal core is not on the front
//                     return;
//                 const fitAddon = newTerminalCore.getFitAddon();
//                 if (fitAddon !== null) fitAddon.fit();
//             });
//             const buttonNewTerminalViewNavigation = document.createElement('button');
//             buttonNewTerminalViewNavigation.type = 'button';
//             buttonNewTerminalViewNavigation.textContent = `{ Tab #${tabCount} }`;
//             buttonNewTerminalViewNavigation.style.fontWeight = 'normal';
//             buttonNewTerminalViewNavigation.addEventListener('mouseover', () => {
//                 buttonNewTerminalViewNavigation.style.textDecoration = 'underline';
//             });
//             buttonNewTerminalViewNavigation.addEventListener('mouseout', () => {
//                 buttonNewTerminalViewNavigation.style.textDecoration = 'none';
//             });
//             buttonNewTerminalViewNavigation.addEventListener('click', () => {
//                 if (currentTerminalCore !== newTerminalCore) { // view switching needed
//                     // switch the nav button style
//                     for (const button of terminalHTMLButtonElements)
//                         button.style.fontWeight = 'normal';
//                     buttonNewTerminalViewNavigation.style.fontWeight = 'bold';
//                     // switch the terminal tab view
//                     for (const div of terminalHTMLDivElements)
//                         div.style.display = 'none';
//                     divNewTerminalHTMLDivElement.style.display = 'block';
//                     currentTerminalCore = newTerminalCore;
//                 }
//                 setTimeout(() => {
//                     const fitAddon = newTerminalCore.getFitAddon(); // has to be newTerminalCore since 10ms waiting race
//                     if (fitAddon !== null) fitAddon.fit();
//                 }, 50);
//             });
//             navViewNavigation.appendChild(buttonNewTerminalViewNavigation);
//             terminalHTMLButtonElements.push(buttonNewTerminalViewNavigation);
//             if (currentTerminalCore === null) // if the terminal tab is <Tab #1>
//                 buttonNewTerminalViewNavigation.click();
//         };
//     })();


const o = {
    '1234': 0,
    'abc': 1
};

console.log(123 in o);

// `
//             CREATE TABLE IF NOT EXISTS files (
//                 serial         TEXT PRIMARY KEY,         -- unique file serial number (string)
//                 encoding       TEXT NOT NULL,            -- encoding of the blob
//                 content        BLOB NOT NULL,            -- binary-safe content
//                 created_at     DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
//                 updated_at     DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP)
//             ) WITHOUT ROWID;                          -- good when PRIMARY KEY is not an integer
//         `;