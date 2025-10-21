document.addEventListener('DOMContentLoaded', () => {
    const
        XTermSetup = {
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
        };
    let
        tabCount = 0, // Initialize the total tab count
        /** @type {null | {divTerminal: HTMLDivElement, terminalCore: Object, buttonViewSwitch: HTMLButtonElement}} */
        currentTabRecord = null; // This is an object from <generateTerminalCore>.
    const
        fsRoot = new Folder(true), // Initialize File System Root
        serialLake = new SerialLake(undefined),
        /** @type {{divTerminal: HTMLDivElement, terminalCore: Object, buttonViewSwitch: HTMLButtonElement}[]} */
        tabRecords = [],
        /** @type {Record<string, {is_async: boolean, executable: function(string[]):void, description: string}>} */
        supportedCommands = {}; // Initialize Supported Commands

    const
        button_to_switch_theme = document.getElementById('button_to_switch_theme'),
        div_terminal_container = document.getElementById('terminal-container'),
        nav_view_navigation = document.getElementById('view-navigation'),
        button_to_open_new_terminal_tab = document.getElementById('button_to_open_new_terminal_tab'),
        button_to_save_terminal_log = document.getElementById('button_to_save_terminal_log'),
        button_to_add_files_to_terminal = document.getElementById('button_to_add_files_to_terminal');

    // Set Up Button Functions Links
    button_to_switch_theme.addEventListener('click', () => {
        button_to_switch_theme.innerText = document.body.classList.toggle('dark-body-mode') ? '☀️' : '🌙';
    });
    button_to_open_new_terminal_tab.addEventListener('click', () => {
        // check the tab count limit
        if (tabCount >= 8) {
            alert('You can open at most 8 terminal tabs.');
            return;
        }
        // Record the total tab count & Use it as current tab number
        tabCount++;
        // Create a new <HTMLDivElement> for the new Terminal
        const divNewTerminal = document.createElement('div');
        divNewTerminal.setAttribute('class', 'terminal-tab');
        divNewTerminal.setAttribute('id', `terminal-tab-${tabCount}`);
        divNewTerminal.style.display = 'none';
        div_terminal_container.appendChild(divNewTerminal);
        // Create a new terminal core on the new div
        const
            newXTermObject = new window.Terminal(XTermSetup),
            newTerminalCore = generateTerminalCore(
                newXTermObject,
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
        // Create a new <HTMLButtonElement> for the view switch for the new terminal core
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
                // change the nav button style and the terminal tab view
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
        nav_view_navigation.appendChild(buttonNewTerminalViewNavigation);
        tabRecords.push(newTerminalTabRecord);
        if (currentTabRecord === null) // if the terminal tab is <Tab #1>
            buttonNewTerminalViewNavigation.click();
    });
    button_to_save_terminal_log.addEventListener('click', () => {
        const
            url = URL.createObjectURL(new Blob([currentTabRecord.terminalCore.getTerminalLogString()], {type: 'text/plain'})),
            link = document.createElement('a');
        link.href = url;
        link.download = `terminal_log @ ${getISOTimeString()}.txt`; // the filename the user will get
        link.click();
        URL.revokeObjectURL(url);
    });
    button_to_add_files_to_terminal.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '';
        // set up a reader for __every__ file
        const reader = new FileReader();
        // set up the file input element
        input.onchange = (input_event) =>
            Object.values(input_event.target.files).forEach((file) => {
                if (!file) { // user hit "cancel"
                    alert('button_to_add_files_to_terminal: no file is added.');
                    return;
                }
                if (typeof file.name !== 'string') { // filename is illegal
                    alert('button_to_add_files_to_terminal: file name must be a string.');
                    return;
                }
                // set up behaviors on errors
                reader.onerror = (error) => {
                    alert(`button_to_add_files_to_terminal: error reading the file '${file.name}', ${error}.`);
                };
                // set up behaviors on loading
                reader.onload = (reader_event) => {
                    const
                        fileContent = reader_event.target.result,
                        [newFile, newFileName] = currentTabRecord.terminalCore
                            .getCurrentFolderPointer()
                            .getCurrentFolder()
                            .createNewFile(true, file.name, serialLake.generateNext());
                    newFile.setContent(fileContent);
                    alert(`Successfully added file "${newFileName}" to the current directory.`);
                };
                // Check the file type to determine HOW to read it
                if (typeof file.type === 'string' && file.type.startsWith('text/')) {
                    // Read as text if the file is a text-based file
                    reader.readAsText(file);
                } else {
                    // Read as binary (ArrayBuffer) for non-text files (e.g., images)
                    reader.readAsArrayBuffer(file);  // For binary files (e.g., images)
                }
            });
        // activate the file input element
        input.click();
    });

    // Automatically Open Window #1
    button_to_open_new_terminal_tab.click();

    // Finished
    supportedCommands['hello'] = {
        is_async: false,
        executable: (_) => {
            currentTabRecord.terminalCore.printToWindow(`Hello World!`, false, true);
        },
        description: `Say 'Hello World!'`
    };

    // Finished
    supportedCommands['help'] = {
        is_async: false,
        executable: (_) => {
            currentTabRecord.terminalCore.printToWindow(
                `This terminal supports: ${
                    Object.keys(supportedCommands).reduce(
                        (acc, elem, index) => {
                            if (index === 0) return `\n     ${elem}`;
                            return (index % 6 === 0) ? `${acc},\n     ${elem}` : `${acc}, ${elem}`;
                        },
                        null
                    )
                }.\nFor more details, please use the command 'man [command_name]'.`,
                false,
                true
            );
        },
        description: 'A brief manual of the terminal simulator.',
    };

    // Finished
    supportedCommands['man'] = {
        is_async: false,
        executable: (parameters) => {
            if (parameters.length === 1) {
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
                return;
            }
            currentTabRecord.terminalCore.printToWindow(`Wrong grammar!\nUsage: man [command_name]`, false, true);
        },
        description: 'A detailed manual of the terminal simulator.\n' +
            'Usage: man [command_name]',
    };

    // Finished
    supportedCommands['echo'] = {
        is_async: false,
        executable: (parameters) => {
            const result = parameters.reduce(
                (acc, elem, index) => {
                    if (index === 0) return elem;
                    return `${acc} ${elem}`;
                },
                ''
            );
            currentTabRecord.terminalCore.printToWindow(
                result.length > 0 ? result : `''`,
                false, true
            );
        },
        description: 'Simply print all the parameters.\n' +
            'Usage: echo [parameters]',
    };

    // Finished
    supportedCommands['touch'] = {
        is_async: false,
        executable: (parameters) => {
            if (parameters.length === 1) {
                try {
                    currentTabRecord.terminalCore.getCurrentFolderPointer().getCurrentFolder().createNewFile(false, parameters[0], serialLake.generateNext());
                    currentTabRecord.terminalCore.printToWindow(`Successfully create a file.`, false, true);
                } catch (error) {
                    currentTabRecord.terminalCore.printToWindow(`${error}`, false, true);
                }
                return;
            }
            currentTabRecord.terminalCore.printToWindow(`Wrong grammar!\nUsage: touch [file_name]`, false, true);
        },
        description: 'Make a new file in the current directory.\n' +
            'Usage: touch [file_name]'
    };

    // Finished
    supportedCommands['mkdir'] = {
        is_async: false,
        executable: (parameters) => {
            if (parameters.length === 1) {
                try {
                    currentTabRecord.terminalCore.getCurrentFolderPointer().createPath(parameters[0]);
                    currentTabRecord.terminalCore.printToWindow(
                        `Successfully created a directory. (Note that the directory may be already existing!)`,
                        false, true
                    );
                } catch (error) {
                    currentTabRecord.terminalCore.printToWindow(`${error}`, false, true);
                }
                return;
            }
            currentTabRecord.terminalCore.printToWindow(`Wrong grammar!\nUsage: mkdir [folder_path]`, false, true);
        },
        description: 'Make a new directory.\n' +
            'Usage: mkdir [folder_path]'
    };

    // Finished
    supportedCommands['ls'] = {
        is_async: false,
        executable: (parameters) => {
            if (parameters.length === 0) {
                currentTabRecord.terminalCore.printToWindow(
                    currentTabRecord.terminalCore.getCurrentFolderPointer().getCurrentFolder().getContentListAsString(),
                    false, true
                );
                return;
            }
            if (parameters.length === 1) {
                try {
                    currentTabRecord.terminalCore.printToWindow(
                        currentTabRecord.terminalCore.getCurrentFolderPointer().duplicate().gotoPath(parameters[0]).getContentListAsString(),
                        false, true
                    );
                } catch (error) {
                    currentTabRecord.terminalCore.printToWindow(`${error}`, false, true);
                }
                return;
            }
            currentTabRecord.terminalCore.printToWindow(`Wrong grammar!\nUsage: ls [folder_path]`, false, true);
        },
        description: 'List all the folders and files.\n' +
            'Usage: ls [folder_path]'
    };

    // Finished
    supportedCommands['cd'] = {
        is_async: false,
        executable: (parameters) => {
            if (parameters.length === 1) {
                try {
                    currentTabRecord.terminalCore.getCurrentFolderPointer().gotoPath(parameters[0]);
                    currentTabRecord.terminalCore.printToWindow(`Successfully went to the directory.`, false, true);
                } catch (error) {
                    currentTabRecord.terminalCore.printToWindow(`${error}`, false, true);
                }
                return;
            }
            currentTabRecord.terminalCore.printToWindow(`Wrong grammar!\nUsage: cd [folder_path]`, false, true);
        },
        description: 'Goto the given folder.\n' +
            'Usage: cd [folder_path]'
    };

    // Finished
    supportedCommands['pwd'] = {
        is_async: false,
        executable: (_) => {
            currentTabRecord.terminalCore.printToWindow(
                currentTabRecord.terminalCore.getCurrentFolderPointer().getFullPath(),
                false, true
            );
        },
        description: 'Print the current full path.'
    };

    // Finished
    supportedCommands['mv'] = {
        is_async: false,
        executable: (parameters) => {
            if (parameters.length === 3) {
                const cfp = currentTabRecord.terminalCore.getCurrentFolderPointer();
                if (parameters[0] === '-f') {
                    try {
                        cfp.movePath('file', parameters[1], parameters[2]);
                        currentTabRecord.terminalCore.printToWindow(`Successfully moved the file.`, false, true);
                    } catch (error) {
                        currentTabRecord.terminalCore.printToWindow(`${error}`, false, true);
                    }
                    return;
                }
                if (parameters[0] === '-d') {
                    try {
                        cfp.movePath('directory', parameters[1], parameters[2]);
                        currentTabRecord.terminalCore.printToWindow(`Successfully moved the directory.`, false, true);
                    } catch (error) {
                        currentTabRecord.terminalCore.printToWindow(`${error}`, false, true);
                    }
                    return;
                }
            }
            currentTabRecord.terminalCore.printToWindow(
                'Wrong grammar!\n' +
                'Usage: mv -f [old_file_path] [new_file_path]\n' +
                '       mv -d [old_directory_path] [new_directory_path]',
                false, true
            );
        },
        description: 'mv an existing file or directory.\n' +
            'Usage: mv -f [old_file_path] [new_file_path]\n' +
            '       mv -d [old_directory_path] [new_directory_path]'
    };

    // Finished
    supportedCommands['cp'] = {
        is_async: false,
        executable: (parameters) => {
            if (parameters.length === 3) {
                const cfp = currentTabRecord.terminalCore.getCurrentFolderPointer();
                if (parameters[0] === '-f') {
                    try {
                        cfp.copyPath('file', parameters[1], parameters[2], serialLake.generateNext());
                        currentTabRecord.terminalCore.printToWindow(`Successfully copied the file.`, false, true);
                    } catch (error) {
                        currentTabRecord.terminalCore.printToWindow(`${error}`, false, true);
                    }
                    return;
                }
                if (parameters[0] === '-d') {
                    try {
                        cfp.copyPath('directory', parameters[1], parameters[2], undefined);
                        currentTabRecord.terminalCore.printToWindow(`Successfully copied the directory.`, false, true);
                    } catch (error) {
                        currentTabRecord.terminalCore.printToWindow(`${error}`, false, true);
                    }
                    return;
                }
            }
            currentTabRecord.terminalCore.printToWindow(
                'Wrong grammar!\n' +
                'Usage: cp -f [original_file_path] [destination_file_path]\n' +
                '       cp -d [original_directory_path] [destination_directory_path]',
                false, true
            );
        },
        description: 'Copy an existing file or directory.\n' +
            'Usage: cp -f [original_file_path] [destination_file_path]\n' +
            '       cp -d [original_directory_path] [destination_directory_path]'
    };

    // Finished
    supportedCommands['rm'] = {
        is_async: false,
        executable: (parameters) => {
            if (parameters.length === 2) {
                const cfp = currentTabRecord.terminalCore.getCurrentFolderPointer();
                if (parameters[0] === '-f') {
                    try {
                        cfp.deletePath('file', parameters[1]);
                        currentTabRecord.terminalCore.printToWindow(`Successfully removed the file.`, false, true);
                    } catch (error) {
                        currentTabRecord.terminalCore.printToWindow(`${error}`, false, true);
                    }
                    return;
                }
                if (parameters[0] === '-d') {
                    try {
                        cfp.deletePath('directory', parameters[1]);
                        currentTabRecord.terminalCore.printToWindow(`Successfully removed the directory.`, false, true);
                    } catch (error) {
                        currentTabRecord.terminalCore.printToWindow(`${error}`, false, true);
                    }
                    return;
                }
            }
            currentTabRecord.terminalCore.printToWindow(
                'Wrong grammar!\n' +
                'Usage: rm -f [file_path]\n' +
                '       rm -d [directory_path]',
                false, true
            );
        },
        description: 'Remove (delete) an existing file or directory.\n' +
            'Usage: rm -f [file_path]\n' +
            '       rm -d [directory_path]'
    };

    // Finished
    supportedCommands['print'] = {
        is_async: false,
        executable: (parameters) => {
            if (parameters.length === 1) {
                try {
                    const [fileDir, fileName] = extractFileDirAndName(parameters[0]);
                    currentTabRecord.terminalCore.printToWindow(
                        currentTabRecord.terminalCore.getCurrentFolderPointer().duplicate().gotoPath(fileDir).getFile(fileName).getContent(),
                        false, true
                    );
                } catch (error) {
                    currentTabRecord.terminalCore.printToWindow(`${error}`, false, true);
                }
                return;
            }
            currentTabRecord.terminalCore.printToWindow(`Wrong grammar!\nUsage: print [file_path]`, false, true);
        },
        description: 'Print an existing file to the terminal window.\n' +
            'Usage: print [file_path]'
    };

    /**
     * This function sets up the editor window for the <edit> command.
     * @param {HTMLDivElement} terminalWindow
     * @param {string} fileName
     * @param {string} orginalFileContent
     * @param {function(windowDescription: string, divAceEditorWindow:HTMLDivElement, aceEditorObject: Object): void} callbackToRecoverMinimizedWindow
     * @param {function(newFileContent: string): void} callbackToSaveFile
     * @param {function():void} callbackToCancelEdit
     * @returns {void}
     * */
    function openFileEditor(
        terminalWindow,
        fileName, orginalFileContent,
        callbackToRecoverMinimizedWindow, callbackToSaveFile, callbackToCancelEdit
    ) {
        const divAceEditorWindow = document.createElement('div');
        divAceEditorWindow.classList.add('ace-editor-window');
        {
            // the title of the editor window
            const h3Title = document.createElement('h3');
            h3Title.classList.add('ace-editor-title');
            h3Title.innerText = `Editing File: ${fileName}`;
            divAceEditorWindow.appendChild(h3Title);

            // Ace-Editor container
            const divAceEditorContainer = document.createElement('div');
            divAceEditorContainer.classList.add('ace-editor-container');
            const aceEditorObject = ace.edit(divAceEditorContainer); // Create Ace editor in the div container
            aceEditorObject.setValue(orginalFileContent);  // Set the initial content of the file
            aceEditorObject.setOptions({
                fontSize: "14px",   // Set font size
                showPrintMargin: false, // Disable the print margin
            });
            aceEditorObject.focus();
            divAceEditorWindow.appendChild(divAceEditorContainer);

            // exit buttons
            const divExitButtons = document.createElement('div');
            divExitButtons.classList.add('ace-editor-exit-buttons-container');
            {
                const minimizeButton = document.createElement('button');
                minimizeButton.classList.add('ace-editor-minimize-button');
                minimizeButton.innerText = `🔽 Minimize`;
                minimizeButton.onclick = () => {
                    callbackToRecoverMinimizedWindow(`Editing File: ${fileName}`, divAceEditorWindow, aceEditorObject); // giving out info to recover the window
                    divAceEditorWindow.style.display = 'none'; // hide but not remove
                };
                divExitButtons.appendChild(minimizeButton);

                const saveButton = document.createElement('button');
                saveButton.classList.add('ace-editor-save-button');
                saveButton.innerText = '💾 Save';
                saveButton.onclick = () => {
                    callbackToSaveFile(aceEditorObject.getValue());
                    divAceEditorWindow.remove();
                };
                divExitButtons.appendChild(saveButton);

                const cancelButton = document.createElement('button');
                cancelButton.classList.add('ace-editor-cancel-button');
                cancelButton.innerText = '✖ Cancel';
                cancelButton.onclick = () => {
                    callbackToCancelEdit();
                    divAceEditorWindow.remove();
                };
                divExitButtons.appendChild(cancelButton);
            }
            divAceEditorWindow.appendChild(divExitButtons);
        }
        terminalWindow.appendChild(divAceEditorWindow);
    }

    // Finished
    supportedCommands['edit'] = {
        is_async: false,
        executable: (parameters) => {
            if (parameters.length === 1) {
                const emptyKBL = (_) => undefined; // empty keyboard listener
                try {
                    const
                        [fileDir, fileName] = extractFileDirAndName(parameters[0]),
                        file = currentTabRecord.terminalCore
                            .getCurrentFolderPointer()
                            .duplicate()
                            .gotoPath(fileDir)
                            .getFile(fileName);
                    currentTabRecord.terminalCore.setNewKeyboardListener(emptyKBL);
                    openFileEditor(
                        currentTabRecord.terminalCore.getHTMLDivForTerminalWindow(),
                        fileName,
                        file.getContent(),
                        (windowDescription, divAceEditorWindow, aceEditorObject) => { // minimize
                            const cmwr = currentTabRecord.terminalCore.getMinimizedWindowRecords();
                            cmwr.add(windowDescription, () => {
                                currentTabRecord.terminalCore.setNewKeyboardListener(emptyKBL);
                                divAceEditorWindow.style.display = '';
                                aceEditorObject.focus();
                            });
                            currentTabRecord.terminalCore.setDefaultKeyboardListener();
                        },
                        (newFileContent) => { // save
                            file.setContent(newFileContent);
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
                return;
            }
            currentTabRecord.terminalCore.printToWindow(`Wrong grammar!\nUsage: edit [file_path]`, false, true);
        },
        description: 'Edit an existing file.\n' +
            'Usage: edit [file_path]'
    };

    // Finished
    supportedCommands['mini'] = {
        is_async: false,
        executable: (parameters) => {
            if (parameters.length === 1 && parameters[0] === '-l') { // Command: "mini -l"
                const cmwrList = currentTabRecord.terminalCore.getMinimizedWindowRecords().getList();
                if (cmwrList.length === 0) {
                    currentTabRecord.terminalCore.printToWindow('No window minimized...', false, true);
                } else {
                    currentTabRecord.terminalCore.printToWindow(
                        'Minimized Windows:' + cmwrList.reduce(
                            (acc, [index, description]) =>
                                `${acc}\n                    [${index}] ${description}`,
                            ''
                        ),
                        false,
                        true
                    );
                }
                return;
            }
            if (parameters.length === 2 && parameters[0] === '-r') { // Command: "mini -r [number]"
                const
                    cmwr = currentTabRecord.terminalCore.getMinimizedWindowRecords(),
                    result = cmwr.recoverWindow(Number.parseInt(parameters[1], 10));
                if (result === null) {
                    currentTabRecord.terminalCore.printToWindow('Wrong index!', false, true);
                } else if (result === true) {
                    currentTabRecord.terminalCore.printToWindow(
                        'Successfully recovered the window.\n' +
                        'Note: Window indices are refrshed after this operation!',
                        false, true
                    );
                }
                return;
            }
            currentTabRecord.terminalCore.printToWindow(
                'Wrong grammar!\n' +
                'Usage: mini -l\n' +
                '       mini -r [number]',
                false, true
            );
        },
        description: 'List all the minimized windows, or Re-open a minimized window.\n' +
            'Usage: mini -l             to list all the minimized windows\n' +
            '       mini -r [number]    to recover the minimized window',
    };

    // Finished
    supportedCommands['download'] = {
        is_async: true,
        executable: async (parameters) => {
            if (parameters.length === 2) {
                const tfp = currentTabRecord.terminalCore.getCurrentFolderPointer().duplicate();
                if (parameters[0] === '-f') {
                    try {
                        const
                            [fileDir, fileName] = extractFileDirAndName(parameters[1]),
                            url = URL.createObjectURL(
                                new Blob(
                                    [tfp.gotoPath(fileDir).getFile(fileName).getContent()],
                                    {type: 'application/octet-stream'}
                                )
                            ),
                            link = document.createElement('a');
                        link.href = url;
                        link.download = fileName; // the filename the user sees
                        link.click();
                        URL.revokeObjectURL(url);
                        currentTabRecord.terminalCore.printToWindow(
                            'Successfully downloaded the file.',
                            false, true
                        );
                    } catch (error) {
                        currentTabRecord.terminalCore.printToWindow(`${error}`, false, true);
                    }
                    return;
                }
                if (parameters[0] === '-d') {
                    try {
                        const
                            url = URL.createObjectURL(
                                await tfp.gotoPath(parameters[1]).getZipBlob()
                            ),
                            link = document.createElement('a'),
                            zipFileName = tfp.getFullPath().substring(1).replaceAll('/', '_');
                        link.href = url;
                        link.download = (zipFileName === '') ? 'ROOT.zip' : `ROOT_${zipFileName}.zip`; // the filename the user sees
                        link.click();
                        URL.revokeObjectURL(url);
                        currentTabRecord.terminalCore.printToWindow(
                            'Successfully downloaded the directory.',
                            false, true
                        );
                    } catch (error) {
                        currentTabRecord.terminalCore.printToWindow(`${error}`, false, true);
                    }
                    return;
                }
            }
            currentTabRecord.terminalCore.printToWindow(
                'Wrong grammar!\n' +
                'Usage: download -f [file_path]\n' +
                '       download -d [directory_path]',
                false, true
            );
        },
        description: 'Download a single file or a directory (as .zip file) in the terminal file system.\n' +
            'Usage: download -f [file_path]\n' +
            '       download -d [directory_path]'
    };

    // Update Needed
    supportedCommands['mc'] = {
        is_async: true,
        executable: async (parameters) => {
            if (parameters.length === 3 &&
                parameters[0].length > 6 && parameters[0].startsWith('-ipp=') &&  // ip:port
                parameters[1].length > 5 && parameters[1].startsWith('-key=')     // user key
            ) {
                const
                    ipp = parameters[0].substring(5),
                    user_key = parameters[1].substring(5);
                if (parameters[2] === '-new') { // Command: mycloud -ipp=[ip:port] -key=[user_key] -new
                    try {
                        const
                            res = await fetch(
                                `http://${ipp}/mycloud/users/`,
                                {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Accept': 'application/json'
                                    },
                                    body: JSON.stringify({
                                        aim: 'new_account',
                                        user_key: user_key
                                    })
                                }
                            ),
                            body = await res.json();
                        if (body.connection === true) { // has connection
                            if (body.error !== undefined) { // has error
                                currentTabRecord.terminalCore.printToWindow(`${body.error}`, false, true);
                            } else { // no error
                                currentTabRecord.terminalCore.printToWindow('Successfully registered a user key.', false, true);
                            }
                        } else { // no connection
                            currentTabRecord.terminalCore.printToWindow('Bad connection: "body.connection" is not true.', false, true);
                        }
                    } catch (error) {
                        currentTabRecord.terminalCore.printToWindow(`${error}`, false, true);
                    }
                    return;
                }
                if (parameters[2] === '-conf') { // Command: mycloud -ipp=[ip:port] -key=[user_key] -conf
                    try {
                        const
                            res = await fetch(
                                `http://${ipp}/mycloud/users/`,
                                {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Accept': 'application/json'
                                    },
                                    body: JSON.stringify({
                                        aim: 'conf_account',
                                        user_key: user_key
                                    })
                                }
                            ),
                            body = await res.json();
                        if (body.connection === true) { // has connection
                            if (body.error !== undefined) { // has error
                                currentTabRecord.terminalCore.printToWindow(`${body.error}`, false, true);
                            } else { // no error
                                if (body.result === true) { // user_key exists
                                    currentTabRecord.terminalCore.printToWindow(
                                        'The user key is valid.\n' +
                                        ' --> Generating the configuration file at /.mycloud_conf\n'
                                        , false, true
                                    );
                                    const rootFolder = currentTabRecord.terminalCore.getCurrentFolderPointer().duplicate().gotoRoot();
                                    if (rootFolder.hasFile('.mycloud_conf')) { // .mycloud_conf is already existing
                                        const file = rootFolder.getFile('.mycloud_conf');
                                        file.setContent(`${parameters[0]}\n${parameters[1]}`);
                                    } else {
                                        const [file, _] = rootFolder.createNewFile(false, '.mycloud_conf', serialLake.generateNext());
                                        file.setContent(`${parameters[0]}\n${parameters[1]}`);
                                    }
                                    currentTabRecord.terminalCore.printToWindow(
                                        ' --> Success!'
                                        , false, true
                                    );
                                } else { // user_key does not exist
                                    currentTabRecord.terminalCore.printToWindow('The user key does not exist.', false, true);
                                }
                            }
                        } else { // no connection
                            currentTabRecord.terminalCore.printToWindow('Bad connection: "body.connection" is not true.', false, true);
                        }
                    } catch (error) {
                        currentTabRecord.terminalCore.printToWindow(`${error}`, false, true);
                    }
                    return;
                }
            }
            if (parameters.length === 1) {
                if (parameters[0] === '-b') { // Command: mycloud -b
                    // ...
                    return;
                }
                if (parameters[0] === '-r') { // Command: mycloud -r
                    // ...
                    return;
                }
            }
            currentTabRecord.terminalCore.printToWindow(
                'Wrong grammar!\n' +
                'Usage: mycloud -ipp=[ip:port] -key=[user_key] -new     to register a new user key on MyCloud server\n' +
                '       mycloud -ipp=[ip:port] -key=[user_key] -conf    to configure MyCloud client (creating file "/.mycloud_conf")\n' +
                '       mycloud -b                                      to backup the current file system to MyCloud server\n' +
                '       mycloud -r                                      to recover the file system to MyCloud server\n',
                false, true
            );
        },
        description: 'Backup and recover the terminal file system to MyCloud server.\n' +
            'Usage: mycloud -ipp=[ip:port] -key=[user_key] -new     to register a new user key on MyCloud server\n' +
            '       mycloud -ipp=[ip:port] -key=[user_key] -conf    to configure MyCloud client (creating file "/.mycloud_conf")\n' +
            '       mycloud -b                                      to backup the current file system to MyCloud server\n' +
            '       mycloud -r                                      to recover the file system to MyCloud server\n'
    }

    // Update Needed
    supportedCommands['sh'] = {
        is_async: false,
        executable: (parameters) => {

        },
        description: ''
    }

    supportedCommands['ttt'] = {
        // is_async: true,
        executable: (_) => {
            console.log(currentTabRecord.terminalCore.getCurrentFolderPointer().getCurrentFolder().JSON());
        },
        description: ''
    }

    // // Update Needed
    // supportedCommands['ctow'] = {
    //     executable: (parameters) => {
    //     },
    //     description: ''
    // }
    //
    //
    // // Update Needed
    // supportedCommands['pytow'] = {
    //     executable: (parameters) => {
    //     },
    //     description: ''
    // }
    //
    //
    // // Update Needed
    // supportedCommands['wasm'] = {
    //     executable: (parameters) => {
    //     },
    //     description: ''
    // }

    // supportedCommands[''] = {
    //     executable: (parameters) => {},
    //     description: ''
    // }

});

























