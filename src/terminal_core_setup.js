// let _root = null;

document.addEventListener('DOMContentLoaded', () => {

    const
        fsRoot = generateRootDirectory(), // Initialize File System Root
        supportedCommands = {}; // Initialize Supported Commands

    // Set Up Current Terminal Core Services
    let currentTerminalCore = null;

    // Set Up Button Functions Links
    document.getElementById('button_to_switch_theme').onclick = (() => {
        const theme_icon = document.querySelector('label[for=\"button_to_switch_theme\"]');
        return () => {
            theme_icon.innerHTML = document.body.classList.toggle('dark-body-mode') ? '☀️' : '🌙';
        };
    })();
    document.getElementById('button_to_open_new_terminal_tab').onclick = (() => {
        const divTerminalContainer = document.getElementById('terminal-container');
        const navViewNavigation = document.getElementById('view-navigation');
        const terminalHTMLDivElements = [];
        const terminalHTMLButtonElements = [];
        let tabCount = 0;
        return () => {
            if (tabCount === 8) {
                alert('You can open at most 8 terminal tabs.');
                return;
            }
            tabCount++;
            const divNewTerminalHTMLDivElement = document.createElement('div');
            divNewTerminalHTMLDivElement.setAttribute('class', 'terminal-tab');
            divNewTerminalHTMLDivElement.setAttribute('id', `terminal-tab-${tabCount}`);
            divNewTerminalHTMLDivElement.style.display = 'none';
            divTerminalContainer.appendChild(divNewTerminalHTMLDivElement);
            terminalHTMLDivElements.push(divNewTerminalHTMLDivElement);
            const newXtermObject = new window.Terminal({
                fontFamily: '"Fira Code", monospace',
                cursorBlink: true,
                allowProposedApi: true,
                theme: {
                    foreground: '#f1f1f0',
                    background: 'black',
                    selection: '#97979b33',
                    black: '#282a36',
                    brightBlack: '#686868',
                    red: '#ff5c57',
                    brightRed: '#ff5c57',
                    green: '#5af78e',
                    brightGreen: '#5af78e',
                    yellow: '#f3f99d',
                    brightYellow: '#f3f99d',
                    blue: '#57c7ff',
                    brightBlue: '#57c7ff',
                    magenta: '#ff6ac1',
                    brightMagenta: '#ff6ac1',
                    cyan: '#9aedfe',
                    brightCyan: '#9aedfe',
                    white: '#f1f1f0',
                    brightWhite: '#eff0eb'
                },
            });
            const newTerminalCore = generateTerminalCore(
                newXtermObject,
                divNewTerminalHTMLDivElement,
                fsRoot,
                supportedCommands
            );
            window.addEventListener('resize', () => {
                if (currentTerminalCore !== newTerminalCore) // if the current terminal core is not on the front
                    return;
                const fitAddon = newTerminalCore.getFitAddon();
                if (fitAddon !== null) fitAddon.fit();
            });
            const buttonNewTerminalViewNavigation = document.createElement('button');
            buttonNewTerminalViewNavigation.type = 'button';
            buttonNewTerminalViewNavigation.textContent = `{ Tab #${tabCount} }`;
            buttonNewTerminalViewNavigation.style.fontWeight = 'normal';
            buttonNewTerminalViewNavigation.addEventListener('mouseover', () => {
                buttonNewTerminalViewNavigation.style.textDecoration = 'underline';
            });
            buttonNewTerminalViewNavigation.addEventListener('mouseout', () => {
                buttonNewTerminalViewNavigation.style.textDecoration = 'none';
            });
            buttonNewTerminalViewNavigation.addEventListener('click', () => {
                if (currentTerminalCore !== newTerminalCore) { // view switching needed
                    // switch the nav button style
                    for (const button of terminalHTMLButtonElements)
                        button.style.fontWeight = 'normal';
                    buttonNewTerminalViewNavigation.style.fontWeight = 'bold';
                    // switch the terminal tab view
                    for (const div of terminalHTMLDivElements)
                        div.style.display = 'none';
                    divNewTerminalHTMLDivElement.style.display = 'block';
                    currentTerminalCore = newTerminalCore;
                }
                setTimeout(() => {
                    const fitAddon = newTerminalCore.getFitAddon(); // has to be newTerminalCore since 10ms waiting race
                    if (fitAddon !== null) fitAddon.fit();
                }, 50);
            });
            navViewNavigation.appendChild(buttonNewTerminalViewNavigation);
            terminalHTMLButtonElements.push(buttonNewTerminalViewNavigation);
            if (currentTerminalCore === null) // if the terminal tab is <Tab #1>
                buttonNewTerminalViewNavigation.click();
        };
    })();
    document.getElementById('button_to_open_new_terminal_tab').click(); // auto-open window #1
    document.getElementById('button_to_close_current_terminal_tab').onclick = () => {
        alert('no implementation found.');
    };
    document.getElementById('button_to_download_terminal_log').onclick = () => {
        const
            url = URL.createObjectURL(new Blob([currentTerminalCore.getTerminalLogString()], {type: 'text/plain'})),
            link = document.createElement('a');
        link.href = url;
        link.download = `terminal_log @ ${date.getHours()}-${date.getMinutes()}'-${date.getSeconds()}''_${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}.txt`; // the filename the user will get
        link.click();
        URL.revokeObjectURL(url);
    };
    document.getElementById('button_to_add_local_file').onclick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '';
        input.onchange = (input_event) => {
            const file = input_event.target.files[0];
            if (!file) return;   // user hit “cancel”
            // set up a reader for the file
            const reader = new FileReader();
            // set up behaviors on errors
            reader.onerror = (error) => {
                alert(`button_to_add_local_file: error reading the file '${file.name}', ${error}.`);
            };
            // set up behaviors on loading
            const cfp = currentTerminalCore.getCurrentFolderPointer();
            let filename = file.name;
            reader.onload = (reader_event) => {
                const fileContent = reader_event.target.result;
                if (cfp.haveFile(filename)) {
                    const date = new Date();
                    filename = `${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}_${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}_${filename}`;
                }
                cfp.changeFileContent(filename, fileContent);
                alert(`Successfully added file '${filename}' to the current directory (${cfp.getFullPath()}).`);
            };
            // Check the file type to determine HOW to read it
            if (file.type.startsWith('text/')) {
                // Read as text if the file is a text-based file
                reader.readAsText(file);
            } else {
                // Read as binary (ArrayBuffer) for non-text files (e.g., images)
                reader.readAsArrayBuffer(file);  // For binary files (e.g., images)
            }
        };
        input.click();
    };
    document.getElementById('button_to_save_terminal_fs').onclick = () => {
        alert('no implementation found.');
    };

    // Finished
    supportedCommands['hello'] = {
        executable: (_) => {
            currentTerminalCore.printToWindow(`Hello World!`, false, true);
        },
        description: `Say 'Hello World!'`
    };

    // Finished
    supportedCommands['help'] = {
        executable: (_) => {
            currentTerminalCore.printToWindow(
                `Supported commands are: ${
                    Object.keys(supportedCommands).reduce(
                        (acc, elem, index) => {
                            if (index === 0) return `${elem}`;
                            return `${acc}, ${elem}`;
                        },
                        null
                    )
                }.\nFor more details of each command, please use the command 'man [command_name]'.`,
                false,
                true
            );
        },
        description: 'A brief manual of the terminal simulator.',
    };

    // Finished
    supportedCommands['man'] = {
        executable: (parameters) => {
            switch (parameters.length) {
                case 1: {
                    const
                        commandName = parameters[0],
                        commandObject = supportedCommands[commandName];
                    if (commandObject === undefined) {
                        currentTerminalCore.printToWindow(
                            `The command '${commandName}' is not supported!`,
                            true,
                            true
                        );
                    } else {
                        currentTerminalCore.printToWindow(
                            commandObject.description,
                            false,
                            true
                        );
                    }
                    break;
                }
                default: {
                    currentTerminalCore.printToWindow(`Wrong grammar!\nUsage: man [command_name]`, false, true);
                }
            }
        },
        description: 'A detailed manual of the terminal simulator.\n' +
            'Usage: man [command_name]',
    };

    // Finished
    supportedCommands['echo'] = {
        executable: (parameters) => {
            currentTerminalCore.printToWindow(
                `'${
                    parameters.reduce(
                        (acc, elem, index) => {
                            if (index === 0) return elem;
                            return `${acc} ${elem}`;
                        },
                        ''
                    )
                }'`,
                false, true
            );
        },
        description: 'Simply print all the parameters -- with quotation marks [\'] added at the beginning and the end.\n' +
            'Usage: echo [parameters]',
    };

    // Finished
    supportedCommands['ls'] = {
        executable: (parameters) => {
            switch (parameters.length) {
                case 0: { // print current folder info
                    const cfp = currentTerminalCore.getCurrentFolderPointer();
                    currentTerminalCore.printToWindow(cfp.getContentListAsString(), false, true);
                    break;
                }
                case 1: { // print the folder info of given path
                    try {
                        const tfp = currentTerminalCore.getCurrentFolderPointer().duplicate();
                        tfp.gotoPath(parameters[0]);
                        currentTerminalCore.printToWindow(`${tfp.getContentListAsString()}`, false, true);
                    } catch (error) {
                        currentTerminalCore.printToWindow(`${error}`, false, true);
                    }
                    break;
                }
                default: {
                    currentTerminalCore.printToWindow(`Wrong grammar!\nUsage: ls [folder_path]`, false, true);
                }
            }
        },
        description: 'List all the folders and files.\n' +
            'Usage: ls [folder_path]'
    };

    // Finished
    supportedCommands['mkdir'] = {
        executable: (parameters) => {
            switch (parameters.length) {
                case 1: {
                    try {
                        const cfp = currentTerminalCore.getCurrentFolderPointer();
                        cfp.createPath(parameters[0]);
                        currentTerminalCore.printToWindow(`Successfully created a directory (Or the directory is already existing).`, false, true);
                    } catch (error) {
                        currentTerminalCore.printToWindow(`${error}`, false, true);
                    }
                    break;
                }
                default: {
                    currentTerminalCore.printToWindow(`Wrong grammar!\nUsage: mkdir [folder_path]`, false, true);
                }
            }
        },
        description: 'Make a new directory.\n' +
            'Usage: mkdir [folder_path]'
    };

    // Finished
    supportedCommands['pwd'] = {
        executable: (_) => {
            currentTerminalCore.printToWindow(
                currentTerminalCore.getCurrentFolderPointer().getFullPath(),
                false, true
            );
        },
        description: 'Print the current full path.'
    };

    // Finished
    supportedCommands['touch'] = {
        executable: (parameters) => {
            switch (parameters.length) {
                case 1: {
                    try {
                        currentTerminalCore.getCurrentFolderPointer().createNewFile(parameters[0]);
                        currentTerminalCore.printToWindow(`Successfully create a file.`, false, true);
                    } catch (error) {
                        currentTerminalCore.printToWindow(`${error}`, false, true);
                    }
                    break;
                }
                default: {
                    currentTerminalCore.printToWindow(`Wrong grammar!\nUsage: touch [file_name]`, false, true);
                }
            }
        },
        description: 'Make a new file in the current directory.\n' +
            'Usage: touch [file_name]'
    };

    // Finished
    supportedCommands['cd'] = {
        executable: (parameters) => {
            switch (parameters.length) {
                case 1: {
                    try {
                        const cfp = currentTerminalCore.getCurrentFolderPointer();
                        cfp.gotoPath(parameters[0]);
                        currentTerminalCore.printToWindow(`Successfully went to the directory.`, false, true);
                    } catch (error) {
                        currentTerminalCore.printToWindow(`${error}`, false, true);
                    }
                    break;
                }
                default: {
                    currentTerminalCore.printToWindow(`Wrong grammar!\nUsage: cd [folder_path]`, false, true);
                }
            }
        },
        description: 'Goto the given folder.\n' +
            'Usage: cd [folder_path]'
    };

    // Finished
    supportedCommands['mv'] = {
        executable: (parameters) => {
            if (
                (parameters.length !== 3) ||
                (parameters[0] !== '-f' && parameters[0] !== '-d')
            ) {
                currentTerminalCore.printToWindow(`Wrong grammar!\nUsage: mv -f [old_file_path] [new_file_path]\n       mv -d [old_directory_path] [new_directory_path]`, false, true);
                return;
            }
            try {
                const cfp = currentTerminalCore.getCurrentFolderPointer();
                if (parameters[0] === '-f') { // move a file
                    // const old_file_path = parameters[1], new_file_path = parameters[2];
                    cfp.movePath('file', parameters[1], parameters[2]);
                } else if (parameters[0] === '-d') { // move a directory
                    // const old_directory_path = parameters[1], new_directory_path = parameters[2];
                    cfp.movePath('directory', parameters[1], parameters[2]);
                }
                currentTerminalCore.printToWindow(`Successfully moved the path.`, false, true);
            } catch (error) {
                currentTerminalCore.printToWindow(`${error}`, false, true);
            }
        },
        description: 'mv an existing file or directory.\n' +
            'Usage: mv -f [old_file_path] [new_file_path]\n' +
            '       mv -d [old_directory_path] [new_directory_path]'
    };

    // Finished
    supportedCommands['cp'] = {
        executable: (parameters) => {
            if (
                (parameters.length !== 3) ||
                (parameters[0] !== '-f' && parameters[0] !== '-d')
            ) {
                currentTerminalCore.printToWindow(`Wrong grammar!\nUsage: cp -f [original_file_path] [destination_file_path]\n       cp -d [original_directory_path] [destination_directory_path]`, false, true);
                return;
            }
            try {
                const cfp = currentTerminalCore.getCurrentFolderPointer();
                if (parameters[0] === '-f') { // move a file
                    cfp.copyPath('file', parameters[1], parameters[2]);
                } else if (parameters[0] === '-d') { // move a directory
                    cfp.copyPath('directory', parameters[1], parameters[2]);
                }
                currentTerminalCore.printToWindow(`Successfully copied the path.`, false, true);
            } catch (error) {
                currentTerminalCore.printToWindow(`${error}`, false, true);
            }
        },
        description: 'Copy an existing file or directory.\n' +
            'Usage: cp -f [original_file_path] [destination_file_path]\n' +
            '       cp -d [original_directory_path] [destination_directory_path]'
    };

    // Finished
    supportedCommands['rm'] = {
        executable: (parameters) => {
            if (
                (parameters.length !== 2) ||
                (parameters[0] !== '-f' && parameters[0] !== '-d')
            ) {
                currentTerminalCore.printToWindow(`Wrong grammar!\nUsage: rm -f [file_path]\n       rm -d [directory_path]`, false, true);
                return;
            }
            try {
                const cfp = currentTerminalCore.getCurrentFolderPointer();
                if (parameters[0] === '-f') { // move a file
                    // const old_file_path = parameters[1], new_file_path = parameters[2];
                    cfp.deletePath('file', parameters[1]);
                } else if (parameters[0] === '-d') { // move a directory
                    // const old_directory_path = parameters[1], new_directory_path = parameters[2];
                    cfp.deletePath('directory', parameters[1]);
                }
                currentTerminalCore.printToWindow(`Successfully removed the path.`, false, true);
            } catch (error) {
                currentTerminalCore.printToWindow(`${error}`, false, true);
            }
        },
        description: 'Remove (delete) an existing file or directory.\n' +
            'Usage: rm -f [file_path]\n' +
            '       rm -d [directory_path]'
    };

    // Finished
    supportedCommands['download'] = {
        executable: (parameters) => {
            if (
                (parameters.length !== 2) ||
                (parameters[0] !== '-f' && parameters[0] !== '-d')
            ) {
                currentTerminalCore.printToWindow(`Wrong grammar!\nUsage: download -f [file_path]\n       download -d [directory_path]`, false, true);
                return;
            }
            try {
                const tfp = currentTerminalCore.getCurrentFolderPointer().duplicate();
                if (parameters[0] === '-f') { // rename a file
                    const file_path = parameters[1];
                    const index = file_path.lastIndexOf('/');
                    const [fileDir, fileName] = (() => {
                        if (index === -1) return ['.', file_path];
                        if (index === 0) return ['/', file_path.slice(1)];
                        return [file_path.substring(0, index), file_path.slice(index + 1)];
                    })();
                    tfp.gotoPath(fileDir);
                    const
                        url = URL.createObjectURL(new Blob([tfp.getFileContent(fileName)], {type: 'application/octet-stream'})),
                        link = document.createElement('a');
                    link.href = url;
                    link.download = fileName; // the filename the user will get
                    link.click();
                    URL.revokeObjectURL(url);
                } else if (parameters[0] === '-d') { // rename a directory
                    const directory_path = parameters[1];
                    tfp.gotoPath(directory_path);
                    (async () => {
                        tfp.getZipBlobOfFolder().then(
                            (blob) => {
                                const
                                    url = URL.createObjectURL(blob),
                                    link = document.createElement('a'),
                                    fullPath = tfp.getFullPath();
                                link.href = url;
                                link.download = `${
                                    (fullPath === '/') ? 'root' : fullPath.substring(1).replaceAll('/', '_')
                                }.zip`; // the filename the user will get
                                link.click();
                                URL.revokeObjectURL(url);
                            }
                        );
                    })();
                }
            } catch (error) {
                currentTerminalCore.printToWindow(`${error}`, false, true);
            }
        },
        description: 'Download a single file or a directory (as .zip file) in the terminal file system.\n' +
            'Usage: download -f [file_path]\n' +
            '       download -d [directory_path]'
    };

    // Finished
    supportedCommands['print'] = {
        executable: (parameters) => {
            if (parameters.length !== 1) {
                currentTerminalCore.printToWindow(`Wrong grammar!\nUsage: print [file_path]`, false, true);
                return;
            }
            try {
                const tfp = currentTerminalCore.getCurrentFolderPointer().duplicate();
                const file_path = parameters[0];
                const index = file_path.lastIndexOf('/');
                const [fileDir, fileName] = (() => {
                    if (index === -1) return ['.', file_path];
                    if (index === 0) return ['/', file_path.slice(1)];
                    return [file_path.substring(0, index), file_path.slice(index + 1)];
                })();
                tfp.gotoPath(fileDir);
                currentTerminalCore.printToWindow(tfp.getFileContent(fileName), false, true);
            } catch (error) {
                currentTerminalCore.printToWindow(`${error}`, false, true);
            }
        },
        description: 'Print an existing file to the terminal window.\n' +
            'Usage: print [file_path]'
    };

    // Finished
    supportedCommands['edit'] = {
        executable: (parameters) => {
            if (parameters.length !== 1) {
                currentTerminalCore.printToWindow(`Wrong grammar!\nUsage: edit [file_path]`, false, true);
                return;
            }
            try {
                const tfp = currentTerminalCore.getCurrentFolderPointer().duplicate();
                const filePath = parameters[0];
                const index = filePath.lastIndexOf('/');
                const [fileDir, fileName] = (() => {
                    if (index === -1) return ['.', filePath];
                    if (index === 0) return ['/', filePath.slice(1)];
                    return [filePath.substring(0, index), filePath.slice(index + 1)];
                })();
                tfp.gotoPath(fileDir);
                const fileContent = tfp.getFileContent(fileName); // need this line to make sure the file is loaded before resetting the keyboard listener
                currentTerminalCore.setNewKeyboardListener((_) => { // empty keyboard listener
                });
                openFileEditor(
                    currentTerminalCore.getHTMLDivForTerminalWindow(),
                    fileName,
                    fileContent,
                    (windowDescription, divAceEditorWindow, aceEditorObject) => { // minimize
                        const cmwr = currentTerminalCore.getMinimizedWindowRecords();
                        cmwr.add(windowDescription, () => {
                            currentTerminalCore.setNewKeyboardListener((_) => {
                            });
                            divAceEditorWindow.style.display = '';
                            aceEditorObject.focus();
                        });
                        currentTerminalCore.setDefaultKeyboardListener();
                    },
                    (newFileContent) => { // save
                        tfp.changeFileContent(fileName, newFileContent);
                        currentTerminalCore.setDefaultKeyboardListener();
                    },
                    () => { // cancel
                        currentTerminalCore.setDefaultKeyboardListener();
                    }
                );
                currentTerminalCore.printToWindow(`Successfully opened an editor.`, false, true);
            } catch (error) {
                currentTerminalCore.printToWindow(`${error}`, false, true);
            }
        },
        description: 'Edit an existing file.\n' +
            'Usage: edit [file_path]'
    };

    supportedCommands['mini'] = {
        executable: (parameters) => {
            if (
                (parameters.length <= 0) ||
                (parameters.length >= 3) || // length can only be 1 or 2
                (parameters[0] !== '-l' && parameters[0] !== '-r') || // check the first parameter component
                (parameters[0] === '-r' && parameters.length === 1) // check the second parameter component
            ) {
                currentTerminalCore.printToWindow(`Wrong grammar!\nUsage: mini -l\n       mini -r [number]`, false, true);
                return;
            }
            try {
                if (parameters[0] === '-l') {
                    // 'Folders:' + folderNames.reduce((acc, elem) =>
                    //     `${acc}\n            ${elem}`, '');
                    const cmwr = currentTerminalCore.getMinimizedWindowRecords();
                    const cmwrDescriptions = cmwr.getDescriptions();
                    if (cmwrDescriptions.length > 0) {
                        currentTerminalCore.printToWindow(
                            'Minimized Windows:' + cmwrDescriptions.reduce(
                                (acc, elem, index) => `${acc}\n                    [${index + 1}] ${elem}`, ''
                            ),
                            false,
                            true
                        );
                    } else {
                        currentTerminalCore.printToWindow('No window minimized...', false, true);
                    }
                } else if (parameters[0] === '-r') {
                    const trueKeyIndex = Number.parseInt(parameters[1]) - 1;
                    const cmwr = currentTerminalCore.getMinimizedWindowRecords();
                    const cmwrDescriptions = cmwr.getDescriptions();
                    if (Number.isNaN(trueKeyIndex) || trueKeyIndex < 0 || trueKeyIndex >= cmwrDescriptions.length) {
                        currentTerminalCore.printToWindow('Wrong index!', false, true);
                        return;
                    }
                    if (!cmwr.recoverWindow(cmwrDescriptions[trueKeyIndex])) {
                        currentTerminalCore.printToWindow('Unexpected error, failed to recover the minimized window.', false, true);
                    }
                }
            } catch (error) {
                currentTerminalCore.printToWindow(`${error}`, false, true);
            }
        },
        description: 'List all the minimized windows, or Re-open a minimized window.\n' +
            'Usage: mini -l             to list all the minimized windows\n' +
            '       mini -r [number]    to recover the minimized window',
    };

    supportedCommands['webass'] = {
        executable: (parameters) => {
        },
        description: ''
    }

    // Update Needed
    // supportedCommands['wget'] = {
    //     executable: (parameters) => {
    //         switch (parameters.length) {
    //             case 1: {
    //                 const url = parameters[0];
    //                 // Example URL: https://static.vecteezy.com/system/resources/previews/036/333/113/large_2x/monarch-beautiful-butterflygraphy-beautiful-butterfly-on-flower-macrography-beautyful-nature-photo.jpg
    //                 try {
    //                     fetch(url)
    //                         .then((response) => {
    //                             if (!response.ok) {
    //                                 throw new Error(`Could not find ${parameters[0]}`);
    //                             }
    //                             return response.text();
    //                         })
    //                         .then((text) => {
    //                             const
    //                                 date = new Date(),
    //                                 filename = `wget_${date.getHours()}-${date.getMinutes()}'-${date.getSeconds()}''_${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}.txt`;
    //                             currentTerminalCore.getCurrentFolderPointer().changeFileContent(
    //                                 filename,
    //                                 text
    //                             );
    //                             currentTerminalCore.printToWindow(`Success!`, false, true);
    //                         });
    //                 } catch (error) {
    //                     currentTerminalCore.printToWindow(`${error}`, false, true);
    //                 }
    //                 break;
    //             }
    //             default: {
    //                 currentTerminalCore.printToWindow(`Wrong grammar!\nUsage: wget [html_link]`, false, true);
    //             }
    //         }
    //     },
    //     description: 'Download file from html link.\nUsage: wget [html_link]'
    // };

    // // Update Needed
    // supportedCommands['ping'] = {
    //     executable: (parameters) => {
    //         if (parameters.length === 0) {
    //             currentTerminalCore.printToWindow(`Usage: ping [hostname]`, false, true);
    //             return;
    //         }
    //
    //         const fullCommand = `ping -c 4 ${parameters.join(' ')}`;
    //         currentTerminalCore.printToWindow(`Running: ${fullCommand}\n`, false, true);
    //
    //         fetch('http://localhost:3000/api/run', {
    //             method: 'POST',
    //             headers: {'Content-Type': 'application/json'},
    //             body: JSON.stringify({command: fullCommand})
    //         })
    //             .then(res => res.text())
    //             .then(output => {
    //                 currentTerminalCore.printToWindow(output, false, true);
    //             })
    //             .catch(err => {
    //                 currentTerminalCore.printToWindow(`Error executing ping: ${err}`, false, true);
    //             });
    //     },
    //     description: 'Ping a domain or IP address.\nUsage: ping [hostname]'
    // };

    // // Update Needed
    // supportedCommands['curl'] = {
    //     executable: (params) => {
    //         // Validate
    //         if (params.length !== 1) {
    //             currentTerminalCore.printToWindow('Usage: curl [url]\n', false, true);
    //             return;
    //         }
    //         // Pull the URL from params
    //         const url = params[0];
    //
    //         // Print a fetch banner
    //         currentTerminalCore.printToWindow(`Fetching ${url} …\n`, false, true);
    //
    //         fetch(`http://localhost:3000/api/proxy?url=${encodeURIComponent(url)}`)
    //             .then(res => {
    //                 // 5) Print status + headers
    //                 currentTerminalCore.printToWindow(
    //                     `$ HTTP ${res.status} ${res.statusText}` +
    //                     [...res.headers.entries()]
    //                         .map(([k, v]) => `\n${k}: ${v}`)
    //                         .join('') +
    //                     `\n\n`,
    //                     false,
    //                     true
    //                 );
    //                 // Return the body text
    //                 return res.text();
    //             })
    //             .then(body => {
    //                 // Print the HTML snippet
    //                 const snippet = body.slice(0, 1000);
    //                 currentTerminalCore.printToWindow(
    //                     snippet + (body.length > 1000 ? '\n...[truncated]\n' : '\n'),
    //                     false,
    //                     true
    //                 );
    //             })
    //             .catch(err => {
    //                 currentTerminalCore.printToWindow(`curl failed: ${err.message}\n`, false, true);
    //             });
    //     },
    //     description: 'Fetch a URL via your server proxy and show status, headers & a 1 000-char body snippet'
    // };

    // // Update Needed
    // supportedCommands['files'] = {
    //     executable: (params) => {
    //         const fp = currentTerminalCore.getCurrentFolderPointer();
    //         const [action, ...rest] = params;
    //
    //         switch (action) {
    //             case 'list': {
    //                 // show folders and files in current dir
    //                 const folders = fp.getSubfolderNames();
    //                 const files = fp.getFileNames();
    //                 currentTerminalCore.printToWindow(
    //                     `Folders:\n  ${folders.join('\n  ')}\n\n` +
    //                     `Files:\n  ${files.join('\n  ')}\n`,
    //                     false, true
    //                 );
    //                 break;
    //             }
    //
    //             case 'read': {
    //                 // files read <filename>
    //                 if (rest.length !== 1) {
    //                     currentTerminalCore.printToWindow('Usage: files read <path>\n', false, true);
    //                     return;
    //                 }
    //                 try {
    //                     const content = fp.getFileContent(rest[0]);
    //                     currentTerminalCore.printToWindow(content + '\n', false, true);
    //                 } catch (e) {
    //                     currentTerminalCore.printToWindow(`files read failed: ${e.message}\n`, false, true);
    //                 }
    //                 break;
    //             }
    //
    //             case 'create': {
    //                 // files create <filename> [initial content...]
    //                 if (rest.length < 1) {
    //                     currentTerminalCore.printToWindow('Usage: files create <path> [content]\n', false, true);
    //                     return;
    //                 }
    //                 const [path, ...txt] = rest;
    //                 try {
    //                     fp.createNewFile(path);
    //                     if (txt.length) fp.changeFileContent(path, txt.join(' '));
    //                     currentTerminalCore.printToWindow(`Created ${path}\n`, false, true);
    //                 } catch (e) {
    //                     currentTerminalCore.printToWindow(`files create failed: ${e.message}\n`, false, true);
    //                 }
    //                 break;
    //             }
    //
    //             case 'update': {
    //                 // files update <filename> <new content...>
    //                 if (rest.length < 2) {
    //                     currentTerminalCore.printToWindow('Usage: files update <path> <content>\n', false, true);
    //                     return;
    //                 }
    //                 const [path, ...txt] = rest;
    //                 try {
    //                     fp.changeFileContent(path, txt.join(' '));
    //                     currentTerminalCore.printToWindow(`Updated ${path}\n`, false, true);
    //                 } catch (e) {
    //                     currentTerminalCore.printToWindow(`files update failed: ${e.message}\n`, false, true);
    //                 }
    //                 break;
    //             }
    //
    //             case 'delete': {
    //                 // files delete <filename>
    //                 if (rest.length !== 1) {
    //                     currentTerminalCore.printToWindow('Usage: files delete <path>\n', false, true);
    //                     return;
    //                 }
    //                 try {
    //                     fp.deleteFile(rest[0]);
    //                     currentTerminalCore.printToWindow(`Deleted ${rest[0]}\n`, false, true);
    //                 } catch (e) {
    //                     currentTerminalCore.printToWindow(`files delete failed: ${e.message}\n`, false, true);
    //                 }
    //                 break;
    //             }
    //
    //             case 'rename': {
    //                 // files rename <oldName> <newName>
    //                 if (rest.length !== 2) {
    //                     currentTerminalCore.printToWindow('Usage: files rename <old> <new>\n', false, true);
    //                     return;
    //                 }
    //                 try {
    //                     fp.renameExistingFile(rest[0], rest[1]);
    //                     currentTerminalCore.printToWindow(`Renamed ${rest[0]} → ${rest[1]}\n`, false, true);
    //                 } catch (e) {
    //                     currentTerminalCore.printToWindow(`files rename failed: ${e.message}\n`, false, true);
    //                 }
    //                 break;
    //             }
    //
    //             default:
    //                 currentTerminalCore.printToWindow(
    //                     'Usage: files <list|read|create|update|delete|rename> [args]\n',
    //                     false, true
    //                 );
    //         }
    //     },
    //     description:
    //         'Virtual-FS CRUD operations:\n' +
    //         '  files list\n' +
    //         '  files read <path>\n' +
    //         '  files create <path> [content]\n' +
    //         '  files update <path> <content>\n' +
    //         '  files delete <path>\n' +
    //         '  files rename <old> <new>'
    // };

    // Update Needed
    // supportedCommands['save'] = {
    //     description: 'Persist FS to SQLite',
    //     executable: () => {
    //         const cwd = currentTerminalCore.getCurrentFolderPointer().getFullPath();
    //         const state = exportFS(fsRoot, cwd);
    //
    //         fetch('http://localhost:3000/api/fs/save', {
    //             method: 'POST',                            // ← must be POST
    //             headers: {'Content-Type': 'application/json'},
    //             body: JSON.stringify(state),               // ← your JSON payload
    //         })
    //             .then(res => {
    //                 if (!res.ok) throw new Error(res.statusText);
    //                 console.log('✅ Saved to SQLite');
    //             })
    //             .catch(err => {
    //                 console.log(`Save failed: ${err}`);
    //             });
    //     }
    // };

    // Update Needed
    // supportedCommands['load'] = {
    //     description: 'Load FS from SQLite',
    //     executable: () => {
    //         fetch('http://localhost:3000/api/fs/load')
    //             .then(res => res.json())
    //             .then(state => {
    //                 importFS(fsRoot, state);                  // you’ll need an importFS to mirror exportFS
    //                 // restore working directory
    //                 // const cwd = state.cwd.startsWith('/') ? state.cwd.slice(1) : state.cwd;
    //                 // if (cwd) currentTerminalCore.getCurrentFolderPointer().gotoPathFromRoot(cwd);
    //                 currentTerminalCore.printToWindow('✅ Loaded from SQLite', false, true);
    //             })
    //             .catch(err => currentTerminalCore.printToWindow(`Load failed: ${err}`, false, true));
    //     }
    // };

});

























