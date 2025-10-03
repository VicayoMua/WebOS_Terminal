// let _root = null;

document.addEventListener('DOMContentLoaded', () => {
    let
        tabCount = 0, // Initialize the total tab count
        fsRoot = generateRootFolder(), // Initialize File System Root
        supportedCommands = {}, // Initialize Supported Commands
        currentTabRecord = null; // This is an object from <generateTerminalCore>.
    const
        labelThemeIcon = document.querySelector('label[for=\"button_to_switch_theme\"]'),
        divTerminalContainer = document.getElementById('terminal-container'),
        navViewNavigation = document.getElementById('view-navigation'),
        tabRecords = [
            // {
            //     divTerminal: ...,
            //     terminalCore: ...,
            //     buttonViewSwitch: ...,
            // }
        ];

    // Set Up Button Functions Links
    document.getElementById('button_to_switch_theme').addEventListener('click', () => {
        labelThemeIcon.innerHTML = document.body.classList.toggle('dark-body-mode') ? '☀️' : '🌙';
    });
    document.getElementById('button_to_open_new_terminal_tab').addEventListener('click', () => {
        // check the tab count limit
        if (tabCount >= 8) {
            alert('You can open at most 8 terminal tabs.');
            return;
        }
        // Record the total tab count & Use it as current tab number
        tabCount++;
        // Create a new div html element for the new Terminal
        const divNewTerminal = document.createElement('div');
        divNewTerminal.setAttribute('class', 'terminal-tab');
        divNewTerminal.setAttribute('id', `terminal-tab-${tabCount}`);
        divNewTerminal.style.display = 'none';
        divTerminalContainer.appendChild(divNewTerminal);
        // Create a new terminal core on the new div
        const
            newXtermObject = new window.Terminal({
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
            }),
            newTerminalCore = generateTerminalCore(
                newXtermObject,
                divNewTerminal,
                fsRoot,
                supportedCommands
            );
        window.addEventListener('resize', () => {
            if (currentTabRecord === null || currentTabRecord.terminalCore !== newTerminalCore) // if the current terminal core is not in the front
                return;
            // resize the terminal window in the front
            const fitAddon = newTerminalCore.getFitAddon();
            if (fitAddon !== null) fitAddon.fit();
        });
        // Create a new button html element for the view switch for the new terminal core
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
        // Create a new tab record
        const newTerminalTabRecord = {
            divTerminal: divNewTerminal,
            terminalCore: newTerminalCore,
            buttonViewSwitch: buttonNewTerminalViewNavigation,
        };
        buttonNewTerminalViewNavigation.addEventListener('click', () => {
            if (currentTabRecord === null || currentTabRecord.terminalCore !== newTerminalCore) { // if view switching needed
                // switch the nav button style and the terminal tab view
                tabRecords.forEach((tabRecord) => {
                    tabRecord.divTerminal.style.display = 'none';
                    tabRecord.buttonViewSwitch.style.fontWeight = 'normal';
                });
                buttonNewTerminalViewNavigation.style.fontWeight = 'bold';
                divNewTerminal.style.display = 'block';
                // switch the terminal tab record
                currentTabRecord = newTerminalTabRecord;
            }
            setTimeout(() => {
                const fitAddon = newTerminalCore.getFitAddon();
                if (fitAddon !== null) fitAddon.fit();
            }, 50);
        });
        navViewNavigation.appendChild(buttonNewTerminalViewNavigation);
        tabRecords.push(newTerminalTabRecord);
        if (currentTabRecord === null) // if the terminal tab is <Tab #1>
            buttonNewTerminalViewNavigation.click();
    });
    document.getElementById('button_to_download_terminal_log').addEventListener('click', () => {
        const
            url = URL.createObjectURL(new Blob([currentTabRecord.terminalCore.getTerminalLogString()], {type: 'text/plain'})),
            link = document.createElement('a');
        link.href = url;
        link.download = `terminal_log @ ${sysdate.getHours()}-${sysdate.getMinutes()}'-${sysdate.getSeconds()}''_${sysdate.getDate()}-${sysdate.getMonth() + 1}-${sysdate.getFullYear()}.txt`; // the filename the user will get
        link.click();
        URL.revokeObjectURL(url);
    });
    document.getElementById('button_to_add_local_file').addEventListener('click', () => {
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
            const cfp = currentTabRecord.terminalCore.getCurrentFolderPointer();
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
    });

    // Automatically Open Window #1
    document.getElementById('button_to_open_new_terminal_tab').click();

    // Finished
    supportedCommands['hello'] = {
        executable: (_) => {
            currentTabRecord.terminalCore.printToWindow(`Hello World!`, false, true);
        },
        description: `Say 'Hello World!'`
    };

    // Finished
    supportedCommands['help'] = {
        executable: (_) => {
            currentTabRecord.terminalCore.printToWindow(
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
                        currentTabRecord.terminalCore.printToWindow(
                            `The command '${commandName}' is not supported!`,
                            true,
                            true
                        );
                    } else {
                        currentTabRecord.terminalCore.printToWindow(
                            commandObject.description,
                            false,
                            true
                        );
                    }
                    break;
                }
                default: {
                    currentTabRecord.terminalCore.printToWindow(`Wrong grammar!\nUsage: man [command_name]`, false, true);
                }
            }
        },
        description: 'A detailed manual of the terminal simulator.\n' +
            'Usage: man [command_name]',
    };

    // Finished
    supportedCommands['echo'] = {
        executable: (parameters) => {
            currentTabRecord.terminalCore.printToWindow(
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
                    const cfp = currentTabRecord.terminalCore.getCurrentFolderPointer();
                    currentTabRecord.terminalCore.printToWindow(cfp.getContentListAsString(), false, true);
                    break;
                }
                case 1: { // print the folder info of given path
                    try {
                        const tfp = currentTabRecord.terminalCore.getCurrentFolderPointer().duplicate();
                        tfp.gotoPath(parameters[0]);
                        currentTabRecord.terminalCore.printToWindow(`${tfp.getContentListAsString()}`, false, true);
                    } catch (error) {
                        currentTabRecord.terminalCore.printToWindow(`${error}`, false, true);
                    }
                    break;
                }
                default: {
                    currentTabRecord.terminalCore.printToWindow(`Wrong grammar!\nUsage: ls [folder_path]`, false, true);
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
                        const cfp = currentTabRecord.terminalCore.getCurrentFolderPointer();
                        cfp.createPath(parameters[0]);
                        currentTabRecord.terminalCore.printToWindow(`Successfully created a directory (Or the directory is already existing).`, false, true);
                    } catch (error) {
                        currentTabRecord.terminalCore.printToWindow(`${error}`, false, true);
                    }
                    break;
                }
                default: {
                    currentTabRecord.terminalCore.printToWindow(`Wrong grammar!\nUsage: mkdir [folder_path]`, false, true);
                }
            }
        },
        description: 'Make a new directory.\n' +
            'Usage: mkdir [folder_path]'
    };

    // Finished
    supportedCommands['pwd'] = {
        executable: (_) => {
            currentTabRecord.terminalCore.printToWindow(
                currentTabRecord.terminalCore.getCurrentFolderPointer().getFullPath(),
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
                        currentTabRecord.terminalCore.getCurrentFolderPointer().createNewFile(parameters[0]);
                        currentTabRecord.terminalCore.printToWindow(`Successfully create a file.`, false, true);
                    } catch (error) {
                        currentTabRecord.terminalCore.printToWindow(`${error}`, false, true);
                    }
                    break;
                }
                default: {
                    currentTabRecord.terminalCore.printToWindow(`Wrong grammar!\nUsage: touch [file_name]`, false, true);
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
                        const cfp = currentTabRecord.terminalCore.getCurrentFolderPointer();
                        cfp.gotoPath(parameters[0]);
                        currentTabRecord.terminalCore.printToWindow(`Successfully went to the directory.`, false, true);
                    } catch (error) {
                        currentTabRecord.terminalCore.printToWindow(`${error}`, false, true);
                    }
                    break;
                }
                default: {
                    currentTabRecord.terminalCore.printToWindow(`Wrong grammar!\nUsage: cd [folder_path]`, false, true);
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
                currentTabRecord.terminalCore.printToWindow(`Wrong grammar!\nUsage: mv -f [old_file_path] [new_file_path]\n       mv -d [old_directory_path] [new_directory_path]`, false, true);
                return;
            }
            try {
                const cfp = currentTabRecord.terminalCore.getCurrentFolderPointer();
                if (parameters[0] === '-f') { // move a file
                    // const old_file_path = parameters[1], new_file_path = parameters[2];
                    cfp.movePath('file', parameters[1], parameters[2]);
                } else if (parameters[0] === '-d') { // move a directory
                    // const old_directory_path = parameters[1], new_directory_path = parameters[2];
                    cfp.movePath('directory', parameters[1], parameters[2]);
                }
                currentTabRecord.terminalCore.printToWindow(`Successfully moved the path.`, false, true);
            } catch (error) {
                currentTabRecord.terminalCore.printToWindow(`${error}`, false, true);
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
                currentTabRecord.terminalCore.printToWindow(`Wrong grammar!\nUsage: cp -f [original_file_path] [destination_file_path]\n       cp -d [original_directory_path] [destination_directory_path]`, false, true);
                return;
            }
            try {
                const cfp = currentTabRecord.terminalCore.getCurrentFolderPointer();
                if (parameters[0] === '-f') { // move a file
                    cfp.copyPath('file', parameters[1], parameters[2]);
                } else if (parameters[0] === '-d') { // move a directory
                    cfp.copyPath('directory', parameters[1], parameters[2]);
                }
                currentTabRecord.terminalCore.printToWindow(`Successfully copied the path.`, false, true);
            } catch (error) {
                currentTabRecord.terminalCore.printToWindow(`${error}`, false, true);
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
                currentTabRecord.terminalCore.printToWindow(`Wrong grammar!\nUsage: rm -f [file_path]\n       rm -d [directory_path]`, false, true);
                return;
            }
            try {
                const cfp = currentTabRecord.terminalCore.getCurrentFolderPointer();
                if (parameters[0] === '-f') { // move a file
                    // const old_file_path = parameters[1], new_file_path = parameters[2];
                    cfp.deletePath('file', parameters[1]);
                } else if (parameters[0] === '-d') { // move a directory
                    // const old_directory_path = parameters[1], new_directory_path = parameters[2];
                    cfp.deletePath('directory', parameters[1]);
                }
                currentTabRecord.terminalCore.printToWindow(`Successfully removed the path.`, false, true);
            } catch (error) {
                currentTabRecord.terminalCore.printToWindow(`${error}`, false, true);
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
                currentTabRecord.terminalCore.printToWindow(`Wrong grammar!\nUsage: download -f [file_path]\n       download -d [directory_path]`, false, true);
                return;
            }
            try {
                const tfp = currentTabRecord.terminalCore.getCurrentFolderPointer().duplicate();
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
                currentTabRecord.terminalCore.printToWindow(`${error}`, false, true);
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
                currentTabRecord.terminalCore.printToWindow(`Wrong grammar!\nUsage: print [file_path]`, false, true);
                return;
            }
            try {
                const tfp = currentTabRecord.terminalCore.getCurrentFolderPointer().duplicate();
                const file_path = parameters[0];
                const index = file_path.lastIndexOf('/');
                const [fileDir, fileName] = (() => {
                    if (index === -1) return ['.', file_path];
                    if (index === 0) return ['/', file_path.slice(1)];
                    return [file_path.substring(0, index), file_path.slice(index + 1)];
                })();
                tfp.gotoPath(fileDir);
                currentTabRecord.terminalCore.printToWindow(tfp.getFileContent(fileName), false, true);
            } catch (error) {
                currentTabRecord.terminalCore.printToWindow(`${error}`, false, true);
            }
        },
        description: 'Print an existing file to the terminal window.\n' +
            'Usage: print [file_path]'
    };

    // Finished
    supportedCommands['edit'] = {
        executable: (parameters) => {
            if (parameters.length !== 1) {
                currentTabRecord.terminalCore.printToWindow(`Wrong grammar!\nUsage: edit [file_path]`, false, true);
                return;
            }
            try {
                const tfp = currentTabRecord.terminalCore.getCurrentFolderPointer().duplicate();
                const filePath = parameters[0];
                const index = filePath.lastIndexOf('/');
                const [fileDir, fileName] = (() => {
                    if (index === -1) return ['.', filePath];
                    if (index === 0) return ['/', filePath.slice(1)];
                    return [filePath.substring(0, index), filePath.slice(index + 1)];
                })();
                tfp.gotoPath(fileDir);
                const fileContent = tfp.getFileContent(fileName); // need this line to make sure the file is loaded before resetting the keyboard listener
                currentTabRecord.terminalCore.setNewKeyboardListener((_) => { // empty keyboard listener
                });
                openFileEditor(
                    currentTabRecord.terminalCore.getHTMLDivForTerminalWindow(),
                    fileName,
                    fileContent,
                    (windowDescription, divAceEditorWindow, aceEditorObject) => { // minimize
                        const cmwr = currentTabRecord.terminalCore.getMinimizedWindowRecords();
                        cmwr.add(windowDescription, () => {
                            currentTabRecord.terminalCore.setNewKeyboardListener((_) => {
                            });
                            divAceEditorWindow.style.display = '';
                            aceEditorObject.focus();
                        });
                        currentTabRecord.terminalCore.setDefaultKeyboardListener();
                    },
                    (newFileContent) => { // save
                        tfp.changeFileContent(fileName, newFileContent);
                        currentTabRecord.terminalCore.setDefaultKeyboardListener();
                    },
                    () => { // cancel
                        currentTabRecord.terminalCore.setDefaultKeyboardListener();
                    }
                );
                currentTabRecord.terminalCore.printToWindow(`Successfully opened an editor.`, false, true);
            } catch (error) {
                currentTabRecord.terminalCore.printToWindow(`${error}`, false, true);
            }
        },
        description: 'Edit an existing file.\n' +
            'Usage: edit [file_path]'
    };

    // Finished
    supportedCommands['mini'] = {
        executable: (parameters) => {
            if (
                (parameters.length <= 0) ||
                (parameters.length >= 3) || // length can only be 1 or 2
                (parameters[0] !== '-l' && parameters[0] !== '-r') || // check the first parameter component
                (parameters[0] === '-r' && parameters.length === 1) // check the second parameter component
            ) {
                currentTabRecord.terminalCore.printToWindow(`Wrong grammar!\nUsage: mini -l\n       mini -r [number]`, false, true);
                return;
            }
            try {
                if (parameters[0] === '-l') {
                    // 'Folders:' + folderNames.reduce((acc, elem) =>
                    //     `${acc}\n            ${elem}`, '');
                    const cmwr = currentTabRecord.terminalCore.getMinimizedWindowRecords();
                    const cmwrDescriptions = cmwr.getDescriptions();
                    if (cmwrDescriptions.length > 0) {
                        currentTabRecord.terminalCore.printToWindow(
                            'Minimized Windows:' + cmwrDescriptions.reduce(
                                (acc, elem, index) => `${acc}\n                    [${index + 1}] ${elem}`, ''
                            ),
                            false,
                            true
                        );
                    } else {
                        currentTabRecord.terminalCore.printToWindow('No window minimized...', false, true);
                    }
                } else if (parameters[0] === '-r') {
                    const trueKeyIndex = Number.parseInt(parameters[1]) - 1;
                    const cmwr = currentTabRecord.terminalCore.getMinimizedWindowRecords();
                    const cmwrDescriptions = cmwr.getDescriptions();
                    if (Number.isNaN(trueKeyIndex) || trueKeyIndex < 0 || trueKeyIndex >= cmwrDescriptions.length) {
                        currentTabRecord.terminalCore.printToWindow('Wrong index!', false, true);
                        return;
                    }
                    if (!cmwr.recoverWindow(cmwrDescriptions[trueKeyIndex])) {
                        currentTabRecord.terminalCore.printToWindow('Unexpected error, failed to recover the minimized window.', false, true);
                    }
                }
            } catch (error) {
                currentTabRecord.terminalCore.printToWindow(`${error}`, false, true);
            }
        },
        description: 'List all the minimized windows, or Re-open a minimized window.\n' +
            'Usage: mini -l             to list all the minimized windows\n' +
            '       mini -r [number]    to recover the minimized window',
    };


    // Update Needed
    supportedCommands['ctow'] = {
        executable: (parameters) => {
        },
        description: ''
    }


    // Update Needed
    supportedCommands['pytow'] = {
        executable: (parameters) => {
        },
        description: ''
    }


    // Update Needed
    supportedCommands['wasm'] = {
        executable: (parameters) => {
        },
        description: ''
    }

    // supportedCommands[''] = {
    //     executable: (parameters) => {},
    //     description: ''
    // }

});

























